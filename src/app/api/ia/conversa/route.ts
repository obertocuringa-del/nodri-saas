import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET — busca a conversa mais recente de um profissional
export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const profissionalId = searchParams.get('profissional_id')
    if (!profissionalId) return NextResponse.json({ error: 'profissional_id obrigatório' }, { status: 400 })

    const { data } = await supabaseAdmin
      .from('ia_conversas')
      .select('id, mensagens, atualizado_em')
      .eq('salao_id', salaoId)
      .eq('profissional_id', profissionalId)
      .order('atualizado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) return NextResponse.json({ conversa: null })

    return NextResponse.json({ conversa: { id: data.id, mensagens: data.mensagens || [] } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — apaga todas as conversas de um profissional (nova conversa)
export async function DELETE(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const profissionalId = searchParams.get('profissional_id')
    if (!profissionalId) return NextResponse.json({ error: 'profissional_id obrigatório' }, { status: 400 })

    await supabaseAdmin
      .from('ia_conversas')
      .delete()
      .eq('salao_id', salaoId)
      .eq('profissional_id', profissionalId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
