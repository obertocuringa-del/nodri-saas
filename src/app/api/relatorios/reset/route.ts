import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const payload = await verifyJWT(token)
  const salaoId = payload?.salaoId
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const results: Record<string, number> = {}

  const tabelas = ['relatorio_periodos', 'atendimentos_raw', 'agendamentos_raw'] as const
  for (const tabela of tabelas) {
    const { error, count } = await supabaseAdmin
      .from(tabela)
      .delete({ count: 'exact' })
      .eq('salao_id', salaoId)
    if (error) return NextResponse.json({ error: `Erro em ${tabela}: ${error.message}` }, { status: 500 })
    results[tabela] = count ?? 0
  }

  return NextResponse.json({ ok: true, deletados: results })
}
