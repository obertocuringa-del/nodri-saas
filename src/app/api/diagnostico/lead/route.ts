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

  const linhas = [
    `${nome} — WhatsApp ${celular}`,
    `Resultado do diagnóstico: ${placar} números sob controle.`,
    fracos.length ? `Pontos cegos: ${fracos.join(', ')}.` : '',
  ].filter(Boolean)

  const { error: erroNotif } = await supabaseAdmin.from('notificacoes').insert({
    titulo: 'Novo contato pelo diagnóstico',
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

  // Extra, tolerante a falha: enquanto o SQL não roda, a tabela recusa por
  // causa do not null, e está tudo bem — a notificação já garantiu o contato.
  try {
    await supabaseAdmin.from('leads').insert({
      nome,
      celular,
      objetivo: `Diagnóstico: ${placar}.${fracos.length ? ' Pontos cegos: ' + fracos.join(', ') + '.' : ''}`,
      token: randomBytes(9).toString('base64url'),
    })
  } catch {
    // Sem ação: o registro que importa já está gravado.
  }

  return NextResponse.json({ ok: true })
}
