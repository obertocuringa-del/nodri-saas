// ── Boas-vindas automáticas com o link de agendamento ───────────────────────
//
// Pedido do dono (19/09/2026): a cliente que ENTRA EM CONTATO recebe na hora
// uma mensagem com o link da página de agendamento ("se quiser, peça direto
// por aqui, é mais rápido; senão, já te atendemos"). Duas coisas que esta
// automação NÃO faz, de propósito:
//
//   - não responde no meio de uma conversa em andamento. "Entrar em contato"
//     é a primeira mensagem depois de um silêncio longo (12 h) ou o contato
//     novo. Quem está negociando horário há dez minutos não recebe link.
//   - não tira a conversa de "Preciso agir". A mensagem automática não é
//     resposta da recepção: o relógio continua contando e quem agenda é a
//     recepção.
//
// Liga e desliga em CRM > Configurar. Nasce desligada.
import { supabaseAdmin } from '@/lib/supabase'
import { ehSoAgradecimento, tipoDaMensagemDoSalao } from '@/lib/crm'
import { getConfig as configVitrine } from '@/lib/vitrineConfig'

export const CHAVE_BOAS_VINDAS = 'crm_boas_vindas'
export const AUTOR_BOAS_VINDAS = 'Boas-vindas automáticas'

/** Silêncio que separa "continuando a conversa" de "entrou em contato". */
const HORAS_DE_SILENCIO = 12
/** Uma por cliente por dia, no máximo. */
const HORAS_ENTRE_ENVIOS = 24

export interface ConfigBoasVindas {
  ligada: boolean
  texto: string
  link: string
}

export const TEXTO_PADRAO =
  'Olá! Aqui é do {salao}. Para agilizar: se você quer agendar, pode fazer o pedido direto pelo link abaixo, que é mais rápido.\n' +
  '{link}\n' +
  'Se preferir, é só aguardar um instante que já te atendemos por aqui.'

export async function carregarBoasVindas(salaoId: string): Promise<ConfigBoasVindas> {
  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_BOAS_VINDAS).maybeSingle()
  const v: any = (data as any)?.valor || {}
  return {
    ligada: v.ligada === true,
    texto: String(v.texto || '').trim() || TEXTO_PADRAO,
    link: String(v.link || '').trim(),
  }
}

/** O link da página pública do salão (promoções/agendar), se ela estiver no ar. */
export async function linkPadraoDoSalao(salaoId: string): Promise<string> {
  try {
    const v = await configVitrine(salaoId)
    if (v?.slug) return `https://www.nodri.com.br/promocoes/${v.slug}`
  } catch { /* sem vitrine, sem link */ }
  return ''
}

// Saudação pura ("oi", "olá, bom dia", "boa tarde, tudo bem?") é abertura de
// conversa. O que sobra depois de tirar a saudação decide: nada = abertura;
// só cortesia ("obrigada", "sim") = resposta; qualquer outra coisa = assunto.
const SAUDACAO = new Set(['oi', 'oii', 'oiii', 'ola', 'olaa', 'bom', 'boa', 'dia', 'tarde', 'noite', 'tudo', 'bem', 'e', 'ai', 'td', 'blz', 'beleza'])
function ehSoResposta(texto: string): boolean {
  const palavras = String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const semSaudacao = palavras.filter(p => !SAUDACAO.has(p))
  if (semSaudacao.length === 0) return false
  return ehSoAgradecimento(semSaudacao.join(' '))
}

export function montarMensagem(cfg: ConfigBoasVindas, nomeSalao: string): string {
  let t = cfg.texto.replace(/\{salao\}/gi, nomeSalao || 'salão')
  if (/\{link\}/i.test(t)) t = t.replace(/\{link\}/gi, cfg.link)
  else if (cfg.link) t = t.replace(/\s+$/, '') + '\n' + cfg.link
  return t.trim()
}

/**
 * Chamada na entrada de cada mensagem da cliente. Decide sozinha se manda;
 * quando manda, põe a mensagem na fila da ponte sem mexer no estado da
 * conversa. Devolve true quando enfileirou.
 */
export async function boasVindasSePrimeiroContato(args: {
  salaoId: string
  conversaId: string
  estado: string
  texto: string
  tipo: string
  quando: string          // hora da mensagem da cliente (ISO)
  nomeSalao: string
}): Promise<boolean> {
  const { salaoId, conversaId, estado, texto, tipo, quando, nomeSalao } = args
  if (!conversaId) return false
  // Pasta que o salão criou (Profissionais etc.): não é cliente entrando em contato.
  if (String(estado || '').startsWith('extra_')) return false

  const cfg = await carregarBoasVindas(salaoId)
  if (!cfg.ligada || !cfg.link) return false

  // "Obrigada", "Sim", "Confirmado" não é entrar em contato -- é responder.
  // Mas "Oi", "Olá", "Bom dia" É entrar em contato (teste do dono, 19/09/2026:
  // o "Oi" caía na lista de cortesia e não disparava).
  if (tipo === 'texto' && ehSoResposta(texto)) return false

  // A mensagem anterior nesta conversa (a da cliente já está gravada).
  const { data: antes } = await supabaseAdmin
    .from('crm_mensagens').select('direcao, texto, criado_em, autor_nome')
    .eq('conversa_id', conversaId).lt('criado_em', quando)
    .order('criado_em', { ascending: false }).limit(1)
  const anterior = (antes || [])[0]
  if (anterior) {
    const horas = (Date.parse(quando) - Date.parse(anterior.criado_em)) / 3600e3
    if (horas < HORAS_DE_SILENCIO) return false
    // Ela está respondendo a uma automação do salão (confirmação, lembrete,
    // feedback), não entrando em contato.
    if (anterior.direcao === 'saida' && tipoDaMensagemDoSalao(anterior.texto)) return false
  }

  // Uma por dia por conversa.
  const desde = new Date(Date.now() - HORAS_ENTRE_ENVIOS * 3600e3).toISOString()
  const { data: recente } = await supabaseAdmin
    .from('crm_mensagens').select('id')
    .eq('conversa_id', conversaId).eq('autor_nome', AUTOR_BOAS_VINDAS)
    .gte('criado_em', desde).limit(1)
  if (recente?.length) return false

  const mensagem = montarMensagem(cfg, nomeSalao)
  if (!mensagem) return false

  const { error } = await supabaseAdmin.from('crm_mensagens').insert({
    salao_id: salaoId,
    conversa_id: conversaId,
    direcao: 'saida',
    texto: mensagem,
    tipo: 'texto',
    situacao: 'na_fila',
    em_massa: false,
    autor_nome: AUTOR_BOAS_VINDAS,
  })
  if (error) return false

  await supabaseAdmin.from('crm_eventos').insert({
    salao_id: salaoId, conversa_id: conversaId, tipo: 'mudou_estado',
    para_estado: estado, autor_nome: AUTOR_BOAS_VINDAS,
    detalhe: 'Mandou o link de agendamento (primeira mensagem depois de 12 h de silêncio). A conversa continua na fila.',
  })
  return true
}
