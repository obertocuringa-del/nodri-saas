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
//   um por vez    vários podem ficar ligados, cada um com seu período e
//                 horário; sai UMA mensagem por volta para o salão inteiro e
//                 a vez é de quem mandou há mais tempo (revezamento)
//   não junta     com mensagem na fila (confirmação, feedback) ele ESPERA a
//                 fila esvaziar e mais 5 minutos (`filaOcupada`)
//   parar         quem responde "parar"/"sair" nunca mais recebe envio
//
// Nunca manda para: quem está conversando (fala da cliente nas últimas 48h),
// quem recebeu qualquer mensagem do salão nas últimas 24h, profissional do
// salão, número que não é celular.

import { supabaseAdmin } from '@/lib/supabase'
import { paginar } from '@/lib/paginar'
import { normalizarTelefone, chaveTelefone, proximaAcaoPadrao, podeReceber, ETIQUETA_NAO_PERTURBE } from '@/lib/crm'
import { acharOuCriarContato, grafiasDoTelefone } from '@/lib/crmContatos'
import { carregarCampanhas } from '@/lib/crmCampanhas'
import { assinaturaAtendimentos } from '@/lib/atendimentosCache'

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
  /** ano da última visita: de/até (0 = sem limite). "Este ano", "2 anos"... */
  ano_de: number
  ano_ate: number
  /** venda cruzada: NUNCA fez nenhum destes (vazio = sem essa regra) */
  servicos_nao: string[]
}

/** Para que o envio serve. Vem do modelo escolhido; só etiqueta e regra de recuperação. */
export type Categoria = '' | 'perdidas' | 'risco' | 'promocao' | 'vip' | 'novas' | 'cruzada' | 'retorno'
const CATEGORIAS: Categoria[] = ['perdidas', 'risco', 'promocao', 'vip', 'novas', 'cruzada', 'retorno']

/** A 2ª mensagem para quem não respondeu (pedido do dono, 29/09/2026). */
export interface Segunda { ligada: boolean; dias: number; mensagens: string[] }

export type TipoAnexo = 'imagem' | 'video' | 'audio' | 'documento'
export interface Anexo { url: string; tipo: TipoAnexo; nome: string }

/**
 * 'lista'   uma lista do histórico (perdidas, risco, promoção, VIP), que acaba
 * 'retorno' lembrete de retorno: quem fez o serviço e chegou a hora de voltar
 *           (data do serviço + ciclo de retorno). Não acaba: todo dia entra
 *           gente nova na lista.
 */
export type TipoDisparo = 'lista' | 'retorno'

export interface Disparo {
  id: string
  nome: string
  ligado: boolean
  tipo: TipoDisparo
  categoria: Categoria
  /** lista que não termina: todo dia entra quem passa a caber na regra (clientes novas) */
  continuo: boolean
  /** manda de novo para quem recebeu e não voltou depois de N dias (0 = nunca repete) */
  repetir_dias: number
  segunda: Segunda
  /** retorno: dias por serviço escolhidos na tela (vazio = o da página Serviços) */
  ciclos: Record<string, number>
  /** retorno: até quantos dias DEPOIS da data de voltar ainda vale lembrar */
  tolerancia_dias: number
  publico: Publico
  /** 1ª mensagem (saudação): 0 a 3 versões, alternadas. Vazio = não manda. */
  saudacoes: string[]
  /** 2ª mensagem: 1 a 3 versões da mesma mensagem, alternadas */
  mensagens: string[]
  /** 3ª: foto, vídeo, áudio ou arquivo, depois do texto (opcional) */
  anexo: Anexo | null
  /** dia em que começa a mandar (AAAA-MM-DD; vazio = assim que ligar) */
  inicio: string
  /** último dia de envio (vazio = até a lista acabar) */
  fim: string
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
const soData = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : ''
const TIPOS_ANEXO: TipoAnexo[] = ['imagem', 'video', 'audio', 'documento']
function lerAnexo(a: any): Anexo | null {
  const url = String(a?.url || '').trim()
  if (!/^https:\/\//.test(url)) return null
  return {
    url, tipo: TIPOS_ANEXO.includes(a.tipo) ? a.tipo : 'documento',
    nome: String(a.nome || 'arquivo').slice(0, 120),
  }
}
const textos = (v: any) => (Array.isArray(v) ? v : [])
  .map((m: any) => String(m || '').trim()).filter(Boolean).slice(0, 3)

export const semAcento = (s: string) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function lerDisparo(b: any): Disparo | null {
  const id = String(b?.id || '').trim()
  if (!id) return null
  const p = b.publico || {}
  const dias_min = num(p.dias_min, 90, 0, 3650)
  let dias_max = num(p.dias_max, 365, 0, 3650)
  if (dias_max && dias_max < dias_min) dias_max = dias_min
  const ano_de = num(p.ano_de, 0, 0, 2200)
  let ano_ate = num(p.ano_ate, 0, 0, 2200)
  if (ano_de && ano_ate && ano_ate < ano_de) ano_ate = ano_de
  const inicio = soData(b.inicio)
  let fim = soData(b.fim)
  if (inicio && fim && fim < inicio) fim = inicio
  const seg = ['todos', 'vip', 'regular', 'novo'].includes(p.segmento) ? p.segmento : 'todos'
  const dias = Array.isArray(b.dias_semana)
    ? [...new Set(b.dias_semana.map((d: any) => num(d, -1, -1, 6)).filter((d: number) => d >= 0))] as number[]
    : [1, 2, 3, 4, 5, 6]
  return {
    id,
    nome: String(b.nome || 'Envio').slice(0, 60),
    ligado: b.ligado === true,
    tipo: b.tipo === 'retorno' ? 'retorno' : 'lista',
    categoria: CATEGORIAS.includes(b.categoria) ? b.categoria : (b.tipo === 'retorno' ? 'retorno' : ''),
    continuo: b.continuo === true,
    repetir_dias: b.tipo === 'retorno' ? 0 : num(b.repetir_dias, 0, 0, 365),
    segunda: {
      ligada: b.segunda?.ligada === true,
      dias: num(b.segunda?.dias, 5, 1, 60),
      mensagens: textos(b.segunda?.mensagens),
    },
    ciclos: Object.fromEntries(Object.entries(b.ciclos && typeof b.ciclos === 'object' ? b.ciclos : {})
      .map(([k, v]) => [String(k).slice(0, 120), num(v, 0, 0, 3650)] as [string, number]).filter(([, v]) => v > 0).slice(0, 40)),
    tolerancia_dias: num(b.tolerancia_dias, 30, 1, 3650),
    publico: {
      dias_min, dias_max, segmento: seg, ano_de, ano_ate,
      servicos: Array.isArray(p.servicos) ? p.servicos.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 40) : [],
      servicos_nao: Array.isArray(p.servicos_nao) ? p.servicos_nao.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 40) : [],
    },
    saudacoes: textos(b.saudacoes),
    mensagens: textos(b.mensagens),
    anexo: lerAnexo(b.anexo),
    inicio, fim,
    janela_ini: soHora(b.janela_ini, '09:00'),
    janela_fim: soHora(b.janela_fim, '21:00'),
    dias_semana: dias.length ? dias.sort() : [1, 2, 3, 4, 5, 6],
    // Piso de 2 minutos: o dono digita o que quiser; a tela avisa do risco
    // abaixo de 5. Menos que isso nem a rodada de 1 em 1 minuto acompanha.
    intervalo_min: num(b.intervalo_min, 30, 2, 720),
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
  return { dia: `${g('year')}-${g('month')}-${g('day')}`, hora, semana: dias[g('weekday')] ?? 0, ano: Number(g('year')) }
}
const dataBR = (iso: string) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : ''

/**
 * Dos envios ligados, qual manda agora: o que já está no período e tem o
 * início mais cedo (empate: o criado primeiro). Os outros esperam a vez --
 * é assim que "um de tal dia a tal dia, depois outro" funciona sozinho.
 */
export function escolherDaVez(disparos: Disparo[], hoje: string) {
  return disparos
    .filter(x => x.ligado && (!x.inicio || x.inicio <= hoje) && (!x.fim || x.fim >= hoje))
    .sort((a, b) => (a.inicio || '').localeCompare(b.inicio || '') || a.criado_em.localeCompare(b.criado_em))[0] || null
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
  /** ano da última visita (0 = sem data) */
  ano: number
  /** lembrete de retorno: o serviço que venceu, quando foi feito e há quantos dias venceu */
  servico_alvo?: string
  feito_em?: string
  atraso?: number
  /** a marca de "já recebeu": o telefone, ou telefone|serviço|data no retorno */
  envio_chave?: string
  /** todos os nomes (sem acento) desta pessoa: fichas com o nome escrito de outro jeito ou o mesmo celular */
  nomes: string[]
}

const _perfis = new Map<string, { em: number; lista: PerfilCliente[] }>()

const parseBR = (s: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '')
  // Meia-noite UTC, a MESMA conta de api/relatorios/analise-clientes: com
  // outro horário, a cliente de 46 dias lá virava 45 aqui e as abas Em Risco
  // e Perdidos não batiam com o envio na beirada.
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime() : 0
}

/**
 * Os 8 últimos dígitos do telefone: o mesmo número com ou sem 55, com ou sem
 * o nono dígito, com ou sem máscara. É o que separa duas clientes com o mesmo
 * nome (30/09/2026: duas "FABIANA" viravam uma só e o lembrete de uma ia para
 * o celular da outra).
 */
export const fone8 = (t: string | null | undefined) => {
  const d = String(t || '').replace(/\D/g, '')
  return d.length >= 8 ? d.slice(-8) : ''
}

/** Celular de verdade: 55 + DDD + 9 dígitos, ou o formato antigo de 8 começando em 6-9. */
function ehCelular(tel: string) {
  if (tel.length === 13) return tel[4] === '9'
  if (tel.length === 12) return /[6-9]/.test(tel[4])
  return false
}

/**
 * A mesma pessoa em mais de uma ficha (dono, 29/09/2026: 150 casos no Rouge).
 *
 * 1. Mesmo nome escrito de outro jeito ("ANA SILVA" e "Ana Silva"): vira
 *    uma ficha só -- visitas e gasto somados, a última visita é a mais nova.
 * 2. Nomes diferentes com o MESMO celular: cada ficha continua, mas todas
 *    passam a ter a última visita da pessoa. Sem isso, a ficha antiga de
 *    quem veio mês passado caía em "Perdidas" e a cliente ativa recebia
 *    "sentimos sua falta".
 */
function juntarFichas(brutos: PerfilCliente[]): PerfilCliente[] {
  // Passo 1 por NOME + CELULAR (30/09/2026). Grafias do mesmo nome com o
  // mesmo celular (ou sem celular, quando o nome só tem um) viram uma ficha;
  // o mesmo nome com celulares diferentes são pessoas diferentes.
  const nomeDe = (p: PerfilCliente) => semAcento(p.cliente_nome).replace(/\s+/g, ' ')
  const fonesDoNome = new Map<string, Set<string>>()
  for (const p of brutos) {
    const f = fone8(p.celular)
    if (!f) continue
    const k = nomeDe(p)
    fonesDoNome.set(k, new Set([...(fonesDoNome.get(k) || []), f]))
  }
  const porNome = new Map<string, PerfilCliente>()
  for (const p of brutos) {
    const nome = nomeDe(p)
    const fones = fonesDoNome.get(nome)
    const f = fone8(p.celular) || (fones && fones.size === 1 ? [...fones][0] : '')
    const k = `${nome}|${f}`
    const a = porNome.get(k)
    if (!a) { porNome.set(k, { ...p, nomes: [nome] }); continue }
    const novo = p.dias < a.dias ? p : a
    porNome.set(k, {
      ...novo,
      celular: novo.celular_ok ? novo.celular : (a.celular_ok ? a.celular : p.celular),
      celular_ok: novo.celular_ok || a.celular_ok || p.celular_ok,
      chave: novo.celular_ok ? novo.chave : (a.celular_ok ? a.chave : p.chave),
      ltv_total: a.ltv_total + p.ltv_total,
      total_visitas: a.total_visitas + p.total_visitas,
      servicos: [...new Set([...a.servicos, ...p.servicos])],
      nomes: [nome],
    })
  }
  const lista = [...porNome.values()]
  const porTel = new Map<string, PerfilCliente[]>()
  for (const p of lista) if (p.celular_ok) porTel.set(p.chave, [...(porTel.get(p.chave) || []), p])
  for (const grupo of porTel.values()) {
    if (grupo.length < 2) continue
    const maisNova = grupo.reduce((m, x) => (x.dias < m.dias ? x : m))
    const visitas = grupo.reduce((t, x) => t + x.total_visitas, 0)
    const servicos = [...new Set(grupo.flatMap(x => x.servicos))]
    const nomes = [...new Set(grupo.flatMap(x => x.nomes))]
    for (const x of grupo) {
      x.dias = maisNova.dias; x.ultima_visita = maisNova.ultima_visita; x.ano = maisNova.ano
      x.total_visitas = visitas; x.servicos = servicos; x.nomes = nomes
    }
  }
  return lista
}

export async function perfisDoSalao(salaoId: string, fresco = false): Promise<PerfilCliente[]> {
  const c = _perfis.get(salaoId)
  if (!fresco && c && Date.now() - c.em < 30 * 60000) return c.lista
  // Vários cartões pedindo ao mesmo tempo dividem UMA leitura.
  return memo(`perfis:${salaoId}:${fresco ? Date.now() : ''}`, 20, () => lerPerfis(salaoId))
}

async function lerPerfis(salaoId: string): Promise<PerfilCliente[]> {
  const { dados } = await paginar<any>((de, ate) =>
    supabaseAdmin.rpc('perfis_clientes_por_celular', { p_salao: salaoId }).range(de, ate) as any, 60000)
  const agora = Date.now()
  const brutos: PerfilCliente[] = dados.map((r: any) => {
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
      ano: Number(ultima.slice(6, 10)) || 0,
      nomes: [] as string[],
    }
  }).filter(p => p.cliente_nome)
  const lista = juntarFichas(brutos)
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
  // Por FAMÍLIA do serviço (nome sem código): "MANICURE 12" conta como
  // manicure mesmo que só "MANICURE" esteja marcada. Senão a venda cruzada
  // oferecia manicure para quem já faz manicure com outro código.
  const alvos = new Set(p.servicos.map(familiaServico))
  const nunca = new Set((p.servicos_nao || []).map(familiaServico))
  const dentro = perfis.filter(x =>
    (!nunca.size || !x.servicos.some(s => nunca.has(familiaServico(s)))) &&
    x.dias >= p.dias_min && (!p.dias_max || x.dias <= p.dias_max)
    && (!p.ano_de || x.ano >= p.ano_de) && (!p.ano_ate || x.ano <= p.ano_ate)
    && (p.segmento === 'todos' || x.segmento === p.segmento)
    && (!alvos.size || x.servicos.some(s => alvos.has(familiaServico(s)))))
  dentro.sort((a, b) => a.dias - b.dias)
  const vistos = new Set<string>()
  const lista: PerfilCliente[] = []
  let semCelular = 0, repetidos = 0
  for (const x of dentro) {
    if (!x.celular_ok) { semCelular++; continue }
    // Duas fichas com o mesmo celular (mãe e filha, cadastro em dobro): a
    // mensagem vai uma vez só. É parte da diferença para a aba Perdidos, que
    // conta por NOME -- por isso o número aparece na tela.
    if (vistos.has(x.chave)) { repetidos++; continue }
    vistos.add(x.chave)
    lista.push(x)
  }
  return { lista, semCelular, repetidos }
}

/**
 * Os atalhos de período da tela, com quantas entram em cada um (com o resto
 * do filtro igual). Mesmos rótulos do filtro de Mais Relatórios.
 */
export function periodosDe(perfis: PerfilCliente[], p: Publico) {
  const ano = agoraNoSalao().ano
  const opcoes = [
    { id: 'este', rotulo: 'Este ano', ano_de: ano, ano_ate: ano },
    { id: 'passado', rotulo: 'Ano passado', ano_de: ano - 1, ano_ate: ano - 1 },
    { id: '2anos', rotulo: '2 anos', ano_de: ano - 1, ano_ate: 0 },
    { id: '3anos', rotulo: '3 anos', ano_de: ano - 2, ano_ate: 0 },
    { id: 'tudo', rotulo: 'Tudo', ano_de: 0, ano_ate: 0 },
  ]
  // O resto do filtro (inclusive o máximo de dias) continua valendo: em
  // "Clientes em risco" (46 a 90 dias), "Este ano" conta só as em risco que
  // vieram este ano -- não todas as que vieram este ano.
  return opcoes.map(o => ({ ...o, total: publicoDe(perfis, { ...p, ano_de: o.ano_de, ano_ate: o.ano_ate }).lista.length }))
}

const primeiroNome = (s: string) => {
  const n = String(s || '').trim().split(/\s+/)[0] || ''
  // "HELOISA" -> "Heloisa": nome gritado em maiúsculas não parece pessoa escrevendo.
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : ''
}

export function textoPara(d: Disparo, x: PerfilCliente, indice: number) {
  return preencher(d, x, d.mensagens.length ? d.mensagens[indice % d.mensagens.length] : '')
}
export function saudacaoPara(d: Disparo, x: PerfilCliente, indice: number) {
  return preencher(d, x, d.saudacoes.length ? d.saudacoes[indice % d.saudacoes.length] : '')
}

/**
 * O que a cliente recebe, na ordem: saudação, mensagem, anexo. Cada item vira
 * uma mensagem separada no WhatsApp, alguns segundos uma da outra.
 */
export function pacotePara(d: Disparo, x: PerfilCliente, indice: number) {
  const itens: { texto: string; tipo: string; midia_url: string | null }[] = []
  const oi = saudacaoPara(d, x, indice)
  if (oi) itens.push({ texto: oi, tipo: 'texto', midia_url: null })
  const corpo = textoPara(d, x, indice)
  if (corpo) itens.push({ texto: corpo, tipo: 'texto', midia_url: null })
  if (d.anexo && itens.length) itens.push({ texto: '', tipo: d.anexo.tipo, midia_url: d.anexo.url })
  return itens
}

/** A 2ª mensagem: um texto só, curto, alternando as versões. */
export function segundaPara(d: Disparo, x: PerfilCliente, indice: number) {
  const t = preencher(d, x, d.segunda.mensagens.length ? d.segunda.mensagens[indice % d.segunda.mensagens.length] : '')
  return t ? [{ texto: t, tipo: 'texto', midia_url: null as string | null }] : []
}

/**
 * O nome do serviço como a cliente entende (dono, 29/09/2026): sem o código
 * interno do salão nem observação entre parênteses. "MODELAGEM 71" vira
 * "modelagem"; "REALINHAMENTO CAPILAR 56" vira "realinhamento capilar";
 * "MODELAGEM  HIGIENIZAÇÃO ( SETEMBRO )" vira "modelagem higienização".
 */
export function nomeParaCliente(nome: string) {
  return String(nome || '')
    .replace(/\([^)]*\)/g, ' ')          // (SETEMBRO), (promo)
    .replace(/\b\d+([.,]\d+)?\b/g, ' ')  // 71, 56, 14
    .replace(/\s*[-–]\s*$/g, '')          // hífen que sobrou no fim
    .replace(/\s+\.(?=\S)/g, ' ')          // "ESPECIAIS .DOS PÉS"
    .replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Vários serviços numa frase só (dono, 30/09/2026: a venda cruzada citava só
 * o primeiro): "manicure", "manicure e pedicure", "manicure, pedicure e spa".
 * Nomes que ficam iguais depois de limpos aparecem uma vez.
 */
/** A família do serviço: sem código, sem acento, sem maiúscula. */
export const familiaServico = (s: string) => semAcento(nomeParaCliente(s))

export function juntarNomes(nomes: string[]) {
  const u = [...new Set(nomes.map(n => n.trim()).filter(Boolean))]
  if (u.length <= 1) return u[0] || ''
  return `${u.slice(0, -1).join(', ')} e ${u[u.length - 1]}`
}

function preencher(d: Disparo, x: PerfilCliente, modelo: string) {
  const alvos = new Set(d.publico.servicos.map(familiaServico))
  const servico = x.servico_alvo || x.servicos.find(s => alvos.has(familiaServico(s))) || x.servicos[0] || ''
  const dados: Record<string, string> = {
    cliente: primeiroNome(x.cliente_nome), dias: String(x.dias),
    ultima_visita: x.ultima_visita, servico: nomeParaCliente(servico),
    data_servico: x.feito_em || x.ultima_visita,
    oferta: juntarNomes((d.publico.servicos_nao || []).map(nomeParaCliente)),
  }
  return modelo.replace(/\{(\w+)\}/g, (_, k) => dados[k] ?? '')
    .replace(/[ \t]+([,.!?;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim()
}

// ── Quem nunca / agora não ───────────────────────────────────────────────────
// ── Guardar por um tempo o que toda tela e toda volta pedem igual ──────────
//
// A tela de envios pedia, para CADA envio, a mesma lista de bloqueados, a
// mesma recuperação e a mesma agenda -- seis envios, seis vezes cada, e a
// página levava dezenas de segundos para abrir (dono, 30/09/2026).
const _memo = new Map<string, { em: number; v: Promise<any> }>()
function memo<T>(chave: string, segundos: number, fn: () => Promise<T>): Promise<T> {
  const c = _memo.get(chave)
  if (c && Date.now() - c.em < segundos * 1000) return c.v
  const v = fn().catch(e => { _memo.delete(chave); throw e })
  _memo.set(chave, { em: Date.now(), v })
  return v
}

const PEDIU_PARA_SAIR = [
  /^\s*(parar|pare|para|sair|stop|cancelar|remover|descadastrar)\s*[.!]*\s*$/i,
  /n[aã]o quero (mais )?receber/i,
  /(me )?(tira|tire|remove|remova) (da|dessa|desta) lista/i,
]

/**
 * O que este envio já mandou. `feitos`: quem NÃO pode receber agora (já
 * recebeu e, se o envio repete, ainda não passaram os dias). `ult`: quantas
 * vezes e quando foi a última, por cliente. A repetição (dono, 30/09/2026)
 * grava a marca com "|r1", "|r2"... para cada nova volta.
 */
const semVolta = (k: string) => String(k || '').replace(/#2$/, '').replace(/\|r\d+$/, '')
async function enviosDoDisparo(salaoId: string, d: Disparo) {
  const { dados } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_envios')
    .select('chave, enviado_em').eq('salao_id', salaoId).eq('disparo_id', d.id).eq('ciclo', d.ciclo).range(de, ate))
  const ult = new Map<string, { em: number; n: number }>()
  let total = 0
  for (const r of dados) {
    if (String(r.chave).endsWith(SEGUNDA)) continue
    total++
    const base = semVolta(r.chave), em = new Date(r.enviado_em).getTime(), c = ult.get(base)
    ult.set(base, { em: Math.max(em, c?.em || 0), n: (c?.n || 0) + 1 })
  }
  const repetir = d.repetir_dias * 864e5
  const feitos = new Set<string>()
  for (const [base, u] of ult) if (!repetir || Date.now() - u.em < repetir) feitos.add(base)
  /** A marca da próxima mensagem para esta cliente (repetição ganha "|rN"). */
  const marcaDe = (x: PerfilCliente): PerfilCliente => {
    const n = ult.get(x.envio_chave!)?.n || 0
    return n ? { ...x, envio_chave: `${x.envio_chave}|r${n}` } : x
  }
  // Lembrete: a marca leva o serviço e a data em que ela o fez. Se a regra
  // de qual serviço vale mudar (como a da família, 30/09/2026), a marca nova
  // não bate com a antiga e a cliente receberia de novo. Então: já recebeu
  // deste envio DEPOIS do atendimento que a marca aponta, da mesma família,
  // conta como feito.
  const porTel = new Map<string, { base: string; fam: string; em: number }[]>()
  if (d.tipo === 'retorno') {
    for (const [base, u] of ult) {
      const partes = base.split('|')
      if (partes.length < 3) continue
      const l = porTel.get(partes[0]) || []
      l.push({ base, fam: familiaServico(partes[1]), em: u.em })
      porTel.set(partes[0], l)
    }
  }
  const alinhar = <T extends PerfilCliente>(lista: T[]): T[] => d.tipo !== 'retorno' ? lista : lista.map(x => {
    const k = x.envio_chave || ''
    if (ult.has(k)) return x
    const partes = k.split('|'), feitoEm = Number(partes[2]) || 0
    if (partes.length < 3) return x
    const antes = (porTel.get(partes[0]) || []).find(v => v.fam === familiaServico(partes[1]) && v.em > feitoEm)
    return antes ? { ...x, envio_chave: antes.base } : x
  })
  return { feitos, ult, total, marcaDe, alinhar }
}

function bloqueados(salaoId: string) {
  return memo(`bloq:${salaoId}`, 60, async () => {
    const { dados } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_bloqueios')
      .select('chave').eq('salao_id', salaoId).range(de, ate))
    const fora = new Set(dados.map(r => r.chave))
    // "Não perturbe" sem "aceita: promoções": nenhum envio automático.
    const { data: np } = await supabaseAdmin.from('crm_contatos').select('telefone, etiquetas')
      .eq('salao_id', salaoId).contains('etiquetas', [ETIQUETA_NAO_PERTURBE]).limit(5000)
    for (const c of np || []) if (c.telefone && !podeReceber(c.etiquetas, 'promocoes')) fora.add(chaveTelefone(normalizarTelefone(c.telefone)))
    return fora
  })
}

/** Recebeu envio automático OU foi contatada à mão (botão das listas) há menos de N dias. */
/**
 * Entre dois envios DIFERENTES para a mesma cliente, no mínimo uma semana
 * (dono, 29/09/2026: nada de venda cruzada hoje e lembrete amanhã). A 2ª
 * mensagem do mesmo envio não conta: ela é a continuação da primeira.
 */
export const DIAS_ENTRE_ENVIOS = 7
async function enviosDaSemana(salaoId: string) {
  const desde = new Date(Date.now() - DIAS_ENTRE_ENVIOS * 864e5).toISOString()
  const { dados } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_envios')
    .select('chave, disparo_id').eq('salao_id', salaoId).gte('enviado_em', desde).range(de, ate))
  return dados.map(r => ({ tel: telDaChave(r.chave), disparo: r.disparo_id as string }))
}
const deOutros = (semana: { tel: string; disparo: string }[], d: Disparo) =>
  new Set(semana.filter(r => r.disparo !== d.id).map(r => r.tel))

/** O telefone da marca de envio (no retorno ela é telefone|serviço|data). */
const telDaChave = (chave: string) => String(chave || '').split('|')[0].split('#')[0]
/** A marca da 2ª mensagem é a da 1ª com "#2" no fim. */
const SEGUNDA = '#2'

/**
 * `soDestes`: conta só os envios destes disparos. É o lembrete de retorno:
 * promoção e VIP não seguram o lembrete (pedido do dono, 29/09/2026), só
 * recuperação (risco/perdidas), o próprio lembrete e o contato à mão.
 */
async function travados(salaoId: string, dias: number, soDestes?: Set<string>) {
  const chaves = new Set<string>(), nomes = new Set<string>()
  if (!dias) return { chaves, nomes }
  const desde = new Date(Date.now() - dias * 864e5).toISOString()
  const { dados: env } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_envios')
    .select('chave, disparo_id').eq('salao_id', salaoId).gte('enviado_em', desde).range(de, ate))
  for (const r of env) if (!soDestes || soDestes.has(r.disparo_id)) chaves.add(telDaChave(r.chave))
  const { dados: man } = await paginar<any>((de, ate) => supabaseAdmin.from('clientes_contatos')
    .select('cliente_nome, celular, origem').eq('salao_id', salaoId).gte('contato_em', desde).range(de, ate))
  for (const r of man) {
    // O registro que o próprio envio automático deixa já foi contado acima.
    if (soDestes && r.origem === 'envio_automatico') continue
    nomes.add(String(r.cliente_nome || '').trim()); if (r.celular) chaves.add(chaveTelefone(r.celular))
  }
  return { chaves, nomes }
}

// ── Lembrete de retorno ──────────────────────────────────────────────────────
//
// Pedido do dono em 29/09/2026. O ciclo de cada serviço mora na página
// Serviços (salao_servicos.ciclo_retorno_dias); a tela do envio pode pôr um
// número próprio para o serviço que não tem, ou cujo nome no Avec é outro.

/** Envio de recuperação: lista de quem sumiu (risco ou perdidas). */
// 45: o modelo antigo de "Clientes em risco" começava em 45.
export const ehRecuperacao = (d: Disparo) => d.categoria
  ? (d.categoria === 'perdidas' || d.categoria === 'risco')
  : d.tipo === 'lista' && d.publico.dias_min >= 45

/** Corre o tempo todo, lado a lado com a lista da vez: lembrete e lista contínua. */
const sempreRodando = (d: Disparo) => d.tipo === 'retorno' || d.continuo

export async function ciclosDoCatalogo(salaoId: string) {
  const { data } = await supabaseAdmin.from('salao_servicos').select('nome, ciclo_retorno_dias')
    .eq('salao_id', salaoId).not('ciclo_retorno_dias', 'is', null).limit(2000)
  const m = new Map<string, number>()
  for (const s of data || []) if (Number(s.ciclo_retorno_dias) > 0) m.set(semAcento(s.nome), Number(s.ciclo_retorno_dias))
  return m
}

const parseData = (s: string) => /^\d{4}-\d{2}-\d{2}/.test(s || '') ? new Date(s.slice(0, 10)).getTime() : parseBR(s)

// Última vez que cada cliente fez cada serviço. Refeito só quando os
// atendimentos mudam (o cache devolve o mesmo array enquanto nada é importado).
const _ultimas = new Map<string, { sig: string; mapa: Map<string, Map<string, { nome: string; em: number; data: string }>> }>()
async function ultimasPorServico(salaoId: string) {
  // A assinatura (contagem + último importado) diz se houve importação nova;
  // conferida no máximo a cada minuto.
  const sig = await memo(`sig:${salaoId}`, 60, () => assinaturaAtendimentos(salaoId))
  const c = _ultimas.get(salaoId)
  if (c && c.sig === sig) return c.mapa
  return memo(`ult:${salaoId}:${sig}`, 600, async () => {
    const mapa = await montarUltimas(salaoId)
    _ultimas.set(salaoId, { sig, mapa })
    return mapa
  })
}

/** Só as 3 colunas que interessam, em páginas buscadas 8 de cada vez. */
/**
 * A chave de cada atendimento: nome + 8 últimos dígitos do celular. Sem
 * celular, vale o único celular daquele nome; se o nome tem vários, fica sem
 * (e não casa com ninguém -- melhor não mandar do que mandar a data de outra).
 */
function chavesDosAtendimentos(rows: any[]) {
  const fones = new Map<string, Set<string>>()
  for (const r of rows) {
    const cli = semAcento(r.cliente).replace(/\s+/g, ' '), f = fone8(r.celular)
    if (cli && f) fones.set(cli, new Set([...(fones.get(cli) || []), f]))
  }
  return (r: any) => {
    const cli = semAcento(r.cliente).replace(/\s+/g, ' ')
    if (!cli) return ''
    const fs = fones.get(cli)
    const f = fone8(r.celular) || (fs && fs.size === 1 ? [...fs][0] : '')
    return `${cli}|${f}`
  }
}
/** A mesma chave para quem está na lista: um dos nomes dela + o celular. */
const chaveDaCliente = (nome: string, celular: string) => `${nome}|${fone8(celular)}`

async function lerAtendimentosLeve(salaoId: string) {
  const { count } = await supabaseAdmin.from('atendimentos_raw').select('id', { count: 'exact', head: true }).eq('salao_id', salaoId)
  const total = count || 0
  const paginas: number[] = []
  for (let de = 0; de < total; de += 1000) paginas.push(de)
  const rows: any[] = []
  for (let i = 0; i < paginas.length; i += 8) {
    const lotes = await Promise.all(paginas.slice(i, i + 8).map(de => supabaseAdmin.from('atendimentos_raw')
      .select('cliente, celular, servico, data_comanda, total, valor').eq('salao_id', salaoId).order('id').range(de, de + 999)))
    for (const l of lotes) rows.push(...(l.data || []))
  }
  return rows
}

/** Por cliente (nome sem acento): cada comanda com data e valor -- a receita do envio. */
const _receita = new Map<string, Map<string, { em: number; valor: number }[]>>()

async function montarUltimas(salaoId: string) {
  const rows = await lerAtendimentosLeve(salaoId)
  const chaveDe = chavesDosAtendimentos(rows)
  const receita = new Map<string, { em: number; valor: number }[]>()
  for (const r of rows) {
    const cli = chaveDe(r), em = parseData(String(r.data_comanda || ''))
    const valor = Number(r.total) || Number(r.valor) || 0
    if (!cli || !em || !valor) continue
    const l = receita.get(cli) || []; l.push({ em, valor }); receita.set(cli, l)
  }
  _receita.set(salaoId, receita)
  const mapa = new Map<string, Map<string, { nome: string; em: number; data: string }>>()
  for (const r of rows) {
    const cli = chaveDe(r), serv = String(r.servico || '').trim()
    const em = parseData(String(r.data_comanda || ''))
    if (!cli || !serv || !em) continue
    let m = mapa.get(cli)
    if (!m) { m = new Map(); mapa.set(cli, m) }
    const k = semAcento(serv), atual = m.get(k)
    if (!atual || em > atual.em) m.set(k, { nome: serv, em, data: String(r.data_comanda) })
  }
  return mapa
}

/**
 * Quem recebe, já na ordem de envio. Lista: o público de sempre. Retorno:
 * quem fez um dos serviços e já passou da data de voltar (mas não mais que
 * a tolerância), de quem veio ao salão mais recentemente para a mais antiga.
 */
export async function alvosDoDisparo(salaoId: string, d: Disparo, perfis: PerfilCliente[]) {
  const r = await alvosSemAgenda(salaoId, d, perfis)
  // Já tem horário marcado (hoje ou depois): não recebe nada -- nem
  // "sentimos sua falta", nem lembrete, nem promoção.
  const agenda = await comHorarioMarcado(salaoId)
  const lista = r.lista.filter(x => !agenda.chaves.has(x.chave) && !x.nomes.some(n => agenda.nomes.has(n)))
  return { ...r, lista, agendadas: r.lista.length - lista.length }
}

/**
 * Quem tem horário marcado de hoje em diante na agenda importada do Avec
 * (agendamentos_raw). Guardado 30 minutos.
 */
const _agenda = new Map<string, { em: number; chaves: Set<string>; nomes: Set<string> }>()
async function comHorarioMarcado(salaoId: string) {
  const c = _agenda.get(salaoId)
  if (c && Date.now() - c.em < 30 * 60000) return c
  return memo(`agenda:${salaoId}`, 20, () => lerAgenda(salaoId))
}
async function lerAgenda(salaoId: string) {
  const hoje = agoraNoSalao()
  // Só do mês atual em diante: a agenda inteira são 100 mil linhas.
  const mes = Number(hoje.dia.slice(5, 7))
  const { dados } = await paginar<any>((de, ate) => supabaseAdmin.from('agendamentos_raw')
    .select('cliente, celular, data_reserva, status').eq('salao_id', salaoId)
    .or(`ano.gt.${hoje.ano},and(ano.eq.${hoje.ano},mes.gte.${mes})`).range(de, ate))
  const chaves = new Set<string>(), nomes = new Set<string>()
  const limite = new Date(`${hoje.dia}T00:00:00Z`).getTime()
  for (const r of dados) {
    if (/cancel|falt|desmarc/i.test(String(r.status || ''))) continue
    if (parseBR(String(r.data_reserva || '')) < limite) continue
    if (r.celular) chaves.add(chaveTelefone(normalizarTelefone(r.celular)))
    if (r.cliente) nomes.add(semAcento(r.cliente).replace(/\s+/g, ' '))
  }
  const v = { em: Date.now(), chaves, nomes }
  _agenda.set(salaoId, v)
  return v
}

async function alvosSemAgenda(salaoId: string, d: Disparo, perfis: PerfilCliente[]) {
  if (d.tipo !== 'retorno') {
    const r = publicoDe(perfis, d.publico)
    // Contínuo: a marca de "já recebeu" leva a data da última visita. Se ela
    // voltar e depois sumir de novo, entra de novo -- é outra vez que sumiu.
    return { ...r, lista: r.lista.map(x => ({ ...x, envio_chave: d.continuo ? `${x.chave}|v|${parseBR(x.ultima_visita)}` : x.chave })), sem_ciclo: [] as string[] }
  }
  // Os dias sem vir não valem aqui: quem manda é a data de cada serviço.
  const base = publicoDe(perfis, { ...d.publico, servicos: [], dias_min: 0, dias_max: 0 })
  const [ultimas, catalogo] = await Promise.all([ultimasPorServico(salaoId), ciclosDoCatalogo(salaoId)])
  const cicloDe = (nome: string) => d.ciclos[nome] || catalogo.get(semAcento(nome)) || 0
  // O mesmo serviço tem várias grafias e códigos no Avec ("REALINHAMENTO
  // CAPILAR 30", "... 46", "... 56"). Antes cada código era um serviço à parte
  // e valia o que estava MAIS atrasado: a cliente que fez o 56 em 2025 recebeu
  // "seu último atendimento foi em 20/10/2023", a data do 30 (dono,
  // 30/09/2026). Agora conta a FAMÍLIA do serviço (o nome sem o código), e a
  // data é a do atendimento mais recente de qualquer variação -- mesmo uma
  // que não esteja marcada na lista.
  const familias = new Set(d.publico.servicos.map(s => familiaServico(s)).filter(Boolean))
  const cicloFam = new Map<string, number>()
  const guardarCiclo = (nome: string, c: number) => {
    const f = familiaServico(nome)
    if (c > 0 && familias.has(f)) cicloFam.set(f, Math.max(cicloFam.get(f) || 0, c))
  }
  for (const s of d.publico.servicos) guardarCiclo(s, cicloDe(s))
  for (const [nome, c] of Object.entries(d.ciclos || {})) guardarCiclo(nome, Number(c) || 0)
  for (const [nome, c] of catalogo) guardarCiclo(nome, c)
  const sem_ciclo = d.publico.servicos.filter(s => !cicloFam.get(familiaServico(s)))
  const agora = Date.now()
  const lista: PerfilCliente[] = []
  for (const x of base.lista) {
    // A última vez de cada família em QUALQUER ficha da pessoa.
    const mapas = x.nomes.map(n => ultimas.get(chaveDaCliente(n, x.celular))).filter(Boolean) as Map<string, { nome: string; em: number; data: string }>[]
    if (!mapas.length) continue
    const ultimaDaFamilia = new Map<string, { nome: string; em: number; data: string }>()
    for (const m of mapas) {
      for (const u of m.values()) {
        const f = familiaServico(u.nome)
        if (!familias.has(f)) continue
        const a = ultimaDaFamilia.get(f)
        if (!a || u.em > a.em) ultimaDaFamilia.set(f, u)
      }
    }
    let melhor: PerfilCliente | null = null
    for (const [f, u] of ultimaDaFamilia) {
      const ciclo = cicloFam.get(f) || 0
      if (!ciclo) continue
      const atraso = Math.floor((agora - (u.em + ciclo * 864e5)) / 864e5)
      if (atraso < 0 || atraso > d.tolerancia_dias) continue
      // Mais de um serviço vencido: lembra o que venceu mais recentemente.
      if (!melhor || atraso < (melhor.atraso || 0)) {
        melhor = { ...x, servico_alvo: u.nome, feito_em: u.data, atraso, envio_chave: `${x.chave}|${semAcento(u.nome)}|${u.em}` }
      }
    }
    if (melhor) lista.push(melhor)
  }
  // Ordem do lembrete (dono, 30/09/2026): quem fez o serviço mais
  // recentemente primeiro (venceu há menos tempo -- 2025 antes de 2023).
  // Empate: quem veio ao salão mais recentemente.
  lista.sort((a, b) => (a.atraso || 0) - (b.atraso || 0) || a.dias - b.dias)
  return { lista, semCelular: base.semCelular, repetidos: base.repetidos, sem_ciclo }
}

/**
 * Quem NENHUM outro envio pega: está numa recuperação (risco ou perdidas) --
 * já recebeu depois da última visita, ou está na fila de uma recuperação
 * ligada. A recuperação manda (dono, 29/09/2026): se ela parou de vir, foi
 * por algum motivo, e lembrete, promoção ou venda cruzada esperam ela voltar.
 */
function emRecuperacao(salaoId: string, disparos: Disparo[], perfis: PerfilCliente[]) {
  const rec = disparos.filter(ehRecuperacao)
  const chave = `rec:${salaoId}:` + rec.map(x => `${x.id}.${x.ciclo}.${x.ligado}.${JSON.stringify(x.publico)}`).join('|')
  return memo(chave, 60, () => calcularRecuperacao(salaoId, rec, perfis))
}
async function calcularRecuperacao(salaoId: string, rec: Disparo[], perfis: PerfilCliente[]) {
  const fora = new Set<string>()
  if (!rec.length) return fora
  const ultimaDe = new Map(perfis.map(p => [p.chave, parseBR(p.ultima_visita)]))
  const { dados } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_envios')
    .select('chave, disparo_id, ciclo, enviado_em').eq('salao_id', salaoId).in('disparo_id', rec.map(x => x.id)).range(de, ate))
  const jaNoCiclo = new Set<string>()
  for (const r of dados) {
    const tel = telDaChave(r.chave)
    if (new Date(r.enviado_em).getTime() > (ultimaDe.get(tel) || 0)) fora.add(tel)
    jaNoCiclo.add(`${r.disparo_id}|${r.ciclo}|${tel}`)
  }
  for (const d of rec.filter(x => x.ligado)) {
    for (const x of publicoDe(perfis, d.publico).lista) if (!jaNoCiclo.has(`${d.id}|${d.ciclo}|${x.chave}`)) fora.add(x.chave)
  }
  return fora
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

// ── WhatsApp com problema: o envio automático para sozinho ──────────────────
//
// Auditoria (30/09/2026). Mandar lista com o WhatsApp desconectado enche a
// fila; mandar com mensagens falhando ou presas num tique só (sinal clássico
// de número restrito) é o caminho mais curto para o bloqueio. Qualquer um dos
// três pausa TODOS os envios automáticos até normalizar -- confirmação e
// feedback continuam por conta deles.
async function saudeDoWhatsapp(salaoId: string): Promise<string | null> {
  return memo(`saude:${salaoId}`, 60, async () => {
    const { data: canal } = await supabaseAdmin.from('crm_canais').select('situacao, visto_em').eq('salao_id', salaoId).maybeSingle()
    if (!canal || canal.situacao !== 'conectado') return 'Pausado: o WhatsApp do salão está desconectado'
    if (!canal.visto_em || Date.now() - new Date(canal.visto_em).getTime() > 5 * 60000) return 'Pausado: a ponte do WhatsApp não dá sinal há mais de 5 minutos'
    const duasHoras = new Date(Date.now() - 2 * 3600e3).toISOString()
    const { count: falhas } = await supabaseAdmin.from('crm_mensagens').select('id', { count: 'exact', head: true })
      .eq('salao_id', salaoId).eq('direcao', 'saida').eq('situacao', 'falhou').gte('criado_em', duasHoras)
    if ((falhas || 0) >= 5) return `Pausado: ${falhas} mensagens falharam nas últimas 2 horas (confira o WhatsApp)`
    // Um tique só: das 30 últimas do envio automático saídas há mais de 1 h,
    // se a maioria nunca chegou no aparelho, o número pode estar restrito.
    const { data: ult } = await supabaseAdmin.from('crm_mensagens').select('situacao')
      .eq('salao_id', salaoId).eq('direcao', 'saida').eq('autor_nome', AUTOR_DISPARO)
      .lt('criado_em', new Date(Date.now() - 3600e3).toISOString()).gte('criado_em', new Date(Date.now() - 864e5).toISOString())
      .order('criado_em', { ascending: false }).limit(30)
    const lista = ult || []
    const presas = lista.filter((m: any) => m.situacao === 'enviada').length
    if (lista.length >= 20 && presas / lista.length > 0.6) return `Pausado: ${presas} de ${lista.length} mensagens do envio ficaram com um tique só (o número pode estar restrito)`
    return null
  })
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

async function enviarPara(salaoId: string, d: Disparo, x: PerfilCliente, pacote: ReturnType<typeof pacotePara>) {
  const texto = pacote.filter(p => p.texto).map(p => p.texto).join('\n\n')
  const contato = await acharOuCriarContato(salaoId, x.celular, x.cliente_nome)
  if (!contato) return null
  const { conversa, reaberta, nova } = await conversaDoContato(salaoId, contato.id, PASTA_DO_DISPARO)
  if (!conversa) return null
  const agoraIso = new Date().toISOString()
  if (!nova) {
    // Toda mensagem do envio automático fica em Listas (dono, 30/09/2026),
    // a 1ª e a 2ª: não se mistura com as conversas do dia. Quando a cliente
    // responde, a ponte leva para "Preciso agir". Só duas exceções: tem
    // mensagem DELA sem ler (alguém precisa responder -- não se esconde) e a
    // pasta Profissionais.
    const patch: any = { ultima_em: agoraIso, ultima_de: 'salao', ultima_previa: texto.slice(0, 120), atualizado_em: agoraIso }
    const esperandoResposta = (conversa.nao_lidas || 0) > 0
    const reabre = reaberta && !esperandoResposta
    const deProfissional = /^extra_profissiona/.test(String(conversa.estado || ''))
    if (!esperandoResposta && !deProfissional) {
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
  const marca = x.envio_chave || x.chave
  const { error: dup } = await supabaseAdmin.from('crm_disparo_envios').insert({
    salao_id: salaoId, disparo_id: d.id, ciclo: d.ciclo, chave: marca,
    cliente_nome: x.cliente_nome, conversa_id: conversa.id,
  })
  if (dup) return null

  // Saudação, mensagem e anexo saem separados, 8 segundos um do outro
  // (criado_em no futuro = a ponte só pega a partir dali). A marca de envio
  // guarda a PRIMEIRA, que é a que conta como "recebeu".
  const { data: msgs } = await supabaseAdmin.from('crm_mensagens').insert(pacote.map((p, i) => ({
    salao_id: salaoId, conversa_id: conversa.id, direcao: 'saida', texto: p.texto, tipo: p.tipo, midia_url: p.midia_url,
    situacao: 'na_fila', autor_nome: AUTOR_DISPARO, em_massa: true,
    criado_em: new Date(Date.now() + i * 8000).toISOString(),
  }))).select('id, criado_em')
  const msg = (msgs || []).sort((a: any, b: any) => String(a.criado_em).localeCompare(String(b.criado_em)))[0]
  if (msg?.id) {
    await supabaseAdmin.from('crm_disparo_envios').update({ mensagem_id: msg.id })
      .eq('salao_id', salaoId).eq('disparo_id', d.id).eq('ciclo', d.ciclo).eq('chave', marca)
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
  const estados = await carregarEstadosDisparo(salaoId)
  const agora = agoraNoSalao()
  const est = (x: Disparo) => { const e = { ...ESTADO_VAZIO, ...(estados[x.id] || {}) }; if (e.dia !== agora.dia) { e.dia = agora.dia; e.enviados_dia = 0 } return e }
  const marcar = (x: Disparo, situacao: string, e = est(x)) => { e.situacao = situacao; estados[x.id] = e }

  // Passou do último dia: desliga sozinho, com o aviso de quanto faltou.
  let mudou = false
  for (const x of disparos) {
    if (x.ligado && x.fim && x.fim < agora.dia) {
      x.ligado = false; mudou = true
      marcar(x, `Período terminou em ${dataBR(x.fim)}`)
    }
  }

  // Todas as ligadas que já estão no período revezam (dono, 30/09/2026):
  // sai uma mensagem por volta para o salão inteiro e a vez é de quem mandou
  // há mais tempo -- nunca duas juntas. Para uma lista só começar depois de
  // outra, usa-se a data de início ou "Cada uma no seu horário".
  const noPeriodo = (x: Disparo) => x.ligado && (!x.inicio || x.inicio <= agora.dia)
  const ativos = disparos.filter(noPeriodo)
  const soSegunda = disparos.filter(x => !x.ligado && x.segunda.ligada && estados[x.id]?.concluido_em
    && Date.now() - new Date(estados[x.id].concluido_em!).getTime() < (x.segunda.dias + 8) * 864e5)
  for (const x of disparos) {
    if (!x.ligado || ativos.includes(x)) continue
    marcar(x, `Agendado: começa em ${dataBR(x.inicio)}`)
  }
  // A lista que já acabou mas ainda tem 2ª mensagem também entra.
  const ultimoDe = (x: Disparo) => new Date(estados[x.id]?.ultimo_envio_em || 0).getTime()
  const candidatos = [...ativos, ...soSegunda]
    .sort((a, b) => ultimoDe(a) - ultimoDe(b) || Number(ehRecuperacao(b)) - Number(ehRecuperacao(a)))
  if (!candidatos.length) {
    if (mudou) await gravarDisparos(salaoId, disparos)
    await gravarEstadosDisparo(salaoId, estados)
    return disparos.some(x => x.ligado) ? 'nenhum no período' : 'nenhum ligado'
  }
  let saida = ''

  const ultimoGeral = Math.max(0, ...disparos.map(x => new Date(estados[x.id]?.ultimo_envio_em || 0).getTime()))
  let ocupada: string | null | undefined
  let perfis: PerfilCliente[] | null = null
  let comuns: [Set<string>, Set<string>, Set<string>, { tel: string; disparo: string }[]] | null = null

  for (const d of candidatos) {
    const e = est(d)
    const soDaSegunda = soSegunda.includes(d)
    const situacao = (() => {
      if (!d.mensagens.length) return 'Sem mensagem escrita'
      if (!d.dias_semana.includes(agora.semana)) return 'Hoje não é dia de envio'
      if (agora.hora < d.janela_ini) return `Começa às ${d.janela_ini}`
      if (agora.hora >= d.janela_fim) return `Encerrado por hoje (volta amanhã às ${d.janela_ini})`
      if (e.enviados_dia >= d.max_dia) return `Limite do dia atingido (${d.max_dia})`
      const proximo = Math.max(e.proximo_em ? new Date(e.proximo_em).getTime() : 0, ultimoGeral + d.intervalo_min * 0.85 * 60000)
      if (Date.now() < proximo) {
        const h = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(proximo))
        return `Próxima mensagem às ${h}`
      }
      return ''
    })()
    if (situacao) { if (!soDaSegunda) marcar(d, situacao, e); continue }

    if (ocupada === undefined) ocupada = (await saudeDoWhatsapp(salaoId)) || (await filaOcupada(salaoId))
    if (ocupada) { if (!soDaSegunda) marcar(d, ocupada, e); continue }

    perfis = perfis || await perfisDoSalao(salaoId)
    comuns = comuns || await Promise.all([bloqueados(salaoId), telefonesDeProfissionais(salaoId), emRecuperacao(salaoId, disparos, perfis), enviosDaSemana(salaoId)])
    const [bloq, profs, recuperando, semana] = comuns
    const retorno = d.tipo === 'retorno'
    const naRecuperacao = (x: PerfilCliente) => !ehRecuperacao(d) && recuperando.has(x.chave)
    const recebeuOutro = deOutros(semana, d)

    // Manda para o primeiro da fila que pode receber agora. Olha no máximo 25
    // por volta: quem está em conversa ou travada fica para depois.
    const tentar = async (fila: PerfilCliente[], segunda: boolean, trava?: { chaves: Set<string>; nomes: Set<string> }, indice = 0) => {
      let olhadas = 0
      for (const x of fila) {
        if (trava && (trava.chaves.has(x.chave) || trava.nomes.has(x.cliente_nome))) continue
        if (++olhadas > 25) break
        const c = await conferirConversa(salaoId, x)
        if (c.bloquear) {
          await supabaseAdmin.from('crm_disparo_bloqueios').upsert({ salao_id: salaoId, chave: x.chave, motivo: c.bloquear })
          continue
        }
        if (c.pular) continue
        const pacote = segunda ? segundaPara(d, x, indice) : pacotePara(d, x, indice)
        if (!pacote.length) continue
        const conv = await enviarPara(salaoId, d, x, pacote)
        if (!conv) continue
        e.enviados_dia++
        e.ultimo_envio_em = new Date().toISOString()
        e.ultimo_cliente = x.cliente_nome
        // Intervalo com variação de 15% para os envios não saírem num compasso de relógio.
        const var15 = 0.85 + Math.random() * 0.3
        e.proximo_em = new Date(Date.now() + d.intervalo_min * var15 * 60000).toISOString()
        marcar(d, `Enviando: última ${segunda ? '(2ª mensagem) ' : ''}para ${primeiroNome(x.cliente_nome)}`, e)
        saida = `${d.nome}: ${segunda ? '2ª mensagem' : 'enviou'} para ${primeiroNome(x.cliente_nome)}`
        return true
      }
      return false
    }

    // 2ª mensagem primeiro: é quem está esperando há dias. Sem a trava de
    // "recebeu algo há pouco" -- o que ela recebeu foi justamente a 1ª.
    const segundas = (await segundasPendentes(salaoId, d, perfis))
      .filter(x => !bloq.has(x.chave) && !profs.has(x.chave) && !naRecuperacao(x) && !recebeuOutro.has(x.chave))
    if (segundas.length && await tentar(segundas, true, undefined, e.enviados_dia)) break
    if (soDaSegunda) continue

    const { lista } = await alvosDoDisparo(salaoId, d, perfis)
    const [env, trava] = await Promise.all([
      enviosDoDisparo(salaoId, d),
      travados(salaoId, d.trava_dias, retorno ? new Set([d.id, ...disparos.filter(ehRecuperacao).map(x => x.id)]) : undefined),
    ])
    const restantes = env.alinhar(lista).filter(x => !env.feitos.has(x.envio_chave!) && !bloq.has(x.chave) && !profs.has(x.chave)
      && !naRecuperacao(x)).map(env.marcaDe)
    if (!restantes.length) {
      if (sempreRodando(d)) {
        e.proximo_em = new Date(Date.now() + 30 * 60000).toISOString()
        marcar(d, retorno ? 'Ninguém na hora de voltar agora; olha de novo em 30 min' : 'Ninguém novo na lista agora; olha de novo em 30 min', e)
        continue
      }
      e.concluido_em = new Date().toISOString()
      d.ligado = false; mudou = true
      marcar(d, d.segunda.ligada ? 'Lista concluída: todas receberam (a 2ª mensagem continua saindo)' : 'Lista concluída: todas receberam', e)
      continue
    }
    // Quem recebeu outro envio nesta semana fica para depois (continua na fila).
    for (const t of recebeuOutro) trava.chaves.add(t)
    if (await tentar(restantes, false, trava, env.total)) break
    e.proximo_em = new Date(Date.now() + 15 * 60000).toISOString()
    marcar(d, 'Ninguém disponível agora (em conversa ou contatada há pouco); tenta de novo em 15 min', e)
  }

  if (mudou) await gravarDisparos(salaoId, disparos)
  await gravarEstadosDisparo(salaoId, estados)
  return saida || candidatos.map(x => `${x.nome}: ${estados[x.id]?.situacao || ''}`).join(' | ')
}

/**
 * Quem já passou do prazo da 2ª mensagem: recebeu a 1ª há N dias (até uma
 * semana depois disso), não respondeu, não agendou e não voltou ao salão.
 */
async function segundasPendentes(salaoId: string, d: Disparo, perfis: PerfilCliente[]): Promise<PerfilCliente[]> {
  if (!d.segunda.ligada || !d.segunda.mensagens.length) return []
  const agora = Date.now(), minimo = d.segunda.dias * 864e5, maximo = (d.segunda.dias + 7) * 864e5
  const { dados } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_envios')
    .select('chave, conversa_id, enviado_em').eq('salao_id', salaoId).eq('disparo_id', d.id).eq('ciclo', d.ciclo)
    .gte('enviado_em', new Date(agora - maximo).toISOString()).range(de, ate))
  const feitas = new Set(dados.filter(r => String(r.chave).endsWith(SEGUNDA)).map(r => String(r.chave).slice(0, -SEGUNDA.length)))
  const cand = dados
    .filter(r => !String(r.chave).endsWith(SEGUNDA) && !feitas.has(r.chave) && r.conversa_id && agora - new Date(r.enviado_em).getTime() >= minimo)
    .sort((a, b) => String(a.enviado_em).localeCompare(String(b.enviado_em)))
  if (!cand.length) return []
  const enviadoEm = new Map(cand.map(r => [r.conversa_id, new Date(r.enviado_em).getTime()]))
  const ids = [...enviadoEm.keys()]
  const respondeu = new Set<string>(), decidida = new Set<string>()
  for (let i = 0; i < ids.length; i += 150) {
    const lote = ids.slice(i, i + 150)
    const [{ data: msgs }, { data: convs }] = await Promise.all([
      supabaseAdmin.from('crm_mensagens').select('conversa_id, criado_em').in('conversa_id', lote).eq('direcao', 'entrada')
        .gte('criado_em', new Date(agora - maximo).toISOString()).limit(3000),
      supabaseAdmin.from('crm_conversas').select('id, estado').in('id', lote),
    ])
    for (const m of msgs || []) if (new Date(m.criado_em).getTime() > (enviadoEm.get(m.conversa_id) || Infinity)) respondeu.add(m.conversa_id)
    for (const c of convs || []) if (['agendado', 'confirmado'].includes(c.estado)) decidida.add(c.id)
  }
  const porTel = new Map(perfis.map(p => [p.chave, p]))
  const agenda = await comHorarioMarcado(salaoId)
  const saida: PerfilCliente[] = []
  for (const r of cand) {
    if (respondeu.has(r.conversa_id) || decidida.has(r.conversa_id)) continue
    if (agenda.chaves.has(telDaChave(r.chave))) continue
    const x = porTel.get(telDaChave(r.chave))
    if (!x || parseBR(x.ultima_visita) > new Date(r.enviado_em).getTime()) continue
    saida.push({ ...x, envio_chave: r.chave + SEGUNDA })
  }
  return saida
}

/**
 * O mesmo caminho de uma volta, SEM mandar e sem gravar nada: diz se agora
 * sairia mensagem, para quem, e por que as anteriores foram puladas. É o
 * teste honesto de uma automação que fala com cliente.
 */
export async function simularProximo(salaoId: string, d: Disparo) {
  const agora = agoraNoSalao()
  const travas: string[] = []
  if (d.inicio && d.inicio > agora.dia) travas.push(`só começa em ${dataBR(d.inicio)}`)
  if (d.fim && d.fim < agora.dia) travas.push(`o período terminou em ${dataBR(d.fim)}`)
  if (!d.dias_semana.includes(agora.semana)) travas.push('hoje não é dia de envio')
  if (agora.hora < d.janela_ini || agora.hora >= d.janela_fim) travas.push(`fora do horário (${d.janela_ini} às ${d.janela_fim})`)
  const ocupada = (await saudeDoWhatsapp(salaoId)) || (await filaOcupada(salaoId))
  if (ocupada) travas.push(ocupada)
  const perfis = await perfisDoSalao(salaoId)
  const { lista } = await alvosDoDisparo(salaoId, d, perfis)
  const retorno = d.tipo === 'retorno'
  const todos = await carregarDisparos(salaoId)
  const [env, bloq, trava, profs, recuperando] = await Promise.all([
    enviosDoDisparo(salaoId, d), bloqueados(salaoId),
    travados(salaoId, d.trava_dias, retorno ? new Set([d.id, ...todos.filter(ehRecuperacao).map(x => x.id)]) : undefined),
    telefonesDeProfissionais(salaoId), ehRecuperacao(d) ? Promise.resolve(new Set<string>()) : emRecuperacao(salaoId, todos, perfis),
  ])
  const recebeuOutro = deOutros(await enviosDaSemana(salaoId), d)
  const puladas: { cliente: string; motivo: string }[] = []
  let proxima: any = null
  for (const x of env.alinhar(lista)) {
    if (puladas.length > 25) break
    if (env.feitos.has(x.envio_chave!)) continue
    if (recuperando.has(x.chave)) { puladas.push({ cliente: x.cliente_nome, motivo: 'está numa lista de risco/perdidas' }); continue }
    if (recebeuOutro.has(x.chave)) { puladas.push({ cliente: x.cliente_nome, motivo: `recebeu outro envio nos últimos ${DIAS_ENTRE_ENVIOS} dias` }); continue }
    if (bloq.has(x.chave)) { puladas.push({ cliente: x.cliente_nome, motivo: 'pediu para sair' }); continue }
    if (profs.has(x.chave)) { puladas.push({ cliente: x.cliente_nome, motivo: 'profissional do salão' }); continue }
    if (trava.chaves.has(x.chave) || trava.nomes.has(x.cliente_nome)) { puladas.push({ cliente: x.cliente_nome, motivo: `contatada nos últimos ${d.trava_dias} dias` }); continue }
    const c = await conferirConversa(salaoId, x)
    if (c.bloquear || c.pular) { puladas.push({ cliente: x.cliente_nome, motivo: c.bloquear || c.pular! }); continue }
    proxima = { cliente: x.cliente_nome, dias: x.dias, servico: x.servico_alvo || null, atraso: x.atraso ?? null, mensagem: pacotePara(d, x, env.total).map(p => p.texto || `[${p.tipo}]`).join('\n\n') }
    break
  }
  const segundas_pendentes = (await segundasPendentes(salaoId, d, perfis)).filter(x => !bloq.has(x.chave)).length
  return { mandaria_agora: !travas.length && (!!proxima || segundas_pendentes > 0), travas, proxima, puladas, segundas_pendentes }
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
      // A lista que acabou ainda pode ter 2ª mensagem para mandar.
      const temLigado = ((r.valor as any)?.disparos || []).some((x: any) => x?.ligado === true || x?.segunda?.ligada === true)
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
  const alvos = await alvosDoDisparo(salaoId, d, perfis)
  const { semCelular, repetidos, sem_ciclo } = alvos
  const [env, bloq, recuperando] = await Promise.all([enviosDoDisparo(salaoId, d), bloqueados(salaoId), foraPorRecuperacao(salaoId, d, perfis)])
  const lista = env.alinhar(alvos.lista)
  const na_recuperacao = lista.filter(x => recuperando.has(x.chave) && !env.feitos.has(x.envio_chave!)).length
  const naLista = lista.filter(x => !bloq.has(x.chave) && (env.feitos.has(x.envio_chave!) || !recuperando.has(x.chave)))
  // "enviadas" = quem está feito agora; quem voltou a poder receber (repetição) conta em "faltam".
  const enviadas = naLista.filter(x => env.feitos.has(x.envio_chave!)).length
  const repetindo = naLista.filter(x => !env.feitos.has(x.envio_chave!) && env.ult.has(x.envio_chave!)).length

  // Respostas e retornos: do ciclo atual, contados em cima das envios gravados.
  const { dados: envios } = await paginar<any>((de, ate) => supabaseAdmin.from('crm_disparo_envios')
    .select('chave, cliente_nome, conversa_id, enviado_em').eq('salao_id', salaoId).eq('disparo_id', d.id).range(de, ate))
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
  // Pelo celular: pelo nome, a volta de uma "FABIANA" contava para a outra.
  const ultimaDe = new Map<string, number>()
  for (const p of perfis) ultimaDe.set(p.chave, Math.max(ultimaDe.get(p.chave) || 0, parseBR(p.ultima_visita)))
  const voltaram = envios.filter(v => (ultimaDe.get(telDaChave(v.chave)) || 0) > new Date(v.enviado_em).getTime()).length

  // Receita: o que quem recebeu gastou no salão DEPOIS de receber (até 60
  // dias). A primeira mensagem de cada cliente conta; a 2ª não soma de novo.
  await ultimasPorServico(salaoId)
  const receitaMap = _receita.get(salaoId)
  let receita = 0
  const primeira = new Map<string, number>()
  for (const v of envios) {
    if (String(v.chave || '').endsWith(SEGUNDA)) continue
    const k = chaveDaCliente(semAcento(v.cliente_nome).replace(/\s+/g, ' '), telDaChave(v.chave)), t = new Date(v.enviado_em).getTime()
    if (!primeira.has(k) || t < primeira.get(k)!) primeira.set(k, t)
  }
  for (const [k, t] of primeira) {
    for (const c of receitaMap?.get(k) || []) if (c.em > t && c.em - t <= 60 * 864e5) receita += c.valor
  }

  const segundas = envios.filter(v => String(v.chave || '').endsWith(SEGUNDA)).length
  return {
    segundas,
    total: naLista.length, enviadas, faltam: naLista.length - enviadas,
    sem_celular: semCelular, repetidos, sem_ciclo, na_recuperacao, repetindo, bloqueados: lista.length - naLista.length,
    responderam, voltaram, receita: Math.round(receita), envios_total: envios.length - segundas,
    por_dia: cabemPorDia(d),
  }
}

// ── Dividir o dia entre os envios ligados ────────────────────────────────────
//
// Pedido do dono (30/09/2026): um atalho que liga/desliga os envios e reparte
// um total de mensagens por dia entre os ligados, cada um no SEU horário --
// um termina, o outro começa, nunca dois ao mesmo tempo. Mesma conta na tela
// (prévia) e aqui (o que é salvo).
export interface Fatia { id: string; max_dia: number; janela_ini: string; janela_fim: string; intervalo_min: number }
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export function dividirDia(ids: string[], total: number, ini: string, fim: string, modo: 'sequencia' | 'intercalado' = 'sequencia'): Fatia[] {
  const n = ids.length
  const janela = Math.max(0, minutos(fim) - minutos(ini))
  if (!n || !janela || total < 1) return []
  if (modo === 'intercalado') {
    // Todas o dia todo, revezando: o intervalo do salão é janela ÷ total
    // (12 h ÷ 100 = 7 min), e cada lista fica com a sua cota do dia.
    const intervalo = Math.max(5, Math.floor(janela / total))
    const cabemNoDia = Math.floor(janela / intervalo) + 1
    const t = Math.min(total, cabemNoDia)
    const base = Math.floor(t / n), sobra = t % n
    return ids.map((id, i) => ({ id, max_dia: Math.max(1, base + (i < sobra ? 1 : 0)), janela_ini: ini, janela_fim: fim, intervalo_min: intervalo }))
  }
  const fatia = Math.floor(janela / n)
  const base = Math.floor(total / n), sobra = total % n
  return ids.map((id, i) => {
    const cota = Math.max(1, base + (i < sobra ? 1 : 0))
    const a = minutos(ini) + i * fatia
    const b = i === n - 1 ? minutos(fim) : a + fatia
    // Piso de 5 minutos (o mesmo do envio); se não couber, a cota encolhe.
    const intervalo = Math.max(5, Math.floor((b - a) / cota))
    const cabe = Math.floor((b - a) / intervalo) + 1
    return { id, max_dia: Math.min(cota, cabe), janela_ini: hhmm(a), janela_fim: hhmm(b), intervalo_min: intervalo }
  })
}

/** Quem fica de fora deste envio por estar numa recuperação (vazio se ele mesmo é recuperação). */
export async function foraPorRecuperacao(salaoId: string, d: Disparo, perfis: PerfilCliente[]) {
  if (ehRecuperacao(d)) return new Set<string>()
  return emRecuperacao(salaoId, await carregarDisparos(salaoId), perfis)
}

/** Os serviços do salão, do mais feito para o menos, para a tela escolher. */
export async function servicosDoSalao(salaoId: string) {
  const perfis = await perfisDoSalao(salaoId)
  // "PIGMENTAÇÃO 14" e "Pigmentação 14" são o mesmo serviço: um item só, com
  // a grafia mais usada. A busca e o envio já comparam sem acento/maiúscula.
  const conta = new Map<string, { clientes: Set<string>; grafias: Map<string, number> }>()
  for (const p of perfis) for (const s of p.servicos) {
    const k = semAcento(s).replace(/\s+/g, ' ')
    const c = conta.get(k) || { clientes: new Set<string>(), grafias: new Map<string, number>() }
    c.clientes.add(p.chave || p.cliente_nome); c.grafias.set(s, (c.grafias.get(s) || 0) + 1)
    conta.set(k, c)
  }
  const catalogo = await ciclosDoCatalogo(salaoId)
  // `ciclo`: o ciclo de retorno da página Serviços, quando o nome bate.
  return [...conta.values()].map(c => {
    const nome = [...c.grafias.entries()].sort((a, b) => b[1] - a[1])[0][0]
    return { nome, clientes: c.clientes.size, ciclo: catalogo.get(semAcento(nome)) || null }
  }).sort((a, b) => b.clientes - a.clientes)
}
