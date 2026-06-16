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

// Calcula todos os indicadores analíticos da meta de um profissional num mês —
// usado tanto pela aba Metas (exibição) quanto pelo gerador de estratégia (contrato p/ IA).
export async function calcularIndicadoresMeta(profissionalId: string, salaoId: string, ano: number, mes: number, metaFinal: number) {
  const { data: metricaMes } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('faturamento, ticket_medio, taxa_ocupacao')
    .eq('profissional_id', profissionalId)
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  const { data: historico } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('ano, mes, faturamento, ticket_medio, taxa_ocupacao')
    .eq('profissional_id', profissionalId)
    .eq('salao_id', salaoId)
    .order('ano').order('mes')

  const historicoValido = (historico || []).filter((r: any) => Number(r.faturamento) > 0)
  const maiorHistorico = historicoValido.reduce((max: number, r: any) => Math.max(max, Number(r.faturamento || 0)), 0)

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
    alcancabilidade,
  }
}
