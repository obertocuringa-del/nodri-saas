import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

// ── Contato vindo do diagnóstico ────────────────────────────────────────────
//
// Rota pública: quem responde o diagnóstico não tem conta.
//
// Pede só NOME e WHATSAPP. O formulário da vitrine pede mais (e-mail, sistema
// atual, cidade) e faz sentido lá, porque a pessoa foi até o formulário por
// vontade própria. Aqui ela acabou de terminar um teste — cada campo a mais é
// gente que fecha a aba na última tela, justamente a de maior interesse.
//
// ORDEM IMPORTA: a notificação é gravada PRIMEIRO e sempre. Ela é o registro
// que garante que o contato chegou até você, e é o que aparece no painel
// master. A linha em `leads` é o extra: hoje aquela tabela exige e-mail e
// sistema atual (not null), que o diagnóstico não coleta — então a inserção
// pode falhar, e isso não pode custar o contato.
//
// Rodando sql/leads_diagnostico.sql, os dois campos passam a aceitar vazio e o
// contato também entra na lista de leads, com o token do fluxo de planos.

function soDigitos(v: unknown) {
  return String(v ?? '').replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null)

  const nome = String(b?.nome || '').trim()
  const celular = soDigitos(b?.celular)

  if (nome.length < 2) {
    return NextResponse.json({ erro: 'Diga o seu nome.' }, { status: 400 })
  }
  // 10 dígitos cobre fixo com DDD; 11, celular. Acima de 13 já não é telefone
  // brasileiro nem com código de país.
  if (celular.length < 10 || celular.length > 13) {
    return NextResponse.json({ erro: 'Informe um WhatsApp com DDD.' }, { status: 400 })
  }

  const pontos = Number(b?.pontos)
  const dominados = Number.isFinite(pontos) ? pontos : null
  const total = Number(b?.total) || null
  const fracos: string[] = Array.isArray(b?.fracos)
    ? b.fracos.filter((x: unknown) => typeof x === 'string').slice(0, 10)
    : []

  const placar = dominados !== null && total ? `${dominados} de ${total}` : 'não informado'

  // O contato é gravado DUAS vezes no fluxo: quando a pessoa entra no
  // diagnóstico e quando termina. Assim quem começou e desistiu não se perde —
  // e, para quem terminou, a segunda notificação chega com o placar, que é o
  // que abre a conversa de venda.
  const concluido = b?.etapa === 'fim'

  const linhas = concluido
    ? [
        `${nome} — WhatsApp ${celular}`,
        `Resultado: ${placar} números sob controle.`,
        fracos.length ? `Pontos cegos: ${fracos.join(', ')}.` : '',
      ].filter(Boolean)
    : [`${nome} — WhatsApp ${celular}`, 'Começou o diagnóstico agora.']

  const { error: erroNotif } = await supabaseAdmin.from('notificacoes').insert({
    titulo: concluido ? 'Diagnóstico concluído' : 'Novo contato pelo diagnóstico',
    mensagem: linhas.join(' '),
    tipo: 'info',
    para_todos: false,
    lida: false,
  })

  // Se nem a notificação entrou, o contato se perderia em silêncio — e essa é
  // a única falha que o visitante precisa saber, porque ele pode tentar de novo.
  if (erroNotif) {
    return NextResponse.json({ erro: 'Não foi possível enviar. Tente novamente.' }, { status: 500 })
  }

  // Só na abertura: gravar de novo no fim criaria um contato duplicado na
  // tela de Contatos para a mesma pessoa.
  if (concluido) return NextResponse.json({ ok: true, emContatos: true })

  // Extra, tolerante a falha: sem o sql/leads_diagnostico.sql a tabela recusa
  // por causa do not null em email e sistema_atual, e está tudo bem — a
  // notificação já garantiu o contato.
  //
  // O cliente do Supabase NÃO lança exceção quando o banco recusa: ele devolve
  // { error }. Um try/catch aqui nunca pegaria nada, e a falha passaria
  // despercebida. Por isso o erro é lido do retorno, e o resultado volta na
  // resposta — é assim que dá para saber se o contato entrou na lista de
  // Contatos ou se ficou só na notificação.
  const { error: erroLead } = await supabaseAdmin.from('leads').insert({
    nome,
    celular,
    // Redigido para ler bem depois do "Quer:" que a tela de Contatos põe na frente.
    objetivo: `ajuda com o que apareceu no diagnóstico — ${placar} sob controle.`
      + `${fracos.length ? ' Pontos cegos: ' + fracos.join(', ') + '.' : ''}`,
    token: randomBytes(9).toString('base64url'),
  })

  return NextResponse.json({ ok: true, emContatos: !erroLead })
}
