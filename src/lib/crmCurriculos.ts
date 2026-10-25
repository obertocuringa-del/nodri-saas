// ── Candidatos dentro do CRM (um CRM só) ────────────────────────────────────
//
// A tela de Currículos NÃO tem conversa própria: ela usa as mesmas tabelas do
// CRM (crm_contatos, crm_conversas, crm_mensagens) e a mesma ponte do WhatsApp.
// O candidato é um contato como qualquer outro; o que o separa das clientes é
// a PASTA "Currículos" (extra_curriculos), que o CRM já sabe tratar: mensagem
// que chega fica na pasta, o relógio e a boas-vindas não mexem nela.
//
// Duas ressalvas, ambas de segurança:
//   - Candidato que JÁ É cliente do salão (cliente_nome preenchido) não muda de
//     pasta: a conversa dele continua onde estava.
//   - Pasta de outro tipo (Profissionais, Conversa Finalizada) também não é mexida.

import { supabaseAdmin } from '@/lib/supabase'
import { getCurriculosDoc } from '@/lib/curriculos'
import type { Curriculo } from '@/lib/curriculosShared'
import { normalizarTelefone, chaveTelefone } from '@/lib/crm'
import { acharOuCriarContato, grafiasDoTelefone } from '@/lib/crmContatos'
import { CHAVE_ESTADOS, ehEstadoDoSalao, lerConfigEstados } from '@/lib/crmEstados'

export const PASTA_CURRICULOS = 'extra_curriculos'

/** Teto de mensagens por lote e por dia: o WhatsApp bloqueia quem dispara demais. */
export const MAX_POR_LOTE = 20
export const MAX_POR_DIA = 40

const SELECT_CONVERSA = '*, contato:crm_contatos(id, nome, nome_agenda, telefone, telefone_bruto, cliente_nome, etiquetas, lid, observacao)'

const pedacos = <T,>(lista: T[], n: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n))
  return out
}

/** Cria a pasta "Currículos" no salão, se ainda não existir. Idempotente. */
export async function garantirPastaCurriculos(salaoId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE_ESTADOS).maybeSingle()
  const cfg = lerConfigEstados((data as any)?.valor)
  if (cfg.extras.some(e => e.chave === PASTA_CURRICULOS)) return
  cfg.extras.push({
    chave: PASTA_CURRICULOS, rotulo: 'Currículos',
    cor: '#5B4FCF', fundo: '#F1EEFC', ordem: cfg.extras.length,
  })
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_ESTADOS,
    valor: { ajustes: cfg.ajustes, extras: cfg.extras },
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

export async function candidatosPorId(ids: string[]): Promise<Curriculo[]> {
  const doc = await getCurriculosDoc()
  const quer = new Set(ids)
  return ((doc.itens || []) as Curriculo[]).filter(c => quer.has(c.id))
}

/**
 * Todas as conversas deste salão que são de candidatos: as da pasta
 * "Currículos" e as de quem tem o mesmo telefone de um currículo (o candidato
 * que escreveu antes de a gente chamar cai fora da pasta, e aparece aqui igual).
 * A busca é por telefone, em pedaços, e nunca varre as conversas do salão.
 */
export async function conversasDosCandidatos(salaoId: string): Promise<any[]> {
  const doc = await getCurriculosDoc()
  const fones = new Set<string>()
  for (const c of (doc.itens || []) as Curriculo[]) {
    const t = normalizarTelefone(c.telefone)
    if (t.length < 10) continue
    for (const g of grafiasDoTelefone(t)) fones.add(g)
  }

  const contatoIds = new Set<string>()
  for (const lote of pedacos([...fones], 120)) {
    const { data } = await supabaseAdmin.from('crm_contatos').select('id')
      .eq('salao_id', salaoId).in('telefone', lote)
    for (const r of data || []) contatoIds.add((r as any).id)
  }

  const porId = new Map<string, any>()
  const semResumo = 'origem.is.null,origem.neq.resumo_dono'
  for (const lote of pedacos([...contatoIds], 150)) {
    const { data } = await supabaseAdmin.from('crm_conversas').select(SELECT_CONVERSA)
      .eq('salao_id', salaoId).in('contato_id', lote).or(semResumo)
    for (const c of data || []) porId.set((c as any).id, c)
  }
  const { data: daPasta } = await supabaseAdmin.from('crm_conversas').select(SELECT_CONVERSA)
    .eq('salao_id', salaoId).eq('estado', PASTA_CURRICULOS).or(semResumo)
  for (const c of daPasta || []) porId.set((c as any).id, c)

  return [...porId.values()].sort((a, b) =>
    new Date(b.ultima_em || 0).getTime() - new Date(a.ultima_em || 0).getTime())
}

/** Resumo por telefone (chave sem o nono dígito) para a lista de candidatos. */
export function resumoPorTelefone(conversas: any[]) {
  const mapa: Record<string, { conversa: string; estado: string; nao_lidas: number; ultima_em: string | null; ultima_de: string | null }> = {}
  for (const c of conversas) {
    const k = chaveTelefone(c?.contato?.telefone)
    if (!k) continue
    const atual = mapa[k]
    if (atual && new Date(atual.ultima_em || 0) >= new Date(c.ultima_em || 0)) continue
    mapa[k] = { conversa: c.id, estado: c.estado, nao_lidas: c.nao_lidas || 0, ultima_em: c.ultima_em || null, ultima_de: c.ultima_de || null }
  }
  return mapa
}

/** Acha ou cria contato e conversa do candidato, deixando a conversa na pasta. */
export async function conversaDoCandidato(salaoId: string, c: Curriculo) {
  const contato = await acharOuCriarContato(salaoId, c.telefone, c.nome)
  if (!contato) return null

  const { data: convs } = await supabaseAdmin.from('crm_conversas')
    .select('id, estado, assunto').eq('salao_id', salaoId).eq('contato_id', contato.id)
    .order('ultima_em', { ascending: false, nullsFirst: false }).limit(5)
  const lista = (convs || []) as any[]
  const jaCliente = !!contato.cliente_nome
  const assunto = `Vaga: ${c.vaga}`
  const agora = new Date().toISOString()

  let conv = lista.find(x => x.estado === PASTA_CURRICULOS) || lista[0]
  if (!conv) {
    const { data: nova } = await supabaseAdmin.from('crm_conversas').insert({
      salao_id: salaoId, contato_id: contato.id, estado: PASTA_CURRICULOS, importada: true,
      assunto, ultima_em: agora, ultima_de: 'salao', nao_lidas: 0,
    }).select('id, estado, assunto').maybeSingle()
    conv = nova
  } else if (!jaCliente && !ehEstadoDoSalao(conv.estado)) {
    await supabaseAdmin.from('crm_conversas').update({
      estado: PASTA_CURRICULOS, proxima_acao: null, aguardando_desde: null, fechada_em: null,
      assunto: conv.assunto || assunto, atualizado_em: agora,
    }).eq('id', conv.id)
    conv = { ...conv, estado: PASTA_CURRICULOS }
  }
  return conv ? { conversa: conv.id as string, contato, jaCliente } : null
}

/** Quantas mensagens a pasta já mandou hoje (fuso de Brasília). */
export async function enviadasHoje(salaoId: string): Promise<number> {
  const { data: convs } = await supabaseAdmin.from('crm_conversas').select('id')
    .eq('salao_id', salaoId).eq('estado', PASTA_CURRICULOS).limit(1000)
  const ids = (convs || []).map((c: any) => c.id)
  if (!ids.length) return 0
  const hoje = new Date(Date.now() - 3 * 3600e3); hoje.setUTCHours(0, 0, 0, 0)
  const desde = new Date(hoje.getTime() + 3 * 3600e3).toISOString()
  let total = 0
  for (const lote of pedacos(ids, 150)) {
    const { count } = await supabaseAdmin.from('crm_mensagens').select('id', { count: 'exact', head: true })
      .eq('salao_id', salaoId).eq('direcao', 'saida').gte('criado_em', desde).in('conversa_id', lote)
    total += count || 0
  }
  return total
}

export function primeiroNome(nome: string): string {
  const p = String(nome || '').trim().split(/\s+/)[0] || ''
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ''
}
