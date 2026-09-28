import { NextResponse } from 'next/server'
import { rodarDisparos } from '@/lib/crmDisparos'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Relógio do Envio automático: o cron do servidor (/etc/cron.d/nodri) chama
// a cada minuto. Cada salão com envio ligado manda no máximo UMA mensagem por
// volta, e só quando chegou a hora dela. Ver src/lib/crmDisparos.ts.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  return NextResponse.json(await rodarDisparos())
}
