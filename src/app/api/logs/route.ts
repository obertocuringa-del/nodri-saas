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
  // FIX: clamp do limit — aceita apenas entre 1 e 500 (evita NaN e dumps gigantes)
  const rawLimit = parseInt(searchParams.get('limit') || '50')
  const limit = isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 500)

  const { data, error } = await supabaseAdmin
    .from('logs')
    .select('*, usuario:usuarios(nome, email), salao:saloes(nome)')
    .order('criado_em', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
