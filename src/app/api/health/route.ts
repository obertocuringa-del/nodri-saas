import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ── Sinal de vida do sistema ─────────────────────────────────────────────────
//
// Serve para um monitor de fora (UptimeRobot, BetterStack, Pingdom) vigiar o
// NODRI de minuto em minuto e avisar quando cair.
//
// Por que a vigia tem que ser DE FORA: um monitor hospedado aqui dentro cai
// junto com o site e nunca manda o aviso. É o vigia que dorme no mesmo quarto
// do ladrão. Por isso aqui existe só a porta que ele bate — o alarme é dele.
//
// E por que não basta o monitor pedir a home: a home responde 200 mesmo com o
// banco fora do ar (a página abre, e só depois é que nada carrega). Este
// endereço vai até o banco antes de responder. Se o Supabase cair, ele devolve
// 503 e o monitor toca — em vez de o salão descobrir na hora de lançar caixa.
//
// Não diz NADA sobre o negócio: nem quantos salões existem, nem nomes, nem
// versão de biblioteca. É endereço público; só responde se está de pé.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const comecou = Date.now()

  try {
    // Consulta mais barata possível: conta as linhas sem trazer nenhuma.
    const { error } = await supabaseAdmin
      .from('saloes')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) throw error

    return NextResponse.json(
      { ok: true, banco: 'ok', ms: Date.now() - comecou },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    // Sem detalhe do erro de propósito: mensagem de banco em endereço público
    // entrega estrutura de tabela para quem estiver procurando.
    return NextResponse.json(
      { ok: false, banco: 'fora', ms: Date.now() - comecou },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
