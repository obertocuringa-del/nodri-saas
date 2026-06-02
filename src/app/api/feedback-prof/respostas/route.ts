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

export async function GET(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const formulario_id = searchParams.get('formulario_id')
  const busca = searchParams.get('busca') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 50
  const offset = (page - 1) * limit

  if (!formulario_id) return NextResponse.json({ error: 'formulario_id obrigatório' }, { status: 400 })

  // verifica que o formulário pertence ao salão
  const { data: form } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id')
    .eq('id', formulario_id)
    .eq('salao_id', p.salaoId)
    .single()
  if (!form) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  let query = supabaseAdmin
    .from('feedback_prof_respostas')
    .select('*', { count: 'exact' })
    .eq('formulario_id', formulario_id)
    .order('criado_em', { ascending: false })
    .range(offset, offset + limit - 1)

  if (busca) query = query.ilike('profissional_nome', `%${busca}%`)

  const { data, count } = await query
  return NextResponse.json({ respostas: data || [], total: count || 0, page, limit })
}

export async function PUT(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, profissional_nome, tipo, ocorrido_descricao, descricao } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  // verifica que a resposta pertence ao salão
  const { data: existing } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('id')
    .eq('id', id)
    .eq('salao_id', p.salaoId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (profissional_nome !== undefined) updates.profissional_nome = profissional_nome.trim().toUpperCase()
  if (tipo !== undefined) updates.tipo = tipo
  if (ocorrido_descricao !== undefined) updates.ocorrido_descricao = ocorrido_descricao.trim().toUpperCase()
  if (descricao !== undefined) updates.descricao = descricao || null

  const { data, error } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await req.json()

  const { data: existing } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('id')
    .eq('id', id)
    .eq('salao_id', p.salaoId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  await supabaseAdmin.from('feedback_prof_respostas').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
