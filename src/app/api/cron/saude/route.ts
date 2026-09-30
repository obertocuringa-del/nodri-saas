import { NextResponse } from 'next/server'
import { conferirTudo } from '@/lib/saudeSistema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// O vigia do servidor (scripts/vigia-servidor.sh) chama a cada 5 minutos,
// com o Bearer CRON_SECRET. A resposta tem uma linha "REINICIAR: robo ponte"
// que o script lê sem precisar de jq.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  try {
    const r = await conferirTudo()
    return new NextResponse(
      `REINICIAR: ${r.reiniciar.join(' ')}\n` + r.detalhes.map(d => `${d.salao_id}: ${d.problemas.join('; ')}`).join('\n') + '\n',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    )
  } catch (e: any) {
    return new NextResponse(`REINICIAR: \nERRO: ${String(e?.message || e)}\n`, { status: 500 })
  }
}
