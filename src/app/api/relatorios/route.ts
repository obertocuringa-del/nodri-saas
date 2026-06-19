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

// GET — carrega todos os períodos do salão
export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: periodos, error: e1 } = await supabaseAdmin
    .from('relatorio_periodos').select('*').eq('salao_id', salaoId).order('ano').order('mes')
  const { data: feedbacks, error: e2 } = await supabaseAdmin
    .from('relatorio_feedbacks').select('*').eq('salao_id', salaoId).order('data_feedback')
  const { data: metricasProf } = await supabaseAdmin
    .from('prof_metricas_mensais').select('profissional_id, ano, mes, faturamento').eq('salao_id', salaoId)

  if (e1 || e2) return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })

  // Montar estrutura DadosBase
  const base: any = {
    resumo_mensal: [],
    faturamento_diario: [],
    servicos: [],
    produtos: [],
    prof_pagamentos: [],
    metas: [],
    feedbacks: [],
    periodos: [],
    metricas_prof: [] as Array<{ profissional_id: string; ano: number; mes: number; faturamento: number }>,
  }

  for (const p of (periodos || [])) {
    base.resumo_mensal.push(...(p.resumo_mensal || []).map((r: any) => ({ ...r, ano: p.ano, mes: p.mes })))
    base.faturamento_diario.push(...(p.faturamento_diario || []).map((r: any) => ({ ...r, ano: p.ano, mes: p.mes })))
    base.servicos.push(...(p.servicos || []).map((r: any) => ({ ...r, ano: p.ano, mes: p.mes })))
    base.produtos.push(...(p.produtos || []).map((r: any) => ({ ...r, ano: p.ano, mes: p.mes })))
    base.prof_pagamentos.push(...(p.prof_pagamentos || []).map((r: any) => ({ ...r, ano: p.ano, mes: p.mes })))
    base.metas.push(...(p.metas || []).map((r: any) => ({ ...r, ano: p.ano, mes: p.mes })))
    base.periodos.push({ ano: p.ano, mes: p.mes, data_inicio: p.data_inicio, data_fim: p.data_fim })
  }

  base.metricas_prof = (metricasProf || []).map((r: any) => ({
    profissional_id: r.profissional_id,
    ano: Number(r.ano),
    mes: Number(r.mes),
    faturamento: Number(r.faturamento || 0),
  }))

  base.feedbacks = (feedbacks || []).map((f: any) => ({
    ano: f.ano, mes: f.mes,
    profissional: f.profissional,
    tipo: f.tipo,
    oque_houve: f.oque_houve,
    comentario: f.comentario,
    data: f.data_feedback,
  }))

  return NextResponse.json(base)
}
