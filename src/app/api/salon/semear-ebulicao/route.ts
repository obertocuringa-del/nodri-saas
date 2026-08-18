import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { PONTOS_EBULICAO_BASE } from '@/data/pontosEbulicaoBase'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// CARGA ÚNICA dos Pontos de Ebulição.
//
// O documento veio de um .docx da recepção e é grande demais para digitar na
// tela. Esta rota grava o conteúdo base de uma vez — e só em salão que ainda
// está com a página VAZIA, para nunca passar por cima do que alguém escreveu.
//
// Roda uma vez por salão e não faz mais nada depois disso.
// ─────────────────────────────────────────────────────────────────────────────

const SALOES: Record<string, string> = {
  rouge: 'b0902527-1199-4b4c-ba3b-eecb51bc61c6',
  modelo: '2b2c5cd6-99e6-46a0-b125-7a15d9c79b26',
}

export async function POST() {
  const sess = await getSessao()
  if (!sess || (sess.role !== 'salon' && sess.role !== 'master')) {
    return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  }

  const resultado: Record<string, string> = {}
  for (const [nome, salaoId] of Object.entries(SALOES)) {
    const { data: atual } = await supabaseAdmin
      .from('salao_config').select('valor')
      .eq('salao_id', salaoId).eq('chave', 'grid_pontos_ebulicao').maybeSingle()

    const jaTem = Array.isArray((atual?.valor as { blocos?: unknown[] })?.blocos)
      && ((atual!.valor as { blocos: unknown[] }).blocos.length > 0)
    if (jaTem) { resultado[nome] = 'já tinha conteúdo — não mexi'; continue }

    const { error } = await supabaseAdmin.from('salao_config').upsert({
      salao_id: salaoId,
      chave: 'grid_pontos_ebulicao',
      valor: PONTOS_EBULICAO_BASE,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'salao_id,chave' })
    resultado[nome] = error ? `erro: ${error.message}` : 'gravado'
  }

  const pontos = PONTOS_EBULICAO_BASE.blocos.reduce((t, b) => t + b.pontos.length, 0)
  return NextResponse.json({ ok: true, blocos: PONTOS_EBULICAO_BASE.blocos.length, pontos, resultado })
}
