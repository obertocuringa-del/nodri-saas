import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || !payload.salaoId) return null
  return payload.salaoId
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .update({ ...body, atualizado_em: new Date().toISOString() })
    .eq('id', params.id)
    .eq('salao_id', salaoId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('profissionais')
    .delete()
    .eq('id', params.id)
    .eq('salao_id', salaoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
