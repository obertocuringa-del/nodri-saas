import { supabaseAdmin } from '@/lib/supabase'
import {
  minutosUteis, chaveTelefone, proximaAcaoPadrao,
  HORAS_UTEIS_FOLLOW_UP,
} from '@/lib/crm'

// ════════════════════════════════════════════════════════════════════════════
// O RELÓGIO DO CRM
//
// A recepção esquece. Um sistema que só funciona quando alguém lembra de
// clicar não é automação, é mais um lugar para esquecer. Então tudo que dá
// para decidir por conta própria é decidido aqui, uma vez por minuto, pela
// ponte — que é o único pedaço do NODRI que fica ligado o tempo todo.
//
// O QUE ELE NUNCA FAZ: mandar mensagem. Nenhuma linha aqui escreve para
// cliente. Marca estado, devolve conversa para a fila, liga contato a
// cliente do sistema. Quem escreve é gente.
//
// Tudo é limitado por volta: a pior coisa que pode acontecer a um serviço
// que roda a cada minuto é uma volta que demora mais de um minuto.
// ════════════════════════════════════════════════════════════════════════════

const TETO_CONTATOS = 40        // contatos conferidos por volta
const HORAS_RECONFERIR = 12     // de quanto em quanto tempo reconfere um contato

/** '30/05/2025' e '2025-05-30' viram o mesmo número. */
function tsData(s: string): number {
  if (!s) return 0
  const t = String(s).trim()
  if (t.includes('/')) {
    const [d, m, y] = t.split('/')
    return new Date(`${y}-${m}-${d}T12:00:00`).getTime() || 0
  }
  return new Date(t).getTime() || 0
}

/**
 * As grafias em que o mesmo celular pode estar gravado no atendimentos_raw.
 * Lá veio da planilha do salão: às vezes com 55, às vezes sem, às vezes sem o
 * nono dígito. Procurar só uma forma é procurar errado.
 */
function grafias(telefone: string): string[] {
  const d = String(telefone || '').replace(/\D+/g, '')
  if (d.length < 10) return []
  const sem55 = d.startsWith('55') ? d.slice(2) : d
  const com55 = '55' + sem55
  const fora: string[] = [sem55, com55]
  // sem o nono dígito
  if (sem55.length === 11 && sem55[2] === '9') {
    const curto = sem55.slice(0, 2) + sem55.slice(3)
    fora.push(curto, '55' + curto)
  }
  // com o nono dígito
  if (sem55.length === 10) {
    const longo = sem55.slice(0, 2) + '9' + sem55.slice(2)
    fora.push(longo, '55' + longo)
  }
  return [...new Set(fora)]
}

export interface ResumoRelogio {
  pausas_vencidas: number
  viraram_follow_up: number
  agendaram_sozinho: number
  contatos_conferidos: number
  clientes_novas: number
  ligados_ao_sistema: number
}

export async function baterRelogio(salaoId: string): Promise<ResumoRelogio> {
  const agora = new Date()
  const agoraIso = agora.toISOString()
  const r: ResumoRelogio = {
    pausas_vencidas: 0, viraram_follow_up: 0, agendaram_sozinho: 0,
    contatos_conferidos: 0, clientes_novas: 0, ligados_ao_sistema: 0,
  }

  // ── 1. A pausa venceu ─────────────────────────────────────────────────────
  // "Pausar 7 dias" só vale se alguém for lembrado no sétimo dia. Senão é um
  // jeito educado de perder a cliente.
  const { data: pausadas } = await supabaseAdmin
    .from('crm_conversas').select('id, estado')
    .eq('salao_id', salaoId).eq('estado', 'pausada')
    .lte('prazo', agoraIso).limit(200)

  for (const c of pausadas || []) {
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'follow_up',
      proxima_acao: proximaAcaoPadrao('follow_up'),
      prazo: null,
      atualizado_em: agoraIso,
    }).eq('id', c.id)
    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: c.id, tipo: 'mudou_estado',
      de_estado: 'pausada', para_estado: 'follow_up',
      autor_nome: 'Relógio', detalhe: 'A pausa venceu',
    })
    r.pausas_vencidas++
  }

  // ── 2. Respondeu e a cliente sumiu ────────────────────────────────────────
  // O relógio conta expediente, não hora de parede: mensagem mandada sábado à
  // noite não vira cobrança de domingo de manhã.
  const { data: aguardando } = await supabaseAdmin
    .from('crm_conversas').select('id, ultima_em, ultima_de')
    .eq('salao_id', salaoId).eq('estado', 'aguardando')
    .not('ultima_em', 'is', null).limit(300)

  for (const c of aguardando || []) {
    if (c.ultima_de !== 'salao') continue
    // Conversa sem mensagem nenhuma nao vira follow-up: nao ha o que retomar.
    const { count } = await supabaseAdmin
      .from('crm_mensagens').select('id', { count: 'exact', head: true }).eq('conversa_id', c.id)
    if (!count) continue
    const uteis = minutosUteis(new Date(c.ultima_em), agora)
    if (uteis < HORAS_UTEIS_FOLLOW_UP * 60) continue
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'follow_up',
      proxima_acao: proximaAcaoPadrao('follow_up'),
      atualizado_em: agoraIso,
    }).eq('id', c.id)
    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: c.id, tipo: 'mudou_estado',
      de_estado: 'aguardando', para_estado: 'follow_up',
      autor_nome: 'Relógio', detalhe: 'A cliente não respondeu',
    })
    r.viraram_follow_up++
  }

  // ── 3. Quem é essa pessoa no sistema ──────────────────────────────────────
  //
  // O celular é a ponte entre a conversa e o histórico: `atendimentos_raw`
  // guarda o celular de quem foi atendido. Casando os dois, o CRM sabe sozinho
  // se quem está escrevendo já é cliente ou está chegando agora — e sabe
  // depois se aquela conversa virou atendimento de verdade.
  const limite = new Date(Date.now() - HORAS_RECONFERIR * 3600e3).toISOString()
  const { data: contatos } = await supabaseAdmin
    .from('crm_contatos').select('id, telefone, nome, cliente_nome, etiquetas, conferido_em')
    .eq('salao_id', salaoId)
    .or(`conferido_em.is.null,conferido_em.lt.${limite}`)
    .limit(TETO_CONTATOS)

  if (contatos?.length) {
    // Uma consulta só para o lote inteiro. Uma por contato seria uma varredura
    // da tabela de atendimentos por pessoa, e isso derruba a volta do minuto.
    const todas: string[] = []
    const porContato = new Map<string, string[]>()
    for (const ct of contatos) {
      const g = grafias(ct.telefone)
      porContato.set(ct.id, g)
      todas.push(...g)
    }

    const { data: atends } = await supabaseAdmin
      .from('atendimentos_raw')
      .select('celular, cliente, data_comanda')
      .eq('salao_id', salaoId)
      .in('celular', [...new Set(todas)])
      .limit(4000)

    // Agrupa por chave de telefone, que é o que ignora o nono dígito.
    const porChave = new Map<string, { nome: string; ultima: number }>()
    for (const a of atends || []) {
      const k = chaveTelefone(a.celular)
      if (!k) continue
      const quando = tsData(a.data_comanda)
      const atual = porChave.get(k)
      if (!atual || quando > atual.ultima) {
        porChave.set(k, { nome: a.cliente || atual?.nome || '', ultima: quando })
      }
    }

    for (const ct of contatos) {
      const k = chaveTelefone(ct.telefone)
      const achou = porChave.get(k)
      const etiquetas: string[] = Array.isArray(ct.etiquetas) ? [...ct.etiquetas] : []
      const patch: any = { conferido_em: agoraIso }

      if (achou?.nome) {
        // Já é cliente da casa. O nome do sistema é o que abre o painel da
        // direita com visitas, ticket e o que ela costuma fazer.
        if (!ct.cliente_nome) { patch.cliente_nome = achou.nome; r.ligados_ao_sistema++ }
        const i = etiquetas.indexOf('cliente nova')
        if (i >= 0) { etiquetas.splice(i, 1); patch.etiquetas = etiquetas }
      } else if (!ct.cliente_nome) {
        // Nunca foi atendida. É a pessoa que mais vale responder rápido, e é
        // a que mais se perde quando ninguém percebe que ela é nova.
        if (!etiquetas.includes('cliente nova')) {
          etiquetas.push('cliente nova')
          patch.etiquetas = etiquetas
          r.clientes_novas++
        }
      }

      await supabaseAdmin.from('crm_contatos').update(patch).eq('id', ct.id)
      r.contatos_conferidos++

      // ── 4. Virou atendimento? Então agendou ────────────────────────────────
      // Só conta atendimento POSTERIOR ao início da conversa: senão toda
      // cliente antiga nasceria marcada como agendada e a conversão viraria
      // um número bonito e falso.
      if (!achou) continue
      const { data: abertas } = await supabaseAdmin
        .from('crm_conversas').select('id, criado_em, estado')
        .eq('salao_id', salaoId).eq('contato_id', ct.id)
        .not('estado', 'in', '("agendado","sem_conversao")')
        .limit(5)

      for (const cv of abertas || []) {
        const inicio = new Date(cv.criado_em).getTime()
        if (!(achou.ultima > inicio)) continue
        await supabaseAdmin.from('crm_conversas').update({
          estado: 'agendado',
          proxima_acao: proximaAcaoPadrao('agendado'),
          aguardando_desde: null,
          fechada_em: agoraIso,
          atualizado_em: agoraIso,
        }).eq('id', cv.id)
        await supabaseAdmin.from('crm_eventos').insert({
          salao_id: salaoId, conversa_id: cv.id, tipo: 'fechou',
          de_estado: cv.estado, para_estado: 'agendado',
          autor_nome: 'Relógio', detalhe: 'Apareceu no atendimento do salão',
        })
        r.agendaram_sozinho++
      }
    }
  }

  return r
}
