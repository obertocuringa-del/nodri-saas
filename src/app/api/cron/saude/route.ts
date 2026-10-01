import { NextResponse } from 'next/server'
import { conferirTudo } from '@/lib/saudeSistema'
import { registrarServidor, consumirPedidos, anotarReinicio } from '@/lib/servidorCentral'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// O vigia do servidor (scripts/vigia-servidor.sh) chama a cada minuto, com o
// Bearer CRON_SECRET. POST traz o retrato do servidor (memória, disco, pm2).
// A resposta tem uma linha "REINICIAR: robo ponte ..." que o script lê sem
// precisar de jq: o que o vigia achou parado + o que o dono pediu no botão.
async function responder(req: Request, info: any) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  try {
    if (info) await registrarServidor(info).catch(() => {})
    const r = await conferirTudo()
    if (r.reiniciar.length) {
      await anotarReinicio(r.reiniciar.map(alvo => ({
        alvo, origem: 'vigia' as const,
        motivo: r.detalhes.flatMap(d => d.problemas).find((m: string) => m.includes(alvo === 'robo' ? 'robô' : 'ponte')) || 'parado',
      })))
    }
    const pedidos = await consumirPedidos()
    const todos = [...new Set([...r.reiniciar, ...pedidos])]
    return new NextResponse(
      `REINICIAR: ${todos.join(' ')}\n` + r.detalhes.map(d => `${d.salao_id}: ${d.problemas.join('; ')}`).join('\n') + '\n',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    )
  } catch (e: any) {
    return new NextResponse(`REINICIAR: \nERRO: ${String(e?.message || e)}\n`, { status: 500 })
  }
}

export async function GET(req: Request) { return responder(req, null) }
export async function POST(req: Request) {
  const info = await req.json().catch(() => null)
  return responder(req, info)
}
