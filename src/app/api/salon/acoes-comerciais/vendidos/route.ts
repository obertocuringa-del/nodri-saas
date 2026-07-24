import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { normalizaServico, type Campanha } from '@/lib/acoesComerciais'

// Serviços vendidos (do relatório "Mais vendidos") para TODAS as campanhas de
// uma vez — para mostrar ao lado do compartilhar em cada card. Uma leitura só.
// Retorna { [campanhaId]: quantidade }. Vale para o salão e para o profissional.
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: cfg } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', sess.salaoId).eq('chave', 'acoes_comerciais').maybeSingle()
  const campanhas: Campanha[] = Array.isArray((cfg as any)?.valor) ? (cfg as any).valor : []
  if (!campanhas.length) return NextResponse.json({ vendidos: {} })

  // Anos que as campanhas cobrem (sem datas → últimos 2 anos).
  const hoje = new Date()
  const anos = new Set<number>()
  for (const c of campanhas) {
    const ini = c.dataInicio ? new Date(c.dataInicio + 'T00:00:00') : new Date(hoje.getFullYear() - 1, 0, 1)
    const fim = c.dataFim ? new Date(c.dataFim + 'T00:00:00') : hoje
    for (let y = ini.getFullYear(); y <= fim.getFullYear(); y++) anos.add(y)
  }

  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_servicos')
    .eq('salao_id', sess.salaoId)
    .in('ano', Array.from(anos))

  const linhas = (periodos || []) as any[]
  const mesesDaCampanha = (c: Campanha): { ano: number; mes: number }[] => {
    const ini = c.dataInicio ? new Date(c.dataInicio + 'T00:00:00') : new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1)
    const fim = c.dataFim ? new Date(c.dataFim + 'T00:00:00') : hoje
    const out: { ano: number; mes: number }[] = []
    const cur = new Date(ini.getFullYear(), ini.getMonth(), 1)
    const lim = new Date(fim.getFullYear(), fim.getMonth(), 1)
    while (cur <= lim && out.length < 36) { out.push({ ano: cur.getFullYear(), mes: cur.getMonth() + 1 }); cur.setMonth(cur.getMonth() + 1) }
    return out
  }

  const resultado: Record<string, number> = {}
  for (const c of campanhas) {
    const alvo = normalizaServico(c.titulo)
    if (!alvo) { resultado[c.id] = 0; continue }
    const meses = mesesDaCampanha(c)
    let total = 0
    for (const r of linhas) {
      if (!meses.some(m => m.ano === r.ano && m.mes === r.mes)) continue
      const itens = Array.isArray(r.prof_servicos) ? r.prof_servicos : []
      for (const it of itens) if (normalizaServico(it.servico) === alvo) total += Number(it.quantidade || 0)
    }
    resultado[c.id] = total
  }
  return NextResponse.json({ vendidos: resultado })
}
