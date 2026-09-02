import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { bloquearEdicao } from '@/lib/apiAuth'
import { apelidoCasa, palavrasIguais } from '@/lib/matchProfissional'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || !payload.salaoId) return null
  return payload.salaoId
}

function mesesEntreDatas(inicio: string, fim: string): Array<{ ano: number; mes: number }> {
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

// Converte lista de meses para datas ISO de início e fim do intervalo
function periodoParaDatas(meses: Array<{ ano: number; mes: number }>) {
  if (!meses.length) return { inicio: null, fim: null }
  const primeiro = meses[0]
  const ultimo = meses[meses.length - 1]
  const inicio = new Date(primeiro.ano, primeiro.mes - 1, 1).toISOString()
  // último dia do último mês
  const fim = new Date(ultimo.ano, ultimo.mes, 0, 23, 59, 59).toISOString()
  return { inicio, fim }
}

function agregar(rows: any[]) {
  if (!rows.length) return null
  const fat  = rows.reduce((s, r) => s + Number(r.faturamento || 0), 0)
  const serv = rows.reduce((s, r) => s + Number(r.total_servicos || 0), 0)
  const ticket = serv > 0 ? fat / serv : rows.reduce((s, r) => s + Number(r.ticket_medio || 0), 0) / rows.length
  const pref    = rows.reduce((s, r) => s + Number(r.clientes_preferencia || 0), 0)
  const semPref = rows.reduce((s, r) => s + Number(r.clientes_sem_preferencia || 0), 0)
  const dias    = rows.reduce((s, r) => s + Number(r.dias_trabalhados || 0), 0)
  const ocup    = rows.reduce((s, r) => s + Number(r.taxa_ocupacao || 0), 0) / rows.length
  const prod    = rows.reduce((s, r) => s + Number(r.total_produtos || 0), 0)
  const servMap: Record<string, { quantidade: number; valor: number }> = {}
  for (const r of rows) {
    for (const s of (Array.isArray(r.servicos_detalhados) ? r.servicos_detalhados : [])) {
      if (!servMap[s.servico]) servMap[s.servico] = { quantidade: 0, valor: 0 }
      servMap[s.servico].quantidade += Number(s.quantidade || 0)
      servMap[s.servico].valor += Number(s.valor || 0)
    }
  }
  const servicos = Object.entries(servMap)
    .map(([servico, v]) => ({ servico, ...v }))
    .sort((a, b) => b.quantidade - a.quantidade)
  return { faturamento: fat, ticket_medio: ticket, clientes_preferencia: pref,
    clientes_sem_preferencia: semPref, dias_trabalhados: dias, taxa_ocupacao: ocup,
    total_servicos: serv, total_produtos: prod, servicos }
}

// Compara ocorrências P1 vs P2 com variação %
function compararOcorrencias(
  fbP1: any[], fbP2: any[]
): Array<{ tipo: string; p1: number; p2: number; variacao: number | null }> {
  const m1: Record<string, number> = {}
  const m2: Record<string, number> = {}
  for (const f of fbP1) { const k = f.ocorrido_descricao || 'Outro'; m1[k] = (m1[k]||0)+1 }
  for (const f of fbP2) { const k = f.ocorrido_descricao || 'Outro'; m2[k] = (m2[k]||0)+1 }
  const todos = new Set([...Object.keys(m1), ...Object.keys(m2)])
  return Array.from(todos)
    .map(tipo => {
      const p1 = m1[tipo] || 0; const p2 = m2[tipo] || 0
      const variacao = p1 > 0 ? ((p2 - p1) / p1) * 100 : null
      return { tipo, p1, p2, variacao: variacao !== null ? Number(variacao.toFixed(1)) : null }
    })
    .sort((a, b) => (b.p1 + b.p2) - (a.p1 + a.p2))
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const p1_inicio = url.searchParams.get('p1_inicio') || ''
  const p1_fim    = url.searchParams.get('p1_fim')    || ''
  const p2_inicio = url.searchParams.get('p2_inicio') || ''
  const p2_fim    = url.searchParams.get('p2_fim')    || ''

  if (!p1_inicio || !p1_fim || !p2_inicio || !p2_fim) {
    return NextResponse.json({ error: 'Obrigatório: p1_inicio, p1_fim, p2_inicio, p2_fim (YYYY-MM)' }, { status: 400 })
  }

  const mesesP1 = mesesEntreDatas(p1_inicio, p1_fim)
  const mesesP2 = mesesEntreDatas(p2_inicio, p2_fim)
  const datasP1 = periodoParaDatas(mesesP1)
  const datasP2 = periodoParaDatas(mesesP2)

  // ── Métricas mensais (prof_metricas_mensais) ──
  const { data: metricas } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('*')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)

  const inPeriod = (r: any, list: Array<{ano:number;mes:number}>) =>
    list.some(m => m.ano === Number(r.ano) && m.mes === Number(r.mes))

  const dadosP1 = agregar((metricas || []).filter(r => inPeriod(r, mesesP1)))
  const dadosP2 = agregar((metricas || []).filter(r => inPeriod(r, mesesP2)))

  // Fidelização
  let fidelizacao = null
  if (dadosP1 && dadosP2) {
    const total_novos = (dadosP1.clientes_sem_preferencia||0) + (dadosP2.clientes_sem_preferencia||0)
    const fidelizados = (dadosP2.clientes_preferencia||0) - (dadosP1.clientes_preferencia||0)
    const perdidos = total_novos - fidelizados
    const taxa_perda = total_novos > 0 ? (perdidos / total_novos) * 100 : 0
    const taxa_fidel = total_novos > 0 ? (fidelizados / total_novos) * 100 : 0
    fidelizacao = {
      total_novos, fidelizados, perdidos,
      taxa_perda: Number(taxa_perda.toFixed(1)),
      taxa_fidelizacao: Number(taxa_fidel.toFixed(1)),
      nivel: taxa_perda > 100 ? 'critico' : taxa_perda > 70 ? 'alto' : taxa_perda > 40 ? 'medio' : 'baixo',
      novos_p1: dadosP1.clientes_sem_preferencia, novos_p2: dadosP2.clientes_sem_preferencia,
      ticket_medio: dadosP2.ticket_medio,
      valor_perdido: Math.abs(perdidos) * (dadosP2.ticket_medio||0),
    }
  }

  // ── Feedbacks filtrados por período (feedback_prof_respostas) ──
  const { data: prof } = await supabaseAdmin
    .from('profissionais').select('nome_completo,apelido').eq('id', params.id).single()

  const nomeBase = prof?.apelido || prof?.nome_completo?.split(' ')[0] || ''
  let feedbacksP1: any[] = [], feedbacksP2: any[] = [], feedbacksTodos: any[] = []

  if (nomeBase) {
    const buscarFb = async (dtIni: string | null, dtFim: string | null) => {
      if (!dtIni || !dtFim) return []
      const q = supabaseAdmin
        .from('feedback_prof_respostas')
        .select('id,tipo,ocorrido_descricao,descricao,criado_em')
        .eq('salao_id', salaoId)
        .ilike('profissional_nome', `%${nomeBase}%`)
        .gte('criado_em', dtIni)
        .lte('criado_em', dtFim)
        .order('criado_em', { ascending: false })
      const { data } = await q
      return data || []
    }

    ;[feedbacksP1, feedbacksP2] = await Promise.all([
      buscarFb(datasP1.inicio, datasP1.fim),
      buscarFb(datasP2.inicio, datasP2.fim),
    ])
    const idsVistos = new Set<string>()
    feedbacksTodos = [...feedbacksP2, ...feedbacksP1]
      .filter(fb => { if (idsVistos.has(fb.id)) return false; idsVistos.add(fb.id); return true })
      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
  }

  // Comparativo de ocorrências P1 vs P2
  const ocorrencias_comparativo = compararOcorrencias(feedbacksP1, feedbacksP2)

  // Estatísticas simples P2 (período atual)
  const ocorrenciaMap: Record<string, number> = {}
  for (const fb of feedbacksTodos) {
    const k = fb.ocorrido_descricao || 'Outro'
    ocorrenciaMap[k] = (ocorrenciaMap[k]||0)+1
  }
  const ocorrencias = Object.entries(ocorrenciaMap)
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total)

  // ── Faturamento de relatorio_periodos ──
  // Busca TODOS os períodos disponíveis do salão (para histórico completo)
  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_pagamentos, prof_ticket, prof_preferencia, prof_ocupacao, prof_servicos, prof_produtos')
    .eq('salao_id', salaoId)
    .order('ano').order('mes')

  // Match de nome: compara primeiros tokens do nome do profissional
  // Preposições não podem ser usadas como token, senão "Daniel da Rocha" casa com
  // qualquer nome que contenha "da" — ver mesma correção em metasAnalitico.ts
  const STOPWORDS_NOME = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
  const nomeCompleto = (prof?.nome_completo || '').toLowerCase().trim()
  const apelido = (prof?.apelido || '').toLowerCase().trim()
  // Pega os 2 primeiros tokens (sem preposição) do nome para matching robusto
  const tokens = nomeCompleto.split(/\s+/).filter((t: string) => t && !STOPWORDS_NOME.has(t)).slice(0, 2)

  function matchProf(item: any): boolean {
    const n = (item.profissional || item.profissional_original || '').toLowerCase().trim()
    if (!n) return false
    // Match exato
    if (n === nomeCompleto) return true
    // Match por apelido
    if (apelidoCasa(apelido, n)) return true
    // Match pelos primeiros 2 tokens do nome (sem preposição)
    const nTokens = n.split(/\s+/).filter((t: string) => t && !STOPWORDS_NOME.has(t))
    if (tokens.length === 0 || nTokens.length === 0) return false
    const matchCount = tokens.filter((t: string) => nTokens.some((nt: string) => palavrasIguais(t, nt))).length
    return matchCount >= Math.min(tokens.length, 2)
  }

  function getMetricasPeriodo(meses: Array<{ano:number;mes:number}>) {
    const rows = (periodos||[]).filter(p => meses.some(m => m.ano===p.ano && m.mes===p.mes))
    if (!rows.length) return null

    let faturamento = 0, ticket = 0, ticketCount = 0
    let pref = 0, semPref = 0, dias = 0, ocupSum = 0, ocupCount = 0
    let servTotal = 0, prodTotal = 0
    let encontrouDados = false
    const servMap: Record<string, {quantidade:number;valor:number}> = {}

    for (const row of rows) {
      // Faturamento (valor_a_pagar + desconto, independente do sinal)
      for (const item of (row.prof_pagamentos||[])) {
        if (matchProf(item)) {
          faturamento += Number(item.valor_a_pagar||0) + Number(item.desconto||0)
          encontrouDados = true
        }
      }
      // Ticket
      for (const item of (row.prof_ticket||[])) {
        if (matchProf(item)) { ticket += Number(item.ticket_medio||0); ticketCount++; encontrouDados = true }
      }
      // Preferência
      for (const item of (row.prof_preferencia||[])) {
        if (matchProf(item)) {
          pref += Number(item.clientes_preferencia||0)
          semPref += Number(item.clientes_sem_preferencia||0)
          encontrouDados = true
        }
      }
      // Ocupação
      for (const item of (row.prof_ocupacao||[])) {
        if (matchProf(item)) {
          dias += Number(item.dias_trabalhados||0)
          ocupSum += Number(item.taxa_ocupacao||0)
          ocupCount++; encontrouDados = true
        }
      }
      // Serviços
      for (const item of (row.prof_servicos||[])) {
        if (matchProf(item)) {
          const s = item.servico||''; servTotal += Number(item.quantidade||0)
          if (!servMap[s]) servMap[s] = {quantidade:0, valor:0}
          servMap[s].quantidade += Number(item.quantidade||0)
          servMap[s].valor += Number(item.valor||0)
          encontrouDados = true
        }
      }
      // Produtos
      for (const item of (row.prof_produtos||[])) {
        if (matchProf(item)) { prodTotal += Number(item.quantidade||0); encontrouDados = true }
      }
    }

    if (!encontrouDados) return null

    const servicos = Object.entries(servMap)
      .map(([servico, v]) => ({servico, ...v}))
      .sort((a, b) => b.quantidade - a.quantidade)

    const ticketFinal = ticketCount > 0 ? ticket/ticketCount : (servTotal > 0 ? faturamento/servTotal : 0)

    return {
      faturamento,
      ticket_medio: ticketFinal,
      clientes_preferencia: pref,
      clientes_sem_preferencia: semPref,
      dias_trabalhados: dias,
      taxa_ocupacao: ocupCount > 0 ? ocupSum/ocupCount : 0,
      total_servicos: servTotal,
      total_produtos: prodTotal,
      servicos,
    }
  }

  const fatP1 = getMetricasPeriodo(mesesP1)
  const fatP2 = getMetricasPeriodo(mesesP2)

  // Fidelização dos dados do relatorio
  let fidelizacaoFat = null
  if (fatP1 && fatP2) {
    const total_novos = (fatP1.clientes_sem_preferencia||0) + (fatP2.clientes_sem_preferencia||0)
    const fidelizados = (fatP2.clientes_preferencia||0) - (fatP1.clientes_preferencia||0)
    const perdidos = total_novos - fidelizados
    const taxa_perda = total_novos > 0 ? (perdidos / total_novos) * 100 : 0
    const taxa_fidel = total_novos > 0 ? (fidelizados / total_novos) * 100 : 0
    fidelizacaoFat = {
      total_novos, fidelizados, perdidos,
      taxa_perda: Number(taxa_perda.toFixed(1)),
      taxa_fidelizacao: Number(taxa_fidel.toFixed(1)),
      nivel: taxa_perda > 100 ? 'critico' : taxa_perda > 70 ? 'alto' : taxa_perda > 40 ? 'medio' : 'baixo',
      novos_p1: fatP1.clientes_sem_preferencia, novos_p2: fatP2.clientes_sem_preferencia,
      ticket_medio: fatP2.ticket_medio,
      valor_perdido: Math.abs(perdidos) * (fatP2.ticket_medio||0),
    }
  }

  // Histórico completo (faturamento + preferência + ocupação + serviços por mês)
  const historicoCompleto = (periodos||[])
    .sort((a, b) => a.ano!==b.ano ? a.ano-b.ano : a.mes-b.mes)
    .map(row => {
      let fat = 0, pref = 0, semPref = 0, dias = 0, servTotal = 0
      for (const item of (row.prof_pagamentos||[])) {
        if (matchProf(item)) fat += Number(item.valor_a_pagar||0) + Number(item.desconto||0)
      }
      for (const item of (row.prof_preferencia||[])) {
        if (matchProf(item)) { pref += Number(item.clientes_preferencia||0); semPref += Number(item.clientes_sem_preferencia||0) }
      }
      for (const item of (row.prof_ocupacao||[])) {
        if (matchProf(item)) dias += Number(item.dias_trabalhados||0)
      }
      for (const item of (row.prof_servicos||[])) {
        if (matchProf(item)) servTotal += Number(item.quantidade||0)
      }
      return { ano: row.ano, mes: row.mes, faturamento: fat, clientes_preferencia: pref, clientes_sem_preferencia: semPref, dias_trabalhados: dias, total_servicos: servTotal }
    })
    .filter(r => r.faturamento > 0 || r.total_servicos > 0)

  // Histórico mensal faturamento (dos relatorios) - últimos 12 meses com dados
  const historicoFat = historicoCompleto
    .filter(r => r.faturamento > 0)
    .slice(-12)

  // Mix de receita — top 10 serviços por valor total (histórico completo)
  const mixMap: Record<string, {quantidade:number;valor:number}> = {}
  for (const row of (periodos||[])) {
    for (const item of (row.prof_servicos||[])) {
      if (matchProf(item)) {
        const s = item.servico||''
        if (!mixMap[s]) mixMap[s] = {quantidade:0, valor:0}
        mixMap[s].quantidade += Number(item.quantidade||0)
        mixMap[s].valor += Number(item.valor||0)
      }
    }
  }
  const totalValorMix = Object.values(mixMap).reduce((s, v) => s + v.valor, 0)
  const mixReceita = Object.entries(mixMap)
    .map(([servico, v]) => ({servico, ...v, pct: totalValorMix > 0 ? Number(((v.valor/totalValorMix)*100).toFixed(1)) : 0}))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10)

  // Sazonalidade — média de faturamento por número do mês (todos os anos)
  const porMesNum: Record<number, number[]> = {}
  for (const h of historicoCompleto) {
    if (h.faturamento > 0) {
      if (!porMesNum[h.mes]) porMesNum[h.mes] = []
      porMesNum[h.mes].push(h.faturamento)
    }
  }
  const sazonalidade = Array.from({length:12}, (_,i) => {
    const vals = porMesNum[i+1] || []
    return {
      mes: i+1,
      media: vals.length ? Math.round(vals.reduce((s,v)=>s+v,0)/vals.length) : 0,
      max: vals.length ? Math.max(...vals) : 0,
      min: vals.length ? Math.min(...vals) : 0,
      count: vals.length,
    }
  })

  // Projeção — tendência dos últimos 3 meses
  const ultimos4 = historicoCompleto.filter(r => r.faturamento > 0).slice(-4)
  let projecao = null
  if (ultimos4.length >= 2) {
    const taxas: number[] = []
    for (let i = 1; i < ultimos4.length; i++) {
      const prev = ultimos4[i-1].faturamento
      const curr = ultimos4[i].faturamento
      if (prev > 0) taxas.push((curr - prev) / prev)
    }
    if (taxas.length > 0) {
      const mediaTaxa = taxas.reduce((s,v)=>s+v,0) / taxas.length
      const ultimo = ultimos4[ultimos4.length-1]
      projecao = {
        taxa_media: Number((mediaTaxa*100).toFixed(1)),
        valor_projetado: Math.round(ultimo.faturamento * (1 + mediaTaxa)),
        baseado_em: taxas.length,
        proximo_mes: ultimo.mes===12 ? 1 : ultimo.mes+1,
        proximo_ano: ultimo.mes===12 ? ultimo.ano+1 : ultimo.ano,
        tendencia: mediaTaxa > 0.05 ? 'alta' : mediaTaxa < -0.05 ? 'baixa' : 'estavel',
      }
    }
  }

  // Histórico métricas (de prof_metricas_mensais)
  const historico = (metricas||[])
    .sort((a, b) => a.ano!==b.ano ? a.ano-b.ano : a.mes-b.mes)
    .slice(-12)
    .map(r => ({ ano: r.ano, mes: r.mes, faturamento: r.faturamento,
      total_servicos: r.total_servicos, ticket_medio: r.ticket_medio, taxa_ocupacao: r.taxa_ocupacao }))

  return NextResponse.json({
    // Métricas de prof_metricas_mensais
    p1: dadosP1, p2: dadosP2, fidelizacao,
    // Dados financeiros de relatorio_periodos
    fat_p1: fatP1, fat_p2: fatP2, fidelizacao_fat: fidelizacaoFat, historico_fat: historicoFat,
    // Feedbacks filtrados por período
    feedbacks: feedbacksTodos,
    feedbacks_p1_total: feedbacksP1.length,
    feedbacks_p2_total: feedbacksP2.length,
    ocorrencias,
    ocorrencias_comparativo,
    historico,
    // Novas análises gerenciais
    historico_completo: historicoCompleto,
    mix_receita: mixReceita,
    sazonalidade,
    projecao,
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    if (await bloquearEdicao('POST')) return NextResponse.json({ error: 'Modo Caixa: você pode adicionar, mas não editar nem excluir.' }, { status: 403 })
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  const { ano, mes } = body
  if (!ano || !mes) return NextResponse.json({ error: 'ano e mes obrigatórios' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .upsert({ salao_id: salaoId, profissional_id: params.id, ...body }, { onConflict: 'profissional_id,ano,mes' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
