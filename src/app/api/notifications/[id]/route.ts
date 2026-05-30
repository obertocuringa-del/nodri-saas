import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { mensagem } = await req.json()
  if (!mensagem?.trim()) return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('notificacoes')
    .update({ mensagem })
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

  const { error } = await supabaseAdmin
    .from('notificacoes')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
