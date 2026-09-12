import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, escritaBloqueadaSub } from '@/lib/apiAuth'
import { MODELOS_PADRAO, MOTIVOS_PERDA_PADRAO, ORIGENS_PADRAO, MOTIVOS_DESMARQUE_PADRAO } from '@/lib/crm'
import { CHAVE_ESTADOS, lerConfigEstados, ESTADOS_VAZIO } from '@/lib/crmEstados'

export const dynamic = 'force-dynamic'

// ── A conexão com o WhatsApp ────────────────────────────────────────────────
//
// Esta rota NÃO fala com o WhatsApp. Ela só lê e escreve o que a ponte grava:
// a situação da conexão e o QR do momento. Pedir para conectar é deixar o
// canal em `aguardando_qr` — a ponte vê, abre a sessão e devolve o código.
//
// A `sessao` (credenciais) nunca sai daqui para o navegador. É o único campo
// da tabela que a tela não pode ver, e por um motivo simples: com ele nas mãos
// alguém entraria no WhatsApp do salão.

async function sessaoDoSalao() {
  const sess = await getSessao()
  if (!sess) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  if (sess.role === 'profissional') {
    return { erro: NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 }) }
  }
  return { sess }
}

/** Semeia mensagens prontas e motivos de perda no primeiro uso do salão. */
async function semearSeVazio(salaoId: string) {
  const { count: temModelos } = await supabaseAdmin
    .from('crm_modelos').select('id', { count: 'exact', head: true }).eq('salao_id', salaoId)
  if (!temModelos) {
    await supabaseAdmin.from('crm_modelos').insert(
      MODELOS_PADRAO.map((m, i) => ({ salao_id: salaoId, ...m, ordem: i }))
    )
  }
  const { count: temMotivos } = await supabaseAdmin
    .from('crm_motivos_perda').select('id', { count: 'exact', head: true }).eq('salao_id', salaoId)
  if (!temMotivos) {
    await supabaseAdmin.from('crm_motivos_perda').insert(
      MOTIVOS_PERDA_PADRAO.map((nome, i) => ({ salao_id: salaoId, nome, ordem: i }))
    )
  }
  const { count: temDesmarque } = await supabaseAdmin
    .from('crm_motivos_desmarque').select('id', { count: 'exact', head: true }).eq('salao_id', salaoId)
  if (!temDesmarque) {
    await supabaseAdmin.from('crm_motivos_desmarque').insert(
      MOTIVOS_DESMARQUE_PADRAO.map((nome, i) => ({ salao_id: salaoId, nome, ordem: i }))
    )
  }
  const { count: temOrigens } = await supabaseAdmin
    .from('crm_origens').select('id', { count: 'exact', head: true }).eq('salao_id', salaoId)
  if (!temOrigens) {
    await supabaseAdmin.from('crm_origens').insert(
      ORIGENS_PADRAO.map((nome, i) => ({ salao_id: salaoId, nome, ordem: i }))
    )
  }
}

export async function GET() {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro

  await semearSeVazio(sess!.salaoId)

  const { data } = await supabaseAdmin
    .from('crm_canais')
    .select('situacao, qr, qr_expira_em, numero, nome_exibicao, visto_em, erro, numero_dados')
    .eq('salao_id', sess!.salaoId).maybeSingle()

  // O último período em que a ponte ficou fora do ar, se ainda não foi visto.
  // Ver o bloco "O buraco que ninguém via", em /api/crm/ponte.
  const { data: foraRow } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess!.salaoId).eq('chave', 'crm_fora_do_ar').maybeSingle()
  const fora = (foraRow as any)?.valor
  const foraDoAr = (fora && fora.visto === false) ? fora : null

  const [{ data: modelos }, { data: motivos }, { data: origens }, { data: desmarques }] = await Promise.all([
    supabaseAdmin.from('crm_modelos').select('id, nome, texto, atalho')
      .eq('salao_id', sess!.salaoId).eq('ativo', true).order('ordem'),
    supabaseAdmin.from('crm_motivos_perda').select('id, nome')
      .eq('salao_id', sess!.salaoId).eq('ativo', true).order('ordem'),
    supabaseAdmin.from('crm_origens').select('id, nome')
      .eq('salao_id', sess!.salaoId).eq('ativo', true).order('ordem'),
    supabaseAdmin.from('crm_motivos_desmarque').select('id, nome')
      .eq('salao_id', sess!.salaoId).eq('ativo', true).order('ordem'),
  ])

  // QR vencido não é mostrado: melhor pedir para gerar de novo do que exibir
  // um código morto e a pessoa achar que o celular dela é que está errado.
  const canal: any = data || { situacao: 'desconectado' }
  if (canal.qr && canal.qr_expira_em && new Date(canal.qr_expira_em) < new Date()) canal.qr = null

  // A ponte dá sinal de vida a cada poucos segundos. Sem sinal há mais de dois
  // minutos, ela caiu — e a tela precisa dizer isso, não fingir que está tudo bem.
  const desdeSinal = canal.visto_em ? (Date.now() - new Date(canal.visto_em).getTime()) / 1000 : null
  canal.ponte_viva = desdeSinal !== null && desdeSinal < 120

  // Quem da recepcao pode assinar a mensagem. Sai do cadastro de
  // profissionais, cargo "Recepcionista" -- lista que o salao ja mantem, em
  // vez de uma segunda lista para alguem esquecer de atualizar.
  const { data: profs } = await supabaseAdmin
    .from('profissionais').select('id, nome_completo, apelido, cargo, ativo, is_departamento')
    .eq('salao_id', sess!.salaoId).limit(500)
  const atendentes = (profs || [])
    .filter((p: any) => p.ativo !== false && !p.is_departamento && /recep/i.test(String(p.cargo || '')))
    .map((p: any) => ({ id: p.id, nome: p.apelido || p.nome_completo || '' }))
    .filter((p: any) => p.nome)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome, 'pt-BR'))

  // Os botoes da faixa, como o salao deixou. Ver src/lib/crmEstados.ts.
  const { data: estRow } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess!.salaoId).eq('chave', CHAVE_ESTADOS).maybeSingle()
  const estados = estRow ? lerConfigEstados((estRow as any).valor) : ESTADOS_VAZIO

  return NextResponse.json({ canal, foraDoAr, estados, atendentes, modelos: modelos || [], motivos: motivos || [], origens: origens || [], desmarques: desmarques || [] })
}

/** "Já conferi": apaga o aviso de que a ponte ficou fora do ar. */
export async function PATCH() {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro

  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess!.salaoId).eq('chave', 'crm_fora_do_ar').maybeSingle()
  const v = (data as any)?.valor
  if (!v) return NextResponse.json({ ok: true })

  await supabaseAdmin.from('salao_config').upsert({
    salao_id: sess!.salaoId,
    chave: 'crm_fora_do_ar',
    valor: { ...v, visto: true },
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro
  if (await escritaBloqueadaSub()) {
    return NextResponse.json({ error: 'Este acesso é somente leitura.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const acao = String(body?.acao || 'conectar')
  const agora = new Date().toISOString()

  const patch: any = { atualizado_em: agora, erro: null }
  if (acao === 'conectar') {
    patch.situacao = 'aguardando_qr'
    patch.qr = null
  } else if (acao === 'recomecar') {
    // ── Recomecar do zero com o numero que estiver conectado ────────────────
    //
    // Trocar o WhatsApp do salao (do celular pessoal para o da recepcao, por
    // exemplo) deixa nas tabelas as conversas do aparelho anterior. Elas nao
    // somem sozinhas e nao tem como "atualizar": o WhatsApp so entrega o
    // historico no momento do pareamento, entao nao existe botao de recarregar
    // que resolva -- e preciso limpar e parear de novo.
    //
    // Apaga de verdade, e nao esconde: conversa de um numero que nao e mais o
    // do salao nao serve para relatorio nenhum, e deixar escondida e garantir
    // que um dia ela volte a aparecer em alguma conta.
    //
    // O que NAO se apaga: mensagens prontas, motivos e origens. Sao o ajuste
    // do salao, nao dados do aparelho.
    const alvo = { salao_id: sess!.salaoId }
    await supabaseAdmin.from('crm_eventos').delete().match(alvo)
    await supabaseAdmin.from('crm_mensagens').delete().match(alvo)
    await supabaseAdmin.from('crm_conversas').delete().match(alvo)
    await supabaseAdmin.from('crm_contatos').delete().match(alvo)

    patch.situacao = 'desconectado'
    patch.qr = null
    patch.sessao = null
    patch.numero = null
    patch.numero_dados = null
  } else if (acao === 'desconectar') {
    patch.situacao = 'desconectado'
    patch.qr = null
    patch.sessao = null   // derruba a sessão: da próxima vez precisa escanear de novo
    patch.numero = null
  } else {
    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
  }

  const { data: existe } = await supabaseAdmin
    .from('crm_canais').select('id').eq('salao_id', sess!.salaoId).maybeSingle()
  if (existe) await supabaseAdmin.from('crm_canais').update(patch).eq('id', existe.id)
  else await supabaseAdmin.from('crm_canais').insert({ salao_id: sess!.salaoId, ...patch })

  return NextResponse.json({ ok: true })
}
