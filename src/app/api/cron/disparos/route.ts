import { NextResponse } from 'next/server'
import { rodarDisparos } from '@/lib/crmDisparos'
import { rodarResumoDono } from '@/lib/resumoDono'

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
  // O resumo do dono (Relatórios > Notificar donos) usa o mesmo relógio de
  // minuto em minuto; um não atrapalha o outro.
  const [disparos, resumo] = await Promise.all([
    rodarDisparos(),
    rodarResumoDono().catch((e: any) => ({ ok: false, erro: String(e?.message || e).slice(0, 200) })),
  ])
  return NextResponse.json({ ...disparos, resumo_dono: resumo })
}
