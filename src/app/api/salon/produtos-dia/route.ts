import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { chaveDoMes, lerLinhas, type LinhaProduto } from '@/lib/produtosDia'

export const dynamic = 'force-dynamic'

// Produtos vendidos (relatório 0041), guardados por MÊS.
//
// Por mês, e não por dia, pela mesma razão dos caixas: uma linha de
// salao_config por dia daria trinta consultas por mês. E a chave termina em
// _AAAA-MM de propósito — é o padrão de folha mensal que o salão modelo não
// copia. Venda de produto é dado de cliente real.

function paraDataBR(iso: string): string {
  return `01/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.linhas)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const itens = lerLinhas(body.linhas)
  if (!itens.length) {
    return NextResponse.json({ ok: true, ignorado: true, total: 0,
      aviso: 'Nenhuma linha de produto reconhecida; nada foi alterado.' })
  }

  // Agrupo por mês pela data da venda. A planilha traz vários meses de uma vez
  // e cada um é uma folha própria.
  const porMes = new Map<string, LinhaProduto[]>()
  for (const l of itens) {
    const chave = chaveDoMes(l.data_venda)
    if (!chave) continue
    if (!porMes.has(chave)) porMes.set(chave, [])
    porMes.get(chave)!.push(l)
  }
  if (!porMes.size) {
    return NextResponse.json({ error: 'As linhas não têm data reconhecível (DD/MM/AAAA)' }, { status: 400 })
  }

  // Cada mês é SUBSTITUÍDO inteiro. Somar por cima duplicaria o produto a cada
  // importação — e produto duplicado infla o lançado e passa a acusar falta de
  // dinheiro onde não há.
  const linhas = Array.from(porMes.entries()).map(([chave, lista]) => ({
    salao_id: sess.salaoId, chave, valor: { itens: lista },
    atualizado_em: new Date().toISOString(),
  }))
  const { error } = await supabaseAdmin.from('salao_config')
    .upsert(linhas, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, total: itens.length, meses: porMes.size })
}

export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const data = String(new URL(req.url).searchParams.get('data') || '').trim()
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    return NextResponse.json({ error: 'Informe a data como DD/MM/AAAA' }, { status: 400 })
  }
  const { data: cfg } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess.salaoId).eq('chave', chaveDoMes(data)).maybeSingle()
  const todos: LinhaProduto[] = Array.isArray((cfg as any)?.valor?.itens) ? (cfg as any).valor.itens : []
  const doDia = todos.filter(l => l.data_venda === data)
  return NextResponse.json({ data, itens: doDia, total: doDia.length, noMes: todos.length })
}
