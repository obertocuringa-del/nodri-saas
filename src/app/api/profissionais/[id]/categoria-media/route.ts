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

function mesesEntreDatas(inicio: string, fim: string) {
  const mI = inicio?.match(/^(\d{4})-(\d{2})$/)
  const mF = fim?.match(/^(\d{4})-(\d{2})$/)
  if (!mI || !mF) return []
  const meses: Array<{ ano: number; mes: number }> = []
  let ano = parseInt(mI[1]), mes = parseInt(mI[2])
  const fAno = parseInt(mF[1]), fMes = parseInt(mF[2])
  while (ano < fAno || (ano === fAno && mes <= fMes)) {
    meses.push({ ano, mes })
    mes++; if (mes > 12) { mes = 1; ano++ }
    if (meses.length > 60) break
  }
  return meses
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const p2_inicio = url.searchParams.get('p2_inicio') || ''
  const p2_fim    = url.searchParams.get('p2_fim')    || ''
  if (!p2_inicio || !p2_fim) return NextResponse.json({ error: 'p2_inicio e p2_fim obrigatórios' }, { status: 400 })

  const mesesP2 = mesesEntreDatas(p2_inicio, p2_fim)
  if (!mesesP2.length) return NextResponse.json({ error: 'Período inválido' }, { status: 400 })

  // Busca o cargo do profissional atual
  const { data: profAtual } = await supabaseAdmin
    .from('profissionais').select('cargo,nome_completo,apelido').eq('id', params.id).single()
  if (!profAtual?.cargo) return NextResponse.json({ error: 'Cargo não encontrado' }, { status: 404 })

  // Busca todos os profissionais com o mesmo cargo (exceto o atual)
  const { data: colegas } = await supabaseAdmin
    .from('profissionais')
    .select('id,nome_completo,apelido,cargo')
    .eq('salao_id', salaoId)
    .eq('cargo', profAtual.cargo)
    .eq('ativo', true)
    .neq('id', params.id)

  const totalProfCat = (colegas?.length || 0) + 1 // inclui o próprio

  // Busca periodos dos meses do P2
  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano,mes,prof_pagamentos,prof_ticket,prof_preferencia,prof_ocupacao,prof_servicos,prof_produtos')
    .eq('salao_id', salaoId)
    .in('mes', mesesP2.map(m => m.mes))

  const periodosP2 = (periodos || []).filter(p => mesesP2.some(m => m.ano === p.ano && m.mes === p.mes))

  const STOPWORDS = new Set(['da','de','do','das','dos','e'])

  function tokensNome(nome: string) {
    return nome.toLowerCase().split(/\s+/).filter(t => t && !STOPWORDS.has(t)).slice(0, 2)
  }

  // Casamento ESTRITO — idêntico à rota oficial /metricas (matchProf):
  // nome exato OU apelido OU os 2 primeiros tokens batendo. Evita contar a mesma
  // pessoa em vários profissionais (que inflava a soma e a média da categoria).
  function matchNome(item: any, nomeCompleto: string, tokens: string[], apelido: string): boolean {
    const n = (item.profissional || item.profissional_original || '').toLowerCase().trim()
    if (!n) return false
    if (nomeCompleto && n === nomeCompleto.toLowerCase().trim()) return true
    const ap = (apelido || '').toLowerCase().trim()
    if (ap && (n === ap || n.includes(ap) || ap.includes(n))) return true
    const nTok = n.split(/\s+/).filter((t: string) => t && !STOPWORDS.has(t))
    if (tokens.length === 0 || nTok.length === 0) return false
    const matchCount = tokens.filter(t => nTok.some((nt: string) => nt.startsWith(t) || t.startsWith(nt))).length
    return matchCount >= Math.min(tokens.length, 2)
  }

  // Calcula métricas para um profissional em P2
  function calcMetricasProf(nomeCompleto: string, tokens: string[], apelido: string) {
    let fat = 0, ticket = 0, ticketCount = 0, pref = 0, semPref = 0
    let dias = 0, ocupSum = 0, ocupCount = 0, serv = 0, prod = 0
    let temDados = false
    for (const row of periodosP2) {
      for (const item of (row.prof_pagamentos || [])) {
        if (matchNome(item, nomeCompleto, tokens, apelido)) { fat += Number(item.valor_a_pagar||0) + Number(item.desconto||0); temDados = true }
      }
      for (const item of (row.prof_ticket || [])) {
        if (matchNome(item, nomeCompleto, tokens, apelido)) { ticket += Number(item.ticket_medio||0); ticketCount++; temDados = true }
      }
      for (const item of (row.prof_preferencia || [])) {
        if (matchNome(item, nomeCompleto, tokens, apelido)) { pref += Number(item.clientes_preferencia||0); semPref += Number(item.clientes_sem_preferencia||0); temDados = true }
      }
      for (const item of (row.prof_ocupacao || [])) {
        if (matchNome(item, nomeCompleto, tokens, apelido)) { dias += Number(item.dias_trabalhados||0); ocupSum += Number(item.taxa_ocupacao||0); ocupCount++; temDados = true }
      }
      for (const item of (row.prof_servicos || [])) {
        if (matchNome(item, nomeCompleto, tokens, apelido)) { serv += Number(item.quantidade||0); temDados = true }
      }
      for (const item of (row.prof_produtos || [])) {
        if (matchNome(item, nomeCompleto, tokens, apelido)) { prod += Number(item.quantidade||0); temDados = true }
      }
    }
    if (!temDados) return null
    return {
      faturamento: fat,
      ticket_medio: ticketCount > 0 ? ticket/ticketCount : (serv > 0 ? fat/serv : 0),
      clientes_preferencia: pref,
      clientes_sem_preferencia: semPref,
      dias_trabalhados: dias,
      taxa_ocupacao: ocupCount > 0 ? ocupSum/ocupCount : 0,
      total_servicos: serv,
      total_produtos: prod,
    }
  }

  // Calcula o próprio profissional
  const nomeAtual = profAtual.nome_completo || ''
  const tokensAtual = tokensNome(nomeAtual)
  const apelidoAtual = profAtual.apelido || ''
  const metricasAtual = calcMetricasProf(nomeAtual, tokensAtual, apelidoAtual)

  // Calcula cada colega
  const metricasColegas: any[] = []
  for (const c of (colegas || [])) {
    const tok = tokensNome(c.nome_completo || '')
    const m = calcMetricasProf(c.nome_completo || '', tok, c.apelido || '')
    if (m) metricasColegas.push({ nome: c.apelido || c.nome_completo, ...m })
  }

  // Média da categoria (todos com dados, incluindo o profissional atual)
  const todos = [...metricasColegas]
  if (metricasAtual) todos.push({ nome: apelidoAtual || profAtual.nome_completo, ...metricasAtual })

  if (!todos.length) return NextResponse.json({ cargo: profAtual.cargo, total_prof_categoria: totalProfCat, media: null, atual: metricasAtual })

  const keys = ['faturamento','ticket_medio','clientes_preferencia','clientes_sem_preferencia','dias_trabalhados','taxa_ocupacao','total_servicos','total_produtos'] as const
  const media: Record<string, number> = {}
  for (const k of keys) {
    media[k] = todos.reduce((s, m) => s + (m[k] || 0), 0) / todos.length
  }

  return NextResponse.json({
    cargo: profAtual.cargo,
    total_prof_categoria: totalProfCat,
    prof_com_dados: todos.length,
    media,
    atual: metricasAtual,
    colegas: metricasColegas.map(c => ({ nome: c.nome, faturamento: c.faturamento })),
  })
}
