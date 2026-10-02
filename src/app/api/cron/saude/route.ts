import { NextResponse } from 'next/server'
import { conferirTudo } from '@/lib/saudeSistema'
import { registrarServidor, consumirPedidos, anotarReinicio } from '@/lib/servidorCentral'
import { fecharSobrando } from '@/lib/abasDoRobo'
import { supabaseAdmin } from '@/lib/supabase'

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
    // ── Enxugar as abas do Chrome, sozinho ──────────────────────────────────
    //
    // Regra do salão: DUAS abas por Chrome, sempre -- a da extensão (0051) e a
    // da coleta. Se uma fecha ou desloga, reabre na mesma. Só que na prática
    // elas vazam: em 01/10/2026 o Chrome do Rouge chegou a vinte e três, comeu
    // 58% do único núcleo do servidor e as telas do NODRI passaram a abrir em
    // 3 a 5 segundos.
    //
    // Então o vigia, que já passa aqui de minuto em minuto, também fecha o que
    // está sobrando. Nunca encosta na aba da automação nem na coleta em
    // andamento (ver src/lib/abasDoRobo.ts), e nunca deixa o Chrome sem aba
    // nenhuma -- sem aba ele se encerra e o robô teria de reabrir tudo.
    await enxugarAbas().catch(() => {})

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


/** Fecha as abas sobrando de cada salão que roda no servidor. */
async function enxugarAbas() {
  const { data: cfgs } = await supabaseAdmin.from('salao_config')
    .select('salao_id, chave, valor').in('chave', ['crm_robo_avec', 'crm_automacao_feedback'])
  const porSalao = new Map<string, any>()
  for (const c of cfgs || []) {
    const atual = porSalao.get(c.salao_id) || {}
    atual[c.chave] = c.valor
    porSalao.set(c.salao_id, atual)
  }
  for (const [salaoId, v] of porSalao) {
    if (!(v.crm_robo_avec as any)?.no_servidor) continue
    const { data: emCurso } = await supabaseAdmin.from('robo_coletas')
      .select('salao_id').eq('salao_id', salaoId).eq('situacao', 'rodando').limit(1)
    await fecharSobrando(
      salaoId,
      String((v.crm_automacao_feedback as any)?.url_relatorio || ''),
      !!(emCurso && emCurso.length),
    ).catch(() => {})
  }
}
