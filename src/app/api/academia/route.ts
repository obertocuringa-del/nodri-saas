import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const categoria = searchParams.get('categoria')

    let query = supabaseAdmin
      .from('academia_artigos')
      .select('id, categoria, titulo, resumo, emoji, ordem, criado_em')
      .eq('ativo', true)
      .order('categoria')
      .order('ordem')

    if (categoria) query = query.eq('categoria', categoria)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ artigos: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('academia_artigos')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ artigo: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
