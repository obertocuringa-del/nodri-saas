import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'menu_links')
    .single()

  if (error || !data) {
    return NextResponse.json(null)
  }

  return NextResponse.json(data.valor)
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()

  const { error } = await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: 'menu_links', valor: body }, { onConflict: 'chave' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
