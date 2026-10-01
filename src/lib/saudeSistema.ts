import { supabaseAdmin } from './supabase'
import { CHAVE_ROBO, lerRobo } from './crmRoboAvec'

// ── O vigia: o que parou, e o que o servidor deve religar ────────────────────
//
// 30/09/2026: o servidor caiu às 10h48, voltou, e o robô do Avec voltou pela
// metade -- ligado, mas sem ler o Avec. Aviso ao profissional, confirmação e
// feedback ficaram parados o resto do dia e ninguém percebeu até a noite.
//
// A cada 5 minutos o servidor (scripts/vigia-servidor.sh, no cron) pergunta
// aqui o que está parado. Esta rota decide e ANOTA; quem religa é o script,
// porque só ele tem o pm2. Os limites moram aqui, para um robô que não volta
// não ser reiniciado em loop:
//   - no máximo 1 reinício a cada 20 minutos por serviço;
//   - no máximo 8 por dia -- depois disso, só o aviso na tela.
//
// Robô do Avec: só de 07:30 às 21:30 (fora disso o salão está fechado e o
// Avec pode estar em manutenção; reiniciar de madrugada não resolve nada).
// Ponte do WhatsApp: a qualquer hora -- cliente escreve de noite também.

export const CHAVE_SAUDE = 'nodri_saude'
const MIN = 60_000

export type Servico = 'robo' | 'ponte'

export interface Problema {
  servico: Servico
  motivo: string
  desde: string | null
}

export interface EstadoSaude {
  problemas: Problema[]
  reinicios: { servico: Servico; em: string; motivo: string }[]
  conferido_em: string
}

function horaSP(d = new Date()) {
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
  return p // "HH:MM"
}
const diaSP = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
const hhmm = (iso: string | null | undefined) => iso ? horaSP(new Date(iso)) : '?'

export async function lerSaude(salaoId: string): Promise<EstadoSaude | null> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_SAUDE).maybeSingle()
  return (data as any)?.valor || null
}

async function conferirSalao(salaoId: string, agora: number): Promise<Problema[]> {
  const problemas: Problema[] = []
  const [{ data: cfgs }, { data: canal }] = await Promise.all([
    supabaseAdmin.from('salao_config').select('chave, valor').eq('salao_id', salaoId)
      .in('chave', [CHAVE_ROBO, 'crm_automacao_feedback_estado', 'crm_campanhas_estado']),
    supabaseAdmin.from('crm_canais').select('situacao, visto_em').eq('salao_id', salaoId).maybeSingle(),
  ])
  const cfg = new Map((cfgs || []).map((c: any) => [c.chave, c.valor]))

  // ── Robô do Avec ──
  const robo = lerRobo(cfg.get(CHAVE_ROBO))
  const h = horaSP(new Date(agora))
  if (robo.no_servidor && h >= '07:30' && h <= '21:30') {
    const fb = cfg.get('crm_automacao_feedback_estado') || {}
    const camp = cfg.get('crm_campanhas_estado') || {}
    // A última vez que ele LEU o Avec (feedback ou qualquer campanha).
    const leituras = [fb?.ultimo?.em, ...Object.values(camp).map((e: any) => e?.ultimo?.em)]
      .filter(Boolean).map((x: any) => new Date(x).getTime()).filter(n => n > 0)
    const leu = leituras.length ? Math.max(...leituras) : 0
    const visto = fb?.visto_em ? new Date(fb.visto_em).getTime() : 0
    if (!visto || agora - visto > 10 * MIN) {
      problemas.push({ servico: 'robo', motivo: `robô do Avec sem sinal desde ${hhmm(fb?.visto_em)}`, desde: fb?.visto_em || null })
    } else if (!leu || agora - leu > 20 * MIN) {
      problemas.push({ servico: 'robo', motivo: `robô do Avec ligado, mas sem ler o Avec desde ${leu ? hhmm(new Date(leu).toISOString()) : '?'}`, desde: leu ? new Date(leu).toISOString() : null })
    }
  }

  // ── Ponte do WhatsApp ── (só se o salão usa: canal que já esteve conectado)
  //
  // Desconectado de propósito (o dono tirou o QR) não é falha da ponte. E
  // AGUARDANDO_QR também não: o salão está esperando alguém encostar o celular
  // na tela, e isso pode levar dias. 01/10/2026: o salão "Luan Leal" nunca
  // chegou a conectar e ficou parado em aguardando_qr -- o vigia leu como
  // ponte caída e religou a ponte a cada 20 minutos. A ponte é UMA só para
  // todos os salões, então cada religamento desses derrubava o WhatsApp do
  // Rouge, que estava funcionando, por causa de um salão que nem começou.
  //
  // A ponte só é cobrada de um canal que está CONECTADO. Nos estados de
  // passagem (conectando) ela ainda está trabalhando; nos de espera
  // (aguardando_qr, desconectado) quem falta é gente, não programa.
  const sit = String((canal as any)?.situacao || '')
  if (canal && (canal as any).visto_em && sit === 'conectado') {
    const visto = new Date((canal as any).visto_em).getTime()
    if (agora - visto > 5 * MIN) {
      problemas.push({ servico: 'ponte', motivo: `ponte do WhatsApp sem sinal desde ${hhmm((canal as any).visto_em)}`, desde: (canal as any).visto_em })
    }
  }
  return problemas
}

/**
 * Confere todos os salões e devolve o que o servidor deve religar agora.
 * Anota em cada salão o que achou (a tela do CRM mostra) e os reinícios.
 */
export async function conferirTudo(): Promise<{ reiniciar: Servico[]; detalhes: any[] }> {
  const agora = Date.now()
  // Salões que usam robô no servidor ou têm canal de WhatsApp.
  const [{ data: robos }, { data: canais }] = await Promise.all([
    supabaseAdmin.from('salao_config').select('salao_id').eq('chave', CHAVE_ROBO),
    supabaseAdmin.from('crm_canais').select('salao_id'),
  ])
  const saloes = [...new Set([...(robos || []), ...(canais || [])].map((r: any) => r.salao_id).filter(Boolean))]

  const reiniciar = new Set<Servico>()
  const detalhes: any[] = []
  for (const salaoId of saloes) {
    const problemas = await conferirSalao(salaoId, agora)
    const antes = await lerSaude(salaoId)
    const hoje = diaSP(new Date(agora))
    const reinicios = (antes?.reinicios || []).filter(r => diaSP(new Date(r.em)) === hoje)
    for (const p of problemas) {
      const doServico = reinicios.filter(r => r.servico === p.servico)
      const ultimo = doServico.length ? new Date(doServico[doServico.length - 1].em).getTime() : 0
      if (doServico.length < 8 && agora - ultimo >= 20 * MIN) {
        reiniciar.add(p.servico)
        reinicios.push({ servico: p.servico, em: new Date(agora).toISOString(), motivo: p.motivo })
      }
    }
    const estado: EstadoSaude = { problemas, reinicios: reinicios.slice(-30), conferido_em: new Date(agora).toISOString() }
    await supabaseAdmin.from('salao_config').upsert(
      { salao_id: salaoId, chave: CHAVE_SAUDE, valor: estado, atualizado_em: new Date(agora).toISOString() },
      { onConflict: 'salao_id,chave' },
    )
    if (problemas.length) detalhes.push({ salao_id: salaoId, problemas: problemas.map(p => p.motivo) })
  }
  return { reiniciar: [...reiniciar], detalhes }
}
