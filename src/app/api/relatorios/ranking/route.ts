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
function tokensNome(nome: string) {
  return (nome || '').toLowerCase().split(/\s+/).filter(t => t && !STOPWORDS.has(t)).slice(0, 2)
}
// Casamento estrito — igual a /metricas e categoria-media (nome exato OU apelido OU 2 tokens)
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

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const ano = parseInt(url.searchParams.get('ano') || '0')
  const mes = parseInt(url.searchParams.get('mes') || '0')
  if (!ano || !mes) return NextResponse.json({ error: 'ano e mes obrigatórios' }, { status: 400 })

  // Profissionais ativos
  const { data: profs } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, cargo')
    .eq('salao_id', salaoId)
    .eq('ativo', true)

  // Período do mês selecionado
  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_pagamentos, prof_ticket, prof_preferencia, prof_ocupacao, prof_servicos, prof_produtos, resumo_mensal')
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)

  // Mês anterior (para fidelização e tendência)
  const mesPrev = mes === 1 ? 12 : mes - 1
  const anoPrev = mes === 1 ? ano - 1 : ano
  const { data: periodosPrev } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('prof_pagamentos, prof_preferencia')
    .eq('salao_id', salaoId)
    .eq('ano', anoPrev)
    .eq('mes', mesPrev)
  const rowsPrev = periodosPrev || []

  // Metas do mês (para % de atingimento)
  const { data: metasRows } = await supabaseAdmin
    .from('metas_profissionais')
    .select('profissional_id, meta_redistribuida, meta_manual')
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
  const metaPorId: Record<string, number> = {}
  for (const m of (metasRows || [])) metaPorId[m.profissional_id] = Number(m.meta_manual ?? m.meta_redistribuida ?? 0)

  // Ocorrências do mês (por profissional_id — exato)
  const ini = new Date(ano, mes - 1, 1).toISOString()
  const fim = new Date(ano, mes, 0, 23, 59, 59).toISOString()
  const { data: feedbacks } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('profissional_id, tipo, ocorrido_descricao')
    .eq('salao_id', salaoId)
    .gte('criado_em', ini)
    .lte('criado_em', fim)

  const rows = periodos || []

  // Faturamento total do salão no mês (para % de dependência)
  let fatSalao = 0
  for (const r of rows) {
    for (const it of (r.prof_pagamentos || [])) {
      fatSalao += Number(it.valor_a_pagar || 0) + Number(it.desconto || 0)
    }
  }

  const resultado = (profs || []).map((p: any) => {
    const nome = p.nome_completo || ''
    const tokens = tokensNome(nome)
    const apelido = p.apelido || ''
    let fat = 0, ticket = 0, ticketN = 0, pref = 0, sem = 0
    let dias = 0, ocupSum = 0, ocupN = 0, serv = 0, prod = 0

    for (const r of rows) {
      for (const it of (r.prof_pagamentos || []))
        if (matchNome(it, nome, tokens, apelido)) fat += Number(it.valor_a_pagar || 0) + Number(it.desconto || 0)
      for (const it of (r.prof_ticket || []))
        if (matchNome(it, nome, tokens, apelido)) { ticket += Number(it.ticket_medio || 0); ticketN++ }
      for (const it of (r.prof_preferencia || []))
        if (matchNome(it, nome, tokens, apelido)) { pref += Number(it.clientes_preferencia || 0); sem += Number(it.clientes_sem_preferencia || 0) }
      for (const it of (r.prof_ocupacao || []))
        if (matchNome(it, nome, tokens, apelido)) { dias += Number(it.dias_trabalhados || 0); ocupSum += Number(it.taxa_ocupacao || 0); ocupN++ }
      for (const it of (r.prof_servicos || []))
        if (matchNome(it, nome, tokens, apelido)) serv += Number(it.quantidade || 0)
      for (const it of (r.prof_produtos || []))
        if (matchNome(it, nome, tokens, apelido)) prod += Number(it.quantidade || 0)
    }

    // Ocorrências por profissional_id
    const fbs = (feedbacks || []).filter((f: any) => f.profissional_id === p.id)
    const neg = fbs.filter((f: any) => f.tipo === 'negativo').length
    const pos = fbs.filter((f: any) => f.tipo === 'positivo').length
    const faltas = fbs.filter((f: any) => (f.ocorrido_descricao || '').toLowerCase().includes('falta')).length
    const atrasos = fbs.filter((f: any) => (f.ocorrido_descricao || '').toLowerCase().includes('atras')).length

    const ticketMedio = ticketN > 0 ? ticket / ticketN : (serv > 0 ? fat / serv : 0)
    const ocupacao = ocupN > 0 ? ocupSum / ocupN : 0

    // Mês anterior (faturamento e preferência/sem-preferência) para fidelização e tendência
    let fatPrev = 0, prefPrev = 0, semPrev = 0
    for (const r of rowsPrev) {
      for (const it of (r.prof_pagamentos || []))
        if (matchNome(it, nome, tokens, apelido)) fatPrev += Number(it.valor_a_pagar || 0) + Number(it.desconto || 0)
      for (const it of (r.prof_preferencia || []))
        if (matchNome(it, nome, tokens, apelido)) { prefPrev += Number(it.clientes_preferencia || 0); semPrev += Number(it.clientes_sem_preferencia || 0) }
    }
    // Fidelização (mesma lógica de /metricas)
    const totalNovos = semPrev + sem
    const fidelizados = pref - prefPrev
    const perdidos = totalNovos - fidelizados
    const taxaFid = totalNovos > 0 ? (fidelizados / totalNovos) * 100 : 0
    const taxaPerda = totalNovos > 0 ? (perdidos / totalNovos) * 100 : 0
    // Meta
    const meta = metaPorId[p.id] || 0
    const metaPct = meta > 0 ? (fat / meta) * 100 : 0
    // Tendência
    const cresc = fatPrev > 0 ? ((fat - fatPrev) / fatPrev) * 100 : 0
    const proj = fat * (1 + cresc / 100)

    return {
      id: p.id,
      nome: apelido || nome,
      cargo: p.cargo || '—',
      // Desempenho / Atendimento
      faturamento: Math.round(fat * 100) / 100,
      ticket_medio: Math.round(ticketMedio * 100) / 100,
      preferencia: pref,
      sem_preferencia: sem,
      dias_trabalhados: dias,
      ocupacao: Math.round(ocupacao * 10) / 10,
      servicos: serv,
      produtos: prod,
      // Eficiência
      fat_dia: dias > 0 ? Math.round((fat / dias) * 100) / 100 : 0,
      serv_dia: dias > 0 ? Math.round((serv / dias) * 10) / 10 : 0,
      ticket_servico: serv > 0 ? Math.round((fat / serv) * 100) / 100 : 0,
      // Ocorrências
      ocorr_negativas: neg,
      ocorr_positivas: pos,
      faltas,
      atrasos,
      // Dependência
      pct_salao: fatSalao > 0 ? Math.round((fat / fatSalao) * 1000) / 10 : 0,
      fat_gerado: Math.round(fat * 100) / 100,
      clientes_fieis: pref,
      // Fidelização
      taxa_fidelizacao: Math.round(taxaFid * 10) / 10,
      taxa_perda: Math.round(taxaPerda * 10) / 10,
      fidelizados,
      clientes_perdidos: perdidos,
      total_novos: totalNovos,
      // Meta
      meta_pct: Math.round(metaPct * 10) / 10,
      realizado: Math.round(fat * 100) / 100,
      // Tendência
      crescimento: Math.round(cresc * 10) / 10,
      projecao: Math.round(proj * 100) / 100,
    }
  })

  return NextResponse.json({ ano, mes, fat_salao: Math.round(fatSalao * 100) / 100, profissionais: resultado })
}
