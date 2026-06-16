import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload?.salaoId || null
}

function calcAlcancabilidade(metaFinal: number, maiorHistorico: number) {
  if (!maiorHistorico) return { probabilidade: null, label: 'Histórico insuficiente para avaliar', cor: '#9ca3af', maior_historico: 0 }
  const ratio = metaFinal / maiorHistorico
  const probabilidade = ratio <= 1
    ? Math.round(Math.min(97, 80 + (1 - ratio) * 60))
    : Math.round(Math.max(5, 100 - (ratio - 1) * 120))
  let label = '', cor = ''
  if (probabilidade >= 80) { label = '✅ Meta confortável'; cor = '#22c55e' }
  else if (probabilidade >= 60) { label = '✅ Meta desafiadora porém alcançável'; cor = '#00e5c8' }
  else if (probabilidade >= 35) { label = '⚠️ Meta ambiciosa'; cor = '#f59e0b' }
  else { label = '⚠️ Meta pouco realista'; cor = '#ef4444' }
  return { probabilidade, label, cor, maior_historico: maiorHistorico }
}

// GET — meta do mês atual (ou ano/mes informado) + planejamento salvo
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const hoje = new Date()
  const ano = parseInt(searchParams.get('ano') || '') || hoje.getFullYear()
  const mes = parseInt(searchParams.get('mes') || '') || (hoje.getMonth() + 1)

  const { data: meta } = await supabaseAdmin
    .from('metas_profissionais')
    .select('*')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  const { data: plano } = await supabaseAdmin
    .from('planejamentos_metas')
    .select('*')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  const { data: metricaMes } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('faturamento')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  // Histórico completo do profissional, para calcular o maior faturamento já alcançado
  const { data: historico } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('faturamento')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)

  const maiorHistorico = (historico || []).reduce((max: number, r: any) => Math.max(max, Number(r.faturamento || 0)), 0)

  const metaFinal = meta?.meta_manual ?? meta?.meta_redistribuida ?? 0
  const realizado = Number(metricaMes?.faturamento || 0)
  const faltam = Math.max(metaFinal - realizado, 0)

  const hoje2 = new Date()
  const ultimoDiaMes = new Date(ano, mes, 0).getDate()
  const diasRestantes = (ano === hoje2.getFullYear() && mes === hoje2.getMonth() + 1)
    ? Math.max(ultimoDiaMes - hoje2.getDate(), 0)
    : ultimoDiaMes
  const necessarioPorDia = diasRestantes > 0 ? faltam / diasRestantes : faltam

  return NextResponse.json({
    ano, mes,
    meta_redistribuida: meta?.meta_redistribuida || 0,
    meta_manual: meta?.meta_manual ?? null,
    meta_final: metaFinal,
    realizado,
    faltam,
    dias_restantes: diasRestantes,
    necessario_por_dia: necessarioPorDia,
    alcancabilidade: calcAlcancabilidade(metaFinal, maiorHistorico),
    plano: plano || null,
  })
}

// PUT — define/limpa a meta manual do profissional para o mês
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const hoje = new Date()
  const ano = parseInt(body.ano) || hoje.getFullYear()
  const mes = parseInt(body.mes) || (hoje.getMonth() + 1)
  const meta_manual = body.meta_manual === '' || body.meta_manual === null || body.meta_manual === undefined
    ? null
    : Number(body.meta_manual)

  const { data, error } = await supabaseAdmin
    .from('metas_profissionais')
    .upsert({
      salao_id: salaoId,
      profissional_id: params.id,
      ano, mes,
      meta_manual,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'profissional_id,ano,mes' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
