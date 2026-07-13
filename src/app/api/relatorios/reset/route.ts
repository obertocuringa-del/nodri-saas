import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

export async function DELETE() {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const token = cookies().get('nodri_token')?.value
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const payload = await verifyJWT(token)
  const salaoId = payload?.salaoId
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const results: Record<string, number> = {}
  const erros: Record<string, string> = {}

  // NÃO inclui relatorio_feedbacks / feedback_respostas / feedback_prof_respostas:
  // os feedbacks de cliente e profissional são preservados no reset (decisão do gestor).
  // clientes_perfil e clientes_resumo_mensal = cache dos "Mais Relatórios" (Em Risco, Perdidos, VIP, etc.)
  const tabelas = [
    'relatorio_periodos',
    'atendimentos_raw',
    'agendamentos_raw',
    'clientes_perfil',
    'clientes_resumo_mensal',
  ] as const

  // Resiliente: se uma tabela falhar (não existe, RLS, etc.), registra o erro
  // e CONTINUA limpando as demais — não aborta o reset inteiro.
  for (const tabela of tabelas) {
    const { error, count } = await supabaseAdmin
      .from(tabela)
      .delete({ count: 'exact' })
      .eq('salao_id', salaoId)
    if (error) erros[tabela] = error.message
    else results[tabela] = count ?? 0
  }

  return NextResponse.json({
    ok: true,
    deletados: results,
    erros: Object.keys(erros).length ? erros : undefined,
  })
}
