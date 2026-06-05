import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (payload?.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const salaoId = req.nextUrl.searchParams.get('salao_id')
  if (!salaoId) {
    return NextResponse.json({ error: 'salao_id é obrigatório' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('ia_conversas')
    .select('id, profissional_id, mensagens, criado_em, atualizado_em')
    .eq('salao_id', salaoId)
    .order('atualizado_em', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversas: data || [] })
}

export async function DELETE(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (payload?.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { conversa_id } = body

  if (!conversa_id) {
    return NextResponse.json({ error: 'conversa_id é obrigatório' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('ia_conversas')
    .delete()
    .eq('id', conversa_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
