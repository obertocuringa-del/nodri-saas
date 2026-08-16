import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Limpeza das compras abandonadas ─────────────────────────────────────────
//
// `compras` guarda a INTENÇÃO de assinar: os dados que a pessoa preencheu
// antes de ir para o checkout do Asaas. Quem conclui vira salão; quem desiste
// no meio deixa a linha lá para sempre.
//
// Isso não quebra nada, mas suja de um jeito que atrapalha depois: a tabela
// vira o lugar onde ninguém confia no número, e você perde a única medida
// honesta de quantas pessoas chegaram no checkout e não compraram.
//
// A linha antiga é APAGADA, não marcada. Ela não tem valor histórico — os
// dados que importam (nome, e-mail, plano) só existem de verdade quando
// viraram salão.
//
// 7 dias é folgado de propósito: a cobrança do Asaas fica aberta por alguns
// dias, e alguém pode pagar no terceiro. Apagar antes disso jogaria fora o
// cadastro de quem pagou atrasado, e o webhook não teria como criar o salão.
const DIAS = 7

export async function GET() {
  const limite = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('compras')
    .delete()
    .eq('status', 'aguardando')
    .lt('criado_em', limite)
    .select('id')

  if (error) {
    // Uma limpeza que falha não é urgência: o pior caso é a tabela crescer
    // mais um dia. Reportar sem alarme.
    return NextResponse.json({ ok: false, erro: error.message }, { status: 200 })
  }

  return NextResponse.json({ ok: true, apagadas: data?.length || 0, dias: DIAS })
}
