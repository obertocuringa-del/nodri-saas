import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

const STOPWORDS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

function matchProf(item: any, tokens: string[], apelido: string, nomeCompleto: string): boolean {
  const n = (item.profissional || item.profissional_original || '').toLowerCase().trim()
  if (!n) return false
  if (n === nomeCompleto) return true
  if (apelido && (n === apelido || n.includes(apelido) || apelido.includes(n))) return true
  const nTokens = n.split(/\s+/).filter((t: string) => t && !STOPWORDS.has(t))
  const matchCount = tokens.filter(t => nTokens.some((nt: string) => nt.startsWith(t) || t.startsWith(nt))).length
  return matchCount >= Math.min(tokens.length, 2)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const tipo = new URL(req.url).searchParams.get('tipo') || ''

  // ── Busca dados do profissional ──
  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, cargo, servicos_habilitados')
    .eq('id', params.id)
    .eq('salao_id', salaoId)
    .single()

  if (!prof) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

  const nomeCompleto = (prof.nome_completo || '').toLowerCase().trim()
  const apelido = (prof.apelido || '').toLowerCase().trim()
  const tokens = nomeCompleto.split(/\s+/).filter((t: string) => t && !STOPWORDS.has(t)).slice(0, 2)

  // ── Busca todos os períodos do salão ──
  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_pagamentos, prof_servicos')
    .eq('salao_id', salaoId)
    .order('ano').order('mes')

  // ── DEPENDÊNCIA ────────────────────────────────────────────────────────────
  if (tipo === 'dependencia') {
    let fatTotal = 0
    let fatProf = 0
    const fatPorMes: Array<{ ano: number; mes: number; fat_prof: number; fat_total: number; pct: number }> = []

    for (const row of (periodos || [])) {
      let totalMes = 0, profMes = 0
      for (const item of (row.prof_pagamentos || [])) {
        const v = Number(item.valor_a_pagar || 0)
        totalMes += v
        if (matchProf(item, tokens, apelido, nomeCompleto)) profMes += v
      }
      fatTotal += totalMes
      fatProf += profMes
      if (totalMes > 0) {
        fatPorMes.push({
          ano: row.ano, mes: row.mes,
          fat_prof: Math.round(profMes * 100) / 100,
          fat_total: Math.round(totalMes * 100) / 100,
          pct: Math.round((profMes / totalMes) * 1000) / 10,
        })
      }
    }

    const pct = fatTotal > 0 ? Math.round((fatProf / fatTotal) * 1000) / 10 : 0

    // Clientes exclusivos desse profissional (que só foram atendidos por ele)
    let clientesExclusivos = 0
    try {
      // Conta clientes que só têm registros com este profissional
      const { data: rawProf } = await supabaseAdmin
        .from('atendimentos_raw')
        .select('cliente')
        .eq('salao_id', salaoId)
        .ilike('profissional', `%${prof.apelido || prof.nome_completo?.split(' ')[0] || ''}%`)
      const clientesDoProf = new Set((rawProf || []).map((r: any) => r.cliente).filter(Boolean))

      const { data: rawTodos } = await supabaseAdmin
        .from('atendimentos_raw')
        .select('cliente, profissional')
        .eq('salao_id', salaoId)
        .in('cliente', Array.from(clientesDoProf).slice(0, 500))

      const clientesPorProf: Record<string, Set<string>> = {}
      for (const r of (rawTodos || [])) {
        const cli = r.cliente || ''
        if (!clientesPorProf[cli]) clientesPorProf[cli] = new Set()
        const n = (r.profissional || '').toLowerCase()
        clientesPorProf[cli].add(n)
      }
      for (const [, profs] of Object.entries(clientesPorProf)) {
        const matches = Array.from(profs).filter(n => matchProf({ profissional: n }, tokens, apelido, nomeCompleto))
        if (matches.length > 0 && profs.size === matches.length) clientesExclusivos++
      }
    } catch (_) {}

    // Nível de risco
    const nivelRisco = pct >= 30 ? 'critico' : pct >= 20 ? 'alto' : pct >= 10 ? 'medio' : 'baixo'
    const corRisco = { critico: '#ef4444', alto: '#f97316', medio: '#f59e0b', baixo: '#10b981' }[nivelRisco]

    return NextResponse.json({
      pct_faturamento: pct,
      fat_prof: Math.round(fatProf * 100) / 100,
      fat_total: Math.round(fatTotal * 100) / 100,
      clientes_exclusivos: clientesExclusivos,
      nivel_risco: nivelRisco,
      cor_risco: corRisco,
      impacto_mensal: Math.round((fatTotal / Math.max((periodos || []).length, 1)) * (pct / 100) * 100) / 100,
      historico: fatPorMes.slice(-12),
      mensagem: pct >= 30
        ? `Risco CRÍTICO: ${pct}% do faturamento depende deste profissional`
        : pct >= 20
        ? `Risco ALTO: saída causaria queda de ~${pct}% no faturamento`
        : `Dependência de ${pct}% — dentro do normal`,
    })
  }

  // ── OPORTUNIDADES ──────────────────────────────────────────────────────────
  if (tipo === 'oportunidades') {
    // Serviços que o profissional faz (histórico)
    const servMap: Record<string, { quantidade: number; valor: number }> = {}
    for (const row of (periodos || [])) {
      for (const item of (row.prof_servicos || [])) {
        if (!matchProf(item, tokens, apelido, nomeCompleto)) continue
        const s = (item.servico || '').trim().toUpperCase()
        if (!s) continue
        if (!servMap[s]) servMap[s] = { quantidade: 0, valor: 0 }
        servMap[s].quantidade += Number(item.quantidade || 0)
        servMap[s].valor += Number(item.valor || 0)
      }
    }

    // Serviços habilitados do profissional
    const habilitadosIds: string[] = Array.isArray(prof.servicos_habilitados) ? prof.servicos_habilitados : []
    const { data: servicosSalao } = await supabaseAdmin
      .from('servicos')
      .select('id, nome, categoria, preco_fixo, comissao_valor')
      .eq('salao_id', salaoId)
      .eq('ativo', true)

    const habilitados = (servicosSalao || []).filter((s: any) => habilitadosIds.includes(s.id))

    const totalQtd = Object.values(servMap).reduce((s, v) => s + v.quantidade, 0)

    const mais_vende = Object.entries(servMap)
      .map(([servico, v]) => ({ servico, ...v, pct: totalQtd > 0 ? Math.round(v.quantidade / totalQtd * 100) : 0 }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5)

    const deveria_vender = habilitados
      .filter((s: any) => {
        const n = s.nome.toUpperCase()
        const qtd = servMap[n]?.quantidade || 0
        return qtd === 0 || (totalQtd > 0 && qtd / totalQtd < 0.03)
      })
      .map((s: any) => ({
        servico: s.nome,
        categoria: s.categoria,
        qtd_historico: servMap[s.nome.toUpperCase()]?.quantidade || 0,
        comissao: s.comissao_valor,
        motivo: servMap[s.nome.toUpperCase()]?.quantidade
          ? 'Faz raramente — potencial inexplorado'
          : 'Habilitado mas nunca ofereceu',
      }))
      .slice(0, 8)

    const nunca_oferece = habilitados
      .filter((s: any) => !servMap[s.nome.toUpperCase()])
      .map((s: any) => ({ servico: s.nome, categoria: s.categoria, comissao: s.comissao_valor }))

    return NextResponse.json({ mais_vende, deveria_vender, nunca_oferece })
  }

  // ── BUNDLE (serviços que deveriam ser vendidos juntos) ─────────────────────
  if (tipo === 'bundle') {
    const nomeQuery = prof.apelido || prof.nome_completo?.split(' ')[0] || ''
    if (!nomeQuery) return NextResponse.json({ pares: [] })

    // Busca atendimentos deste profissional
    let rows: any[] = []
    let from = 0
    while (true) {
      const { data } = await supabaseAdmin
        .from('atendimentos_raw')
        .select('cliente, servico, num_comanda, data_comanda')
        .eq('salao_id', salaoId)
        .ilike('profissional', `%${nomeQuery}%`)
        .range(from, from + 999)
      if (!data || data.length === 0) break
      rows = rows.concat(data)
      if (data.length < 1000) break
      from += 1000
    }

    const SERVICOS_EXCLUIDOS_BUNDLE = ['HIGIENIZAÇÃO', 'HIGIENIZAÇÃO ESPECIAL']
    function isExcluidoBundle(s: string) {
      return SERVICOS_EXCLUIDOS_BUNDLE.some(ex => s.toUpperCase().includes(ex))
    }

    // Agrupa por comanda: cliente + data + num_comanda
    const comandas: Record<string, Set<string>> = {}
    for (const r of rows) {
      const key = `${r.cliente}||${r.data_comanda}||${r.num_comanda}`
      if (!comandas[key]) comandas[key] = new Set()
      if (r.servico && !isExcluidoBundle(r.servico)) comandas[key].add(r.servico.trim().toUpperCase())
    }

    // Conta co-ocorrências de pares de serviços
    const pares: Record<string, { count: number; totalA: number }> = {}
    const totalServico: Record<string, number> = {}

    for (const servicos of Object.values(comandas)) {
      const lista = Array.from(servicos)
      for (const s of lista) totalServico[s] = (totalServico[s] || 0) + 1
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          const [a, b] = [lista[i], lista[j]].sort()
          const key = `${a}|||${b}`
          if (!pares[key]) pares[key] = { count: 0, totalA: 0 }
          pares[key].count++
        }
      }
    }

    // Calcula % de clientes que fazem A também fazem B
    const resultado = Object.entries(pares)
      .map(([key, v]) => {
        const [a, b] = key.split('|||')
        const totalA = totalServico[a] || 1
        const totalB = totalServico[b] || 1
        const pctAB = Math.round(v.count / Math.min(totalA, totalB) * 100)
        return { servico_a: a, servico_b: b, count: v.count, pct: pctAB, total_a: totalA, total_b: totalB }
      })
      .filter(p => p.count >= 3 && p.pct >= 20)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 15)

    return NextResponse.json({ pares: resultado, total_comandas: Object.keys(comandas).length })
  }

  return NextResponse.json({ error: 'Tipo inválido. Use: dependencia, oportunidades, bundle' }, { status: 400 })
}
