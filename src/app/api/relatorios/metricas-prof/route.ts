import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({}, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get('ano') || '0')
  const mes = parseInt(searchParams.get('mes') || '0')
  const ids = searchParams.get('ids') || ''
  if (!ano || !mes || !ids) return NextResponse.json({})

  const profIds = ids.split(',').filter(Boolean)

  const { data } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('profissional_id, faturamento')
    .in('profissional_id', profIds)
    .eq('ano', ano)
    .eq('mes', mes)

  const result: Record<string, number> = {}
  for (const row of (data || [])) {
    if (row.profissional_id) result[row.profissional_id] = Number(row.faturamento || 0)
  }

  return NextResponse.json(result)
}
