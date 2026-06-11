import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — retorna lista de profissionais do salão (só nome/id, sem dados sensíveis)
export async function GET(_: NextRequest, { params }: { params: { salaoId: string } }) {
  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('id, nome')
    .eq('id', params.salaoId)
    .single()

  if (!salao) return NextResponse.json({ error: 'Salão não encontrado' }, { status: 404 })

  const { data: profissionais } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, cargo')
    .eq('salao_id', params.salaoId)
    .eq('ativo', true)
    .order('nome_completo')

  return NextResponse.json({ salao_nome: salao.nome, profissionais: profissionais || [] })
}

// POST — profissional envia uma pendência para si mesmo
export async function POST(req: NextRequest, { params }: { params: { salaoId: string } }) {
  const body = await req.json()
  const { profissional_id, mensagem, data_limite } = body

  if (!profissional_id || !mensagem?.trim()) {
    return NextResponse.json({ error: 'Selecione o profissional e descreva a pendência' }, { status: 400 })
  }

  // Valida que o profissional pertence ao salão
  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('id')
    .eq('id', profissional_id)
    .eq('salao_id', params.salaoId)
    .single()

  if (!prof) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('pendencias_profissionais')
    .insert({
      salao_id: params.salaoId,
      profissional_id,
      mensagem: mensagem.trim(),
      data_limite: data_limite || null,
      resolvido: false,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true }, { status: 201 })
}
