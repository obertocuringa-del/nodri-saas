import { supabaseAdmin } from '@/lib/supabase'
import { chaveTelefone, normalizarTelefone, ETIQUETA_NAO_PERTURBE, ETIQUETA_ACEITA } from '@/lib/crm'
import { paginar } from '@/lib/paginar'

// ── Travas de segurança do envio automático ────────────────────────────────
//
// Escritas depois do bloqueio de 02/10/2026. A causa medida não foi volume:
// foi PARA QUEM. Das 52 da lista, 48 nunca tinham escrito ao salão. Somado a
// 732 mensagens no dia e 84% sem resposta, o WhatsApp leu o que o número
// parecia ser -- alguém com uma base comprada.
//
// Daí as quatro travas aqui. A ordem importa: a primeira sozinha já resolve
// quase tudo, porque muda a natureza do envio de abordagem para conversa.

// ── 1. Quem já conversou com o salão ───────────────────────────────────────

/**
 * Telefones que JÁ TROCARAM mensagem com o salão -- entrada e saída.
 *
 * Exigir os dois lados é de propósito. Só saída significa que o salão mandou
 * e a pessoa nunca respondeu, que é exatamente o perfil das 48. Com entrada,
 * existe relação: o WhatsApp vê conversa, não abordagem.
 *
 * Guardado por 5 minutos: a varredura é cara e a resposta muda devagar.
 */
const _comConversa = new Map<string, { em: number; chaves: Set<string> }>()

export async function chavesComConversa(salaoId: string): Promise<Set<string>> {
  const c = _comConversa.get(salaoId)
  if (c && Date.now() - c.em < 5 * 60_000) return c.chaves

  // Conversas que têm fala da cliente. Uma consulta por direção e o cruzamento
  // em memória sai bem mais barato do que perguntar conversa por conversa.
  const { dados: entradas } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_mensagens').select('conversa_id')
    .eq('salao_id', salaoId).eq('direcao', 'entrada').range(de, ate))
  const comFala = new Set((entradas || []).map((m: any) => m.conversa_id).filter(Boolean))
  if (!comFala.size) {
    const vazio = new Set<string>()
    _comConversa.set(salaoId, { em: Date.now(), chaves: vazio })
    return vazio
  }

  const { dados: convs } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_conversas').select('id, contato_id').eq('salao_id', salaoId).range(de, ate))
  const contatosComFala = new Set(
    (convs || []).filter((c: any) => comFala.has(c.id)).map((c: any) => c.contato_id).filter(Boolean),
  )

  const { dados: contatos } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_contatos').select('id, telefone').eq('salao_id', salaoId).range(de, ate))
  const chaves = new Set<string>()
  for (const ct of contatos || []) {
    if (!ct.telefone || !contatosComFala.has(ct.id)) continue
    const k = chaveTelefone(normalizarTelefone(ct.telefone))
    if (k) chaves.add(k)
  }

  _comConversa.set(salaoId, { em: Date.now(), chaves })
  return chaves
}

/**
 * Teto diário para quem NUNCA escreveu ao salão.
 *
 * Vale mesmo que o envio esteja configurado para 100 por dia: o limite da
 * tela governa o total, este governa a parte arriscada dele. Quinze é o
 * número que o dono escolheu, e é conservador de propósito -- foi justamente
 * esse público que derrubou o número.
 */
export const TETO_SEM_CONVERSA_DIA = 15

// ── 2. Pediu para sair ─────────────────────────────────────────────────────

/**
 * Variações de quem quer sair, incluindo erro de digitação.
 *
 * Tolerante por decisão: errar para o lado de tirar alguém da lista custa uma
 * cliente a menos recebendo promoção. Errar para o outro lado custa uma
 * denúncia -- e denúncia pesa muito mais que bloqueio na conta do WhatsApp.
 */
export const PEDIU_PARA_SAIR: RegExp[] = [
  // A palavra sozinha, com ou sem pontuação, maiúscula ou não.
  /^\s*(sair|sai|sae|sar|sari|siar|parar|pare|para|para de mandar|stop|cancelar|cancela|remover|remove|descadastrar|desinscrever)\s*[.!,;]*\s*$/i,
  /n[aã]o\s*quero\s*(mais\s*)?(receber|mensage|msg)/i,
  /n[aã]o\s*me\s*(mande|manda|envie|envia)\s*(mais)?/i,
  /(me\s*)?(tira|tire|tirar|remove|remova|remover|exclui|exclua)\s*(me\s*)?(da|dessa|desta|de sua|da sua)?\s*lista/i,
  /pare?\s*de\s*(me\s*)?(mandar|enviar)/i,
  /descadastr/i,
  /sair\s*da\s*lista/i,
]

export function pediuParaSair(texto: string): boolean {
  const t = String(texto || '').trim()
  if (!t || t.length > 120) return false      // texto longo é conversa, não comando
  return PEDIU_PARA_SAIR.some(r => r.test(t))
}

/**
 * Põe a cliente em "não perturbe", mantendo confirmação e feedback.
 *
 * Não bloqueia a cliente nem apaga o contato: ela continua recebendo o que
 * é serviço (o lembrete do horário dela, o pedido de opinião) e para de
 * receber o que é propaganda. Foi o desenho que o dono já tinha escolhido
 * para o "não perturbe" -- aqui só se chega nele sozinho, pela palavra.
 */
export async function porEmNaoPerturbe(salaoId: string, telefone: string): Promise<boolean> {
  const chave = chaveTelefone(normalizarTelefone(telefone))
  if (!chave) return false

  const { data: contatos } = await supabaseAdmin
    .from('crm_contatos').select('id, etiquetas, telefone')
    .eq('salao_id', salaoId).limit(5000)

  const alvo = (contatos || []).find((c: any) =>
    c.telefone && chaveTelefone(normalizarTelefone(c.telefone)) === chave)
  if (!alvo) return false

  const atuais: string[] = Array.isArray(alvo.etiquetas) ? alvo.etiquetas : []
  if (atuais.includes(ETIQUETA_NAO_PERTURBE)) return true   // já estava

  const novas = [...new Set([
    ...atuais,
    ETIQUETA_NAO_PERTURBE,
    ETIQUETA_ACEITA.confirmacao,
    ETIQUETA_ACEITA.feedback,
  ])]
  const { error } = await supabaseAdmin.from('crm_contatos')
    .update({ etiquetas: novas }).eq('id', alvo.id)
  return !error
}

// ── 3. Freio por taxa de resposta ──────────────────────────────────────────

/** Antes disto não há amostra: parar com 10 enviadas seria parar por acaso. */
const MINIMO_PARA_JULGAR = 50
/** Abaixo desta taxa, a lista está incomodando mais do que conversando. */
const TAXA_MINIMA = 0.15

export interface Termometro {
  enviadas: number
  responderam: number
  taxa: number
  /** Preenchido quando a lista deve parar. */
  travar: string | null
}

/**
 * Mede a conversa, não o envio.
 *
 * O bloqueio de 02/10 teve 84% sem resposta e ninguém estava olhando o placar
 * enquanto as 732 saíam. Este freio é esse olho: passadas as primeiras 50, se
 * menos de 15% responderam, a lista para sozinha e diz por quê.
 *
 * Conta só o ciclo atual do envio, e só respostas DEPOIS da mensagem -- uma
 * conversa que já existia antes não é mérito da lista.
 */
export async function termometroDoEnvio(salaoId: string, disparoId: string): Promise<Termometro> {
  const { dados: envios } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_disparo_envios').select('conversa_id, enviado_em')
    .eq('salao_id', salaoId).eq('disparo_id', disparoId).range(de, ate))

  const enviadas = (envios || []).length
  if (enviadas < MINIMO_PARA_JULGAR) {
    return { enviadas, responderam: 0, taxa: 1, travar: null }
  }

  // A PRIMEIRA mensagem de cada conversa: a 2ª é continuação e contaria duas
  // vezes a mesma pessoa.
  const primeira = new Map<string, number>()
  for (const v of envios) {
    if (!v.conversa_id) continue
    const t = new Date(v.enviado_em).getTime()
    if (!primeira.has(v.conversa_id) || t < primeira.get(v.conversa_id)!) {
      primeira.set(v.conversa_id, t)
    }
  }

  let responderam = 0
  const ids = [...primeira.keys()]
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await supabaseAdmin.from('crm_mensagens')
      .select('conversa_id, criado_em')
      .in('conversa_id', ids.slice(i, i + 150))
      .eq('direcao', 'entrada')
      .order('criado_em', { ascending: false }).limit(1500)
    const ja = new Set<string>()
    for (const m of data || []) {
      if (ja.has(m.conversa_id)) continue
      if (new Date(m.criado_em).getTime() > (primeira.get(m.conversa_id) || Infinity)) {
        ja.add(m.conversa_id); responderam++
      }
    }
  }

  const taxa = enviadas ? responderam / enviadas : 1
  const travar = taxa < TAXA_MINIMA
    ? `Parado: só ${responderam} de ${enviadas} responderam (${Math.round(taxa * 100)}%). `
      + 'Abaixo de 15% o WhatsApp entende a lista como incômodo — foi assim que o número foi bloqueado em 02/10. '
      + 'Reveja a mensagem e o público antes de ligar de novo.'
    : null

  return { enviadas, responderam, taxa, travar }
}
