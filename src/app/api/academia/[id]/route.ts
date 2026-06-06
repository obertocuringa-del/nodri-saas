import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('academia_artigos')
      .select('*')
      .eq('id', params.id)
      .eq('ativo', true)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 })

    return NextResponse.json({ artigo: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
