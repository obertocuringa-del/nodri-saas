import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const CHAVE = 'materiais_trabalho'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || !payload.salaoId) return null
  return payload.salaoId
}

export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('salao_config')
    .select('valor')
    .eq('salao_id', salaoId)
    .eq('chave', CHAVE)
    .maybeSingle()
  return NextResponse.json(data?.valor ?? null)
}

export async function PUT(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  const { error } = await supabaseAdmin
    .from('salao_config')
    .upsert({ salao_id: salaoId, chave: CHAVE, valor: body, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
