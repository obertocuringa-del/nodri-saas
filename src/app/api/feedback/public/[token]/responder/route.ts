import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { data: form } = await supabaseAdmin
    .from('feedback_formularios')
    .select('id, salao_id, ativo')
    .eq('token', params.token)
    .single()

  if (!form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })
  if (!form.ativo) return NextResponse.json({ error: 'Formulário inativo' }, { status: 410 })

  const body = await req.json()
  const dados = body.dados || {}

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || null

  const { error } = await supabaseAdmin.from('feedback_respostas').insert({
    formulario_id: form.id,
    salao_id: form.salao_id,
    dados,
    ip,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
