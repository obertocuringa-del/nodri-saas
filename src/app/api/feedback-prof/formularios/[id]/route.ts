import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

async function auth(id: string) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !['salon','sub'].includes(payload.role) || !payload.salaoId) return null
  const { data } = await supabaseAdmin.from('feedback_prof_formularios').select('*').eq('id', id).eq('salao_id', payload.salaoId).single()
  if (!data) return null
  return { payload, form: data }
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const r = await auth(params.id)
  if (!r) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  return NextResponse.json(r.form)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const r = await auth(params.id)
  if (!r) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.titulo !== undefined) updates.titulo = body.titulo
  if (body.ativo !== undefined) updates.ativo = body.ativo
  const { data, error } = await supabaseAdmin.from('feedback_prof_formularios').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const r = await auth(params.id)
  if (!r) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  await supabaseAdmin.from('feedback_prof_formularios').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
