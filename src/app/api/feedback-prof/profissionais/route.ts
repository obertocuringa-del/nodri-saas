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
  const { data } = await supabaseAdmin.from('feedback_prof_profissionais').select('*').eq('salao_id', p.salaoId).order('nome')
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { nome } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('feedback_prof_profissionais').insert({ salao_id: p.salaoId, nome: nome.trim().toUpperCase() }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id, nome, ativo } = await req.json()
  const updates: Record<string, unknown> = {}
  if (nome !== undefined) updates.nome = nome.trim().toUpperCase()
  if (ativo !== undefined) updates.ativo = ativo
  const { data, error } = await supabaseAdmin.from('feedback_prof_profissionais').update(updates).eq('id', id).eq('salao_id', p.salaoId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await req.json()
  await supabaseAdmin.from('feedback_prof_profissionais').delete().eq('id', id).eq('salao_id', p.salaoId)
  return NextResponse.json({ ok: true })
}
