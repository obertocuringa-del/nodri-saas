import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const CHAVE = 'programa_download'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('configuracoes')
    .select('valor')
    .eq('chave', CHAVE)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ link: '', link_atualizacao: '', atualizacao_ativa: false })
  }

  // valor pode ser objeto (jsonb) ou string (text) dependendo da coluna
  const valor = data.valor
  const config = typeof valor === 'string' ? JSON.parse(valor) : valor
  return NextResponse.json(config || { link: '', link_atualizacao: '', atualizacao_ativa: false })
}

export async function PUT(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()

    // Tenta update primeiro, depois insert
    const { error: updateError } = await supabaseAdmin
      .from('configuracoes')
      .update({ valor: body })
      .eq('chave', CHAVE)

    if (updateError) {
      const { error: insertError } = await supabaseAdmin
        .from('configuracoes')
        .insert({ chave: CHAVE, valor: body })
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}
