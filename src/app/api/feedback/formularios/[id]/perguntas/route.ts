import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('feedback_perguntas')
    .select('*')
    .eq('formulario_id', params.id)
    .order('ordem')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Verifica que o formulário pertence ao salão
  const { data: form } = await supabaseAdmin
    .from('feedback_formularios')
    .select('id')
    .eq('id', params.id)
    .eq('salao_id', payload.salaoId)
    .single()
  if (!form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })

  const body = await req.json()

  // Pega a maior ordem atual
  const { data: last } = await supabaseAdmin
    .from('feedback_perguntas')
    .select('ordem')
    .eq('formulario_id', params.id)
    .order('ordem', { ascending: false })
    .limit(1)
    .single()

  const ordem = (last?.ordem ?? -1) + 1

  const { data, error } = await supabaseAdmin
    .from('feedback_perguntas')
    .insert({
      formulario_id: params.id,
      titulo: body.titulo,
      tipo: body.tipo,
      opcoes: body.opcoes || [],
      obrigatoria: body.obrigatoria ?? true,
      ordem,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
