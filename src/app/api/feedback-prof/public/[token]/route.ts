import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const { data: form } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id, titulo, ativo, salao_id, saloes(nome)')
    .eq('token', params.token)
    .single()

  if (!form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })
  if (!form.ativo) return NextResponse.json({ error: 'Formulário inativo' }, { status: 410 })

  const salao = form.saloes as unknown as { nome: string } | null

  const [{ data: profissionais }, { data: ocorridos }] = await Promise.all([
    supabaseAdmin.from('feedback_prof_profissionais').select('id, nome').eq('salao_id', form.salao_id).eq('ativo', true).order('nome'),
    supabaseAdmin.from('feedback_prof_ocorridos').select('id, descricao').eq('salao_id', form.salao_id).eq('ativo', true).order('descricao'),
  ])

  return NextResponse.json({
    id: form.id,
    titulo: form.titulo,
    salao_nome: salao?.nome || '',
    profissionais: profissionais || [],
    ocorridos: ocorridos || [],
  })
}
