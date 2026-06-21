import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

// GET: retorna o token atual (gera se não existir)
export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('saloes')
    .select('link_cadastro_token, nome')
    .eq('id', salaoId)
    .single()

  let token = data?.link_cadastro_token
  if (!token) {
    token = randomUUID()
    await supabaseAdmin
      .from('saloes')
      .update({ link_cadastro_token: token })
      .eq('id', salaoId)
  }

  return NextResponse.json({ token, salao_nome: data?.nome || '' })
}

// POST: regenera o token
export async function POST() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const token = randomUUID()
  await supabaseAdmin
    .from('saloes')
    .update({ link_cadastro_token: token })
    .eq('id', salaoId)

  return NextResponse.json({ token })
}
