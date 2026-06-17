import { supabaseAdmin } from '@/lib/supabase'

// Motor analítico: calcula chance de bater a meta a partir do ritmo atual projetado,
// ajustado pela tendência de crescimento dos últimos meses — tudo determinístico (sem IA).
function calcAlcancabilidade(p: {
  metaFinal: number
  maiorHistorico: number
  maiorHistoricoMes?: number | null
  maiorHistoricoAno?: number | null
  realizado: number
  diasTranscorridos: number
  totalDiasMes: number
  taxaMediaCrescimento: number | null
}) {
  const { metaFinal, maiorHistorico, realizado, diasTranscorridos, totalDiasMes, taxaMediaCrescimento } = p

  if (!maiorHistorico && diasTranscorridos === 0) {
    return { probabilidade: null as number | null, label: 'Histórico insuficiente para avaliar', cor: '#9ca3af', maior_historico: 0, maior_historico_mes: null, maior_historico_ano: null, projecao_ritmo_atual: 0 }
  }

  const ritmoAtualProjetado = diasTranscorridos > 0 ? (realizado / diasTranscorridos) * totalDiasMes : realizado
  const fatorTendencia = taxaMediaCrescimento != null ? Math.max(-0.3, Math.min(0.3, taxaMediaCrescimento)) : 0
  const ritmoComTendencia = ritmoAtualProjetado * (1 + fatorTendencia)

  const baseProjecao = metaFinal > 0 ? ritmoComTendencia / metaFinal : 1
  const probabilidade = baseProjecao >= 1
    ? Math.round(Math.min(97, 80 + (baseProjecao - 1) * 60))
    : Math.round(Math.max(5, 100 - (1 - baseProjecao) * 120))

  let label = '', cor = ''
  if (probabilidade >= 80) { label = '✅ Meta confortável'; cor = '#22c55e' }
  else if (probabilidade >= 60) { label = '✅ Meta desafiadora porém alcançável'; cor = '#00e5c8' }
  else if (probabilidade >= 35) { label = '⚠️ Meta ambiciosa'; cor = '#f59e0b' }
  else { label = '⚠️ Meta pouco realista'; cor = '#ef4444' }

  return { probabilidade, label, cor, maior_historico: maiorHistorico, maior_historico_mes: p.maiorHistoricoMes ?? null, maior_historico_ano: p.maiorHistoricoAno ?? null, projecao_ritmo_atual: Math.round(ritmoComTendencia * 100) / 100 }
}

// Identifica o principal fator limitando a meta, por regras simples (sem IA)
function identificarGargalo(p: {
  ocupacaoAtual: number; ocupacaoMediaHistorico: number
  ticketAtual: number; ticketMedioHistorico: number
  diasRestantes: number; faltam: number
  taxaMediaCrescimento: number | null
}) {
  const { ocupacaoAtual, ocupacaoMediaHistorico, ticketAtual, ticketMedioHistorico, diasRestantes, faltam, taxaMediaCrescimento } = p
  if (ocupacaoMediaHistorico > 0 && ocupacaoAtual < ocupacaoMediaHistorico - 5) return 'ocupação abaixo da média histórica'
  if (ticketMedioHistorico > 0 && ticketAtual < ticketMedioHistorico * 0.95) return 'ticket médio abaixo da média histórica'
  if (diasRestantes < 5 && faltam > 0) return 'pouco tempo restante no mês'
  if (taxaMediaCrescimento != null && taxaMediaCrescimento < -0.05) return 'tendência de queda no faturamento'
  return 'nenhum gargalo crítico identificado'
}

// Mesmo critério de match de nome usado em /api/profissionais/[id]/metricas — compara
// os 2 primeiros tokens do nome cadastrado contra o nome registrado no relatório importado.
// Preposições/conectivos comuns em nomes em português — não podem ser usados como
// token de comparação, senão "Daniel da Rocha" casa com qualquer nome que contenha
// "da" (inclusive consigo mesmo via startsWith), inflando o histórico com dados de outro profissional.
const STOPWORDS_NOME = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

function criarMatchProf(nomeCompleto: string, apelido: string) {
  const tokens = nomeCompleto.split(/\s+/).filter((t: string) => t && !STOPWORDS_NOME.has(t)).slice(0, 2)
  return (item: any): boolean => {
    const n = (item.profissional || item.profissional_original || '').toLowerCase().trim()
    if (!n) return false
    if (n === nomeCompleto) return true
    if (apelido && (n === apelido || n.includes(apelido) || apelido.includes(n))) return true
    const nTokens = n.split(/\s+/).filter((t: string) => t && !STOPWORDS_NOME.has(t))
    if (tokens.length === 0 || nTokens.length === 0) return false
    const matchCount = tokens.filter((t: string) => nTokens.some((nt: string) => nt.startsWith(t) || t.startsWith(nt))).length
    return matchCount >= Math.min(tokens.length, 2)
  }
}

// Calcula todos os indicadores analíticos da meta de um profissional num mês —
// usado tanto pela aba Metas (exibição) quanto pelo gerador de estratégia (contrato p/ IA).
// Fonte do faturamento real e do histórico: relatorio_periodos (mesma fonte usada em
// Relatórios > Redistribuição/Meta Prof.) — NÃO prof_metricas_mensais, que fica vazia
// para a maioria dos profissionais e fazia o "maior histórico" aparecer zerado.
export async function calcularIndicadoresMeta(profissionalId: string, salaoId: string, ano: number, mes: number, metaFinal: number) {
  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('nome_completo, apelido')
    .eq('id', profissionalId)
    .single()

  const nomeCompleto = (prof?.nome_completo || '').toLowerCase().trim()
  const apelido = (prof?.apelido || '').toLowerCase().trim()
  const matchProf = criarMatchProf(nomeCompleto, apelido)

  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_pagamentos, prof_ticket, prof_ocupacao')
    .eq('salao_id', salaoId)
    .order('ano').order('mes')

  const historico = (periodos || []).map((row: any) => {
    let faturamento = 0
    for (const item of (row.prof_pagamentos || [])) {
      if (matchProf(item)) faturamento += Number(item.valor_a_pagar || 0) + Number(item.desconto || 0)
    }
    let ticket = 0, ticketCount = 0
    for (const item of (row.prof_ticket || [])) {
      if (matchProf(item)) { ticket += Number(item.ticket_medio || 0); ticketCount++ }
    }
    let ocupSum = 0, ocupCount = 0
    for (const item of (row.prof_ocupacao || [])) {
      if (matchProf(item)) { ocupSum += Number(item.taxa_ocupacao || 0); ocupCount++ }
    }
    return {
      ano: row.ano, mes: row.mes, faturamento,
      ticket_medio: ticketCount > 0 ? ticket / ticketCount : 0,
      taxa_ocupacao: ocupCount > 0 ? ocupSum / ocupCount : 0,
    }
  })

  const metricaMes = historico.find((r) => r.ano === ano && r.mes === mes) || null

  const historicoValido = historico.filter((r) => Number(r.faturamento) > 0)
  const maiorRegistro = historicoValido.reduce((melhor: any, r) => (!melhor || Number(r.faturamento) > Number(melhor.faturamento) ? r : melhor), null as any)
  const maiorHistorico = Number(maiorRegistro?.faturamento || 0)

  const ultimosMeses = historicoValido.slice(-4)
  let taxaMediaCrescimento: number | null = null
  if (ultimosMeses.length >= 2) {
    const taxas: number[] = []
    for (let i = 1; i < ultimosMeses.length; i++) {
      const anterior = Number(ultimosMeses[i - 1].faturamento)
      const atual = Number(ultimosMeses[i].faturamento)
      if (anterior > 0) taxas.push((atual - anterior) / anterior)
    }
    if (taxas.length > 0) taxaMediaCrescimento = taxas.reduce((s, t) => s + t, 0) / taxas.length
  }

  const ticketMedioHistorico = ultimosMeses.length > 0
    ? ultimosMeses.reduce((s: number, r: any) => s + Number(r.ticket_medio || 0), 0) / ultimosMeses.length
    : 0
  const ocupacaoMediaHistorico = ultimosMeses.length > 0
    ? ultimosMeses.reduce((s: number, r: any) => s + Number(r.taxa_ocupacao || 0), 0) / ultimosMeses.length
    : 0

  const realizado = Number(metricaMes?.faturamento || 0)
  const ticketAtual = Number(metricaMes?.ticket_medio || 0)
  const ocupacaoAtual = Number(metricaMes?.taxa_ocupacao || 0)
  const faltam = Math.max(metaFinal - realizado, 0)

  const hoje = new Date()
  const ultimoDiaMes = new Date(ano, mes, 0).getDate()
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1
  const diasRestantes = ehMesAtual ? Math.max(ultimoDiaMes - hoje.getDate(), 0) : 0
  const diasTranscorridos = ehMesAtual ? Math.max(hoje.getDate() - 1, 1) : ultimoDiaMes
  const necessarioPorDia = diasRestantes > 0 ? faltam / diasRestantes : faltam

  const alcancabilidade = calcAlcancabilidade({
    metaFinal, maiorHistorico, maiorHistoricoMes: maiorRegistro?.mes ?? null, maiorHistoricoAno: maiorRegistro?.ano ?? null,
    realizado, diasTranscorridos, totalDiasMes: ultimoDiaMes, taxaMediaCrescimento,
  })

  const principal_gargalo = identificarGargalo({
    ocupacaoAtual, ocupacaoMediaHistorico, ticketAtual, ticketMedioHistorico, diasRestantes, faltam, taxaMediaCrescimento,
  })

  // "Efeito dominó": se o principal gargalo fosse resolvido (ocupação ou ticket voltando à
  // própria média histórica do profissional), qual seria a nova chance de bater a meta?
  // Reaproveita o mesmo motor de cálculo (calcAlcancabilidade) — não é um número inventado,
  // é a meta recalculada com o histórico real dele mesmo.
  let probabilidade_se_resolver_gargalo: number | null = null
  if (principal_gargalo.includes('ocupação') && ocupacaoAtual > 0 && ocupacaoMediaHistorico > ocupacaoAtual) {
    const fator = ocupacaoMediaHistorico / ocupacaoAtual
    const ajustada = calcAlcancabilidade({
      metaFinal, maiorHistorico, realizado: realizado * fator, diasTranscorridos, totalDiasMes: ultimoDiaMes, taxaMediaCrescimento,
    })
    probabilidade_se_resolver_gargalo = ajustada.probabilidade
  } else if (principal_gargalo.includes('ticket') && ticketAtual > 0 && ticketMedioHistorico > ticketAtual) {
    const fator = ticketMedioHistorico / ticketAtual
    const ajustada = calcAlcancabilidade({
      metaFinal, maiorHistorico, realizado: realizado * fator, diasTranscorridos, totalDiasMes: ultimoDiaMes, taxaMediaCrescimento,
    })
    probabilidade_se_resolver_gargalo = ajustada.probabilidade
  }

  return {
    realizado,
    faltam,
    dias_restantes: diasRestantes,
    necessario_por_dia: necessarioPorDia,
    ticket_atual: ticketAtual,
    ocupacao_atual: ocupacaoAtual,
    ticket_medio_historico: Math.round(ticketMedioHistorico * 100) / 100,
    ocupacao_media_historico: Math.round(ocupacaoMediaHistorico * 100) / 100,
    taxa_media_crescimento: taxaMediaCrescimento,
    principal_gargalo,
    probabilidade_se_resolver_gargalo,
    alcancabilidade,
    // dados brutos reaproveitados pelo Score NODRI/benchmarking — evita reconsultar o banco
    _historico: historico,
  }
}

// Identifica, com regras simples e dados reais (sem IA), o motivo provável por trás do
// principal gargalo — ex.: ocupação baixa causada por atrasos/faltas recentes.
export function identificarCausaRaiz(p: {
  ocupacaoAtual: number; ocupacaoMediaHistorico: number
  ticketAtual: number; ticketMedioHistorico: number
  atrasos: number; faltas: number
  pendenciasVencidas?: number
}): string {
  const { ocupacaoAtual, ocupacaoMediaHistorico, ticketAtual, ticketMedioHistorico, atrasos, faltas, pendenciasVencidas = 0 } = p
  const ocupacaoBaixa = ocupacaoMediaHistorico > 0 && ocupacaoAtual < ocupacaoMediaHistorico - 5
  if (pendenciasVencidas > 0 && ocupacaoBaixa) {
    return 'Há pendências do gestor com prazo vencido e ainda não resolvidas, o que está diretamente travando o desempenho — resolver isso é pré-requisito para qualquer outra ação'
  }
  if (ocupacaoBaixa && (atrasos + faltas) >= 5) {
    return 'A ocupação caiu porque os atrasos/faltas recentes reduziram a confiança da recepção em distribuir novos clientes para este profissional'
  }
  if (ocupacaoBaixa) {
    return 'A ocupação está abaixo da média histórica dele mesmo, sem relação direta com atrasos/faltas — provável queda de demanda ou divulgação'
  }
  if (ticketMedioHistorico > 0 && ticketAtual < ticketMedioHistorico * 0.95) {
    return 'O ticket médio caiu em relação ao histórico dele mesmo — sinal de menos venda de serviços/produtos de maior valor por atendimento'
  }
  return 'Não há gargalo estrutural claro nos dados — o foco deve ser manter o ritmo atual'
}

// ── Score NODRI, Benchmarking e Potencial Oculto ──────────────────────────
// Tudo aqui é determinístico, calculado a partir de dados reais do banco.
// Nenhum desses números é decidido pela IA — ela só recebe o resultado pronto.

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

function classificarScore(total: number): string {
  if (total >= 95) return '🏆 Elite'
  if (total >= 85) return '🔵 Alta Performance'
  if (total >= 70) return '🟢 Bom'
  if (total >= 50) return '🟡 Atenção'
  return '🔴 Crítico'
}

// Conta ocorrências de feedback (positivas/negativas) e sinaliza atrasos/faltas recorrentes
export async function buscarResumoComportamental(salaoId: string, nomeBase: string) {
  if (!nomeBase) return { positivos: 0, negativos: 0, atrasos: 0, faltas: 0, top_elogios: [] as string[], top_reclamacoes: [] as string[] }

  const { data: respostas } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('tipo, ocorrido_descricao, descricao, criado_em')
    .eq('salao_id', salaoId)
    .ilike('profissional_nome', `%${nomeBase}%`)
    .order('criado_em', { ascending: false })
    .limit(60)

  const lista = respostas || []
  const positivos = lista.filter((r: any) => (r.tipo || '').toLowerCase().includes('positiv'))
  const negativos = lista.filter((r: any) => (r.tipo || '').toLowerCase().includes('negativ'))
  const contemPalavra = (txt: string, palavras: string[]) => palavras.some(p => txt.toLowerCase().includes(p))
  const atrasos = negativos.filter((r: any) => contemPalavra(r.ocorrido_descricao || r.descricao || '', ['atraso', 'atrasou'])).length
  const faltas = negativos.filter((r: any) => contemPalavra(r.ocorrido_descricao || r.descricao || '', ['falta', 'faltou', 'ausência', 'ausencia'])).length

  const top = (arr: any[]) => Array.from(new Set(arr.map((r: any) => r.ocorrido_descricao || r.descricao).filter(Boolean))).slice(0, 5) as string[]

  return { positivos: positivos.length, negativos: negativos.length, atrasos, faltas, top_elogios: top(positivos), top_reclamacoes: top(negativos) }
}

// Clientes com/sem preferência no período (usado na dimensão Fidelização do Score NODRI)
export async function buscarFidelizacaoAtual(salaoId: string, profissionalId: string, ano: number, mes: number) {
  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('nome_completo, apelido')
    .eq('id', profissionalId)
    .single()
  if (!prof) return { clientesPreferencia: 0, clientesSemPreferencia: 0 }

  const matchProf = criarMatchProf((prof.nome_completo || '').toLowerCase().trim(), (prof.apelido || '').toLowerCase().trim())

  const { data: periodo } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('prof_preferencia')
    .eq('salao_id', salaoId)
    .eq('ano', ano).eq('mes', mes)
    .maybeSingle()

  let clientesPreferencia = 0, clientesSemPreferencia = 0
  for (const item of (periodo?.prof_preferencia || [])) {
    if (matchProf(item)) {
      clientesPreferencia += Number(item.clientes_preferencia || 0)
      clientesSemPreferencia += Number(item.clientes_sem_preferencia || 0)
    }
  }
  return { clientesPreferencia, clientesSemPreferencia }
}

// Analisa tendência de fidelização: compara dois meses consecutivos e histórico 12 meses.
// Mostra quantos clientes "sem preferência" do mês anterior viraram "preferência" no mês atual.
export async function buscarTendenciaFidelizacao(
  salaoId: string, profissionalId: string, ano: number, mes: number,
) {
  const { data: prof } = await supabaseAdmin
    .from('profissionais').select('nome_completo, apelido').eq('id', profissionalId).single()
  if (!prof) return null
  const matchProf = criarMatchProf((prof.nome_completo || '').toLowerCase().trim(), (prof.apelido || '').toLowerCase().trim())

  // Busca últimos 13 meses para ter mês anterior + 12 meses de histórico
  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_preferencia')
    .eq('salao_id', salaoId)
    .order('ano', { ascending: false }).order('mes', { ascending: false })
    .limit(13)

  const extrairMes = (p: any) => {
    let pref = 0, semPref = 0
    for (const item of (p?.prof_preferencia || [])) {
      if (matchProf(item)) {
        pref += Number(item.clientes_preferencia || 0)
        semPref += Number(item.clientes_sem_preferencia || 0)
      }
    }
    return { ano: p.ano, mes: p.mes, preferencia: pref, sem_preferencia: semPref }
  }

  const historico = (periodos || []).map(extrairMes).reverse() // ordem cronológica

  // Mês atual e anterior
  const mesAtual = historico.find(h => h.ano === ano && h.mes === mes)
  const idxAtual = historico.findIndex(h => h.ano === ano && h.mes === mes)
  const mesAnterior = idxAtual > 0 ? historico[idxAtual - 1] : null

  // Clientes novos fidelizados = crescimento de preferência entre os dois meses
  const novosFidelizados = mesAnterior && mesAtual
    ? Math.max(0, mesAtual.preferencia - mesAnterior.preferencia)
    : null

  // Taxa de conversão: dos sem-preferência do mês anterior, quantos viraram preferência
  const taxaConversao = mesAnterior && mesAnterior.sem_preferencia > 0 && novosFidelizados !== null
    ? Math.round((novosFidelizados / mesAnterior.sem_preferencia) * 100)
    : null

  return {
    mes_atual: mesAtual ? { preferencia: mesAtual.preferencia, sem_preferencia: mesAtual.sem_preferencia } : null,
    mes_anterior: mesAnterior ? { preferencia: mesAnterior.preferencia, sem_preferencia: mesAnterior.sem_preferencia } : null,
    novos_fidelizados: novosFidelizados,
    taxa_conversao_pct: taxaConversao,
    historico_12_meses: historico.slice(-12).map(h => ({
      periodo: `${String(h.mes).padStart(2,'0')}/${h.ano}`,
      preferencia: h.preferencia,
      sem_preferencia: h.sem_preferencia,
    })),
  }
}

// Pendências reais registradas pelo gestor para o profissional (ex.: treinamento pendente,
// ajuste de comportamento) — usado pra identificar causa raiz e alertas com mais precisão.
export async function buscarPendencias(salaoId: string, profissionalId: string) {
  const { data } = await supabaseAdmin
    .from('pendencias_profissionais')
    .select('mensagem, data_limite, resolvido, criado_em')
    .eq('salao_id', salaoId)
    .eq('profissional_id', profissionalId)
    .eq('resolvido', false)
    .order('criado_em', { ascending: false })
    .limit(10)

  const hoje = new Date()
  return (data || []).map((p: any) => {
    const venceu = p.data_limite ? new Date(p.data_limite) < hoje : false
    return { mensagem: p.mensagem, data_limite: p.data_limite, vencida: venceu }
  })
}

// Venda de produtos (mês atual vs. média histórica) — fonte: relatorio_periodos.prof_produtos,
// mesmo padrão de match por nome usado no resto do motor.
export async function buscarVendaProdutos(salaoId: string, profissionalId: string, ano: number, mes: number) {
  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('nome_completo, apelido')
    .eq('id', profissionalId)
    .single()
  if (!prof) return { quantidade_atual: 0, media_historica: 0 }

  const matchProf = criarMatchProf((prof.nome_completo || '').toLowerCase().trim(), (prof.apelido || '').toLowerCase().trim())

  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_produtos')
    .eq('salao_id', salaoId)
    .order('ano').order('mes')

  let quantidadeAtual = 0
  const historicoQtd: number[] = []
  for (const row of (periodos || [])) {
    let qtd = 0
    for (const item of (row.prof_produtos || [])) {
      if (matchProf(item)) qtd += Number(item.quantidade || 0)
    }
    if (row.ano === ano && row.mes === mes) quantidadeAtual = qtd
    if (qtd > 0) historicoQtd.push(qtd)
  }

  const mediaHistorica = historicoQtd.length > 0
    ? Math.round((historicoQtd.reduce((s, q) => s + q, 0) / historicoQtd.length) * 10) / 10
    : 0

  return { quantidade_atual: quantidadeAtual, media_historica: mediaHistorica }
}

// Calcula o Score NODRI (0-100) ponderando 6 dimensões, todas a partir de dados reais
export function calcularScoreNodri(p: {
  chanceDeBaterMetaPct: number | null
  ticketAtual: number; ticketMedioHistorico: number
  ocupacaoAtual: number
  clientesPreferencia: number; clientesSemPreferencia: number
  positivos: number; negativos: number
  atrasos: number; faltas: number
  taxaMediaCrescimento: number | null
}) {
  const financeiro = p.chanceDeBaterMetaPct ?? 50

  const ticketScore = p.ticketMedioHistorico > 0
    ? clamp(Math.round((p.ticketAtual / p.ticketMedioHistorico) * 100), 0, 100)
    : 50
  const ocupacaoScore = clamp(Math.round(p.ocupacaoAtual), 0, 100)
  const comercial = Math.round((ticketScore + ocupacaoScore) / 2)

  const totalClientes = p.clientesPreferencia + p.clientesSemPreferencia
  const fidelizacao = totalClientes > 0 ? clamp(Math.round((p.clientesPreferencia / totalClientes) * 100), 0, 100) : 50

  const totalFeedbacks = p.positivos + p.negativos
  const qualidade = totalFeedbacks > 0 ? clamp(Math.round((p.positivos / totalFeedbacks) * 100), 0, 100) : 60

  const comprometimento = clamp(100 - (p.atrasos * 10 + p.faltas * 15), 0, 100)

  const evolucao = clamp(Math.round(50 + (p.taxaMediaCrescimento ?? 0) * 100), 0, 100)

  const total = Math.round(
    financeiro * 0.25 + comercial * 0.20 + fidelizacao * 0.15 +
    qualidade * 0.15 + comprometimento * 0.15 + evolucao * 0.10
  )

  return {
    total,
    classificacao: classificarScore(total),
    componentes: { financeiro, comercial, fidelizacao, qualidade, comprometimento, evolucao },
  }
}

// Ranking do profissional frente aos colegas do mesmo cargo, no mesmo salão/período
export async function calcularBenchmarking(salaoId: string, cargo: string, profissionalId: string, ano: number, mes: number) {
  const { data: colegas } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido')
    .eq('salao_id', salaoId)
    .eq('cargo', cargo)
    .eq('ativo', true)

  if (!colegas || colegas.length < 2) return null // benchmarking não faz sentido sozinho

  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_pagamentos, prof_ticket, prof_ocupacao')
    .eq('salao_id', salaoId)
    .eq('ano', ano).eq('mes', mes)
    .maybeSingle()

  if (!periodos) return null

  const linhas = colegas.map((c: any) => {
    const nomeCompleto = (c.nome_completo || '').toLowerCase().trim()
    const apelido = (c.apelido || '').toLowerCase().trim()
    const matchProf = criarMatchProf(nomeCompleto, apelido)

    let faturamento = 0
    for (const item of (periodos.prof_pagamentos || [])) {
      if (matchProf(item)) faturamento += Number(item.valor_a_pagar || 0) + Number(item.desconto || 0)
    }
    let ticket = 0, ticketCount = 0
    for (const item of (periodos.prof_ticket || [])) {
      if (matchProf(item)) { ticket += Number(item.ticket_medio || 0); ticketCount++ }
    }
    let ocupSum = 0, ocupCount = 0
    for (const item of (periodos.prof_ocupacao || [])) {
      if (matchProf(item)) { ocupSum += Number(item.taxa_ocupacao || 0); ocupCount++ }
    }
    return {
      id: c.id,
      faturamento,
      ticket_medio: ticketCount > 0 ? ticket / ticketCount : 0,
      taxa_ocupacao: ocupCount > 0 ? ocupSum / ocupCount : 0,
    }
  })

  const posicao = (campo: 'faturamento' | 'ticket_medio' | 'taxa_ocupacao') => {
    const ordenado = [...linhas].sort((a, b) => b[campo] - a[campo])
    return ordenado.findIndex(l => l.id === profissionalId) + 1
  }

  return {
    total_profissionais_categoria: linhas.length,
    ranking_faturamento: posicao('faturamento'),
    ranking_ticket_medio: posicao('ticket_medio'),
    ranking_ocupacao: posicao('taxa_ocupacao'),
  }
}

// Identifica, com números reais, o serviço habilitado mais subutilizado de maior valor —
// e estima quanto ele poderia faturar a mais, dentro de um volume realista de execução
// (limitado pelos dias restantes do mês, nunca um número fora da capacidade de agenda).
export async function calcularPotencialOculto(
  salaoId: string, profissionalId: string, servicosHabilitados: string[],
  diasRestantes: number, faltam: number,
) {
  if (!Array.isArray(servicosHabilitados) || servicosHabilitados.length === 0) return null

  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('nome_completo, apelido')
    .eq('id', profissionalId)
    .single()
  if (!prof) return null

  const matchProf = criarMatchProf((prof.nome_completo || '').toLowerCase().trim(), (prof.apelido || '').toLowerCase().trim())

  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('prof_servicos')
    .eq('salao_id', salaoId)
    .order('ano', { ascending: false }).order('mes', { ascending: false })
    .limit(6)

  const contagem: Record<string, number> = {}
  let totalAtendimentos = 0
  for (const row of (periodos || [])) {
    for (const item of (row.prof_servicos || [])) {
      if (!matchProf(item)) continue
      const nome = item.servico || ''
      contagem[nome] = (contagem[nome] || 0) + Number(item.quantidade || 0)
      totalAtendimentos += Number(item.quantidade || 0)
    }
  }
  if (totalAtendimentos === 0) return null

  const { data: servicosCatalogo } = await supabaseAdmin
    .from('salao_servicos')
    .select('nome, preco_min, preco_fixo, comissao_valor')
    .in('id', servicosHabilitados)
    .eq('ativo', true)

  if (!servicosCatalogo || servicosCatalogo.length === 0) return null

  // Entre os serviços habilitados, acha o de maior COMISSÃO (não preço cheio) com menos de
  // 20% de participação no volume — a meta do profissional é alimentada por valor_a_pagar
  // (a comissão dele), então a projeção de receita extra precisa estar na mesma unidade,
  // senão fica irreal (ele não embolsa o preço cheio do serviço, só a comissão).
  const candidatos = servicosCatalogo
    .map((s: any) => {
      const preco = Number(s.preco_fixo || s.preco_min || 0)
      const comissao = Number(s.comissao_valor || 0)
      const qtd = contagem[s.nome] || 0
      const participacao = totalAtendimentos > 0 ? qtd / totalAtendimentos : 0
      return { nome: s.nome, preco, comissao, qtd, participacao }
    })
    // só considera serviços com comissão cadastrada — sem isso não há como estimar
    // de forma realista quanto o profissional efetivamente ganharia
    .filter(c => c.comissao > 0 && c.participacao < 0.2)
    .sort((a, b) => b.comissao - a.comissao)

  if (candidatos.length === 0) return null
  const escolhido = candidatos[0]
  const qtdMeta = Math.round(totalAtendimentos * 0.2)
  const qtdDesejada = Math.max(qtdMeta - escolhido.qtd, 0)
  if (qtdDesejada === 0) return null

  // Capa pela capacidade real de agenda nos dias restantes do mês — sem isso o cálculo
  // pode sugerir um volume absurdo (ex.: 124 atendimentos de um serviço de alto valor),
  // que nenhum profissional executa de fato. Estimamos no máximo 1 a cada 5 dias restantes.
  const capacidadeMaxima = Math.max(1, Math.ceil(Math.max(diasRestantes, 1) / 5))
  const qtdAdicional = Math.min(qtdDesejada, capacidadeMaxima)

  const estimativaReceita = Math.round(qtdAdicional * escolhido.comissao * 100) / 100

  return {
    servico: escolhido.nome,
    qtd_realizada_ultimos_meses: escolhido.qtd,
    participacao_atual_pct: Math.round(escolhido.participacao * 100),
    preco_medio: escolhido.preco,
    comissao_por_atendimento: escolhido.comissao,
    estimativa_atendimentos_adicionais: qtdAdicional,
    estimativa_receita_adicional: estimativaReceita,
    cobertura_pct_do_que_falta: faltam > 0 ? Math.round((estimativaReceita / faltam) * 100) : null,
  }
}

// Calcula combinações realistas de serviços para atingir o valor restante da meta.
// Usa comissão real de cada serviço + frequência histórica do próprio profissional.
// Gera até 4 cenários: focado no mais frequente, focado no de maior comissão, mix otimizado, e agressivo.
export async function calcularSimuladorMeta(
  salaoId: string, profissionalId: string, servicosHabilitados: string[],
  faltam: number, diasRestantes: number,
) {
  if (faltam <= 0 || !Array.isArray(servicosHabilitados) || servicosHabilitados.length === 0) return null

  const { data: prof } = await supabaseAdmin
    .from('profissionais').select('nome_completo, apelido').eq('id', profissionalId).single()
  if (!prof) return null
  const matchProf = criarMatchProf((prof.nome_completo || '').toLowerCase().trim(), (prof.apelido || '').toLowerCase().trim())

  const { data: servicosCatalogo } = await supabaseAdmin
    .from('salao_servicos').select('id, nome, comissao_valor').in('id', servicosHabilitados).eq('ativo', true)
  if (!servicosCatalogo || servicosCatalogo.length === 0) return null

  // Frequência histórica dos últimos 6 meses
  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos').select('prof_servicos')
    .eq('salao_id', salaoId).order('ano', { ascending: false }).order('mes', { ascending: false }).limit(6)

  const freqMap: Record<string, number> = {}
  for (const row of (periodos || [])) {
    for (const item of (row.prof_servicos || [])) {
      if (!matchProf(item)) continue
      const nome = item.servico || ''
      freqMap[nome] = (freqMap[nome] || 0) + Number(item.quantidade || 0)
    }
  }

  // Monta lista de serviços com comissão + frequência média mensal
  const servicos = servicosCatalogo
    .map((s: any) => ({
      nome: s.nome,
      comissao: Number(s.comissao_valor || 0),
      freq_media_mensal: Math.round((freqMap[s.nome] || 0) / 6),
    }))
    .filter(s => s.comissao > 0)
    .sort((a, b) => b.comissao - a.comissao)

  if (servicos.length === 0) return null

  // Monta cenário âncora: quantidade exata para cobrir faltam integralmente (sem cap artificial)
  const montarCenario = (ancora: typeof servicos[0], label: string) => {
    const qtdAncora = Math.ceil(faltam / ancora.comissao)
    const subtotalAncora = Math.round(qtdAncora * ancora.comissao * 100) / 100
    const linhas: { servico: string; comissao: number; quantidade: number; subtotal: number }[] = [
      { servico: ancora.nome, comissao: ancora.comissao, quantidade: qtdAncora, subtotal: subtotalAncora },
    ]
    const total = Math.round(linhas.reduce((s, l) => s + l.subtotal, 0) * 100) / 100
    return { label, linhas, total, bate_meta: total >= faltam }
  }

  const cenarios = []
  // Cenário 1: focado no mais frequente
  const maisFrequente = [...servicos].sort((a, b) => b.freq_media_mensal - a.freq_media_mensal)[0]
  cenarios.push(montarCenario(maisFrequente, 'Focado no serviço mais frequente'))
  // Cenário 2: focado na maior comissão (só se diferente do mais frequente)
  if (servicos[0].nome !== maisFrequente.nome) {
    cenarios.push(montarCenario(servicos[0], 'Focado no serviço de maior comissão'))
  }
  // Cenário 3: mix distribuído — quantidade igual por serviço, suficiente para cobrir faltam
  const top3 = servicos.slice(0, Math.min(3, servicos.length))
  if (top3.length >= 2) {
    const somaComissoes = top3.reduce((s, sv) => s + sv.comissao, 0)
    const qtdPorServico = Math.ceil(faltam / somaComissoes)
    const linhasMix = top3.map(sv => ({
      servico: sv.nome, comissao: sv.comissao,
      quantidade: qtdPorServico,
      subtotal: Math.round(qtdPorServico * sv.comissao * 100) / 100,
    }))
    const totalMix = Math.round(linhasMix.reduce((s, l) => s + l.subtotal, 0) * 100) / 100
    cenarios.push({ label: 'Mix distribuído (top 3 serviços)', linhas: linhasMix, total: totalMix, bate_meta: totalMix >= faltam })
  }

  return { faltam: Math.round(faltam * 100) / 100, cenarios }
}

// Calcula o impacto financeiro das perdas operacionais do mês:
// atrasos (serviço mais vendido perdido), faltas (média diária perdida),
// e produtos não vendidos (10% dos clientes atendidos × comissão média de produto).
export async function calcularDinheiroPerdido(
  salaoId: string, profissionalId: string,
  atrasos: number, faltas: number,
  mediaFaturamentoDiario: number,
) {
  const { data: prof } = await supabaseAdmin
    .from('profissionais').select('nome_completo, apelido, servicos_habilitados').eq('id', profissionalId).single()
  if (!prof) return null
  const matchProf = criarMatchProf((prof.nome_completo || '').toLowerCase().trim(), (prof.apelido || '').toLowerCase().trim())

  // Serviço mais vendido historicamente (últimos 6 meses)
  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos').select('prof_servicos, prof_produtos')
    .eq('salao_id', salaoId).order('ano', { ascending: false }).order('mes', { ascending: false }).limit(6)

  const freqServicos: Record<string, number> = {}
  let totalClientesAtendidos = 0
  for (const row of (periodos || [])) {
    for (const item of (row.prof_servicos || [])) {
      if (!matchProf(item)) continue
      const nome = item.servico || ''
      freqServicos[nome] = (freqServicos[nome] || 0) + Number(item.quantidade || 0)
      totalClientesAtendidos += Number(item.quantidade || 0)
    }
  }
  const nMeses = 6
  const clientesMesAtual = Math.round(totalClientesAtendidos / nMeses)

  const servicoMaisVendido = Object.entries(freqServicos).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  // Comissão do serviço mais vendido — se vier zerada, usa o serviço habilitado com maior comissão como fallback
  let comissaoServicoMaisVendido = 0
  let nomeServicoParaCalculo = servicoMaisVendido
  if (Array.isArray(prof.servicos_habilitados) && prof.servicos_habilitados.length > 0) {
    if (servicoMaisVendido) {
      const { data: cat } = await supabaseAdmin
        .from('salao_servicos').select('comissao_valor').eq('nome', servicoMaisVendido)
        .in('id', prof.servicos_habilitados).maybeSingle()
      comissaoServicoMaisVendido = Number(cat?.comissao_valor || 0)
    }
    if (comissaoServicoMaisVendido === 0) {
      // Fallback: pega o serviço habilitado com maior comissão cadastrada
      const { data: melhor } = await supabaseAdmin
        .from('salao_servicos').select('nome, comissao_valor')
        .in('id', prof.servicos_habilitados).gt('comissao_valor', 0)
        .order('comissao_valor', { ascending: false }).limit(1).maybeSingle()
      if (melhor) {
        comissaoServicoMaisVendido = Number(melhor.comissao_valor)
        nomeServicoParaCalculo = melhor.nome
      }
    }
  }

  // Comissão média de produto (histórico do próprio profissional)
  let comissaoMediaProduto = 0
  let produtosVendidos = 0
  for (const row of (periodos || [])) {
    for (const item of (row.prof_produtos || [])) {
      if (!matchProf(item)) continue
      comissaoMediaProduto += Number(item.comissao_produto || item.valor_produto || 0)
      produtosVendidos++
    }
  }
  // Fallback: R$5 quando sem histórico OU quando histórico existe mas comissão veio zerada
  const comissaoProduto = (produtosVendidos > 0 && comissaoMediaProduto > 0)
    ? comissaoMediaProduto / produtosVendidos
    : 5

  const perdaAtrasos = atrasos > 0 && comissaoServicoMaisVendido > 0
    ? Math.round(atrasos * comissaoServicoMaisVendido * 100) / 100
    : null
  const perdaFaltas = faltas > 0 && mediaFaturamentoDiario > 0
    ? Math.round(faltas * mediaFaturamentoDiario * 100) / 100
    : null
  const clientesSemProduto = Math.round(clientesMesAtual * 0.1)
  const perdaProdutos = clientesSemProduto > 0
    ? Math.round(clientesSemProduto * comissaoProduto * 100) / 100
    : null

  const totalPerdido = Math.round(((perdaAtrasos || 0) + (perdaFaltas || 0) + (perdaProdutos || 0)) * 100) / 100

  return {
    servico_mais_vendido: nomeServicoParaCalculo,
    comissao_servico_mais_vendido: comissaoServicoMaisVendido,
    atrasos,
    perda_atrasos: perdaAtrasos,
    faltas,
    perda_faltas: perdaFaltas,
    media_faturamento_diario: Math.round(mediaFaturamentoDiario * 100) / 100,
    clientes_atendidos_mes: clientesMesAtual,
    clientes_sem_produto_estimado: clientesSemProduto,
    comissao_media_produto: Math.round(comissaoProduto * 100) / 100,
    perda_produtos: perdaProdutos,
    total_perdido: totalPerdido,
  }
}

// Identifica serviços que o profissional realiza pouco mas que têm boa comissão
// e compara com a média dos colegas do mesmo cargo — mostra o potencial perdido em R$.
export async function calcularOportunidadesOcultas(
  salaoId: string, profissionalId: string, cargo: string,
  servicosHabilitados: string[], ano: number, mes: number,
) {
  if (!Array.isArray(servicosHabilitados) || servicosHabilitados.length === 0) return []

  const { data: prof } = await supabaseAdmin
    .from('profissionais').select('nome_completo, apelido').eq('id', profissionalId).single()
  if (!prof) return []
  const matchProf = criarMatchProf((prof.nome_completo || '').toLowerCase().trim(), (prof.apelido || '').toLowerCase().trim())

  // Colegas do mesmo cargo
  const { data: colegas } = await supabaseAdmin
    .from('profissionais').select('id, nome_completo, apelido')
    .eq('salao_id', salaoId).eq('cargo', cargo).eq('ativo', true).neq('id', profissionalId)

  const { data: servicosCatalogo } = await supabaseAdmin
    .from('salao_servicos').select('nome, comissao_valor').in('id', servicosHabilitados).eq('ativo', true)

  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos').select('prof_servicos')
    .eq('salao_id', salaoId).order('ano', { ascending: false }).order('mes', { ascending: false }).limit(6)

  // Frequência do próprio profissional por serviço — normalizado lowercase para cruzar com catálogo
  const freqProf: Record<string, number> = {}
  for (const row of (periodos || [])) {
    for (const item of (row.prof_servicos || [])) {
      if (!matchProf(item)) continue
      const nome = (item.servico || '').toLowerCase().trim()
      freqProf[nome] = (freqProf[nome] || 0) + Number(item.quantidade || 0)
    }
  }

  // Frequência média dos colegas por serviço — normalizado lowercase
  const freqColegas: Record<string, number[]> = {}
  for (const colega of (colegas || [])) {
    const matchColega = criarMatchProf((colega.nome_completo || '').toLowerCase().trim(), (colega.apelido || '').toLowerCase().trim())
    for (const row of (periodos || [])) {
      for (const item of (row.prof_servicos || [])) {
        if (!matchColega(item)) continue
        const nome = (item.servico || '').toLowerCase().trim()
        if (!freqColegas[nome]) freqColegas[nome] = []
        const idx = freqColegas[nome].length
        freqColegas[nome][idx] = (freqColegas[nome][idx] || 0) + Number(item.quantidade || 0)
      }
    }
  }

  // Serviços que ela TEM habilitados mas vende menos que colegas — lookup normalizado
  const oportunidades = (servicosCatalogo || [])
    .map((s: any) => {
      const comissao = Number(s.comissao_valor || 0)
      if (comissao <= 0) return null
      const chave = s.nome.toLowerCase().trim()
      const freqProfMensal = Math.round((freqProf[chave] || 0) / 6)
      const mediaColegasMensal = freqColegas[chave]?.length
        ? Math.round(freqColegas[chave].reduce((a: number, b: number) => a + b, 0) / freqColegas[chave].length / 6)
        : 0
      const gap = Math.max(0, mediaColegasMensal - freqProfMensal)
      if (gap === 0) return null
      return {
        servico: s.nome,
        comissao_por_atendimento: comissao,
        freq_propria_mensal: freqProfMensal,
        freq_media_colegas_mensal: mediaColegasMensal,
        gap_mensal: gap,
        potencial_perdido_mes: Math.round(gap * comissao * 100) / 100,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.potencial_perdido_mes - a.potencial_perdido_mes)
    .slice(0, 5)

  // Serviços top da categoria que ela NÃO tem habilitados — comparação case-insensitive
  const nomesHabilitados = new Set((servicosCatalogo || []).map((s: any) => s.nome.toLowerCase().trim()))
  const freqCategoria: Record<string, number> = {}
  for (const colega of (colegas || [])) {
    const matchColega = criarMatchProf((colega.nome_completo || '').toLowerCase().trim(), (colega.apelido || '').toLowerCase().trim())
    for (const row of (periodos || [])) {
      for (const item of (row.prof_servicos || [])) {
        if (!matchColega(item)) continue
        const nome = item.servico || ''
        if (!nomesHabilitados.has(nome.toLowerCase().trim())) {
          freqCategoria[nome] = (freqCategoria[nome] || 0) + Number(item.quantidade || 0)
        }
      }
    }
  }
  const servicosParaAprender = Object.entries(freqCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nome, total]) => ({
      servico: nome,
      freq_media_mensal_categoria: Math.round(total / Math.max(1, (colegas || []).length) / 6),
    }))

  return { oportunidades_habilitadas: oportunidades, servicos_para_aprender: servicosParaAprender }
}
