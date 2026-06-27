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

// Grades editáveis genéricas (bebidas, alicates, produtos...). Namespace 'grid_'.
export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const chave = new URL(req.url).searchParams.get('chave') || ''
  if (!chave) return NextResponse.json(null)
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', `grid_${chave}`).maybeSingle()
  return NextResponse.json(data?.valor ?? null)
}

export async function PUT(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { chave, doc } = await req.json()
  if (!chave) return NextResponse.json({ error: 'Falta chave' }, { status: 400 })
  const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: `grid_${chave}`, valor: doc, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
