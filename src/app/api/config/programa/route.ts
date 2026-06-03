import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const CHAVE = 'programa_download'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('configuracoes')
    .select('valor')
    .eq('chave', CHAVE)
    .single()
  return NextResponse.json(data?.valor || { link: '', link_atualizacao: '', atualizacao_ativa: false })
}

export async function PUT(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { error } = await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: CHAVE, valor: body }, { onConflict: 'chave' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
