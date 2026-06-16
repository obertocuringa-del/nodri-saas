import { supabaseAdmin } from '@/lib/supabase'

// Motor analítico: calcula chance de bater a meta a partir do ritmo atual projetado,
// ajustado pela tendência de crescimento dos últimos meses — tudo determinístico (sem IA).
function calcAlcancabilidade(p: {
  metaFinal: number
  maiorHistorico: number
  realizado: number
  diasTranscorridos: number
  totalDiasMes: number
  taxaMediaCrescimento: number | null
}) {
  const { metaFinal, maiorHistorico, realizado, diasTranscorridos, totalDiasMes, taxaMediaCrescimento } = p

  if (!maiorHistorico && diasTranscorridos === 0) {
    return { probabilidade: null as number | null, label: 'Histórico insuficiente para avaliar', cor: '#9ca3af', maior_historico: 0, projecao_ritmo_atual: 0 }
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

  return { probabilidade, label, cor, maior_historico: maiorHistorico, projecao_ritmo_atual: Math.round(ritmoComTendencia * 100) / 100 }
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
function criarMatchProf(nomeCompleto: string, apelido: string) {
  const tokens = nomeCompleto.split(/\s+/).filter(Boolean).slice(0, 2)
  return (item: any): boolean => {
    const n = (item.profissional || item.profissional_original || '').toLowerCase().trim()
    if (!n) return false
    if (n === nomeCompleto) return true
    if (apelido && (n === apelido || n.includes(apelido) || apelido.includes(n))) return true
    const nTokens = n.split(/\s+/).filter(Boolean)
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
  const maiorHistorico = historicoValido.reduce((max: number, r) => Math.max(max, Number(r.faturamento || 0)), 0)

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
    metaFinal, maiorHistorico, realizado, diasTranscorridos, totalDiasMes: ultimoDiaMes, taxaMediaCrescimento,
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
}): string {
  const { ocupacaoAtual, ocupacaoMediaHistorico, ticketAtual, ticketMedioHistorico, atrasos, faltas } = p
  const ocupacaoBaixa = ocupacaoMediaHistorico > 0 && ocupacaoAtual < ocupacaoMediaHistorico - 5
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
    .select('nome, preco_min, preco_fixo')
    .in('id', servicosHabilitados)
    .eq('ativo', true)

  if (!servicosCatalogo || servicosCatalogo.length === 0) return null

  // Entre os serviços habilitados, acha o de maior preço com menos de 20% de participação no volume
  const candidatos = servicosCatalogo
    .map((s: any) => {
      const preco = Number(s.preco_fixo || s.preco_min || 0)
      const qtd = contagem[s.nome] || 0
      const participacao = totalAtendimentos > 0 ? qtd / totalAtendimentos : 0
      return { nome: s.nome, preco, qtd, participacao }
    })
    .filter(c => c.preco > 0 && c.participacao < 0.2)
    .sort((a, b) => b.preco - a.preco)

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

  const estimativaReceita = Math.round(qtdAdicional * escolhido.preco * 100) / 100

  return {
    servico: escolhido.nome,
    qtd_realizada_ultimos_meses: escolhido.qtd,
    participacao_atual_pct: Math.round(escolhido.participacao * 100),
    preco_medio: escolhido.preco,
    estimativa_atendimentos_adicionais: qtdAdicional,
    estimativa_receita_adicional: estimativaReceita,
    cobertura_pct_do_que_falta: faltam > 0 ? Math.round((estimativaReceita / faltam) * 100) : null,
  }
}
