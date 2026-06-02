import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { data: form } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id, salao_id, ativo')
    .eq('token', params.token)
    .single()

  if (!form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })
  if (!form.ativo) return NextResponse.json({ error: 'Formulário inativo' }, { status: 410 })

  const body = await req.json()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null

  const { error } = await supabaseAdmin.from('feedback_prof_respostas').insert({
    formulario_id: form.id,
    salao_id: form.salao_id,
    profissional_id: body.profissional_id || null,
    profissional_nome: body.profissional_nome,
    tipo: body.tipo,
    ocorrido_id: body.ocorrido_id || null,
    ocorrido_descricao: body.ocorrido_descricao,
    descricao: body.descricao || null,
    ip,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
