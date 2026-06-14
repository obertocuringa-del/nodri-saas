import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const payload = await verifyJWT(token)
  const salaoId = payload?.salaoId
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const ano = Number(req.nextUrl.searchParams.get('ano') || 2026)
  const mes = Number(req.nextUrl.searchParams.get('mes') || 6)

  const { data, error } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('ano, mes, prof_ticket, prof_preferencia, prof_ocupacao, prof_servicos, prof_produtos, prof_pagamentos')
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
    .single()

  if (error) return NextResponse.json({ error: error.message })

  return NextResponse.json({
    periodo: `${ano}/${mes}`,
    prof_ticket_count: (data?.prof_ticket || []).length,
    prof_preferencia_count: (data?.prof_preferencia || []).length,
    prof_ocupacao_count: (data?.prof_ocupacao || []).length,
    prof_servicos_count: (data?.prof_servicos || []).length,
    prof_produtos_count: (data?.prof_produtos || []).length,
    prof_pagamentos_count: (data?.prof_pagamentos || []).length,
    prof_ticket_amostra: (data?.prof_ticket || []).slice(0, 3),
    prof_pagamentos_amostra: (data?.prof_pagamentos || []).slice(0, 3),
    colunas_existem: {
      prof_ticket: 'prof_ticket' in (data || {}),
      prof_preferencia: 'prof_preferencia' in (data || {}),
      prof_ocupacao: 'prof_ocupacao' in (data || {}),
      prof_servicos: 'prof_servicos' in (data || {}),
      prof_produtos: 'prof_produtos' in (data || {}),
    },
    prof_ticket_raw: data?.prof_ticket,
  })
}
