import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'

// Lista só os departamentos (setores) do salão. Liberado para qualquer
// papel logado do salão — inclusive profissional (que precisa para solicitar),
// e NÃO expõe a lista de profissionais.
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, departamento_cor')
    .eq('salao_id', sess.salaoId)
    .eq('is_departamento', true)
    .order('nome_completo')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ departamentos: data || [] })
}
