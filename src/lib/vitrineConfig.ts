import { supabaseAdmin } from '@/lib/supabase'
import { randomBytes } from 'crypto'

// ── Vitrine do cliente ──────────────────────────────────────────────────────
//
// Uma página pública, aberta por link, onde o cliente do salão vê as ações
// comerciais, a tabela de preços, vota em promoções e monta um agendamento
// para mandar no WhatsApp.
//
// Ela NÃO tem dado próprio: espelha o que o salão já mantém nas telas de
// sempre — campanhas em `salao_config.acoes_comerciais`, preços em
// `salao_servicos`, quem faz o quê em `profissionais.servicos_habilitados`.
// Editar continua sendo lá dentro; aqui é só leitura.
//
// A única coisa que nasce aqui é o token do link e os votos da enquete.

export const CHAVE_CONFIG = 'vitrine_config'
export const CHAVE_VOTOS = 'vitrine_votos'

export interface VitrineConfig {
  token: string
  /**
   * Parte legível do endereço: /promocoes/rouge-hair.
   *
   * O token aleatório continua valendo por trás — quem recebeu o link antigo
   * não fica na mão —, mas o que se divulga é o slug: um endereço com
   * "yZc1ffjtrYwx" no meio ninguém digita nem lê em voz alta.
   */
  slug?: string
  /** Link no ar? Desligar tira do ar sem perder o token. */
  ativo: boolean
  criadoEm: number
  /**
   * O que o cliente NÃO vê na página.
   *
   * Ocultar, e não excluir: o serviço continua inteiro no salão, com preço,
   * comissão e histórico — só não aparece no link. Nem tudo que o salão faz
   * se anuncia, e apagar de verdade para esconder da vitrine seria destruir
   * cadastro por causa de uma decisão de vitrine.
   *
   * Vale para a tabela de preços E para o agendamento: o cliente não pode
   * pedir o que não vê no cardápio.
   */
  ocultos?: {
    /** ids de `salao_servicos` */
    servicos?: string[]
    /** nomes de categoria */
    categorias?: string[]
  }
  /**
   * Faixa de atendimento, 'HH:MM'. Ausente = o padrão de 7h às 23h.
   *
   * Sem isto a cliente escolhia entre 7h e 23h em qualquer salão e pedia
   * horário que não existe — e quem tinha de dizer não era a recepção.
   */
  horario?: { abertura: string; fechamento: string }
}

/** Texto vira endereço: sem acento, sem espaço, sem símbolo. */
export function paraSlug(texto: string): string {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Token do link. Curto o bastante para caber num WhatsApp, longo o bastante
 *  para ninguém acertar por tentativa. */
export function gerarToken(): string {
  return randomBytes(9).toString('base64url')
}

export async function getConfig(salaoId: string): Promise<VitrineConfig | null> {
  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_CONFIG).maybeSingle()
  const v = (data as any)?.valor
  if (!v?.token) return null
  return {
    token: v.token,
    slug: v.slug || undefined,
    ativo: v.ativo !== false,
    criadoEm: Number(v.criadoEm) || 0,
    ocultos: {
      servicos: Array.isArray(v.ocultos?.servicos) ? v.ocultos.servicos : [],
      categorias: Array.isArray(v.ocultos?.categorias) ? v.ocultos.categorias : [],
    },
    horario: (v.horario?.abertura && v.horario?.fechamento)
      ? { abertura: String(v.horario.abertura), fechamento: String(v.horario.fechamento) }
      : undefined,
  }
}

export async function salvarConfig(salaoId: string, cfg: VitrineConfig): Promise<void> {
  await supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE_CONFIG, valor: cfg, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}

/** Config existente ou uma nova já gravada — para o botão "gerar link". */
export async function garantirConfig(salaoId: string, nasceNoAr = true): Promise<VitrineConfig> {
  const atual = await getConfig(salaoId)
  if (atual?.slug) return atual

  // Slug de partida vem do nome do salão. Sai feio quando o nome é razão
  // social ("oliveira-e-schneider-intituto-de-beleza-ltda"), e por isso o
  // painel deixa trocar — mas nascer com algo legível é melhor que nascer com
  // o token no meio do endereço.
  const { data: salao } = await supabaseAdmin
    .from('saloes').select('nome').eq('id', salaoId).maybeSingle()
  const base = paraSlug((salao as any)?.nome || '') || 'salao'
  const slug = await slugLivre(base, salaoId)

  const cfg: VitrineConfig = atual
    ? { ...atual, slug }
    : { token: gerarToken(), slug, ativo: nasceNoAr, criadoEm: Date.now() }
  await salvarConfig(salaoId, cfg)
  return cfg
}

/**
 * Um slug que ainda não é de outro salão.
 *
 * Dois salões com o mesmo nome existem, e sem esta checagem o segundo roubaria
 * o endereço do primeiro — as clientes de um cairiam na página do outro.
 */
export async function slugLivre(base: string, salaoId: string): Promise<string> {
  const limpo = paraSlug(base) || 'salao'
  for (let i = 0; i < 20; i++) {
    const tentativa = i === 0 ? limpo : `${limpo}-${i + 1}`
    const { data } = await supabaseAdmin
      .from('salao_config').select('salao_id')
      .eq('chave', CHAVE_CONFIG).eq('valor->>slug', tentativa).maybeSingle()
    if (!data || data.salao_id === salaoId) return tentativa
  }
  return `${limpo}-${Date.now().toString(36).slice(-4)}`
}

export interface SalaoDaVitrine {
  salaoId: string
  nome: string
  telefone: string | null
  logo: string | null
  config: VitrineConfig
}

/**
 * Quem é o salão deste link.
 *
 * Devolve null tanto para token inexistente quanto para link desligado: de
 * fora não dá para distinguir um do outro, e é assim que tem de ser — quem
 * recebeu o link antigo vê a mesma coisa que um curioso digitando à toa.
 */
export async function getSalaoPorToken(token: string): Promise<SalaoDaVitrine | null> {
  const limpo = String(token || '').replace(/[^A-Za-z0-9_-]/g, '')
  if (!limpo) return null

  // Aceita o slug legível e o token antigo: o endereço divulgado é o slug, mas
  // quem já recebeu o link com token continua entrando.
  const { data } = await supabaseAdmin
    .from('salao_config').select('salao_id, valor')
    .eq('chave', CHAVE_CONFIG)
    .or(`valor->>slug.eq.${limpo},valor->>token.eq.${limpo}`)
    .maybeSingle()
  if (!data) return null

  const cfg = data.valor as VitrineConfig
  if (cfg?.ativo === false) return null

  const { data: salao } = await supabaseAdmin
    .from('saloes').select('nome, telefone, status')
    .eq('id', data.salao_id).maybeSingle()
  if (!salao) return null

  // Salão bloqueado ou vencido também some: a vitrine é parte do produto, e
  // quem está fora do ar não deve seguir com uma página no ar em seu nome.
  if (salao.status === 'bloqueado' || salao.status === 'vencido') return null

  // A logo do perfil e gravada pela rota /api/salon/grid, que prefixa a chave
  // com `grid_`. Procurar por 'logo_salao' puro nao acha nada — o salão tem
  // logo cadastrada e a vitrine mostrava o nome da empresa no lugar dela.
  const { data: logoRow } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', data.salao_id).eq('chave', 'grid_logo_salao').maybeSingle()

  return {
    salaoId: data.salao_id,
    nome: salao.nome || 'Salão',
    telefone: salao.telefone || null,
    logo: (logoRow as any)?.valor?.logo || null,
    config: cfg,
  }
}

// ── Votos da enquete de promoção ────────────────────────────────────────────

export interface VotosVitrine {
  /** nome do serviço → quantos pediram */
  servicos: Record<string, number>
  /** o que o cliente digitou quando não achou o serviço na lista */
  livres: Array<{ texto: string; em: number }>
}

export async function getVotos(salaoId: string): Promise<VotosVitrine> {
  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_VOTOS).maybeSingle()
  const v = (data as any)?.valor
  return {
    servicos: v?.servicos && typeof v.servicos === 'object' ? v.servicos : {},
    livres: Array.isArray(v?.livres) ? v.livres : [],
  }
}

export async function salvarVotos(salaoId: string, votos: VotosVitrine): Promise<void> {
  await supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE_VOTOS, valor: votos, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}

/** Telefone só com dígitos e DDI, do jeito que o link do WhatsApp precisa. */
export function whatsappDoSalao(telefone: string | null): string | null {
  const so = String(telefone || '').replace(/\D/g, '')
  if (so.length < 10) return null
  return so.startsWith('55') ? so : `55${so}`
}
