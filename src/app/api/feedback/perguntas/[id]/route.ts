import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

async function authorize(perguntaId: string) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) return null

  // Verifica que a pergunta pertence a um formulário do salão
  const { data } = await supabaseAdmin
    .from('feedback_perguntas')
    .select('id, feedback_formularios!inner(salao_id)')
    .eq('id', perguntaId)
    .single()

  if (!data) return null
  const form = data.feedback_formularios as unknown as { salao_id: string }
  if (form.salao_id !== payload.salaoId) return null
  return payload
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const payload = await authorize(params.id)
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.titulo !== undefined) updates.titulo = body.titulo
  if (body.tipo !== undefined) updates.tipo = body.tipo
  if (body.opcoes !== undefined) updates.opcoes = body.opcoes
  if (body.obrigatoria !== undefined) updates.obrigatoria = body.obrigatoria
  if (body.ordem !== undefined) updates.ordem = body.ordem
  // Critério de liberação do convite do Google. null é valor legítimo: é
  // assim que o salão tira a pergunta da regra sem apagar a pergunta.
  if (body.criterio !== undefined) updates.criterio = body.criterio

  const { data, error } = await supabaseAdmin
    .from('feedback_perguntas')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const payload = await authorize(params.id)
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('feedback_perguntas')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
