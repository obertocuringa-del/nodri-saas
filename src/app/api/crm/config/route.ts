import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, escritaBloqueadaSub } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// ── Configuração do CRM ─────────────────────────────────────────────────────
//
// Mensagens prontas e motivos de "Não fechou". Os dois nascem com um padrão
// genérico e o salão edita daqui — nenhum dado de salão nenhum viaja no
// código, que é a regra que já vale no resto do NODRI.
//
// As duas listas são CATÁLOGO, não identidade: podem ser copiadas para um
// salão novo sem levar junto nada que seja de alguém.

const TABELAS = { modelos: 'crm_modelos', motivos: 'crm_motivos_perda', origens: 'crm_origens' } as const
type Lista = keyof typeof TABELAS

async function sessaoDoSalao() {
  const sess = await getSessao()
  if (!sess) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  if (sess.role === 'profissional') {
    return { erro: NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 }) }
  }
  return { sess }
}

export async function GET() {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro

  const [{ data: modelos }, { data: motivos }, { data: origens }] = await Promise.all([
    supabaseAdmin.from('crm_modelos').select('id, nome, texto, atalho, ordem, ativo')
      .eq('salao_id', sess!.salaoId).order('ordem'),
    supabaseAdmin.from('crm_motivos_perda').select('id, nome, ordem, ativo')
      .eq('salao_id', sess!.salaoId).order('ordem'),
    supabaseAdmin.from('crm_origens').select('id, nome, ordem, ativo')
      .eq('salao_id', sess!.salaoId).order('ordem'),
  ])

  return NextResponse.json({ modelos: modelos || [], motivos: motivos || [], origens: origens || [] })
}

export async function POST(req: NextRequest) {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro
  if (await escritaBloqueadaSub()) {
    return NextResponse.json({ error: 'Este acesso é somente leitura.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const lista = String(body?.lista || '') as Lista
  const tabela = TABELAS[lista]
  if (!tabela) return NextResponse.json({ error: 'Lista desconhecida' }, { status: 400 })

  // A tela manda a lista inteira, na ordem em que está na tela. Salvar item a
  // item exigiria a tela acertar a ordem sozinha, e ordem meio salva é o tipo
  // de defeito que ninguém percebe até o dia em que percebe.
  const itens = Array.isArray(body?.itens) ? body.itens : []

  const limpos = itens
    .map((it: any, i: number) => ({
      id: typeof it?.id === 'string' && it.id.length > 20 ? it.id : null,
      nome: String(it?.nome || '').trim().slice(0, 120),
      texto: lista === 'modelos' ? String(it?.texto || '').trim().slice(0, 4000) : null,
      atalho: lista === 'modelos' ? (String(it?.atalho || '').trim().slice(0, 40) || null) : null,
      ordem: i,
      ativo: it?.ativo !== false,
    }))
    .filter((it: any) => it.nome && (lista !== 'modelos' || it.texto))

  const { data: atuais } = await supabaseAdmin
    .from(tabela).select('id').eq('salao_id', sess!.salaoId)

  const ficam = new Set(limpos.map((i: any) => i.id).filter(Boolean))
  const somem = (atuais || []).map(a => a.id).filter(id => !ficam.has(id))

  // Apagar de verdade o que o salão tirou da lista: desativar deixaria motivo
  // velho aparecendo no relatório de perdas para sempre.
  if (somem.length) {
    await supabaseAdmin.from(tabela).delete().in('id', somem).eq('salao_id', sess!.salaoId)
  }

  for (const it of limpos) {
    const linha: any = { nome: it.nome, ordem: it.ordem, ativo: it.ativo }
    if (lista === 'modelos') { linha.texto = it.texto; linha.atalho = it.atalho }
    if (it.id) {
      await supabaseAdmin.from(tabela).update(linha).eq('id', it.id).eq('salao_id', sess!.salaoId)
    } else {
      await supabaseAdmin.from(tabela).insert({ salao_id: sess!.salaoId, ...linha })
    }
  }

  return NextResponse.json({ ok: true, gravados: limpos.length, apagados: somem.length })
}
