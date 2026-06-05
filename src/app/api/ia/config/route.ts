import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = await verifyJWT(token)
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data } = await supabaseAdmin
      .from('ia_configuracao')
      .select('contexto_adicional')
      .eq('salao_id', salaoId)
      .maybeSingle()

    return NextResponse.json({
      contexto_adicional: data?.contexto_adicional || '',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = await verifyJWT(token)
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { contexto_adicional } = body

    const { error } = await supabaseAdmin
      .from('ia_configuracao')
      .upsert({ salao_id: salaoId, contexto_adicional: contexto_adicional || '' }, { onConflict: 'salao_id' })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
