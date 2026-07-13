import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getSessao, sessaoModoCaixa } from '@/lib/apiAuth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()

    // Sub-usuário: comum não altera nada; Modo Caixa só pode RESOLVER (executar)
    const sess = await getSessao()
    if (sess?.role === 'sub' || sess?.role === 'profissional') {
      const soResolver = sessaoModoCaixa(sess) && body.resolvido === true && body.mensagem === undefined && body.data_limite === undefined
      if (!soResolver) return NextResponse.json({ error: 'Modo Caixa: você pode marcar como resolvida, mas não editar ou excluir pendências.' }, { status: 403 })
    }

    const updates: Record<string, any> = {}

    if (body.resolvido === true) {
      updates.resolvido = true
      updates.resolvido_em = new Date().toISOString()
    } else if (body.resolvido === false) {
      updates.resolvido = false
      updates.resolvido_em = null
    }
    if (body.mensagem !== undefined) updates.mensagem = body.mensagem
    if (body.data_limite !== undefined) updates.data_limite = body.data_limite

    const { data, error } = await supabaseAdmin
      .from('pendencias_profissionais')
      .update(updates)
      .eq('id', params.id)
      .eq('salao_id', salaoId)
      .select('id, profissional_id, mensagem, data_limite, resolvido, resolvido_em, criado_em')
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Excluir é só para o dono/usuários completos — sub e profissional nunca
    const sess = await getSessao()
    if (sess?.role === 'sub' || sess?.role === 'profissional') return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('pendencias_profissionais')
      .delete()
      .eq('id', params.id)
      .eq('salao_id', salaoId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
