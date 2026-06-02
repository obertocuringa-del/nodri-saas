import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getPayload() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) return null
  return payload
}

export async function GET() {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('feedback_prof_regras_custom')
    .select('*')
    .eq('salao_id', p.salaoId)
    .order('created_at', { ascending: true })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  if (!body.nome?.trim() || !body.ocorrencia?.trim())
    return NextResponse.json({ error: 'Nome e ocorrência são obrigatórios' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('feedback_prof_regras_custom')
    .insert({
      salao_id: p.salaoId,
      nome: body.nome.trim(),
      ocorrencia: body.ocorrencia.trim().toUpperCase(),
      quantidade: Number(body.quantidade) || 3,
      periodo: body.periodo === 'mes' ? 'mes' : 'semana',
      dias_bloqueio: Number(body.dias_bloqueio) || 7,
      profissional_nome: body.profissional_nome?.trim() || null,
      ativo: true,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.nome !== undefined) updates.nome = body.nome.trim()
  if (body.ocorrencia !== undefined) updates.ocorrencia = body.ocorrencia.trim().toUpperCase()
  if (body.quantidade !== undefined) updates.quantidade = Number(body.quantidade)
  if (body.periodo !== undefined) updates.periodo = body.periodo
  if (body.dias_bloqueio !== undefined) updates.dias_bloqueio = Number(body.dias_bloqueio)
  if (body.ativo !== undefined) updates.ativo = body.ativo
  if (body.profissional_nome !== undefined) updates.profissional_nome = body.profissional_nome || null
  const { data, error } = await supabaseAdmin
    .from('feedback_prof_regras_custom')
    .update(updates)
    .eq('id', body.id)
    .eq('salao_id', p.salaoId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await req.json()
  await supabaseAdmin.from('feedback_prof_regras_custom').delete().eq('id', id).eq('salao_id', p.salaoId)
  return NextResponse.json({ ok: true })
}
