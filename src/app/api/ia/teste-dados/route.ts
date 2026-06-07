import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const nome = url.searchParams.get('nome') || 'Suelen'
  const mes = Number(url.searchParams.get('mes') || '1')
  const ano = Number(url.searchParams.get('ano') || '2026')

  const { data: profs } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, cargo, salao_id')
    .ilike('nome_completo', `%${nome}%`)
    .limit(1)

  if (!profs?.length) return NextResponse.json({ erro: `"${nome}" não encontrado` })
  const prof = profs[0]

  // Testa relatorio_periodos (fonte real da tela)
  const { data: periodo } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_pagamentos, prof_ticket, prof_preferencia, prof_ocupacao, prof_servicos, prof_produtos')
    .eq('salao_id', prof.salao_id)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  // Testa prof_metricas_mensais
  const { data: metricas } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('faturamento, ticket_medio, taxa_ocupacao, dias_trabalhados, clientes_preferencia, clientes_sem_preferencia, total_servicos, total_produtos')
    .eq('profissional_id', prof.id)
    .eq('ano', ano).eq('mes', mes)
    .maybeSingle()

  // Extrai dados do relatorio_periodos para esse profissional
  let dadosPeriodo: any = null
  if (periodo) {
    const nomeC = prof.nome_completo.toLowerCase()
    const ap = (prof.apelido || '').toLowerCase()
    const tokens = nomeC.split(/\s+/).slice(0, 2)
    const match = (item: any) => {
      const n = (item.profissional || '').toLowerCase()
      if (n === nomeC || (ap && n.includes(ap))) return true
      return tokens.filter((t: string) => n.includes(t)).length >= Math.min(tokens.length, 2)
    }
    let fat = 0, tick = 0, tickN = 0, pref = 0, semP = 0, dias = 0, ocup = 0, ocupN = 0, serv = 0, prod = 0
    for (const i of (periodo.prof_pagamentos||[])) if (match(i)) fat += Number(i.valor_a_pagar||0)+Number(i.desconto||0)
    for (const i of (periodo.prof_ticket||[])) if (match(i)) { tick += Number(i.ticket_medio||0); tickN++ }
    for (const i of (periodo.prof_preferencia||[])) if (match(i)) { pref += Number(i.clientes_preferencia||0); semP += Number(i.clientes_sem_preferencia||0) }
    for (const i of (periodo.prof_ocupacao||[])) if (match(i)) { dias += Number(i.dias_trabalhados||0); ocup += Number(i.taxa_ocupacao||0); ocupN++ }
    for (const i of (periodo.prof_servicos||[])) if (match(i)) serv += Number(i.quantidade||0)
    for (const i of (periodo.prof_produtos||[])) if (match(i)) prod += Number(i.quantidade||0)
    dadosPeriodo = { faturamento: fat, ticket_medio: tickN>0?tick/tickN:0, clientes_preferencia: pref, clientes_sem_preferencia: semP, dias_trabalhados: dias, taxa_ocupacao: ocupN>0?ocup/ocupN:0, total_servicos: serv, total_produtos: prod }
  }

  const esperado = { faturamento: 2657.52, ticket_medio: 69.45, taxa_ocupacao: 33.3, dias_trabalhados: 18, clientes_preferencia: 67, clientes_sem_preferencia: 25, total_servicos: 95, total_produtos: 0 }

  const verificar = (d: any) => d ? {
    faturamento: `${d.faturamento?.toFixed(2)} ${Math.abs(d.faturamento-esperado.faturamento)<1?'✅':'❌ esperado '+esperado.faturamento}`,
    ticket_medio: `${d.ticket_medio?.toFixed(2)} ${Math.abs(d.ticket_medio-esperado.ticket_medio)<1?'✅':'❌ esperado '+esperado.ticket_medio}`,
    taxa_ocupacao: `${Number(d.taxa_ocupacao)?.toFixed(1)} ${Math.abs(Number(d.taxa_ocupacao)-esperado.taxa_ocupacao)<1?'✅':'❌ esperado '+esperado.taxa_ocupacao}`,
    dias_trabalhados: `${d.dias_trabalhados} ${Number(d.dias_trabalhados)===esperado.dias_trabalhados?'✅':'❌ esperado '+esperado.dias_trabalhados}`,
    clientes_preferencia: `${d.clientes_preferencia} ${Number(d.clientes_preferencia)===esperado.clientes_preferencia?'✅':'❌ esperado '+esperado.clientes_preferencia}`,
    clientes_sem_preferencia: `${d.clientes_sem_preferencia} ${Number(d.clientes_sem_preferencia)===esperado.clientes_sem_preferencia?'✅':'❌ esperado '+esperado.clientes_sem_preferencia}`,
    total_servicos: `${d.total_servicos} ${Number(d.total_servicos)===esperado.total_servicos?'✅':'❌ esperado '+esperado.total_servicos}`,
    total_produtos: `${d.total_produtos} ${Number(d.total_produtos)===esperado.total_produtos?'✅':'❌ esperado '+esperado.total_produtos}`,
  } : 'SEM DADOS'

  return NextResponse.json({
    profissional: prof.nome_completo,
    periodo: `${mes}/${ano}`,
    relatorio_periodos: verificar(dadosPeriodo),
    prof_metricas_mensais: verificar(metricas),
  })
}
