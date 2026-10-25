import { NextResponse } from 'next/server'
import { rotinaDiariaCurriculos } from '@/lib/crmCurriculos'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Rotina diária dos currículos (00:50, antes da limpeza geral do CRM às 01:30):
// guarda os arquivos de candidatos fora do alcance dos 30 dias e, nos salões
// em que o dono LIGOU a exclusão automática, apaga o que passou do prazo dele.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const resumo = await rotinaDiariaCurriculos()
  return NextResponse.json({ ok: true, saloes_com_movimento: resumo.length, resumo })
}
