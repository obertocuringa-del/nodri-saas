// ── "Confirmo" da cliente vira Confirmado no Avec ───────────────────────────
//
// A cliente responde a mensagem de confirmação. Se o texto bate com a lista de
// palavras, o NODRI põe um pedido na fila; a extensão vai ao Avec e marca o
// agendamento como Confirmado; SÓ SE DEU CERTO o NODRI manda o "Combinado".
//
// A ordem importa: se a mensagem saísse antes da marcação, um erro no Avec
// deixaria a cliente achando que está confirmado com o sistema dizendo que não.
// Na dúvida, não fala nada e chama gente.
//
// ── A trava que faz "ok" ser seguro ─────────────────────────────────────────
//
// "ok" sozinho não quer dizer nada: responde tanto "podemos confirmar?" quanto
// "hoje não tenho encaixe". Por isso a palavra só vale quando a conversa está
// na pasta CONFIRMAÇÃO -- ou seja, quando a última coisa que o salão mandou foi
// mesmo um pedido de confirmação. Fora dali, a mensagem vai para Preciso agir.

import { supabaseAdmin } from '@/lib/supabase'

export const CHAVE_CFG = 'crm_confirmacao'
export const CHAVE_FILA = 'crm_confirmacao_fila'

export interface ConfigConfirmacao {
  ligada: boolean
  /** pedaços de texto que valem como confirmação (editável na tela) */
  palavras: string[]
  /** o que responder depois de marcar no Avec */
  resposta: string
  url_relatorio: string
}

// Tirado das respostas REAIS das clientes do salão (15/09/2026). São PEDAÇOS,
// não frases inteiras: "confirma" pega "Confirmado", "confirmar", "Confirmo" e
// até "Cinfirmado" não pega -- por isso o erro de digitação está na lista.
export const PALAVRAS_PADRAO = [
  'confirma', 'confirmo', 'confirmado', 'cinfirmado', 'confirmar',
  'pode confirmar', 'pode sim', 'pode agendar', 'pode marcar',
  'sim', 'isso', 'ok', 'okay', 'blz', 'beleza', 'certo', 'perfeito',
  'combinado', 'tudo certo', 'ta certo', 'ta bom', 'tudo bem',
  'estou a caminho', 'to a caminho', 'vou sim', 'estarei',
]

export const CONFIG_PADRAO: ConfigConfirmacao = {
  ligada: false,
  palavras: [...PALAVRAS_PADRAO],
  resposta: 'Combinado, *{cliente}*! Seu horário está confirmado para *{data}* às *{hora}*.\n\nQualquer coisa é só me chamar. Até lá! ✨',
  url_relatorio: 'https://admin.avec.beauty/admin/relatorio/0051',
}

export interface PedidoConfirmacao {
  id: string
  conversa_id: string
  contato_id: string
  telefone: string
  nome: string
  /** dd/mm/aaaa do agendamento — normalmente amanhã */
  data: string
  criado_em: string
  tentativas: number
}

const semAcento = (s: string) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function lerConfig(bruto: any): ConfigConfirmacao {
  const b = bruto || {}
  return {
    ligada: b.ligada === true,
    palavras: Array.isArray(b.palavras) && b.palavras.length
      ? b.palavras.map((p: any) => String(p || '').trim()).filter(Boolean)
      : [...PALAVRAS_PADRAO],
    resposta: String(b.resposta ?? CONFIG_PADRAO.resposta),
    url_relatorio: String(b.url_relatorio || CONFIG_PADRAO.url_relatorio).trim(),
  }
}

export async function carregarConfig(salaoId: string): Promise<ConfigConfirmacao> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_CFG).maybeSingle()
  return lerConfig(data?.valor)
}

export async function gravarConfig(salaoId: string, cfg: ConfigConfirmacao) {
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_CFG, valor: cfg, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

export async function carregarFila(salaoId: string): Promise<PedidoConfirmacao[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_FILA).maybeSingle()
  const v = (data?.valor as any)?.fila
  return Array.isArray(v) ? v : []
}

export async function gravarFila(salaoId: string, fila: PedidoConfirmacao[]) {
  // Teto de 200 e nada de mais de 6h: pedido velho não serve mais, e fila que
  // só cresce vira um campo gigante que ninguém lê.
  const limite = Date.now() - 6 * 3600e3
  const limpa = fila
    .filter(p => new Date(p.criado_em).getTime() > limite && p.tentativas < 4)
    .slice(-200)
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_FILA,
    valor: { fila: limpa }, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

/**
 * O texto da cliente vale como confirmação?
 *
 * Compara sem acento e sem pontuação. Mensagem longa NÃO conta: quem escreve
 * três linhas está explicando alguma coisa, não confirmando -- e aí é caso de
 * gente ler. "Pode confirmar por favor, só manicure mesmo" passa (curta); um
 * parágrafo pedindo para remarcar, não.
 */
export function ehConfirmacao(texto: string, palavras: string[]): boolean {
  const t = semAcento(texto).replace(/[^a-z0-9?\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 90) return false
  // ── O que derruba, antes de qualquer palavra ─────────────────────────────
  //
  // Um "não" em qualquer lugar: "não posso confirmar", "não vou poder".
  // Pedido de mudança: "pode ser mais tarde?", "consegue trocar pra 15h?",
  // "sim, mas queria adiantar" -- tudo isso tem "pode"/"sim" dentro e NÃO é
  // confirmação; é gente pedindo outra coisa. E pergunta é pergunta: quem
  // confirma não pergunta. Na dúvida, vai para "Preciso agir" e alguém lê.
  const derruba = /\bnao\b|\bnem\b|\bcancel|\bdesmarc|\bremarc|\bmud[ae]|\btroc[ae]|\balter[ae]|\badiant|\batras[ae]|mais tarde|mais cedo|outro dia|outra data|outro hor|outra hor|\bencaixe|\bantes\b|\bdepois\b|\?/
  if (derruba.test(t)) return false
  // ── Palavra INTEIRA, não pedaço ──────────────────────────────────────────
  //
  // A lista do salão tem "s", "ss", "ta", "vou" -- respostas reais de cliente
  // com pressa. Como pedaço, "s" está dentro de qualquer frase e "ta" está em
  // "tarde"; como palavra inteira, "s" só vale quando a cliente escreveu "s".
  const comEspacos = ' ' + t.replace(/\?/g, ' ').replace(/\s+/g, ' ').trim() + ' '
  return palavras.some(p => {
    const alvo = semAcento(p).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
    return !!alvo && comEspacos.includes(' ' + alvo + ' ')
  })
}

/** Põe um pedido na fila, sem repetir a mesma conversa. */
export async function enfileirar(salaoId: string, p: Omit<PedidoConfirmacao, 'id' | 'criado_em' | 'tentativas'>) {
  const fila = await carregarFila(salaoId)
  if (fila.some(x => x.conversa_id === p.conversa_id)) return false
  fila.push({
    ...p,
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    criado_em: new Date().toISOString(),
    tentativas: 0,
  })
  await gravarFila(salaoId, fila)
  return true
}

// ── Aprender com quem clicou em "Confirmou" ─────────────────────────────────
//
// Pedido do dono (18/09/2026): a lista de palavras nasce das respostas reais
// das clientes, e ninguém vai ficar cadastrando uma a uma. Quando alguém da
// recepção clica em "Confirmou" numa conversa em que o salão tinha pedido
// confirmação e a cliente respondeu algo que a lista NÃO reconhecia, essa
// resposta vira palavra-chave -- a pessoa acabou de dizer, com o clique, que
// aquilo era um "sim".
//
// Guardas para não aprender bobagem: só frase curta (até 5 palavras), sem
// pergunta, sem negação nem pedido de mudança, sem número, e a frase inteira
// como veio (não pedaços). "Pode confirmar sim." vira "pode confirmar sim";
// "Boa tarde, confirmado" vira "boa tarde confirmado". A frase inteira é o
// que garante que "boa tarde" sozinho nunca vira confirmação.
export function fraseParaAprender(texto: string, palavras: string[]): string | null {
  const t = semAcento(texto).replace(/[^a-z0-9?\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t || t.includes('?')) return null
  const n = t.split(' ').length
  if (n > 5 || t.length > 40) return null
  if (/\d/.test(t)) return null
  if (/\bnao\b|\bnem\b|\bcancel|\bdesmarc|\bremarc|\bmud[ae]|\btroc[ae]|\balter[ae]|\badiant|\batras[ae]|mais tarde|mais cedo|outro|outra|\bencaixe|\bantes\b|\bdepois\b/.test(t)) return null
  // Cumprimento sozinho não é confirmação.
  if (/^(oi|ola|bom dia|boa tarde|boa noite|obrigad[ao]s?|ok|valeu)$/.test(t)) return null
  if (ehConfirmacao(t, palavras)) return null   // já reconhece: nada a aprender
  return t
}

/** Aprende a frase da última resposta da cliente, se couber. Devolve a frase aprendida. */
export async function aprenderConfirmacao(salaoId: string, conversaId: string): Promise<string | null> {
  const { data: ultSaida } = await supabaseAdmin
    .from('crm_mensagens').select('texto, criado_em')
    .eq('conversa_id', conversaId).eq('direcao', 'saida')
    .order('criado_em', { ascending: false }).limit(1)
  const pedido = (ultSaida || [])[0]
  if (!pedido) return null
  // Só quando a última coisa do salão foi um pedido de confirmação.
  const { tipoDaMensagemDoSalao } = await import('@/lib/crm')
  if (tipoDaMensagemDoSalao(pedido.texto) !== 'confirmacao') return null

  const { data: dela } = await supabaseAdmin
    .from('crm_mensagens').select('texto')
    .eq('conversa_id', conversaId).eq('direcao', 'entrada').gt('criado_em', pedido.criado_em)
    .order('criado_em', { ascending: true }).limit(5)
  const cfg = await carregarConfig(salaoId)
  for (const m of dela || []) {
    const frase = fraseParaAprender(String(m.texto || ''), cfg.palavras)
    if (!frase) continue
    cfg.palavras = [...new Set([...cfg.palavras, frase])]
    await gravarConfig(salaoId, cfg)
    return frase
  }
  return null
}
