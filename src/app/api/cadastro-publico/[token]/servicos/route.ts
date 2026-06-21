import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('id')
    .eq('link_cadastro_token', params.token)
    .maybeSingle()

  if (!salao) return NextResponse.json([], { status: 200 })

  const { data } = await supabaseAdmin
    .from('servicos')
    .select('id, nome, categoria, comissao_valor')
    .eq('salao_id', salao.id)
    .eq('ativo', true)
    .order('nome')

  return NextResponse.json(data || [])
}
