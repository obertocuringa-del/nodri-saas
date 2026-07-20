import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSalaoPorTokenCurriculo, VAGAS, EXPERIENCIAS, ESTADOS_BR } from '@/lib/curriculos'

// GET público: valida o token e devolve nome do salão + opções do formulário
export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const achado = await getSalaoPorTokenCurriculo(params.token)
  if (!achado) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  const { data: salao } = await supabaseAdmin.from('saloes').select('nome').eq('id', achado.salaoId).maybeSingle()
  return NextResponse.json({
    salao_nome: salao?.nome || 'Salão',
    vagas: VAGAS,
    experiencias: EXPERIENCIAS,
    estados: ESTADOS_BR,
  })
}
