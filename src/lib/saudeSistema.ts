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
  // ── Nem todo problema se resolve religando ────────────────────────────────
  //
  // Os dois primeiros vigias cuidavam de programa parado, e para isso o
  // conserto é reiniciar. Os de 02/10/2026 são de outra natureza: a
  // confirmação do dia que não saiu se conserta liberando outra rodada (feito
  // aqui mesmo, ver crmCampanhas), não religando nada. Pedir ao script para
  // reiniciar um serviço que não existe só gasta um reinício do teto diário e
  // enche o registro de "não achou no pm2".
  //
  // Então: 'reiniciar' (o padrão, como sempre foi) ou 'avisar'.
  acao?: 'reiniciar' | 'avisar'
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

  // ── Mensagem parada na fila, com a ponte dizendo que está conectada ───────
  //
  // "Sem sinal" pega a ponte caída. Não pega a ponte VIVA que parou de
  // entregar -- e para o salão o resultado é o mesmo: a cliente não recebeu. A
  // fila é a única testemunha honesta disso.
  //
  // `criado_em` no futuro é o espaçamento entre mensagens (20 s no feedback e
  // na confirmação diária), então só conta o que já venceu há mais de 10
  // minutos. Dez é folgado: a ponte roda de minuto em minuto.
  //
  // Esta pede reinício, porque quem está parada é a ponte.
  if (sit === 'conectado') {
    const limite = new Date(agora - 10 * MIN).toISOString()
    const { count } = await supabaseAdmin
      .from('crm_mensagens').select('id', { count: 'exact', head: true })
      .eq('salao_id', salaoId).eq('situacao', 'na_fila').lt('criado_em', limite)
    if ((count || 0) > 0) {
      problemas.push({
        servico: 'ponte',
        motivo: `${count} mensagem(ns) parada(s) na fila há mais de 10 min, com a ponte conectada`,
        desde: limite,
      })
    }
  }

  // ── Mensagem que falhou: o vigia reenvia sozinho ─────────────────────────
  //
  // Ordem do dono (10/10/2026): "eu quero tudo automático, não quero ficar
  // nada pendente". O reenvio é o mesmo que a pessoa faria à mão -- a própria
  // linha volta para a fila, sem duplicar o balão.
  //
  // Isto NÃO fere o "o CRM nunca envia sozinho": a mensagem já tinha sido
  // autorizada por alguém e só não chegou. O vigia não escreve nada novo,
  // termina um envio que já havia começado.
  //
  // Quatro freios, e cada um tem uma história:
  //
  //  - SÓ COM A PONTE CONECTADA. Com o WhatsApp fora, reenviar é empilhar:
  //    quando ele volta, tudo sai junto. Foi o que quase aconteceu em
  //    03/10/2026, com 243 na fila.
  //  - SÓ DEPOIS DE 3 MINUTOS. Falha de um minuto atrás provavelmente tem a
  //    causa ainda de pé; tentar na hora só queima uma tentativa.
  //  - NO MÁXIMO 3 VEZES POR MENSAGEM. O que falha quatro vezes não é
  //    acidente de rede: é número errado, bloqueio ou conteúdo recusado.
  //    Insistir nisso é o caminho para o WhatsApp barrar o número, como em
  //    02/10/2026. Depois do terceiro, a mensagem FICA falhada e aparece na
  //    Central para alguém decidir -- que é o "se ele não fizer, eu faço o
  //    manual".
  //  - NO MÁXIMO 5 POR VOLTA. O vigia roda de minuto em minuto; cinco por vez
  //    repõe sem rajada.
  if (sit === 'conectado') {
    const MAX_POR_MENSAGEM = 3
    const MAX_POR_VOLTA = 5
    const { data: falhadas } = await supabaseAdmin
      .from('crm_mensagens')
      .select('id, reenvios, criado_em')
      .eq('salao_id', salaoId).eq('situacao', 'falhou').eq('direcao', 'saida')
      .lt('criado_em', new Date(agora - 3 * MIN).toISOString())
      .gte('criado_em', new Date(agora - 24 * 60 * MIN).toISOString())
      .order('criado_em', { ascending: true })
      .limit(50)

    const podem = (falhadas || []).filter((m: any) => (m.reenvios || 0) < MAX_POR_MENSAGEM)
    const desistidas = (falhadas || []).length - podem.length

    for (const m of podem.slice(0, MAX_POR_VOLTA)) {
      await supabaseAdmin.from('crm_mensagens').update({
        situacao: 'na_fila', erro: null, enviado_em: null,
        criado_em: new Date().toISOString(),
        reenvios: (m.reenvios || 0) + 1,
      }).eq('id', m.id).eq('situacao', 'falhou')   // só se ainda estiver falhada
    }

    if (podem.length) {
      problemas.push({
        servico: 'ponte',
        motivo: `${Math.min(podem.length, MAX_POR_VOLTA)} mensagem(ns) que falharam voltaram para a fila sozinhas`,
        desde: null, acao: 'avisar',
      })
    }
    if (desistidas) {
      problemas.push({
        servico: 'ponte',
        motivo: `${desistidas} mensagem(ns) falharam ${MAX_POR_MENSAGEM} vezes e pararam de ser reenviadas — precisam de alguém`,
        desde: null, acao: 'avisar',
      })
    }
  }

  // ── A confirmação do dia que não saiu ─────────────────────────────────────
  //
  // "A confirmação jamais pode falhar" é a ordem do dono, e ela podia falhar
  // calada: depois de cinco tentativas o horário era dado por perdido e nada
  // mais acontecia. Quem decide e conserta é conferirHorariosDoDia (libera UMA
  // segunda rodada); aqui só se registra o que ele achou, para aparecer na
  // tela. Por isso 'avisar': não há o que religar.
  try {
    const { carregarConfig } = await import('./crmAutomacao')
    const { conferirHorariosDoDia } = await import('./crmCampanhas')
    const fuso = (await carregarConfig(salaoId))?.fuso || 'America/Sao_Paulo'
    for (const a of await conferirHorariosDoDia(salaoId, fuso)) {
      problemas.push({ servico: 'robo', motivo: a.motivo, desde: null, acao: 'avisar' })
    }
  } catch { /* sem campanha configurada: não é problema */ }

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
      // Aviso não religa nada: aparece na tela e pronto. Sem isto ele gastaria
      // um dos 8 reinícios do dia e o script procuraria no pm2 um serviço que
      // não tem culpa nenhuma.
      if (p.acao === 'avisar') continue
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
