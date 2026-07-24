import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { normalizaServico } from '@/lib/acoesComerciais'

// Conta quantos serviços com o MESMO nome da campanha foram vendidos, no salão
// inteiro, dentro do período da campanha. Fonte: relatorio_periodos.prof_servicos
// (a mesma do relatório "Serviços mais vendidos"). Granularidade: mensal — soma
// os meses que o período cobre.
//
// GET ?titulo=...&inicio=YYYY-MM-DD&fim=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const titulo = url.searchParams.get('titulo') || ''
  const inicio = url.searchParams.get('inicio') || ''
  const fim = url.searchParams.get('fim') || ''
  const alvo = normalizaServico(titulo)
  if (!alvo) return NextResponse.json({ vendidos: 0, meses: [], semNome: true })

  // Intervalo de meses (YYYY-MM). Sem datas, considera os últimos 12 meses.
  const hoje = new Date()
  const dIni = inicio ? new Date(inicio + 'T00:00:00') : new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)
  const dFim = fim ? new Date(fim + 'T00:00:00') : hoje
  const meses: { ano: number; mes: number }[] = []
  const cur = new Date(dIni.getFullYear(), dIni.getMonth(), 1)
  const limite = new Date(dFim.getFullYear(), dFim.getMonth(), 1)
  while (cur <= limite && meses.length < 36) {
    meses.push({ ano: cur.getFullYear(), mes: cur.getMonth() + 1 })
    cur.setMonth(cur.getMonth() + 1)
  }
  if (!meses.length) return NextResponse.json({ vendidos: 0, meses: [] })

  const anos = Array.from(new Set(meses.map(m => m.ano)))
  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_servicos')
    .eq('salao_id', sess.salaoId)
    .in('ano', anos)

  const noRange = (r: any) => meses.some(m => m.ano === r.ano && m.mes === r.mes)
  let vendidos = 0
  for (const r of (periodos || [])) {
    if (!noRange(r)) continue
    const itens = Array.isArray(r.prof_servicos) ? r.prof_servicos : []
    for (const it of itens) {
      if (normalizaServico(it.servico) === alvo) vendidos += Number(it.quantidade || 0)
    }
  }
  return NextResponse.json({ vendidos, meses: meses.length })
}
