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
    // Sem profissional_id = conversa do GESTOR (a do painel do salao). Antes
    // isso era erro 400, e por isso a conversa do dono nunca voltava ao abrir
    // o chat: nao havia como pedir por ela.
    const profissionalId = searchParams.get('profissional_id')

    let q = supabaseAdmin
      .from('ia_conversas')
      .select('id, mensagens, atualizado_em')
      .eq('salao_id', salaoId)
    q = profissionalId ? q.eq('profissional_id', profissionalId) : q.is('profissional_id', null)

    const { data } = await q
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

    let d = supabaseAdmin
      .from('ia_conversas')
      .delete()
      .eq('salao_id', salaoId)
    d = profissionalId ? d.eq('profissional_id', profissionalId) : d.is('profissional_id', null)
    await d

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
