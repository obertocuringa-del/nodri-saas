import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('id')
    .eq('link_cadastro_token', params.token)
    .maybeSingle()

  if (!salao) return NextResponse.json({ servicos: [], categorias: [] }, { status: 200 })

  const [{ data: servicos }, { data: profs }] = await Promise.all([
    supabaseAdmin
      .from('servicos')
      .select('id, nome, categoria, comissao_valor')
      .eq('salao_id', salao.id)
      .eq('ativo', true)
      .order('nome'),
    supabaseAdmin
      .from('profissionais')
      .select('cargo')
      .eq('salao_id', salao.id)
      .eq('ativo', true)
      .not('cargo', 'is', null),
  ])

  const categorias = Array.from(new Set((profs || []).map((p: any) => p.cargo).filter(Boolean))).sort()

  return NextResponse.json({ servicos: servicos || [], categorias })
}
