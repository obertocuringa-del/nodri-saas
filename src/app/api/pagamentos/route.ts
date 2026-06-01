import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const salaoId = searchParams.get('salao_id')
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('pagamentos')
    .select('*, salao:saloes(nome, email), plano:planos(nome)')
    .order('criado_em', { ascending: false })
    .limit(100)

  if (salaoId) query = query.eq('salao_id', salaoId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('pagamentos')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id, ...updates } = await req.json()
  const { data, error } = await supabaseAdmin
    .from('pagamentos')
    .update({ ...updates, data_pagamento: updates.status === 'pago' ? new Date().toISOString().split('T')[0] : undefined })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se marcado como pago, libera acesso do salão
  if (updates.status === 'pago' && data.salao_id) {
    const vencimento = new Date()
    vencimento.setMonth(vencimento.getMonth() + 1)
    await supabaseAdmin.from('saloes').update({
      status: 'ativo',
      licenca_vencimento: vencimento.toISOString().split('T')[0],
    }).eq('id', data.salao_id)
  }

  return NextResponse.json(data)
}
