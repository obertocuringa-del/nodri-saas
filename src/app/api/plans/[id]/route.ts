import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('planos')
    .update({ nome: body.nome, slug: body.slug, preco: Number(body.preco), max_usuarios: Number(body.max_usuarios), descricao: body.descricao, ativo: body.ativo })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Verifica se há salões usando este plano
  const { data: saloes } = await supabaseAdmin.from('saloes').select('id').eq('plano_id', params.id).limit(1)
  if (saloes && saloes.length > 0) return NextResponse.json({ error: 'Não é possível excluir um plano que possui salões vinculados' }, { status: 400 })

  const { error } = await supabaseAdmin.from('planos').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
