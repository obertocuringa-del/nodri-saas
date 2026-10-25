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

// ── Chat enxuto dos candidatos ──────────────────────────────────────────────
//
// A tela de Currículos tem um chat próprio e simples (texto, foto e áudio que
// chegam, texto que sai). Ele NÃO mexe no código do CRM principal: lê e grava
// nas mesmas tabelas, e a mesma ponte entrega e recebe.

/** A conversa só vale aqui se for de candidato: da pasta Currículos ou de telefone de currículo. */
export async function conversaDeCandidato(salaoId: string, conversaId: string) {
  const { data: conv } = await supabaseAdmin.from('crm_conversas')
    .select('id, estado, assunto, nao_lidas, contato:crm_contatos(id, nome, telefone, cliente_nome)')
    .eq('id', conversaId).eq('salao_id', salaoId).maybeSingle()
  if (!conv) return null
  if ((conv as any).estado === PASTA_CURRICULOS) return conv as any
  const k = chaveTelefone((conv as any).contato?.telefone)
  if (!k) return null
  const doc = await getCurriculosDoc()
  const eh = ((doc.itens || []) as Curriculo[]).some(c => chaveTelefone(normalizarTelefone(c.telefone)) === k)
  return eh ? (conv as any) : null
}

const TIPOS_QUE_NAO_APARECEM = ['entrou', 'mudou_estado', 'reacao']

export async function mensagensDoCandidato(salaoId: string, conversaId: string) {
  const { data } = await supabaseAdmin.from('crm_mensagens')
    .select('id, direcao, texto, tipo, midia_url, situacao, criado_em, autor_nome')
    .eq('salao_id', salaoId).eq('conversa_id', conversaId)
    .order('criado_em', { ascending: false }).limit(200)
  return ((data || []) as any[])
    .filter(m => !String(m.tipo || '').startsWith('acao_') && !TIPOS_QUE_NAO_APARECEM.includes(m.tipo))
    .reverse()
}

// ── Configuração, triagem e arquivos ────────────────────────────────────────
//
// Tudo em salao_config (chave/valor), sem tabela nova: mudança de esquema neste
// banco exige SQL à mão. Duas chaves, só da tela de Currículos:
//   curriculos_config   { limpeza: { ligado, dias }, modelos: string[] }
//   curriculos_triagem  { porConversa: { <conversa_id>: <vaga> } }

const CHAVE_CONFIG = 'curriculos_config'
const CHAVE_TRIAGEM = 'curriculos_triagem'
const BUCKET = 'uploads'

/**
 * O ritmo de envio dos candidatos: a mesma sistemática do Envio automático
 * (janela de horário, uma mensagem a cada X minutos, máximo por dia e dias da
 * semana), para o WhatsApp do salão não ser bloqueado. Nomes dos campos iguais
 * aos de crmDisparos.ts; dias_semana segue 0 = domingo ... 6 = sábado.
 */
export interface RitmoCurriculos {
  janela_ini: string
  janela_fim: string
  intervalo_min: number
  max_dia: number
  dias_semana: number[]
}
export const RITMO_PADRAO: RitmoCurriculos = { janela_ini: '09:00', janela_fim: '20:00', intervalo_min: 20, max_dia: 20, dias_semana: [1, 2, 3, 4, 5, 6] }
// Tetos de segurança: valem mesmo que a tela mande outra coisa.
export const MIN_INTERVALO = 2
export const MAX_DIA_TETO = 100
export const MAX_POR_PEDIDO = 100

export interface ConfigCurriculos {
  limpeza: { ligado: boolean; dias: number }
  modelos: string[]
  ritmo: RitmoCurriculos
}

const hhmm = (v: any, padrao: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')) ? String(v) : padrao
const inteiro = (v: any, padrao: number, min: number, max: number) => {
  const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao
}
export function limparRitmo(b: any): RitmoCurriculos {
  const dias = Array.isArray(b?.dias_semana)
    ? ([...new Set(b.dias_semana.map((d: any) => Math.round(Number(d))).filter((d: number) => d >= 0 && d <= 6))] as number[]).sort()
    : []
  let ini = hhmm(b?.janela_ini, RITMO_PADRAO.janela_ini), fim = hhmm(b?.janela_fim, RITMO_PADRAO.janela_fim)
  if (fim <= ini) { ini = RITMO_PADRAO.janela_ini; fim = RITMO_PADRAO.janela_fim }
  return {
    janela_ini: ini, janela_fim: fim,
    intervalo_min: inteiro(b?.intervalo_min, RITMO_PADRAO.intervalo_min, MIN_INTERVALO, 720),
    max_dia: inteiro(b?.max_dia, RITMO_PADRAO.max_dia, 1, MAX_DIA_TETO),
    dias_semana: dias.length ? dias : RITMO_PADRAO.dias_semana,
  }
}

async function lerJson(salaoId: string, chave: string): Promise<any> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', chave).maybeSingle()
  return (data as any)?.valor || {}
}
async function gravarJson(salaoId: string, chave: string, valor: any) {
  await supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave, valor, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' })
}

export async function lerConfigCurriculos(salaoId: string): Promise<ConfigCurriculos> {
  const v = await lerJson(salaoId, CHAVE_CONFIG)
  const dias = Math.max(7, Math.min(365, Number(v?.limpeza?.dias) || 60))
  return {
    // Desligada por padrão: apagar currículo é decisão do dono, não do sistema.
    limpeza: { ligado: v?.limpeza?.ligado === true, dias },
    modelos: Array.isArray(v?.modelos) ? v.modelos.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 40) : [],
    ritmo: limparRitmo(v?.ritmo),
  }
}

export async function salvarConfigCurriculos(salaoId: string, parcial: Partial<ConfigCurriculos>) {
  const atual = await lerConfigCurriculos(salaoId)
  const novo: ConfigCurriculos = {
    limpeza: parcial.limpeza ? {
      ligado: parcial.limpeza.ligado === true,
      dias: Math.max(7, Math.min(365, Number(parcial.limpeza.dias) || atual.limpeza.dias)),
    } : atual.limpeza,
    modelos: parcial.modelos
      ? parcial.modelos.map(x => String(x || '').trim()).filter(Boolean).slice(0, 40)
      : atual.modelos,
    ritmo: parcial.ritmo ? limparRitmo(parcial.ritmo) : atual.ritmo,
  }
  await gravarJson(salaoId, CHAVE_CONFIG, novo)
  return novo
}

export async function lerTriagem(salaoId: string): Promise<Record<string, string>> {
  const v = await lerJson(salaoId, CHAVE_TRIAGEM)
  return (v?.porConversa && typeof v.porConversa === 'object') ? v.porConversa : {}
}
export async function definirTriagem(salaoId: string, conversaId: string, vaga: string) {
  const mapa = await lerTriagem(salaoId)
  if (vaga) mapa[conversaId] = vaga; else delete mapa[conversaId]
  await gravarJson(salaoId, CHAVE_TRIAGEM, { porConversa: mapa })
}

/** Conversas da pasta Currículos de quem NÃO preencheu o formulário (escreveu para o telefone principal). */
export async function conversasDoTelefonePrincipal(salaoId: string) {
  const doc = await getCurriculosDoc()
  const chaves = new Set<string>()
  for (const c of (doc.itens || []) as Curriculo[]) {
    const k = chaveTelefone(normalizarTelefone(c.telefone)); if (k) chaves.add(k)
  }
  const { data } = await supabaseAdmin.from('crm_conversas').select(SELECT_CONVERSA)
    .eq('salao_id', salaoId).eq('estado', PASTA_CURRICULOS)
  const triagem = await lerTriagem(salaoId)
  return ((data || []) as any[])
    .filter(c => { const k = chaveTelefone(c?.contato?.telefone); return !k || !chaves.has(k) })
    .map(c => ({
      conversa: c.id as string,
      nome: c.contato?.nome || c.contato?.nome_agenda || c.contato?.telefone || 'Sem nome',
      telefone: c.contato?.telefone || '',
      vaga: triagem[c.id] || '',
      nao_lidas: c.nao_lidas || 0,
      ultima_em: c.ultima_em || null,
      ultima_de: c.ultima_de || null,
      previa: c.ultima_previa || '',
    }))
    .sort((a, b) => new Date(b.ultima_em || 0).getTime() - new Date(a.ultima_em || 0).getTime())
}

// ── Arquivos recebidos: lista, peso e exclusão ──────────────────────────────

export interface ItemArquivo {
  mensagem: string; conversa: string; candidato: string; vaga: string
  tipo: string; nome: string; url: string; bytes: number; criado_em: string
}

/** O caminho dentro do bucket, só se o arquivo for DESTE salão. Nunca apaga o que não reconhece. */
export function caminhoDaUrl(url: string | null, salaoId: string): string | null {
  const m = /\/object\/(?:public|sign)\/uploads\/([^?]+)/.exec(String(url || ''))
  if (!m) return null
  let p = m[1]
  try { p = decodeURIComponent(p) } catch { /* mantém */ }
  return (p.startsWith(`crm/${salaoId}/`) || p.startsWith(`arquivos/${salaoId}/`) || p.startsWith(`curriculos/${salaoId}/`)) ? p : null
}

async function tamanhosDoSalao(salaoId: string): Promise<Map<string, number>> {
  const mapa = new Map<string, number>()
  for (const prefixo of [`crm/${salaoId}`, `arquivos/${salaoId}`, `curriculos/${salaoId}`]) {
    for (let de = 0; de < 20000; de += 1000) {
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(prefixo, { limit: 1000, offset: de })
      if (error || !data?.length) break
      for (const o of data as any[]) if (o?.metadata?.size != null) mapa.set(`${prefixo}/${o.name}`, Number(o.metadata.size) || 0)
      if (data.length < 1000) break
    }
  }
  return mapa
}

const nomeDoArquivo = (url: string) => {
  let bruto = url.split('?')[0].split('/').pop() || 'arquivo'
  try { bruto = decodeURIComponent(bruto) } catch { /* mantém */ }
  return bruto.replace(/^\d{10,}_/, '')
}

export async function arquivosDosCandidatos(salaoId: string): Promise<{ itens: ItemArquivo[]; bytes: number }> {
  const [conversas, doc, triagem] = await Promise.all([
    conversasDosCandidatos(salaoId), getCurriculosDoc(), lerTriagem(salaoId),
  ])
  const vagaPorFone = new Map<string, string>()
  for (const c of (doc.itens || []) as Curriculo[]) {
    const k = chaveTelefone(normalizarTelefone(c.telefone)); if (k && !vagaPorFone.has(k)) vagaPorFone.set(k, c.vaga)
  }
  const info = new Map<string, { candidato: string; vaga: string }>()
  for (const c of conversas) {
    const k = chaveTelefone(c?.contato?.telefone)
    info.set(c.id, {
      candidato: c.contato?.nome || c.contato?.nome_agenda || c.contato?.telefone || 'Sem nome',
      vaga: (k && vagaPorFone.get(k)) || triagem[c.id] || 'Sem vaga definida',
    })
  }
  const ids = [...info.keys()]
  const msgs: any[] = []
  for (const lote of pedacos(ids, 100)) {
    const { data } = await supabaseAdmin.from('crm_mensagens')
      .select('id, conversa_id, tipo, midia_url, criado_em')
      .eq('salao_id', salaoId).in('conversa_id', lote).not('midia_url', 'is', null)
    msgs.push(...(data || []))
  }
  const tamanhos = msgs.length ? await tamanhosDoSalao(salaoId) : new Map<string, number>()
  const itens: ItemArquivo[] = msgs.map(m => {
    const caminho = caminhoDaUrl(m.midia_url, salaoId)
    const i = info.get(m.conversa_id)!
    return {
      mensagem: m.id, conversa: m.conversa_id, candidato: i.candidato, vaga: i.vaga,
      tipo: m.tipo, nome: nomeDoArquivo(m.midia_url), url: m.midia_url,
      bytes: caminho ? (tamanhos.get(caminho) || 0) : 0, criado_em: m.criado_em,
    }
  }).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
  return { itens, bytes: itens.reduce((t, x) => t + x.bytes, 0) }
}

/**
 * Apaga o arquivo do armazenamento e deixa a mensagem como "arquivo removido".
 * Só de candidatos. Sem critério (lista de mensagens ou idade), não apaga nada.
 */
export async function excluirArquivos(salaoId: string, mensagens: string[], antesDeDias?: number, todos = false) {
  if (!mensagens.length && !antesDeDias && !todos) return { removidos: 0, bytes: 0 }
  const { itens } = await arquivosDosCandidatos(salaoId)
  const corte = antesDeDias ? new Date(Date.now() - antesDeDias * 86400e3).toISOString() : null
  const quer = new Set(mensagens)
  const alvo = itens.filter(x => (quer.size ? quer.has(x.mensagem) : true) && (!corte || x.criado_em < corte))
  if (!alvo.length) return { removidos: 0, bytes: 0 }
  const caminhos = alvo.map(x => caminhoDaUrl(x.url, salaoId)).filter(Boolean) as string[]
  for (const lote of pedacos(caminhos, 100)) await supabaseAdmin.storage.from(BUCKET).remove(lote)
  for (const lote of pedacos(alvo.map(x => x.mensagem), 100)) {
    await supabaseAdmin.from('crm_mensagens')
      .update({ midia_url: null, texto: '[arquivo removido]', tipo: 'texto', transcricao: null })
      .eq('salao_id', salaoId).in('id', lote)
  }
  return { removidos: alvo.length, bytes: alvo.reduce((t, x) => t + x.bytes, 0) }
}

// ── Mensagens variadas para o lote ──────────────────────────────────────────
//
// Reveza os modelos sem repetir o mesmo texto em duas pessoas seguidas. Se há
// menos modelos que pessoas, o modelo que se repete ganha uma abertura e um
// fecho diferentes -- o WhatsApp bloqueia quem manda texto idêntico em série.

const ABERTURAS = ['Olá', 'Oi']
const FECHOS = ['', ' Obrigada!', ' Fico no aguardo.', ' Um abraço.', ' Aguardo o seu retorno.']
const escolhe = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)]

export function distribuirModelos(modelos: string[], quantidade: number): { textos: string[]; variados: boolean } {
  const limpos = modelos.map(m => m.trim()).filter(Boolean)
  if (!limpos.length) return { textos: [], variados: false }
  const usos = new Map<number, number>()
  const textos: string[] = []
  let anterior = -1
  let fila: number[] = []
  for (let i = 0; i < quantidade; i++) {
    if (!fila.length) {
      fila = limpos.map((_, k) => k).sort(() => Math.random() - 0.5)
      if (fila.length > 1 && fila[0] === anterior) fila.push(fila.shift()!)   // nunca repete em seguida
    }
    const k = fila.shift()!
    anterior = k
    const vez = usos.get(k) || 0
    usos.set(k, vez + 1)
    let t = limpos[k]
    if (vez > 0) {
      t = t.replace(/^(ol[aá]|oi)\b/i, () => escolhe(ABERTURAS))
      t = t.trimEnd() + escolhe(FECHOS)
    }
    textos.push(t)
  }
  return { textos, variados: limpos.length < quantidade }
}

// ── O arquivo do candidato não some em 30 dias ──────────────────────────────
//
// A limpeza geral do CRM (api/cron/limpar-midia) apaga, todo dia, qualquer
// arquivo de `crm/<salao>/` com mais de 30 dias. Currículo que o candidato
// manda pelo WhatsApp cairia nela. Então, antes dela rodar, a rotina daqui
// MOVE os arquivos de candidatos para `curriculos/<salao>/`, que a limpeza
// geral não olha, e aponta a mensagem para o novo endereço. Quem decide quando
// o currículo sai é o dono: na mão, ou pelo botão de exclusão automática.
export async function arquivarMidiaDeCandidatos(salaoId: string): Promise<number> {
  const conversas = await conversasDosCandidatos(salaoId)
  const ids = conversas.map((c: any) => c.id)
  let movidos = 0
  for (const lote of pedacos(ids, 100)) {
    const { data } = await supabaseAdmin.from('crm_mensagens').select('id, midia_url')
      .eq('salao_id', salaoId).in('conversa_id', lote).like('midia_url', `%/uploads/crm/${salaoId}/%`)
    for (const m of (data || []) as any[]) {
      const de = caminhoDaUrl(m.midia_url, salaoId)
      if (!de || !de.startsWith(`crm/${salaoId}/`)) continue
      const para = de.replace(`crm/${salaoId}/`, `curriculos/${salaoId}/`)
      const { error } = await supabaseAdmin.storage.from(BUCKET).move(de, para)
      if (error) continue
      const novaUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(para).data.publicUrl
      await supabaseAdmin.from('crm_mensagens').update({ midia_url: novaUrl }).eq('id', m.id)
      movidos++
    }
  }
  return movidos
}

/** Rotina diária de todos os salões: guarda o que é de candidato e, se o dono ligou, apaga o antigo. */
export async function rotinaDiariaCurriculos() {
  const { data: saloes } = await supabaseAdmin.from('saloes').select('id')
  const resumo: { salao: string; movidos: number; apagados: number }[] = []
  for (const s of (saloes || []) as any[]) {
    try {
      const movidos = await arquivarMidiaDeCandidatos(s.id)
      const cfg = await lerConfigCurriculos(s.id)
      const apagados = cfg.limpeza.ligado ? (await excluirArquivos(s.id, [], cfg.limpeza.dias)).removidos : 0
      if (movidos || apagados) resumo.push({ salao: s.id, movidos, apagados })
    } catch { /* um salão com problema não pára os outros */ }
  }
  return resumo
}

// ── Agendar o lote no ritmo do salão ────────────────────────────────────────
//
// A ponte só pega mensagem `na_fila` cujo criado_em já venceu. Então o ritmo
// vira DATA: cada mensagem nasce com o criado_em do instante em que deve sair,
// respeitando dias da semana, janela de horário, intervalo (com ~20% de
// variação, como no Envio automático) e o máximo por dia -- contando o que já
// estava agendado ou foi enviado naquele dia na pasta Currículos.
// Fuso de Brasília (UTC-3, sem horário de verão).

const FUSO_MS = -3 * 3600e3
const minutosDe = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
/** "2026-10-26" de um instante, em Brasília. */
const diaBR = (t: number) => new Date(t + FUSO_MS).toISOString().slice(0, 10)
/** Instante (ms) de um dia de Brasília às N minutos. */
const instanteDe = (dia: string, minutos: number) => Date.parse(`${dia}T00:00:00Z`) - FUSO_MS + minutos * 60000
const semanaBR = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay()

/** Quantas saídas da pasta Currículos já há por dia (enviadas hoje ou agendadas), de hoje a 14 dias. */
export async function saidasPorDia(salaoId: string): Promise<Record<string, number>> {
  const { data: convs } = await supabaseAdmin.from('crm_conversas').select('id')
    .eq('salao_id', salaoId).eq('estado', PASTA_CURRICULOS).limit(2000)
  const ids = (convs || []).map((c: any) => c.id)
  const mapa: Record<string, number> = {}
  if (!ids.length) return mapa
  const desde = new Date(instanteDe(diaBR(Date.now()), 0)).toISOString()
  const ate = new Date(Date.now() + 15 * 86400e3).toISOString()
  for (const lote of pedacos(ids, 150)) {
    const { data } = await supabaseAdmin.from('crm_mensagens').select('criado_em')
      .eq('salao_id', salaoId).eq('direcao', 'saida').gte('criado_em', desde).lte('criado_em', ate).in('conversa_id', lote)
    for (const m of (data || []) as any[]) { const d = diaBR(Date.parse(m.criado_em)); mapa[d] = (mapa[d] || 0) + 1 }
  }
  return mapa
}

/**
 * Os instantes (ms) em que cada uma das `quantidade` mensagens deve sair.
 * Devolve null se não coube em 14 dias (ritmo apertado demais).
 */
export function agendarNoRitmo(quantidade: number, ritmo: RitmoCurriculos, jaPorDia: Record<string, number>, agora = Date.now()): number[] | null {
  const r = limparRitmo(ritmo)
  const ini = minutosDe(r.janela_ini), fim = minutosDe(r.janela_fim)
  const saidas: number[] = []
  let ultimo = 0
  for (let d = 0; d < 15 && saidas.length < quantidade; d++) {
    const dia = diaBR(agora + d * 86400e3)
    if (!r.dias_semana.includes(semanaBR(dia))) continue
    let usados = jaPorDia[dia] || 0
    // Primeiro horário do dia: o começo da janela, ou "daqui a pouco" se já passou dele.
    let t = Math.max(instanteDe(dia, ini), agora + 60e3, ultimo ? ultimo + r.intervalo_min * 60e3 * 0.85 : 0)
    const limite = instanteDe(dia, fim)
    while (saidas.length < quantidade && usados < r.max_dia && t <= limite) {
      saidas.push(t); ultimo = t; usados++
      t += r.intervalo_min * 60e3 * (0.85 + Math.random() * 0.3)   // variação de 15% para cada lado
    }
  }
  return saidas.length === quantidade ? saidas : null
}

/** Quantas mensagens de candidatos estão agendadas para o futuro (ainda na fila). */
export async function contarAgendadas(salaoId: string): Promise<number> {
  const { data: convs } = await supabaseAdmin.from('crm_conversas').select('id')
    .eq('salao_id', salaoId).eq('estado', PASTA_CURRICULOS).limit(2000)
  const ids = (convs || []).map((c: any) => c.id)
  let total = 0
  for (const lote of pedacos(ids, 150)) {
    const { count } = await supabaseAdmin.from('crm_mensagens').select('id', { count: 'exact', head: true })
      .eq('salao_id', salaoId).eq('direcao', 'saida').eq('situacao', 'na_fila')
      .gt('criado_em', new Date().toISOString()).in('conversa_id', lote)
    total += count || 0
  }
  return total
}

/** Cancela o que ainda não saiu: só mensagens na fila, no futuro, de conversas da pasta Currículos. */
export async function cancelarAgendadas(salaoId: string): Promise<number> {
  const { data: convs } = await supabaseAdmin.from('crm_conversas').select('id')
    .eq('salao_id', salaoId).eq('estado', PASTA_CURRICULOS).limit(2000)
  const ids = (convs || []).map((c: any) => c.id)
  let total = 0
  for (const lote of pedacos(ids, 150)) {
    const { data } = await supabaseAdmin.from('crm_mensagens').delete()
      .eq('salao_id', salaoId).eq('direcao', 'saida').eq('situacao', 'na_fila')
      .gt('criado_em', new Date().toISOString()).in('conversa_id', lote).select('id')
    total += (data || []).length
  }
  return total
}

/** "hoje às 09:00" / "amanhã às 09:00" / "28/10 às 14:20", em Brasília. */
export function quandoBR(t: number, agora = Date.now()): string {
  const dia = diaBR(t), hoje = diaBR(agora), amanha = diaBR(agora + 86400e3)
  const h = new Date(t + FUSO_MS).toISOString().slice(11, 16)
  return `${dia === hoje ? 'hoje' : dia === amanha ? 'amanhã' : `${dia.slice(8, 10)}/${dia.slice(5, 7)}`} às ${h}`
}
export const diasEntre = (a: number, b: number) => new Set([diaBR(a), diaBR(b)]).size === 1 ? 1 : Math.round((Date.parse(diaBR(b)) - Date.parse(diaBR(a))) / 86400e3) + 1
