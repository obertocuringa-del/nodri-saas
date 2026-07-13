import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub, salaoIdSeVer } from '@/lib/apiAuth'

async function getPayloadAndForm(id: string) {
  // Leitura liberada p/ dono e sub com permissão; escritas ficam barradas
  // depois por escritaBloqueadaSub() em cada PUT/DELETE.
  const salaoId = await salaoIdSeVer('feedback_cliente')
  if (!salaoId) return { error: 'Não autorizado', status: 401 }

  const { data: form } = await supabaseAdmin
    .from('feedback_formularios')
    .select('*')
    .eq('id', id)
    .eq('salao_id', salaoId)
    .single()

  if (!form) return { error: 'Formulário não encontrado', status: 404 }
  return { payload: { salaoId }, form }
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const result = await getPayloadAndForm(params.id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const { data: perguntas } = await supabaseAdmin
    .from('feedback_perguntas')
    .select('*')
    .eq('formulario_id', params.id)
    .order('ordem')

  return NextResponse.json({ ...result.form, perguntas: perguntas || [] })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const result = await getPayloadAndForm(params.id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const body = await req.json()
  const updates: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
  if (body.titulo !== undefined) updates.titulo = body.titulo
  if (body.descricao !== undefined) updates.descricao = body.descricao
  if (body.ativo !== undefined) updates.ativo = body.ativo
  if (body.cor_primaria !== undefined) updates.cor_primaria = body.cor_primaria

  const { data, error } = await supabaseAdmin
    .from('feedback_formularios')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const result = await getPayloadAndForm(params.id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const { error } = await supabaseAdmin
    .from('feedback_formularios')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
