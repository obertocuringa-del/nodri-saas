import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { salaoIdSe } from '@/lib/apiAuth'

export async function GET() {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const { data, error } = await supabaseAdmin.from('lojistas').select('*').eq('salao_id', salaoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const itens = data || []

  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)
  const mesAtual = hojeStr.slice(0, 7)

  // Totais gerais
  const totais = {
    total: itens.length,
    novos_este_mes: itens.filter(l => (l.criado_em || '').slice(0, 7) === mesAtual).length,
    cadastros_hoje: itens.filter(l => (l.criado_em || '').slice(0, 10) === hojeStr).length,
    ativos: itens.filter(l => l.situacao === 'ativo').length,
    inativos: itens.filter(l => l.situacao === 'inativo').length,
  }

  // Crescimento — últimos 12 meses (inclusive os com 0 cadastros)
  const crescimento: { mes: string; qtd: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const qtd = itens.filter(l => (l.criado_em || '').slice(0, 7) === chave).length
    crescimento.push({ mes: chave, qtd })
  }

  // Segmentos
  const segmentosMap = new Map<string, number>()
  for (const l of itens) {
    const seg = l.segmento || 'Sem segmento'
    segmentosMap.set(seg, (segmentosMap.get(seg) || 0) + 1)
  }
  const segmentos = Array.from(segmentosMap.entries()).map(([segmento, qtd]) => ({ segmento, qtd })).sort((a, b) => b.qtd - a.qtd)

  // Serviços mais procurados (ranking + percentual sobre o total de lojistas)
  const servicosMap = new Map<string, number>()
  for (const l of itens) {
    for (const s of (l.servicos_interesse || [])) servicosMap.set(s, (servicosMap.get(s) || 0) + 1)
  }
  const servicos = Array.from(servicosMap.entries())
    .map(([nome, qtd]) => ({ nome, qtd, percentual: itens.length ? Math.round((qtd / itens.length) * 100) : 0 }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 15)

  // Aniversariantes
  const proximos7 = new Set<string>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoje)
    d.setDate(d.getDate() + i)
    proximos7.add(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  const aniversariantes = { hoje: 0, semana: 0, mes: 0 }
  for (const l of itens) {
    if (!l.data_aniversario) continue
    const d = new Date(`${l.data_aniversario}T00:00:00`)
    const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (d.getMonth() === hoje.getMonth()) aniversariantes.mes++
    if (proximos7.has(mmdd)) aniversariantes.semana++
    if (d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate()) aniversariantes.hoje++
  }

  // Participação no grupo
  const entraram = itens.filter(l => l.entrou_grupo === true).length
  const grupo = {
    entraram,
    nao_entraram: itens.length - entraram,
    percentual: itens.length ? Math.round((entraram / itens.length) * 100) : 0,
  }

  return NextResponse.json({ totais, crescimento, segmentos, servicos, aniversariantes, grupo })
}
