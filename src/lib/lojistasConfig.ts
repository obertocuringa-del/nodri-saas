import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { servicosLojistaPadrao, LojistaServico } from '@/lib/lojistasServicosPadrao'

export interface LojistasConfig { token: string; whatsapp_link: string; mensagem: string }

const MENSAGEM_PADRAO = 'Olá!\n\nObrigado por fazer parte das nossas parcerias.\n\nAtravés deste grupo você receberá promoções exclusivas, ações especiais e campanhas destinadas aos nossos parceiros.'

// Lê a config do módulo; gera o token na primeira vez (autocadastro lazy).
export async function getOuCriarConfig(salaoId: string): Promise<LojistasConfig> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'lojistas_config').maybeSingle()
  const atual = (data?.valor || {}) as Partial<LojistasConfig>
  if (atual.token) return { token: atual.token, whatsapp_link: atual.whatsapp_link || '', mensagem: atual.mensagem || MENSAGEM_PADRAO }
  const novo: LojistasConfig = { token: randomBytes(12).toString('hex'), whatsapp_link: '', mensagem: MENSAGEM_PADRAO }
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_config', valor: novo, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  return novo
}

export async function salvarConfig(salaoId: string, patch: Partial<Pick<LojistasConfig, 'whatsapp_link' | 'mensagem'>>): Promise<LojistasConfig> {
  const atual = await getOuCriarConfig(salaoId)
  const novo: LojistasConfig = { ...atual, ...patch }
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_config', valor: novo, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  return novo
}

// Acha o salão dono de um token público (usado nas rotas /lojista/[token]).
export async function getSalaoPorToken(token: string): Promise<{ salaoId: string; config: LojistasConfig } | null> {
  const { data } = await supabaseAdmin
    .from('salao_config')
    .select('salao_id, valor')
    .eq('chave', 'lojistas_config')
    .contains('valor', { token })
    .maybeSingle()
  if (!data) return null
  return { salaoId: data.salao_id, config: data.valor as LojistasConfig }
}

export async function getServicos(salaoId: string): Promise<LojistaServico[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'lojistas_servicos').maybeSingle()
  if (Array.isArray(data?.valor) && data.valor.length > 0) return data.valor as LojistaServico[]
  const padrao = servicosLojistaPadrao()
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_servicos', valor: padrao, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  return padrao
}

export async function salvarServicos(salaoId: string, lista: LojistaServico[]): Promise<void> {
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_servicos', valor: lista, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
}

// Adiciona um serviço manual (dedupe case-insensitive), usado no autocadastro público.
export async function adicionarServicoManual(salaoId: string, nome: string): Promise<LojistaServico> {
  const lista = await getServicos(salaoId)
  const nomeNorm = nome.trim()
  const existente = lista.find(s => s.nome.toLowerCase() === nomeNorm.toLowerCase())
  if (existente) return existente
  const novo: LojistaServico = { id: `c${Date.now()}`, nome: nomeNorm, ativo: true, ordem: lista.length }
  await salvarServicos(salaoId, [...lista, novo])
  return novo
}
