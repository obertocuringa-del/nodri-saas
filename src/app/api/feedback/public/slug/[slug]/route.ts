import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: { slug: string } }) {
  const { data: form, error } = await supabaseAdmin
    .from('feedback_formularios')
    .select('id, token, titulo, descricao, cor_primaria, ativo, salao_id, saloes(nome)')
    .eq('slug', params.slug)
    .single()

  if (error || !form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })
  if (!form.ativo) return NextResponse.json({ error: 'Este formulário não está mais ativo' }, { status: 410 })

  const { data: perguntas } = await supabaseAdmin
    .from('feedback_perguntas')
    .select('id, titulo, tipo, opcoes, obrigatoria, ordem')
    .eq('formulario_id', form.id)
    .order('ordem')

  const salao = form.saloes as unknown as { nome: string } | null

  return NextResponse.json({
    id: form.id,
    token: form.token,
    titulo: form.titulo,
    descricao: form.descricao,
    cor_primaria: form.cor_primaria,
    salao_nome: salao?.nome || '',
    perguntas: perguntas || [],
  })
}
