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
  /** Link no ar? Desligar tira do ar sem perder o token. */
  ativo: boolean
  criadoEm: number
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
  return { token: v.token, ativo: v.ativo !== false, criadoEm: Number(v.criadoEm) || 0 }
}

export async function salvarConfig(salaoId: string, cfg: VitrineConfig): Promise<void> {
  await supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE_CONFIG, valor: cfg, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}

/** Config existente ou uma nova já gravada — para o botão "gerar link". */
export async function garantirConfig(salaoId: string): Promise<VitrineConfig> {
  const atual = await getConfig(salaoId)
  if (atual) return atual
  const nova: VitrineConfig = { token: gerarToken(), ativo: true, criadoEm: Date.now() }
  await salvarConfig(salaoId, nova)
  return nova
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

  // Filtro dentro do JSON no formato que o resto do sistema ja usa e que
  // comprovadamente funciona aqui (mesmo padrao do link de lojistas). A forma
  // `.eq('valor->>token', x)` nao devolveu linha nenhuma em producao.
  const { data } = await supabaseAdmin
    .from('salao_config').select('salao_id, valor')
    .eq('chave', CHAVE_CONFIG)
    .or(`valor->>token.eq.${limpo}`)
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

  const { data: logoRow } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', data.salao_id).eq('chave', 'logo_salao').maybeSingle()

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
