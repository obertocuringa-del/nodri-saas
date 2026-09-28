// ── Envio automático (recuperação e promoção por lista) ─────────────────────
//
// Pedido do dono em 28/09/2026. Diferente das campanhas do relatório do Avec
// (confirmação, feedback), que mandam para quem tem horário HOJE/AMANHÃ, este
// manda para uma LISTA de clientes do histórico -- perdidas, em risco, quem
// faz tal serviço -- uma mensagem por vez, bem espaçada, ao longo de dias ou
// meses, até a lista acabar.
//
// As regras que ele pediu, e onde cada uma mora:
//
//   ritmo         intervalo entre mensagens + máximo por dia + janela 09-21h
//                 (cron de minuto em minuto chama `rodarDisparos`)
//   ordem         da visita mais recente para a mais antiga (`publicoDe`)
//   memória       crm_disparo_envios: quem já recebeu NESTE envio e ciclo
//                 nunca recebe de novo, mesmo pausando por meses
//   trava         quem recebeu qualquer envio -- ou foi contatada à mão pelo
//                 botão das listas -- nos últimos N dias fica de fora
//   um por vez    só um envio ligado por salão (a rota desliga os outros)
//   não junta     com mensagem na fila (confirmação, feedback) ele ESPERA a
//                 fila esvaziar e mais 5 minutos (`filaOcupada`)
//   parar         quem responde "parar"/"sair" nunca mais recebe envio
//
// Nunca manda para: quem está conversando (fala da cliente nas últimas 48h),
// quem recebeu qualquer mensagem do salão nas últimas 24h, profissional do
// salão, número que não é celular.

import { supabaseAdmin } from '@/lib/supabase'
import { paginar } from '@/lib/paginar'
import { normalizarTelefone, chaveTelefone, proximaAcaoPadrao, PASSIVAS_DO_DISPARO } from '@/lib/crm'
import { acharOuCriarContato, grafiasDoTelefone } from '@/lib/crmContatos'
import { carregarCampanhas } from '@/lib/crmCampanhas'

export const CHAVE_DISPAROS = 'crm_disparos'
export const CHAVE_ESTADO_DISPAROS = 'crm_disparos_estado'
export const AUTOR_DISPARO = 'Envio automático'
const PASTA_DO_DISPARO = 'aguardando_promo'   // "Listas" no CRM
const FUSO = 'America/Sao_Paulo'

export type Segmento = 'todos' | 'vip' | 'regular' | 'novo'

export interface Publico {
  /** sem vir há pelo menos N dias (0 = qualquer) */
  dias_min: number
  /** e no máximo N dias (0 = sem teto) */
  dias_max: number
  /** fez pelo menos um destes serviços (vazio = qualquer) */
  servicos: string[]
  segmento: Segmento
}

export interface Disparo {
  id: string
  nome: string
  ligado: boolean
  publico: Publico
  /** 1 a 3 versões da mesma mensagem, alternadas */
  mensagens: string[]
  janela_ini: string
  janela_fim: string
  /** 0 = domingo ... 6 = sábado */
  dias_semana: number[]
  intervalo_min: number
  max_dia: number
  /** quem recebeu qualquer envio (ou contato manual) nestes dias fica de fora */
  trava_dias: number
  ciclo: number
  criado_em: string
}

export interface EstadoDisparo {
  proximo_em: string | null
  dia: string
  enviados_dia: number
  ultimo_envio_em: string | null
  ultimo_cliente: string | null
  /** o que a tela mostra: "Enviando", "Esperando a confirmação terminar"... */
  situacao: string
  concluido_em: string | null
}

const num = (v: any, pad: number, min: number, max: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : pad
}
const soHora = (s: any, pad: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(s || ''))
  if (!m) return pad
  const h = Math.min(Number(m[1]), 23), mi = Math.min(Number(m[2]), 59)
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}
export const semAcento = (s: string) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function lerDisparo(b: any): Disparo | null {
  const id = String(b?.id || '').trim()
  if (!id) return null
  const p = b.publico || {}
  const dias_min = num(p.dias_min, 90, 0, 3650)
  let dias_max = num(p.dias_max, 365, 0, 3650)
  if (dias_max && dias_max < dias_min) dias_max = dias_min
  const seg = ['todos', 'vip', 'regular', 'novo'].includes(p.segmento) ? p.segmento : 'todos'
  const dias = Array.isArray(b.dias_semana)
    ? [...new Set(b.dias_semana.map((d: any) => num(d, -1, -1, 6)).filter((d: number) => d >= 0))] as number[]
    : [1, 2, 3, 4, 5, 6]
  return {
    id,
    nome: String(b.nome || 'Envio').slice(0, 60),
    ligado: b.ligado === true,
    publico: {
      dias_min, dias_max, segmento: seg,
      servicos: Array.isArray(p.servicos) ? p.servicos.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 40) : [],
    },
    mensagens: (Array.isArray(b.mensagens) ? b.mensagens : [])
      .map((m: any) => String(m || '').trim()).filter(Boolean).slice(0, 3),
    janela_ini: soHora(b.janela_ini, '09:00'),
    janela_fim: soHora(b.janela_fim, '21:00'),
    dias_semana: dias.length ? dias.sort() : [1, 2, 3, 4, 5, 6],
    // Piso de 5 minutos: abaixo disso deixa de ser "espaçado".
    intervalo_min: num(b.intervalo_min, 30, 5, 720),
    max_dia: num(b.max_dia, 20, 1, 300),
    trava_dias: num(b.trava_dias, 30, 0, 180),
    ciclo: num(b.ciclo, 1, 1, 999),
    criado_em: String(b.criado_em || new Date().toISOString()),
  }
}

export async function carregarDisparos(salaoId: string): Promise<Disparo[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_DISPAROS).maybeSingle()
  const lista = Array.isArray((data?.valor as any)?.disparos) ? (data!.valor as any).disparos : []
  return lista.map(lerDisparo).filter(Boolean) as Disparo[]
}

export async function gravarDisparos(salaoId: string, disparos: Disparo[]) {
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_DISPAROS,
    valor: { disparos }, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

const ESTADO_VAZIO: EstadoDisparo = {
  proximo_em: null, dia: '', enviados_dia: 0, ultimo_envio_em: null, ultimo_cliente: null, situacao: '', concluido_em: null,
}

export async function carregarEstadosDisparo(salaoId: string): Promise<Record<string, EstadoDisparo>> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_ESTADO_DISPAROS).maybeSingle()
  const v = (data?.valor as any) || {}
  const saida: Record<string, EstadoDisparo> = {}
  for (const [k, e] of Object.entries<any>(v)) saida[k] = { ...ESTADO_VAZIO, ...(e || {}) }
  return saida
}

async function gravarEstadosDisparo(salaoId: string, estados: Record<string, EstadoDisparo>) {
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_ESTADO_DISPAROS,
    valor: estados, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

// ── Relógio do salão ─────────────────────────────────────────────────────────
function agoraNoSalao() {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(new Date())
  const g = (t: string) => p.find(x => x.type === t)?.value || ''
  const dias: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const hora = `${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`
  return { dia: `${g('year')}-${g('month')}-${g('day')}`, hora, semana: dias[g('weekday')] ?? 0 }
}
const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/** Quantas mensagens cabem por dia com este ritmo (o menor entre o teto e a janela). */
export function cabemPorDia(d: Pick<Disparo, 'janela_ini' | 'janela_fim' | 'intervalo_min' | 'max_dia'>) {
  const janela = Math.max(0, minutos(d.janela_fim) - minutos(d.janela_ini))
  return Math.min(d.max_dia, Math.floor(janela / d.intervalo_min) + 1)
}

// ── Perfis de clientes ───────────────────────────────────────────────────────
//
// A MESMA conta das listas de Mais Relatórios (função perfis_clientes do
// banco), para "Perdidas" aqui e lá contarem igual. Guardada 30 minutos em
// memória: o servidor é um processo só, e recalcular a cada mensagem seria
// baixar a base de clientes inteira dezenas de vezes por dia.

export interface PerfilCliente {
  cliente_nome: string
  celular: string
  chave: string
  celular_ok: boolean
  ltv_total: number
  total_visitas: number
  ultima_visita: string
  dias: number
  servicos: string[]
  segmento: 'vip' | 'regular' | 'novo'
}

const _perfis = new Map<string, { em: number; lista: PerfilCliente[] }>()

const parseBR = (s: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '')
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00-03:00`).getTime() : 0
}

/** Celular de verdade: 55 + DDD + 9 dígitos, ou o formato antigo de 8 começando em 6-9. */
function ehCelular(tel: string) {
  if (tel.length === 13) return tel[4] === '9'
  if (tel.length === 12) return /[6-9]/.test(tel[4])
  return false
}

export async function perfisDoSalao(salaoId: string, fresco = false): Promise<PerfilCliente[]> {
  const c = _perfis.get(salaoId)
  if (!fresco && c && Date.now() - c.em < 30 * 60000) return c.lista
  const { dados } = await paginar<any>((de, ate) =>
    supabaseAdmin.rpc('perfis_clientes', { p_salao: salaoId, p_ano_de: null, p_ano_ate: null }).range(de, ate) as any, 60000)
  const agora = Date.now()
  const lista: PerfilCliente[] = dados.map((r: any) => {
    const tel = normalizarTelefone(r.celular)
    const ultima = String(r.ultima_visita || '')
    return {
      cliente_nome: String(r.cliente_nome || '').trim(),
      celular: tel,
      chave: chaveTelefone(tel),
      celular_ok: ehCelular(tel),
      ltv_total: Number(r.ltv_total) || 0,
      total_visitas: Number(r.total_visitas) || 0,
      ultima_visita: ultima,
      dias: ultima ? Math.floor((agora - parseBR(ultima)) / 864e5) : 99999,
      servicos: Array.isArray(r.servicos_feitos) ? r.servicos_feitos : [],
      segmento: 'regular' as const,
    }
  }).filter(p => p.cliente_nome)
  // VIP = top 15% por gasto; novo = 1 visita (a mesma regra da tela).
  const ltvs = lista.map(p => p.ltv_total).sort((a, b) => b - a)
  const corte = ltvs.length ? (ltvs[Math.floor(ltvs.length * 0.15)] || ltvs[0] || 0) : 0
  for (const p of lista) {
    p.segmento = p.total_visitas <= 1 ? 'novo' : (p.ltv_total > 0 && p.ltv_total >= corte ? 'vip' : 'regular')
  }
  _perfis.set(salaoId, { em: Date.now(), lista })
  return lista
}

/**
 * Quem entra na lista, JÁ NA ORDEM de envio: da visita mais recente para a
 * mais antiga (quem veio há pouco é quem mais volta). Um telefone só uma vez.
 */
export function publicoDe(perfis: PerfilCliente[], p: Publico) {
  const alvos = new Set(p.servicos.map(semAcento))
  const dentro = perfis.filter(x =>
    x.dias >= p.dias_min && (!p.dias_max || x.dias <= p.dias_max)
    && (p.segmento === 'todos' || x.segmento === p.segmento)
    && (!alvos.size || x.servicos.some(s => alvos.has(semAcento(s)))))
  dentro.sort((a, b) => a.dias - b.dias)
  const vistos = new Set<string>()
  const lista: PerfilCliente[] = []
  let semCelular = 0
  for (const x of dentro) {
    if (!x.celular_ok) { semCelular++; continue }
    if (vistos.has(x.chave)) continue
    vistos.add(x.chave)
    lista.push(x)
  }
  return { lista, semCelular }
}

const primeiroNome = (s: string) => {
  const n = String(s || '').trim().split(/\s+/)[0] || ''
  // "HELOISA" -> "Heloisa": nome gritado em maiúsculas não parece pessoa escrevendo.
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : ''
}

export function textoPara(d: Disparo, x: PerfilCliente, indice: number) {
  const modelo = d.mensagens.length ? d.mensagens[indice % d.mensagens.length] : ''
  const alvos = new Set(d.publico.servicos.map(semAcento))
  const servico = x.servicos.find(s => alvos.has(semAcento(s))) || x.servicos[0] || ''
  const dados: Record<string, string> = {
    cliente: primeiroNome(x.cliente_nome), dias: String(x.dias),
    ultima_visita: x.ultima_visita, servico: servico.toLowerCase(),
  }
  return modelo.replace(/\{(\w+)\}/g, (_, k) => dados[k] ?? '')
    .replace(/[ \t]+([,.!?;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim()
}

// ── Quem nunca / agora não ───────────────────────────────────────────────────
const PEDIU_PARA_SAIR = [
  /^\s*(parar|pare|para|sair|stop|cancelar|remover|descadastrar)\s*[.!]*\s*$/i,
  /n[aã]o quero (mais )?receber/i,
  /(me )?(tira|tire|remove|remova) (da|dessa|desta) lista/i,
]

async function chavesDoEnvio(salaoId: string, disparoId: string, ciclo: number) {
  const { dados } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_envios')
    .select('chave').eq('salao_id', salaoId).eq('disparo_id', disparoId).eq('ciclo', ciclo).range(de, ate))
  return new Set(dados.map(r => r.chave))
}

async function bloqueados(salaoId: string) {
  const { dados } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_bloqueios')
    .select('chave').eq('salao_id', salaoId).range(de, ate))
  return new Set(dados.map(r => r.chave))
}

/** Recebeu envio automático OU foi contatada à mão (botão das listas) há menos de N dias. */
async function travados(salaoId: string, dias: number) {
  const chaves = new Set<string>(), nomes = new Set<string>()
  if (!dias) return { chaves, nomes }
  const desde = new Date(Date.now() - dias * 864e5).toISOString()
  const { dados: env } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_envios')
    .select('chave').eq('salao_id', salaoId).gte('enviado_em', desde).range(de, ate))
  for (const r of env) chaves.add(r.chave)
  const { dados: man } = await paginar<any>((de, ate) => supabaseAdmin.from('clientes_contatos')
    .select('cliente_nome, celular').eq('salao_id', salaoId).gte('contato_em', desde).range(de, ate))
  for (const r of man) { nomes.add(String(r.cliente_nome || '').trim()); if (r.celular) chaves.add(chaveTelefone(r.celular)) }
  return { chaves, nomes }
}

async function telefonesDeProfissionais(salaoId: string) {
  const { data } = await supabaseAdmin.from('profissionais').select('telefone').eq('salao_id', salaoId).limit(500)
  return new Set((data || []).map((p: any) => chaveTelefone(p.telefone)).filter(Boolean))
}

/**
 * Olha a conversa da cliente antes de mandar. Devolve o motivo para NÃO
 * mandar agora, ou null se pode.
 */
async function conferirConversa(salaoId: string, x: PerfilCliente): Promise<{ pular?: string; bloquear?: string }> {
  const { data: cts } = await supabaseAdmin.from('crm_contatos').select('id')
    .eq('salao_id', salaoId).in('telefone', grafiasDoTelefone(x.celular)).limit(5)
  const ids = (cts || []).map((c: any) => c.id)
  if (!ids.length) return {}
  const { data: convs } = await supabaseAdmin.from('crm_conversas').select('id, estado')
    .eq('salao_id', salaoId).in('contato_id', ids).limit(50)
  if ((convs || []).some((c: any) => /^extra_profissiona/.test(String(c.estado || '')))) return { pular: 'profissional' }
  const conv = (convs || []).map((c: any) => c.id)
  if (!conv.length) return {}
  const { data: msgs } = await supabaseAdmin.from('crm_mensagens').select('direcao, texto, criado_em')
    .in('conversa_id', conv).order('criado_em', { ascending: false }).limit(60)
  const agora = Date.now()
  for (const m of msgs || []) {
    if (m.direcao === 'entrada' && PEDIU_PARA_SAIR.some(r => r.test(String(m.texto || '')))) return { bloquear: 'pediu para sair' }
  }
  const ultEntrada = (msgs || []).find((m: any) => m.direcao === 'entrada')
  if (ultEntrada && agora - new Date(ultEntrada.criado_em).getTime() < 48 * 3600e3) return { pular: 'em conversa' }
  const ultSaida = (msgs || []).find((m: any) => m.direcao === 'saida')
  if (ultSaida && agora - new Date(ultSaida.criado_em).getTime() < 24 * 3600e3) return { pular: 'recebeu mensagem hoje' }
  return {}
}

/**
 * A fila do WhatsApp do salão está ocupada? Confirmação, feedback, resposta
 * da recepção: tudo que está esperando para sair. O envio automático só entra
 * com a fila VAZIA e 5 minutos depois da última mensagem automática -- é o
 * "nunca junto com a confirmação" do dono.
 */
async function filaOcupada(salaoId: string): Promise<string | null> {
  const seisHoras = new Date(Date.now() - 6 * 3600e3).toISOString()
  const { count } = await supabaseAdmin.from('crm_mensagens').select('id', { count: 'exact', head: true })
    .eq('salao_id', salaoId).in('situacao', ['na_fila', 'enviando']).gte('criado_em', seisHoras)
    .lte('criado_em', new Date(Date.now() + 6 * 3600e3).toISOString())
  if ((count || 0) > 0) return 'Pausado: esperando a confirmação/feedback terminar de sair'
  const autores = ['Automação de feedback', 'Confirmação automática',
    ...(await carregarCampanhas(salaoId)).map(c => c.nome)]
  const { data } = await supabaseAdmin.from('crm_mensagens').select('criado_em')
    .eq('salao_id', salaoId).eq('direcao', 'saida').in('autor_nome', autores)
    .order('criado_em', { ascending: false }).limit(1)
  const ult = data?.[0]?.criado_em
  if (ult && Date.now() - new Date(ult).getTime() < 5 * 60000) return 'Pausado: respiro de 5 min depois da confirmação/feedback'
  return null
}

// ── A conversa onde a mensagem entra ─────────────────────────────────────────
//
// A mesma regra das campanhas: conversa aberta é reusada; encerrada há até 7
// dias também; mais velha que isso, nasce outra. Usada também pelo botão
// verde das listas, que agora abre a conversa no CRM.
export async function conversaDoContato(salaoId: string, contatoId: string, pastaNova: string) {
  const agoraIso = new Date().toISOString()
  const { data: abertas } = await supabaseAdmin.from('crm_conversas').select('id, estado, nao_lidas')
    .eq('salao_id', salaoId).eq('contato_id', contatoId)
    .not('estado', 'in', '("agendado","confirmado","sem_conversao","desmarcou")')
    .order('ultima_em', { ascending: false }).limit(1)
  let conversa: any = abertas?.[0] || null
  let reaberta = false
  if (!conversa) {
    const { data: ult } = await supabaseAdmin.from('crm_conversas')
      .select('id, estado, nao_lidas, fechada_em, ultima_em')
      .eq('salao_id', salaoId).eq('contato_id', contatoId)
      .order('ultima_em', { ascending: false }).limit(1)
    const f: any = ult?.[0]
    const quando = f?.fechada_em || f?.ultima_em
    if (f && quando && new Date(quando).getTime() >= Date.now() - 7 * 864e5) { conversa = f; reaberta = true }
  }
  if (!conversa) {
    const { data: nova } = await supabaseAdmin.from('crm_conversas').insert({
      salao_id: salaoId, contato_id: contatoId, estado: pastaNova, importada: true,
      proxima_acao: proximaAcaoPadrao(pastaNova as any), ultima_em: agoraIso, ultima_de: 'salao', nao_lidas: 0,
    }).select('id, estado, nao_lidas').maybeSingle()
    return { conversa: nova, reaberta: false, nova: true }
  }
  return { conversa, reaberta, nova: false }
}

async function enviarPara(salaoId: string, d: Disparo, x: PerfilCliente, texto: string) {
  const contato = await acharOuCriarContato(salaoId, x.celular, x.cliente_nome)
  if (!contato) return null
  const { conversa, reaberta, nova } = await conversaDoContato(salaoId, contato.id, PASTA_DO_DISPARO)
  if (!conversa) return null
  const agoraIso = new Date().toISOString()
  if (!nova) {
    // Só tira de pasta PASSIVA: quem está em "Preciso agir", Follow-up ou numa
    // pasta do salão fica onde está.
    const patch: any = { ultima_em: agoraIso, ultima_de: 'salao', ultima_previa: texto.slice(0, 120), atualizado_em: agoraIso }
    const reabre = reaberta && !((conversa.nao_lidas || 0) > 0)
    if (reabre || PASSIVAS_DO_DISPARO.includes(conversa.estado)) {
      patch.estado = PASTA_DO_DISPARO
      patch.proxima_acao = proximaAcaoPadrao(PASTA_DO_DISPARO as any)
      patch.aguardando_desde = null
      if (reabre) patch.fechada_em = null
    }
    await supabaseAdmin.from('crm_conversas').update(patch).eq('id', conversa.id)
  } else {
    await supabaseAdmin.from('crm_conversas').update({ ultima_previa: texto.slice(0, 120) }).eq('id', conversa.id)
  }

  // A marca de "já recebeu" entra ANTES da mensagem: se duas voltas correrem
  // juntas, a segunda bate na chave única e não manda de novo.
  const { error: dup } = await supabaseAdmin.from('crm_disparo_envios').insert({
    salao_id: salaoId, disparo_id: d.id, ciclo: d.ciclo, chave: x.chave,
    cliente_nome: x.cliente_nome, conversa_id: conversa.id,
  })
  if (dup) return null

  const { data: msg } = await supabaseAdmin.from('crm_mensagens').insert({
    salao_id: salaoId, conversa_id: conversa.id, direcao: 'saida', texto, tipo: 'texto',
    situacao: 'na_fila', autor_nome: AUTOR_DISPARO, em_massa: true, criado_em: agoraIso,
  }).select('id').maybeSingle()
  if (msg?.id) {
    await supabaseAdmin.from('crm_disparo_envios').update({ mensagem_id: msg.id })
      .eq('salao_id', salaoId).eq('disparo_id', d.id).eq('ciclo', d.ciclo).eq('chave', x.chave)
  }

  // O mesmo registro do botão verde das listas: trava o botão por 10 dias,
  // conta "1x · data" e entra no relatório de Recuperados.
  await supabaseAdmin.from('clientes_contatos').insert({
    salao_id: salaoId, cliente_nome: x.cliente_nome, celular: x.celular,
    origem: 'envio_automatico', recepcionista_id: null, recepcionista_nome: AUTOR_DISPARO,
    mensagem: texto, contato_em: agoraIso,
  })
  return conversa.id
}

/**
 * Uma volta do relógio para UM salão. Manda no máximo uma mensagem.
 * Devolve o que aconteceu (para o log do cron).
 */
export async function rodarDisparoDoSalao(salaoId: string): Promise<string> {
  const disparos = await carregarDisparos(salaoId)
  const d = disparos.find(x => x.ligado)
  if (!d) return 'nenhum ligado'
  const estados = await carregarEstadosDisparo(salaoId)
  const e: EstadoDisparo = { ...ESTADO_VAZIO, ...(estados[d.id] || {}) }
  const salvar = async (situacao: string) => { e.situacao = situacao; estados[d.id] = e; await gravarEstadosDisparo(salaoId, estados); return situacao }

  const agora = agoraNoSalao()
  if (e.dia !== agora.dia) { e.dia = agora.dia; e.enviados_dia = 0 }
  if (!d.mensagens.length) return salvar('Sem mensagem escrita')
  if (!d.dias_semana.includes(agora.semana)) return salvar('Hoje não é dia de envio')
  if (agora.hora < d.janela_ini) return salvar(`Começa às ${d.janela_ini}`)
  if (agora.hora >= d.janela_fim) return salvar(`Encerrado por hoje (volta amanhã às ${d.janela_ini})`)
  if (e.enviados_dia >= d.max_dia) return salvar(`Limite do dia atingido (${d.max_dia})`)
  if (e.proximo_em && Date.now() < new Date(e.proximo_em).getTime()) {
    const h = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(e.proximo_em))
    return salvar(`Próxima mensagem às ${h}`)
  }

  const ocupada = await filaOcupada(salaoId)
  if (ocupada) return salvar(ocupada)

  const perfis = await perfisDoSalao(salaoId)
  const { lista } = publicoDe(perfis, d.publico)
  const [feitos, bloq, trava, profs] = await Promise.all([
    chavesDoEnvio(salaoId, d.id, d.ciclo), bloqueados(salaoId), travados(salaoId, d.trava_dias), telefonesDeProfissionais(salaoId),
  ])
  const restantes = lista.filter(x => !feitos.has(x.chave) && !bloq.has(x.chave) && !profs.has(x.chave))
  if (!restantes.length) {
    e.concluido_em = new Date().toISOString()
    d.ligado = false
    await gravarDisparos(salaoId, disparos)
    return salvar('Lista concluída: todas receberam')
  }

  // Olha no máximo 25 por volta: quem está em conversa ou travada fica para
  // depois, e a volta não pode demorar.
  let olhadas = 0
  for (const x of restantes) {
    if (trava.chaves.has(x.chave) || trava.nomes.has(x.cliente_nome)) continue
    if (++olhadas > 25) break
    const c = await conferirConversa(salaoId, x)
    if (c.bloquear) {
      await supabaseAdmin.from('crm_disparo_bloqueios').upsert({ salao_id: salaoId, chave: x.chave, motivo: c.bloquear })
      continue
    }
    if (c.pular) continue
    const texto = textoPara(d, x, feitos.size)
    if (!texto) continue
    const conv = await enviarPara(salaoId, d, x, texto)
    if (!conv) continue
    e.enviados_dia++
    e.ultimo_envio_em = new Date().toISOString()
    e.ultimo_cliente = x.cliente_nome
    // Intervalo com variação de 15% para os envios não saírem num compasso de relógio.
    const var15 = 0.85 + Math.random() * 0.3
    e.proximo_em = new Date(Date.now() + d.intervalo_min * var15 * 60000).toISOString()
    return salvar(`Enviando: última para ${primeiroNome(x.cliente_nome)}`)
  }
  e.proximo_em = new Date(Date.now() + 15 * 60000).toISOString()
  return salvar('Ninguém disponível agora (em conversa ou contatada há pouco); tenta de novo em 15 min')
}

/** A volta do cron: todos os salões com envio ligado, um de cada vez. */
let _rodando = false
export async function rodarDisparos() {
  if (_rodando) return { ok: true, pulado: 'volta anterior ainda rodando' }
  _rodando = true
  try {
    const { data } = await supabaseAdmin.from('salao_config').select('salao_id, valor').eq('chave', CHAVE_DISPAROS)
    const saida: Record<string, string> = {}
    for (const r of data || []) {
      const temLigado = ((r.valor as any)?.disparos || []).some((x: any) => x?.ligado === true)
      if (!temLigado) continue
      try { saida[r.salao_id] = await rodarDisparoDoSalao(r.salao_id) }
      catch (err: any) { saida[r.salao_id] = 'erro: ' + String(err?.message || err).slice(0, 200) }
    }
    return { ok: true, saloes: saida }
  } finally { _rodando = false }
}

// ── Números para a tela ──────────────────────────────────────────────────────
export async function resumoDoDisparo(salaoId: string, d: Disparo) {
  const perfis = await perfisDoSalao(salaoId)
  const { lista, semCelular } = publicoDe(perfis, d.publico)
  const [feitos, bloq] = await Promise.all([chavesDoEnvio(salaoId, d.id, d.ciclo), bloqueados(salaoId)])
  const naLista = lista.filter(x => !bloq.has(x.chave))
  const enviadas = naLista.filter(x => feitos.has(x.chave)).length

  // Respostas e retornos: do ciclo atual, contados em cima das envios gravados.
  const { dados: envios } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_envios')
    .select('cliente_nome, conversa_id, enviado_em').eq('salao_id', salaoId).eq('disparo_id', d.id).range(de, ate))
  let responderam = 0
  const porConversa = new Map<string, number>()
  for (const v of envios) if (v.conversa_id) porConversa.set(v.conversa_id, Math.min(porConversa.get(v.conversa_id) ?? Infinity, new Date(v.enviado_em).getTime()))
  const ids = [...porConversa.keys()]
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await supabaseAdmin.from('crm_mensagens').select('conversa_id, criado_em')
      .in('conversa_id', ids.slice(i, i + 150)).eq('direcao', 'entrada').order('criado_em', { ascending: false }).limit(1000)
    const ja = new Set<string>()
    for (const m of data || []) {
      if (ja.has(m.conversa_id)) continue
      if (new Date(m.criado_em).getTime() > (porConversa.get(m.conversa_id) || Infinity)) { ja.add(m.conversa_id); responderam++ }
    }
  }
  const ultimaDe = new Map(perfis.map(p => [p.cliente_nome, parseBR(p.ultima_visita)]))
  const voltaram = envios.filter(v => (ultimaDe.get(v.cliente_nome) || 0) > new Date(v.enviado_em).getTime()).length

  return {
    total: naLista.length, enviadas, faltam: naLista.length - enviadas,
    sem_celular: semCelular, bloqueados: lista.length - naLista.length,
    responderam, voltaram, envios_total: envios.length,
    por_dia: cabemPorDia(d),
  }
}

/** Os serviços do salão, do mais feito para o menos, para a tela escolher. */
export async function servicosDoSalao(salaoId: string) {
  const perfis = await perfisDoSalao(salaoId)
  const conta = new Map<string, number>()
  for (const p of perfis) for (const s of p.servicos) conta.set(s, (conta.get(s) || 0) + 1)
  return [...conta.entries()].sort((a, b) => b[1] - a[1]).map(([nome, clientes]) => ({ nome, clientes }))
}
