import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

const PADRAO = {
  atrasos_por_semana: 3,
  dias_bloqueio_atraso: 7,
  faltas_por_mes: 2,
  dias_bloqueio_falta: 15,
}

async function getPayload() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !['salon','sub'].includes(payload.role) || !payload.salaoId) return null
  return payload
}

export async function GET() {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('feedback_prof_regras')
    .select('*')
    .eq('salao_id', p.salaoId)
    .single()

  return NextResponse.json(data || { ...PADRAO, salao_id: p.salaoId, personalizada: false })
}

export async function PUT(req: NextRequest) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const regra = {
    salao_id: p.salaoId,
    atrasos_por_semana: Number(body.atrasos_por_semana) || PADRAO.atrasos_por_semana,
    dias_bloqueio_atraso: Number(body.dias_bloqueio_atraso) || PADRAO.dias_bloqueio_atraso,
    faltas_por_mes: Number(body.faltas_por_mes) || PADRAO.faltas_por_mes,
    dias_bloqueio_falta: Number(body.dias_bloqueio_falta) || PADRAO.dias_bloqueio_falta,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('feedback_prof_regras')
    .upsert(regra, { onConflict: 'salao_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE() {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await supabaseAdmin
    .from('feedback_prof_regras')
    .delete()
    .eq('salao_id', p.salaoId)

  return NextResponse.json(PADRAO)
}
