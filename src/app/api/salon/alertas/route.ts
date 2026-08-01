import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'

// ── Alertas que fazem botão piscar no menu ──────────────────────────────────
// Um endpoint só pra todas as telas lerem o MESMO número — se cada menu
// calculasse do seu jeito, um piscaria e o outro não.
//
// kitsPendentes  → kits solicitados pelas profissionais que ninguém separou
//                  (olha o mês atual E o anterior: pedido do fim do mês não
//                  pode sumir do alerta na virada)
// solicitacoes   → pedidos abertos que vieram do portal da profissional

const mesRef = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export async function GET() {
  const sess = await getSessao()
  if (!sess || sess.role === 'profissional') return NextResponse.json({ kitsPendentes: 0, solicitacoes: 0 })

  const hoje = new Date()
  const meses = [mesRef(hoje), mesRef(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1))]

  let kitsPendentes = 0
  try {
    const { data } = await supabaseAdmin
      .from('salao_config').select('chave, valor')
      .eq('salao_id', sess.salaoId)
      .in('chave', meses.map(m => `kits_solicitacoes_${m}`))
    for (const row of (data || []) as any[]) {
      const lista = Array.isArray(row?.valor) ? row.valor : []
      kitsPendentes += lista.filter((s: any) => s?.status === 'pendente').length
    }
  } catch { /* sem kits configurados ainda */ }

  let solicitacoes = 0
  try {
    const { count } = await supabaseAdmin
      .from('pendencias_profissionais')
      .select('id', { count: 'exact', head: true })
      .eq('salao_id', sess.salaoId)
      .eq('resolvido', false)
      .eq('origem', 'solicitacao')
    solicitacoes = count || 0
  } catch { /* tabela pode não ter a coluna origem em bases antigas */ }

  return NextResponse.json({ kitsPendentes, solicitacoes })
}
