// Resumo do dono: a mensagem de WhatsApp que o NODRI manda aos donos, no dia e
// na hora que o dono escolhe (botão "Notificar donos", em Relatórios).
//
// Cada item da mensagem existe para uma decisão: o número vem sempre com uma
// comparação (a meta, a média do mesmo dia da semana) e, quando algo foge do
// normal, vira um alerta com o que fazer. Número solto não entra.
//
// ── Sigilo ───────────────────────────────────────────────────────────────────
// A mensagem sai pelo WhatsApp do salão, o mesmo do CRM. Faturamento e meta
// não podem aparecer para a recepção, então a conversa nasce com
// `origem = 'resumo_dono'` e o CRM não a entrega a ninguém (conversas, painel e
// mensagens filtram por essa origem). O contato ainda ganha a etiqueta "não
// perturbe": nenhum envio automático (promoção, feedback, confirmação) o atinge.
//
// ── Relógio ──────────────────────────────────────────────────────────────────
// `rodarResumoDono()` roda a cada minuto, junto com o Envio automático
// (/api/cron/disparos). Manda UMA vez por dia por salão, dentro de uma janela
// de 2 horas a partir do horário escolhido: se o servidor estava fora ou o
// WhatsApp desconectado, tenta de novo a cada minuto até a janela fechar.

import { supabaseAdmin } from '@/lib/supabase'
import { paginar } from '@/lib/paginar'
import { normalizarTelefone, ETIQUETA_NAO_PERTURBE } from '@/lib/crm'
import { acharOuCriarContato } from '@/lib/crmContatos'
import { normalizaServico, type Campanha } from '@/lib/acoesComerciais'
import { calcularRankings } from '@/lib/corridasCalculo'
import { metricaInfo, formataValor, periodoLabel, resumoGrupo, type CorridaInterna, type LinhaRanking } from '@/lib/corridasInternas'

const FUSO = 'America/Sao_Paulo'
export const CHAVE_RESUMO_DONO = 'resumo_dono'
export const CHAVE_ESTADO_RESUMO = 'resumo_dono_estado'
export const ORIGEM_RESUMO_DONO = 'resumo_dono'
export const AUTOR_RESUMO = 'Resumo do dono'
const JANELA_MIN = 120
const MAX_TELEFONES = 10

// ── O que o dono pode escolher receber ───────────────────────────────────────

export interface ItemResumo { id: string; titulo: string; descricao: string; padrao: boolean }

export const ITENS_RESUMO: ItemResumo[] = [
  { id: 'dia', titulo: 'Faturamento do dia', padrao: true,
    descricao: 'Quanto entrou hoje, comparado à média das últimas quartas, sextas... (o mesmo dia da semana), com atendimentos, ticket e descontos.' },
  { id: 'meta', titulo: 'Meta do mês', padrao: true,
    descricao: 'Realizado contra a meta, quanto falta, a média por dia que ainda precisa entrar e a projeção no ritmo atual.' },
  { id: 'indicadores', titulo: 'Indicadores do mês contra o ano passado', padrao: true,
    descricao: 'Faturamento, ticket médio, clientes atendidas, clientes novas, serviços e produtos (os cartões da aba Geral), com a comparação justa: mesmo período do ano passado e o ritmo até o fim do mês.' },
  { id: 'acoes', titulo: 'Vendas das ações comerciais', padrao: true,
    descricao: 'Só as ações comerciais ativas e visíveis no portal, cada uma com quantas vendas teve, contadas nas comandas pelo nome do serviço, dentro das datas da ação.' },
  { id: 'corridas', titulo: 'Corridas internas', padrao: true,
    descricao: 'As corridas em andamento: a meta, como está o desempenho (do grupo ou de cada uma, conforme o modelo da corrida) e quem está na frente e mais atrás.' },
  { id: 'agenda', titulo: 'Agenda dos próximos 7 dias', padrao: true,
    descricao: 'Agendamentos de cada dia contra o normal daquele dia da semana, para encher os dias fracos a tempo.' },
  { id: 'profissionais', titulo: 'Profissionais no mês', padrao: true,
    descricao: 'Os maiores e os menores faturamentos do mês (mesma quantidade nas duas pontas), com ticket, dias trabalhados e ocupação, e quanto a receita depende dos três primeiros.' },
  { id: 'feedback_prof', titulo: 'Feedback dos profissionais do dia', padrao: true,
    descricao: 'Quantos feedbacks positivos e negativos cada profissional teve no mês (até 20 pessoas) e, em seguida, o que a recepção registrou hoje, por escrito: quem, positivo ou negativo, o que aconteceu e o detalhe.' },
  { id: 'qualidade', titulo: 'Qualidade e feedback', padrao: true,
    descricao: 'Nota média da semana, notas baixas e profissionais com feedback negativo no mês.' },
  { id: 'espera', titulo: 'Lista de espera', padrao: false,
    descricao: 'Quantas clientes aguardam vaga e há quantos dias a mais antiga espera.' },
  { id: 'alertas', titulo: 'Alertas que pedem decisão', padrao: true,
    descricao: 'Só o que fugiu do normal: meta em risco, dia fraco, agenda vazia, desconto alto, queixas e dados desatualizados.' },
]

export interface DestinoResumo { nome: string; telefone: string }
export interface ConfigResumo {
  ligado: boolean
  itens: string[]
  telefones: DestinoResumo[]
  /** 0 = domingo ... 6 = sábado */
  dias: number[]
  hora: string
  /** Como o salão se chama no título da mensagem (vazio = o nome do WhatsApp do salão). */
  nome: string
}
export interface EstadoResumo {
  dia: string
  enviado_em: string | null
  situacao: '' | 'enviado' | 'nao_enviado' | 'erro'
  para: number
  motivo: string
}

const ESTADO_VAZIO: EstadoResumo = { dia: '', enviado_em: null, situacao: '', para: 0, motivo: '' }

export function lerConfig(b: any): ConfigResumo {
  const ids = new Set(ITENS_RESUMO.map(i => i.id))
  const itens = Array.isArray(b?.itens)
    ? Array.from(new Set<string>(b.itens.map(String))).filter(x => ids.has(x))
    : ITENS_RESUMO.filter(i => i.padrao).map(i => i.id)
  const vistos = new Set<string>()
  const telefones: DestinoResumo[] = []
  for (const t of Array.isArray(b?.telefones) ? b.telefones : []) {
    const tel = normalizarTelefone(String(t?.telefone ?? t ?? ''))
    if (tel.length < 12 || vistos.has(tel)) continue
    vistos.add(tel)
    telefones.push({ nome: String(t?.nome || '').trim().slice(0, 60), telefone: tel })
    if (telefones.length >= MAX_TELEFONES) break
  }
  const dias = Array.isArray(b?.dias)
    ? Array.from(new Set<number>(b.dias.map(Number))).filter(n => Number.isInteger(n) && n >= 0 && n <= 6).sort()
    : [0, 1, 2, 3, 4, 5, 6]
  return {
    ligado: b?.ligado === true,
    itens, telefones, dias,
    // Padrão do dono: 23h, quando o dia fechou e a coleta das 22h já chegou.
    hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(b?.hora || '')) ? String(b.hora) : '23:00',
    nome: String(b?.nome || '').trim().slice(0, 60),
  }
}

export async function carregarConfig(salaoId: string): Promise<ConfigResumo> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_RESUMO_DONO).maybeSingle()
  return lerConfig(data?.valor)
}

export async function gravarConfig(salaoId: string, c: ConfigResumo) {
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_RESUMO_DONO, valor: c, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

export async function carregarEstado(salaoId: string): Promise<EstadoResumo> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_ESTADO_RESUMO).maybeSingle()
  return { ...ESTADO_VAZIO, ...((data?.valor as any) || {}) }
}

async function gravarEstado(salaoId: string, e: EstadoResumo) {
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_ESTADO_RESUMO, valor: e, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

// ── Datas (sempre em Brasília) ───────────────────────────────────────────────

const DIA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const DIA_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados']
const MES_NOME = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const p2 = (n: number) => String(n).padStart(2, '0')

interface Agora { ano: number; mes: number; dia: number; dow: number; minutos: number; iso: string }

export function agoraBR(d = new Date()): Agora {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(d)
  const g = (t: string) => partes.find(p => p.type === t)?.value || ''
  const ano = Number(g('year')), mes = Number(g('month')), dia = Number(g('day'))
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'))
  return { ano, mes, dia, dow, minutos: Number(g('hour')) * 60 + Number(g('minute')), iso: `${ano}-${p2(mes)}-${p2(dia)}` }
}

const isoDe = (dt: Date) => `${dt.getUTCFullYear()}-${p2(dt.getUTCMonth() + 1)}-${p2(dt.getUTCDate())}`
const dtDe = (iso: string) => new Date(`${iso}T12:00:00Z`)
function somarDias(iso: string, n: number) { const d = dtDe(iso); d.setUTCDate(d.getUTCDate() + n); return isoDe(d) }
const dowDe = (iso: string) => dtDe(iso).getUTCDay()
const brDe = (iso: string) => { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}` }
const curto = (iso: string) => `${DIA_CURTO[dowDe(iso)]} ${iso.slice(8)}/${iso.slice(5, 7)}`

/** 'dd/mm/aaaa' ou 'aaaa-mm-dd' -> 'aaaa-mm-dd' (ou null). */
function paraIso(s: any): string | null {
  const t = String(s || '').trim()
  let m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

// ── Formatação ───────────────────────────────────────────────────────────────

const num = (v: any) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const moeda = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const moedaCurta = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')
const pct = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
/** "alta de 7,6%" / "queda de 9,8%": palavra no lugar do sinal, que no WhatsApp se perde. */
const variacao = (v: number | null) => v === null ? '' : v >= 0 ? `alta de ${pct(v)}` : `queda de ${pct(-v)}`
const primeiroNome = (s: string) => {
  const p = String(s || '').trim().split(/\s+/)[0] || ''
  if (p.length <= 2) return p.toUpperCase()          // sigla ("MP"), não nome
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ''
}

// ── Os números ───────────────────────────────────────────────────────────────

interface Numeros {
  nome: string
  hoje: Agora
  meses: Array<{ ano: number; mes: number }>
  periodo: any | null
  atualizadoEm: string | null
  diario: Map<string, number>
  sinais: string[]
  linhas: Record<string, string[]>
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()

/** Média do mesmo dia da semana nas últimas ocorrências (sem contar `ate`). */
function mediaDoDia(diario: Map<string, number>, ate: string, dow: number, quantas = 4, janelaSemanas = 8) {
  const v: number[] = []
  for (let i = 1; i <= janelaSemanas && v.length < quantas; i++) {
    const x = diario.get(somarDias(ate, -7 * i))
    if (x && x > 0 && dowDe(somarDias(ate, -7 * i)) === dow) v.push(x)
  }
  return v.length ? { media: v.reduce((s, x) => s + x, 0) / v.length, n: v.length } : { media: 0, n: 0 }
}

async function reunir(salaoId: string, hoje: Agora, itens: string[], nomeEscolhido = ''): Promise<Numeros> {
  const sinais: string[] = []
  const linhas: Record<string, string[]> = {}
  const quer = (id: string) => itens.includes(id)

  const meses: Array<{ ano: number; mes: number }> = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.UTC(hoje.ano, hoje.mes - 1 - i, 15))
    meses.push({ ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 })
  }

  const [{ data: salao }, { data: canal }, { data: periodos }, { data: metaRow }] = await Promise.all([
    supabaseAdmin.from('saloes').select('nome').eq('id', salaoId).maybeSingle(),
    supabaseAdmin.from('crm_canais').select('nome_exibicao').eq('salao_id', salaoId).maybeSingle(),
    supabaseAdmin.from('relatorio_periodos')
      .select('ano, mes, atualizado_em, resumo_mensal, faturamento_diario, prof_servicos, prof_ticket, prof_ocupacao')
      .eq('salao_id', salaoId).gte('ano', hoje.ano - 1),
    supabaseAdmin.from('ia_metas_salao').select('meta_valor')
      .eq('salao_id', salaoId).eq('ano', hoje.ano).eq('mes', hoje.mes).maybeSingle(),
  ])
  // A razão social ("... LTDA") é feia para título; o nome do WhatsApp do salão
  // é como o dono o conhece. O dono ainda pode escolher o nome na tela.
  const nome = nomeEscolhido.trim() || String((canal as any)?.nome_exibicao || '').trim() || String((salao as any)?.nome || 'Seu salão')

  const doMes = (periodos || []).find((p: any) => p.ano === hoje.ano && p.mes === hoje.mes) || null
  const diario = new Map<string, number>()
  for (const p of periodos || []) {
    if (!meses.some(m => m.ano === p.ano && m.mes === p.mes)) continue
    for (const r of (Array.isArray(p.faturamento_diario) ? p.faturamento_diario : [])) {
      const iso = paraIso(r?.data)
      if (iso) diario.set(iso, num(r?.valor))
    }
  }

  // Dados velhos: a coleta de 22h costuma chegar até as 22h30. Se o relatório
  // não foi atualizado hoje depois das 18h, os números de hoje não são confiáveis.
  const atualizadoEm: string | null = doMes?.atualizado_em || null
  const limiteFrescor = new Date(`${hoje.iso}T21:00:00-03:00`).getTime() - 3 * 3600_000
  const horaAtual = hoje.minutos
  if (!doMes) sinais.push('Não há relatório do mês no sistema: os números abaixo podem estar vazios.')
  else if (atualizadoEm && new Date(atualizadoEm).getTime() < limiteFrescor && horaAtual >= 20 * 60) {
    const q = agoraBR(new Date(atualizadoEm))
    sinais.push(`Dados desatualizados: o relatório do sistema foi atualizado pela última vez em ${p2(q.dia)}/${p2(q.mes)} às ${p2(Math.floor(q.minutos / 60))}:${p2(q.minutos % 60)}. Os números de hoje podem estar incompletos.`)
  }

  // ── Dia ──
  const valorHoje = diario.get(hoje.iso) ?? 0
  const base = mediaDoDia(diario, hoje.iso, hoje.dow)
  if (quer('dia') || quer('alertas')) {
    const aten = await paginar<any>((de, ate) => supabaseAdmin.from('atendimentos_raw')
      .select('num_comanda, cliente, total, desconto')
      .eq('salao_id', salaoId).eq('ano', hoje.ano).eq('mes', hoje.mes).eq('data_comanda', brDe(hoje.iso))
      .range(de, ate), 3000)
    const comandas = new Set(aten.dados.map(r => String(r.num_comanda || '')).filter(Boolean)).size
    const clientes = new Set(aten.dados.map(r => String(r.cliente || '').trim().toUpperCase()).filter(Boolean)).size
    const desconto = aten.dados.reduce((s, r) => s + num(r.desconto), 0)
    const bruto = aten.dados.reduce((s, r) => s + num(r.total), 0) + desconto

    const l: string[] = []
    if (valorHoje > 0) {
      l.push(`Faturamento: ${moeda(valorHoje)}`)
      if (base.n >= 2) {
        l.push(`Média de ${DIA_PLURAL[hoje.dow]}: ${moedaCurta(base.media)}`, `Hoje teve ${variacao((valorHoje / base.media - 1) * 100)}`)
        if (valorHoje < base.media * 0.7) sinais.push(`Dia fraco: ${moedaCurta(valorHoje)}, ${pct((valorHoje / base.media) * 100)} da média de ${DIA_PLURAL[hoje.dow]}.`)
      }
      if (clientes > 0) l.push('', `Clientes atendidas: ${clientes}`, `Ticket do dia: ${moeda(valorHoje / clientes)}`)
      if (desconto > 0 && bruto > 0) {
        l.push('', `Descontos: ${moeda(desconto)}`, `São ${pct((desconto / bruto) * 100)} do bruto`)
        if (desconto / bruto > 0.1) sinais.push(`Descontos altos hoje: ${pct((desconto / bruto) * 100)} do bruto. Vale conferir quem concedeu e por quê.`)
      }
      if (comandas >= 500) l.push('', 'Atenção: o sistema entrega no máximo 500 comandas por atualização; os números do dia podem estar incompletos.')
    } else {
      l.push('Nenhum faturamento lançado hoje.')
      if (base.n >= 2) sinais.push(`Sem faturamento lançado hoje (a média de ${DIA_PLURAL[hoje.dow]} é ${moedaCurta(base.media)}). Confira se o dia foi fechado ou se o relatório não chegou.`)
    }
    linhas.dia = l
  }

  // ── Meta ──
  const meta = num((metaRow as any)?.meta_valor)
  const resumo = Array.isArray(doMes?.resumo_mensal) ? doMes!.resumo_mensal[0] : null
  let realizado = num(resumo?.faturamento_total)
  if (!realizado) for (const [iso, v] of diario) if (iso.slice(0, 7) === hoje.iso.slice(0, 7) && iso <= hoje.iso) realizado += v
  // Dias que ainda vão abrir: os do resto do mês cujo dia da semana costuma
  // faturar. `esperado` é o que devem render no ritmo de agora; é a base da
  // projeção da meta e do "no ritmo" dos indicadores.
  let abertos = 0, esperado = 0
  {
    const fim = new Date(Date.UTC(hoje.ano, hoje.mes, 0)).getUTCDate()
    for (let d = hoje.dia + 1; d <= fim; d++) {
      const iso = `${hoje.ano}-${p2(hoje.mes)}-${p2(d)}`
      const m = mediaDoDia(diario, iso, dowDe(iso), 4, 8).media
      if (m > 0) { abertos++; esperado += m }
    }
  }
  if (quer('meta') || quer('alertas')) {
    const l: string[] = []
    if (meta > 0) {
      const restante = Math.max(meta - realizado, 0)
      l.push(`Meta: ${moeda(meta)}`, `Realizado: ${moeda(realizado)}`, `Já são ${pct((realizado / meta) * 100)} da meta`)
      if (restante <= 0) l.push('', 'Meta batida.')
      else {
        l.push('', `Falta: ${moeda(restante)}`)
        if (abertos > 0) {
          l.push(`Restam ${abertos} dias de atendimento`, `Precisa de ${moedaCurta(restante / abertos)} por dia`)
          const proj = realizado + esperado
          l.push('', 'Projeção no ritmo atual:', `${moedaCurta(proj)}, ${pct((proj / meta) * 100)} da meta`)
          if (proj < meta * 0.9) sinais.push(`Meta em risco: no ritmo atual o mês fecha em ${pct((proj / meta) * 100)} da meta. Faltam ${moedaCurta(restante)}; vale uma ação comercial nos dias fracos.`)
        } else l.push('Não restam dias de atendimento no mês.')
      }
    } else {
      l.push(`Realizado: ${moeda(realizado)}`, '', `A meta de ${MES_NOME[hoje.mes]} não está definida. Defina em Relatórios > Metas para ver a projeção.`)
    }
    linhas.meta = l
  }

  // ── Indicadores do mês contra o ano passado ──
  //
  // Os seis cartões da aba Geral. O cartão compara o mês PARCIAL com o mês
  // CHEIO do ano passado (o dono conhece e mandou não mexer na tela); aqui a
  // comparação é a justa: para o faturamento, o MESMO período (dia 1 até
  // hoje) do ano passado e do mês passado, tirado do diário; para o que só
  // existe somado no mês (clientes, serviços, produtos), o ritmo até o fim do
  // mês contra o mês cheio do ano passado. Ticket é média, então compara direto.
  if (quer('indicadores') || quer('alertas')) {
    const l: string[] = []
    const atual = Array.isArray(doMes?.resumo_mensal) ? doMes!.resumo_mensal[0] : null
    const antes = (periodos || []).find((p: any) => p.ano === hoje.ano - 1 && p.mes === hoje.mes)
    const ant = Array.isArray(antes?.resumo_mensal) ? antes!.resumo_mensal[0] : null
    const var_ = (a: number, b: number) => b > 0 ? (a / b - 1) * 100 : null
    const fator = realizado > 0 ? (realizado + esperado) / realizado : 1

    const somaAte = (linhas: any[], prefixo?: string) => {
      let s = 0
      for (const r of linhas) {
        const iso = paraIso(r?.data)
        if (!iso || (prefixo && iso.slice(0, 7) !== prefixo)) continue
        if (Number(iso.slice(8)) <= hoje.dia) s += num(r?.valor)
      }
      return s
    }
    const fatNoPeriodo = somaAte(Array.isArray(doMes?.faturamento_diario) ? doMes!.faturamento_diario : [])
    const fatAnoPassado = somaAte(Array.isArray(antes?.faturamento_diario) ? antes!.faturamento_diario : [])
    const dm = new Date(Date.UTC(hoje.ano, hoje.mes - 2, 15))
    const mesPassado = (periodos || []).find((p: any) => p.ano === dm.getUTCFullYear() && p.mes === dm.getUTCMonth() + 1)
    const fatMesPassado = somaAte(Array.isArray(mesPassado?.faturamento_diario) ? mesPassado!.faturamento_diario : [])
    const fatBase = fatNoPeriodo || realizado
    const ano = hoje.ano - 1

    if (atual) {
      const vAno = var_(fatBase, fatAnoPassado), vMes = var_(fatBase, fatMesPassado)
      l.push('*Faturamento*', moeda(num(atual.faturamento_total)))
      if (fatAnoPassado > 0) l.push(`Em ${ano}, mesmo período: ${moedaCurta(fatAnoPassado)}`, `Agora: ${variacao(vAno)}`)
      if (fatMesPassado > 0) l.push(`No mês passado, mesmo período: ${moedaCurta(fatMesPassado)}`, `Agora: ${variacao(vMes)}`)
      if (vAno !== null && vAno <= -10) sinais.push(`Faturamento ${pct(Math.abs(vAno))} abaixo do mesmo período de ${ano}. O mês está andando mais devagar que o do ano passado.`)
      else if (vMes !== null && vMes <= -10) sinais.push(`Faturamento ${pct(Math.abs(vMes))} abaixo do mesmo período do mês passado.`)

      const tk = num(atual.ticket_medio), tkAnt = num(ant?.ticket_medio)
      l.push('', '*Ticket médio*', moeda(tk))
      if (tkAnt > 0) l.push(`Em ${ano}: ${moeda(tkAnt)}`, `Agora: ${variacao(var_(tk, tkAnt))}`)
      const vt = tkAnt > 0 ? var_(tk, tkAnt) : null
      if (vt !== null && vt <= -10) sinais.push(`Ticket médio ${pct(Math.abs(vt))} abaixo do de ${ano}: confira descontos e venda de serviços de maior valor.`)

      // Cada indicador em 3 ou 4 linhas curtas: o valor até hoje, onde deve
      // fechar o mês no ritmo atual e o mês inteiro de um ano atrás.
      const bloco = (nome: string, a: number, b: number, dinheiro: boolean) => {
        const f = (v: number) => dinheiro ? moedaCurta(v) : String(Math.round(v))
        const rit = a * fator
        const r = ['', `*${nome}*`, `Até hoje: ${f(a)}`, `Fecha o mês em ${dinheiro ? '' : 'cerca de '}${f(rit)}`]
        if (b > 0) r.push(`${MES_NOME[hoje.mes]} de ${ano} inteiro: ${f(b)}`, `Previsão: ${variacao(var_(rit, b))}`)
        return r
      }
      l.push(...bloco('Clientes atendidas', num(atual.clientes_atendidos), num(ant?.clientes_atendidos), false))
      l.push(...bloco('Clientes novas', num(atual.clientes_novos), num(ant?.clientes_novos), false))
      l.push(...bloco('Serviços', num(atual.faturamento_servicos), num(ant?.faturamento_servicos), true))
      l.push(...bloco('Produtos', num(atual.faturamento_produtos), num(ant?.faturamento_produtos), true))
      if (!ant) l.push('', `Sem relatório de ${MES_NOME[hoje.mes]}/${ano} no sistema para comparar.`)
    } else l.push('Sem o resumo do mês importado.')
    linhas.indicadores = l
  }

  // ── Vendas das ações comerciais ──
  //
  // A ação comercial tem o nome do serviço que a recepção lança na comanda
  // ("COMBO ROUGE HAIR"). A venda é contada nas COMANDAS (atendimentos_raw),
  // dentro das datas da própria ação, e não no relatório somado por mês: assim
  // uma ação de 10 a 20 do mês não leva as vendas do mês inteiro.
  //
  // O nome da ação raramente é idêntico ao do serviço ("TRATAMENTO DAVINES +
  // MODELAGEM" é lançado como "TRATAMENTO DAVINES BEAUTIFUL THINGS E
  // MODELAGEM"). Por isso o casamento é por palavras: vale o serviço que
  // contém TODAS as palavras da ação (sem o que está entre parênteses, sem "e",
  // "de"...). Ação de uma palavra só exige nome igual, para "CORTE" não somar
  // todo corte do salão.
  if (quer('acoes')) {
    const { data: cfgA } = await supabaseAdmin.from('salao_config').select('valor')
      .eq('salao_id', salaoId).eq('chave', 'acoes_comerciais').maybeSingle()
    const campanhas: Campanha[] = Array.isArray((cfgA as any)?.valor) ? (cfgA as any).valor : []
    const SEM_PESO = new Set(['e', 'de', 'da', 'do', 'dos', 'das', 'a', 'o', 'as', 'os', 'com', 'para', 'no', 'na', 'em', 'um', 'uma'])
    const palavras = (s: string, tirarParenteses: boolean) => normalizaServico(tirarParenteses ? String(s).replace(/\([^)]*\)/g, ' ') : String(s))
      .split(/[^a-z0-9]+/).filter(t => t && !SEM_PESO.has(t))
    const diasEntre = (a: string, b: string) => Math.round((dtDe(a).getTime() - dtDe(b).getTime()) / 864e5)

    // Quais ações entram: as ativas e visíveis no portal, nada além disso.
    const vivas: Array<{ c: Campanha; titulo: string; alvo: string[]; ini: string; fim: string; encerrada: boolean; ate: string }> = []
    for (const c of campanhas) {
      if (!c.ativa) continue
      const ini = c.dataInicio || '', fim = c.dataFim || ''
      if (ini && ini > hoje.iso) continue
      // Só as que estão VALENDO, a mesma regra do portal (statusCampanha ===
      // 'ativa'): publicada, já começada e ainda dentro da data. Encerrada não
      // entra: o dono só quer ver o que está em andamento.
      if (fim && fim < hoje.iso) continue
      const encerrada = false
      const alvo = palavras(c.titulo, true)
      if (!alvo.length) continue
      vivas.push({
        c, titulo: String(c.titulo).replace(/\s+/g, ' ').trim().slice(0, 60), alvo, ini, fim, encerrada,
        ate: encerrada ? fim : hoje.iso,
      })
    }

    // Uma leitura por mês, de todas as ações juntas.
    const mesesPrecisos = new Set<string>()
    for (const v of vivas) {
      const de = v.ini || somarDias(hoje.iso, -30)
      for (let ym = Number(de.slice(0, 4)) * 12 + Number(de.slice(5, 7)) - 1; ym <= Number(v.ate.slice(0, 4)) * 12 + Number(v.ate.slice(5, 7)) - 1; ym++) {
        mesesPrecisos.add(`${Math.floor(ym / 12)}-${p2((ym % 12) + 1)}`)
      }
    }
    const comandas: Array<{ iso: string; palavras: Set<string>; nomeNorm: string; qtd: number; total: number }> = []
    for (const ym of mesesPrecisos) {
      const r = await paginar<any>((de, ate) => supabaseAdmin.from('atendimentos_raw')
        .select('servico, data_comanda, qtd, total')
        .eq('salao_id', salaoId).eq('ano', Number(ym.slice(0, 4))).eq('mes', Number(ym.slice(5)))
        .range(de, ate), 20000)
      const cache = new Map<string, { palavras: Set<string>; nomeNorm: string }>()
      for (const x of r.dados) {
        const iso = paraIso(x.data_comanda)
        if (!iso) continue
        const nome = String(x.servico || '')
        let k = cache.get(nome)
        if (!k) { k = { palavras: new Set(palavras(nome, false)), nomeNorm: palavras(nome, true).join(' ') }; cache.set(nome, k) }
        comandas.push({ iso, palavras: k.palavras, nomeNorm: k.nomeNorm, qtd: num(x.qtd) || 1, total: num(x.total) })
      }
    }

    const lista = vivas.map(v => {
      const de = v.ini || somarDias(hoje.iso, -30)
      const exato = v.alvo.join(' ')
      let qtd = 0, valor = 0
      for (const x of comandas) {
        if (x.iso < de || x.iso > v.ate) continue
        const casa = v.alvo.length >= 2 ? v.alvo.every(t => x.palavras.has(t)) : x.nomeNorm === exato
        if (casa) { qtd += x.qtd; valor += x.total }
      }
      const linhasAcao = [`*${v.titulo}*`, qtd > 0 ? `${qtd} vendido${qtd === 1 ? '' : 's'}${valor > 0 ? ` (${moedaCurta(valor)})` : ''}` : 'Nenhuma venda encontrada']
      if (v.encerrada) linhasAcao.push(`Encerrada em ${v.fim.slice(8)}/${v.fim.slice(5, 7)}`)
      else if (v.fim) { const d = diasEntre(v.fim, hoje.iso); linhasAcao.push(d === 0 ? 'Termina hoje' : `Termina em ${d} dia${d === 1 ? '' : 's'}`) }
      return { qtd, encerrada: v.encerrada, linhas: linhasAcao }
    })
    lista.sort((a, b) => Number(a.encerrada) - Number(b.encerrada) || b.qtd - a.qtd)
    const l: string[] = []
    lista.slice(0, 12).forEach((x, i) => { if (i) l.push(''); l.push(...x.linhas) })
    if (lista.length > 12) l.push('', `e mais ${lista.length - 12} ações`)
    if (lista.some(x => x.qtd === 0)) l.push('', 'Nenhuma venda encontrada pode ser nome da ação diferente do serviço lançado na comanda.')
    linhas.acoes = l.length ? l : ['Nenhuma ação comercial ativa no momento.']
  }

  // ── Corridas internas ──
  //
  // As corridas em andamento, com a meta e como está o desempenho. A conta é a
  // MESMA da tela (calcularRankings), então cada modelo de meta já vem
  // resolvido: em grupo (meta de cada uma e do conjunto), meta individual,
  // meta única e "menos é melhor" (a meta é um limite).
  if (quer('corridas')) {
    const { data: cfgC } = await supabaseAdmin.from('salao_config').select('valor')
      .eq('salao_id', salaoId).eq('chave', 'corridas_internas').maybeSingle()
    const todas: CorridaInterna[] = Array.isArray((cfgC as any)?.valor) ? (cfgC as any).valor : []
    const ym = `${hoje.ano}-${p2(hoje.mes)}`
    const andamento = todas.filter(c => c.ativa && (!c.de || c.de <= ym) && (!c.ate || c.ate >= ym)).slice(0, 5)
    const l: string[] = []
    if (!andamento.length) l.push('Nenhuma corrida interna em andamento.')
    else {
      // `false`: o faturamento simulado e as doações de teste são ferramentas do
      // dono para testar o gráfico; na mensagem só vale o número real.
      const { rankings } = await calcularRankings(salaoId, andamento, false)
      // O ranking já vem do melhor para o pior (na corrida de "menos é melhor",
      // do menor para o maior). Mesma quantidade nas duas pontas, sem repetir ninguém.
      const pontas = (linhas: LinhaRanking[], texto: (x: LinhaRanking) => string) => {
        const quantos = Math.min(5, Math.floor(linhas.length / 2))
        if (quantos < 1) return linhas.map(texto)
        return ['Na frente:', ...linhas.slice(0, quantos).map(texto), '', 'Mais atrás:', ...linhas.slice(-quantos).reverse().map(texto)]
      }
      andamento.forEach((c, i) => {
        const linhasC = rankings[c.id] || []
        if (i) l.push('')
        l.push(`*${String(c.titulo).replace(/\s+/g, ' ').trim().slice(0, 60)}*`, `Período: ${periodoLabel(c)}`)
        if (c.premio) l.push(`Prêmio: ${String(c.premio).replace(/\s+/g, ' ').trim().slice(0, 80)}`)
        if (!linhasC.length) { l.push('', 'Ainda sem dados de desempenho.'); return }

        const info = metricaInfo(c.metrica)
        const porPct = (x: LinhaRanking) => `${x.nome}: ${x.pctMeta ?? 0}%${x.bateuMeta ? ' (bateu)' : ''}`
        if (c.modo === 'grupo') {
          const r = resumoGrupo(linhasC)
          const meta = r.metaTotal || 0, feito = r.produzido || 0
          l.push('', `Meta do grupo: ${moeda(meta)}`, `Produzido: ${moeda(feito)}`, `Está em ${pct(r.pct)} da meta`, `Bateram a meta: ${r.bateram} de ${r.participantes}`)
          if (meta > feito) l.push(`Falta: ${moeda(meta - feito)}`)
          l.push('', ...pontas(linhasC, porPct))
        } else if (c.metaIndividual && c.metrica === 'faturamento') {
          l.push('', 'Cada uma corre contra a própria meta', `Bateram a meta: ${linhasC.filter(x => x.bateuMeta).length} de ${linhasC.length}`, '', ...pontas(linhasC, porPct))
        } else {
          const temMeta = typeof c.meta === 'number' && (info.inversa ? c.meta >= 0 : c.meta > 0)
          l.push('', `Medida: ${info.label}${c.metrica === 'servico' && c.servico ? ` (${c.servico})` : ''}${c.metrica === 'feedback_neg' && c.ocorrido ? ` (${c.ocorrido})` : ''}`)
          if (temMeta) l.push(info.inversa ? `Limite: ${formataValor(c.metrica, c.meta as number)} (menos é melhor)` : `Meta: ${formataValor(c.metrica, c.meta as number)}`, `Bateram a meta: ${linhasC.filter(x => x.bateuMeta).length} de ${linhasC.length}`)
          else if (info.inversa) l.push('Menos é melhor')
          l.push('', ...pontas(linhasC, x => `${x.pos}. ${x.nome}: ${formataValor(c.metrica, x.valor)}${x.pctMeta != null ? ` (${x.pctMeta}% da meta)` : ''}${x.bateuMeta ? ' - bateu' : ''}`))
        }
      })
    }
    linhas.corridas = l
  }

  // ── Agenda dos próximos 7 dias ──
  if (quer('agenda') || quer('alertas')) {
    const datas = Array.from({ length: 7 }, (_, i) => somarDias(hoje.iso, i + 1))
    const mesesAg = new Set<string>()
    for (const d of [...datas, somarDias(hoje.iso, -28)]) mesesAg.add(d.slice(0, 7))
    const reservas: any[] = []
    for (const ym of mesesAg) {
      const r = await paginar<any>((de, ate) => supabaseAdmin.from('agendamentos_raw')
        .select('data_reserva, status')
        .eq('salao_id', salaoId).eq('ano', Number(ym.slice(0, 4))).eq('mes', Number(ym.slice(5)))
        .range(de, ate), 8000)
      reservas.push(...r.dados)
    }
    const futuros = new Map<string, number>()
    const passados = new Map<string, number>()
    const desde = somarDias(hoje.iso, -28)
    for (const r of reservas) {
      const iso = paraIso(r.data_reserva)
      if (!iso) continue
      const st = String(r.status || '').toUpperCase()
      if (iso > hoje.iso) { if (st === 'AGENDADO' || st === 'CONFIRMADO') futuros.set(iso, (futuros.get(iso) || 0) + 1) }
      else if (iso >= desde) passados.set(iso, (passados.get(iso) || 0) + 1)
    }
    const porDow = new Map<number, number[]>()
    for (const [iso, n] of passados) porDow.set(dowDe(iso), [...(porDow.get(dowDe(iso)) || []), n])
    const l: string[] = []
    const fracos: string[] = []
    for (const iso of datas) {
      const v = porDow.get(dowDe(iso))
      if (!v || v.length < 2) continue                       // dia que o salão não costuma abrir
      const normal = v.reduce((s, x) => s + x, 0) / v.length
      const n = futuros.get(iso) || 0
      const fraco = n < normal * 0.6
      l.push(`${curto(iso)}: ${n} (normal ${Math.round(normal)})${fraco ? ' - fraco' : ''}`)
      if (fraco) fracos.push(curto(iso))
    }
    if (l.length) l.unshift('Agendados contra o normal do dia:', '')
    if (fracos.length) sinais.push(`Agenda fraca em ${fracos.length} dos próximos 7 dias (${fracos.join(', ')}). Ainda dá tempo de chamar a lista de espera e as clientes em retorno.`)
    linhas.agenda = l.length ? l : ['Sem agendamentos futuros no sistema (ou a agenda ainda não foi importada).']
  }

  // ── Profissionais no mês ──
  if (quer('profissionais')) {
    const por = new Map<string, number>()
    for (const r of (Array.isArray(doMes?.prof_servicos) ? doMes!.prof_servicos : [])) {
      const n = String(r?.profissional || '').trim()
      if (!n || n.toLowerCase() === 'nan') continue
      por.set(n, (por.get(n) || 0) + num(r?.valor))
    }
    const ticket = new Map<string, number>()
    for (const r of (Array.isArray(doMes?.prof_ticket) ? doMes!.prof_ticket : [])) ticket.set(semAcento(String(r?.profissional || '')), num(r?.ticket_medio))
    const ordem = [...por.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    const total = ordem.reduce((s, [, v]) => s + v, 0)
    const l: string[] = []

    // Ocupação e dias trabalhados vêm com o nome curto ("CINTIA"); o faturamento,
    // com o completo. Só se junta quando o primeiro nome é único na lista.
    const ocup = new Map<string, { taxa: number; dias: number }[]>()
    for (const r of (Array.isArray(doMes?.prof_ocupacao) ? doMes!.prof_ocupacao : [])) {
      const k = semAcento(primeiroNome(String(r?.profissional || '')))
      ocup.set(k, [...(ocup.get(k) || []), { taxa: num(r?.taxa_ocupacao), dias: num(r?.dias_trabalhados) }])
    }
    const doNome = (n: string) => { const o = ocup.get(semAcento(primeiroNome(n))); return o && o.length === 1 ? o[0] : null }
    const maiorDias = Math.max(0, ...ordem.map(([n]) => doNome(n)?.dias || 0))
    // Duas linhas por pessoa: o nome com o valor, e embaixo o que explica o número.
    const linhaProf = ([n, v]: [string, number], i: number) => {
      const t = ticket.get(semAcento(n)), o = doNome(n)
      const detalhe: string[] = []
      if (t) detalhe.push(`ticket ${moedaCurta(t)}`)
      if (o && o.dias > 0) detalhe.push(`${o.dias} dias${maiorDias > 0 && o.dias < maiorDias * 0.5 ? ' (poucos dias no mês)' : ''}`)
      if (o && o.taxa > 0) detalhe.push(`ocupação ${Math.round(o.taxa)}%`)
      return [`${i + 1}. *${primeiroNome(n)}*: ${moedaCurta(v)}`, ...(detalhe.length ? [`   ${detalhe.join(', ')}`] : [])]
    }
    // Mesma quantidade nas duas pontas (até 5), sem repetir ninguém.
    const quantos = Math.min(5, Math.floor(ordem.length / 2))
    if (quantos >= 2) {
      l.push('*Maiores faturamentos*', ...ordem.slice(0, quantos).flatMap(linhaProf))
      l.push('', '*Menores faturamentos*', ...ordem.slice(-quantos).reverse().flatMap(linhaProf))
    } else ordem.forEach((x, i) => l.push(...linhaProf(x, i)))
    if (ordem.length >= 4 && total > 0) {
      const top3 = ordem.slice(0, 3).reduce((s, [, v]) => s + v, 0) / total * 100
      l.push('', `Os 3 primeiros respondem por ${pct(top3)} do faturamento de serviços`)
      if (top3 > 60) sinais.push(`Receita concentrada: 3 profissionais fazem ${pct(top3)} dos serviços. Se um deles faltar ou sair, o mês sente.`)
    }
    linhas.profissionais = l.length ? l : ['Sem faturamento por profissional importado neste mês.']
  }

  // ── Qualidade ──
  if (quer('qualidade') || quer('alertas')) {
    const l: string[] = []
    const desde7 = new Date(Date.now() - 7 * 864e5).toISOString()
    const { data: forms } = await supabaseAdmin.from('feedback_formularios').select('id').eq('salao_id', salaoId)
    const formIds = (forms || []).map((f: any) => f.id)
    if (formIds.length) {
      const { data: perg } = await supabaseAdmin.from('feedback_perguntas').select('id, tipo')
        .in('formulario_id', formIds).in('tipo', ['escala', 'grid'])
      const escala = new Set((perg || []).map((p: any) => String(p.id)))
      const resp = await paginar<any>((de, ate) => supabaseAdmin.from('feedback_respostas').select('dados')
        .eq('salao_id', salaoId).gte('criado_em', desde7).range(de, ate), 3000)
      const notas: number[] = []
      for (const r of resp.dados) for (const [k, v] of Object.entries(r?.dados || {})) {
        if (!escala.has(k)) continue
        const lista = v && typeof v === 'object' ? Object.values(v as any) : [v]
        for (const x of lista) { const n = Number(x); if (n >= 1 && n <= 5) notas.push(n) }
      }
      if (notas.length) {
        const media = notas.reduce((s, x) => s + x, 0) / notas.length
        const baixas = notas.filter(n => n <= 3).length
        l.push(`Nota média da semana: ${media.toFixed(1).replace('.', ',')} de 5`, `${resp.dados.length} resposta${resp.dados.length === 1 ? '' : 's'}, ${baixas} nota${baixas === 1 ? '' : 's'} baixa${baixas === 1 ? '' : 's'}`)
        if (media < 4.5 || baixas >= 5) sinais.push(`Qualidade: nota média ${media.toFixed(1).replace('.', ',')} na semana com ${baixas} notas baixas. Leia as respostas no módulo Feedback.`)
      } else l.push('Nenhuma resposta de cliente com nota na última semana.')
    }
    const { data: fb } = await supabaseAdmin.from('relatorio_feedbacks').select('profissional, tipo')
      .eq('salao_id', salaoId).eq('ano', hoje.ano).eq('mes', hoje.mes)
    const neg = new Map<string, number>()
    let pos = 0, nega = 0
    for (const r of fb || []) {
      const t = String((r as any).tipo || '').toUpperCase()
      if (t === 'POSITIVO') pos++
      else if (t === 'NEGATIVO') { nega++; const n = primeiroNome(String((r as any).profissional || '')) || 'Sem profissional'; neg.set(n, (neg.get(n) || 0) + 1) }
    }
    if (pos + nega > 0) {
      l.push('', 'Feedback registrado no mês:', `${pos} positivos e ${nega} negativos`)
      const piores = [...neg.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 3).slice(0, 3)
      if (piores.length) {
        l.push('', 'Mais negativos:', ...piores.map(([n, c]) => `${n}: ${c}`))
        sinais.push(`Feedback negativo recorrente no mês: ${piores.map(([n, c]) => `${n} (${c})`).join(', ')}. Vale uma conversa individual.`)
      }
    }
    linhas.qualidade = l.length ? l : ['Sem feedback registrado.']
  }

  // ── Feedback dos profissionais (o que a recepção registra no dia) ──
  //
  // Mesma fonte da tela Feedback dos Profissionais: nome, o que aconteceu
  // ("ATRASO", "AUSENCIA DO SALÃO"), a descrição e se foi positivo ou negativo.
  // Saem duas mensagens: a CONTAGEM do mês de cada profissional (positivos e
  // negativos, até 20 pessoas) e, embaixo, o que foi registrado HOJE, por escrito.
  if (quer('feedback_prof')) {
    const iniMes = `${hoje.ano}-${p2(hoje.mes)}-01T00:00:00-03:00`
    const r = await paginar<any>((de, ate) => supabaseAdmin.from('feedback_prof_respostas')
      .select('profissional_id, profissional_nome, tipo, ocorrido_descricao, descricao, criado_em')
      .eq('salao_id', salaoId).gte('criado_em', iniMes).order('criado_em', { ascending: true }).range(de, ate), 5000)
    const negativo = (x: any) => String(x.tipo || '').toLowerCase().startsWith('neg')
    // A pessoa é o id do cadastro; sem id, o primeiro nome.
    const chave = (x: any) => String(x.profissional_id || semAcento(primeiroNome(String(x.profissional_nome || ''))))
    const s = (n: number) => (n === 1 ? '' : 's')

    const contagem = new Map<string, { nome: string; neg: number; pos: number }>()
    for (const x of r.dados) {
      const k = chave(x)
      const c = contagem.get(k) || { nome: '', neg: 0, pos: 0 }
      c.nome = primeiroNome(String(x.profissional_nome || '')) || c.nome || 'Sem nome'
      if (negativo(x)) c.neg++; else c.pos++
      contagem.set(k, c)
    }
    const ordem = [...contagem.values()].sort((a, b) => b.neg - a.neg || b.pos - a.pos || a.nome.localeCompare(b.nome))
    const mes: string[] = []
    if (ordem.length) {
      mes.push('Quantidade de registros de cada profissional neste mês:', '')
      for (const c of ordem.slice(0, 20)) mes.push(`${c.nome}: ${c.neg} negativo${s(c.neg)}, ${c.pos} positivo${s(c.pos)}`)
      if (ordem.length > 20) mes.push(`e mais ${ordem.length - 20} profissionais`)
    } else mes.push('Nenhum registro neste mês.')
    linhas.feedback_prof_mes = mes

    const doDia = r.dados.filter(x => agoraBR(new Date(x.criado_em)).iso === hoje.iso)
    const dia: string[] = []
    if (doDia.length) {
      const neg = doDia.filter(negativo).length
      dia.push(`${doDia.length} registro${s(doDia.length)} hoje: ${neg} negativo${s(neg)} e ${doDia.length - neg} positivo${s(doDia.length - neg)}`)
      for (const x of doDia.slice(0, 25)) {
        const nome = primeiroNome(String(x.profissional_nome || '')) || 'Sem nome'
        const oc = String(x.ocorrido_descricao || '').trim()
        const desc = String(x.descricao || '').replace(/\s+/g, ' ').trim()
        dia.push('', `*${nome}* - ${negativo(x) ? 'negativo' : 'positivo'}${oc ? `: ${oc}` : ''}`)
        if (desc) dia.push(desc.length > 300 ? desc.slice(0, 297).trimEnd() + '...' : desc)
      }
      if (doDia.length > 25) dia.push('', `e mais ${doDia.length - 25} registros`)
    } else dia.push('Nenhum registro hoje.')
    linhas.feedback_prof_dia = dia
  }

  // ── Lista de espera ──
  if (quer('espera')) {
    const { data } = await supabaseAdmin.from('lista_espera').select('criado_em, status')
      .eq('salao_id', salaoId).not('status', 'in', '("atendida","cancelada")')
    const aberta = data || []
    if (aberta.length) {
      const velha = Math.max(...aberta.map((x: any) => Math.floor((Date.now() - new Date(x.criado_em).getTime()) / 864e5)))
      linhas.espera = [`${aberta.length} aguardando vaga`, `A mais antiga espera há ${velha} dias`]
    } else linhas.espera = ['Ninguém aguardando vaga.']
  }

  // ── Robô de coleta ──
  if (quer('alertas')) {
    const { data: col } = await supabaseAdmin.from('robo_coletas').select('situacao, inicio')
      .eq('salao_id', salaoId).order('inicio', { ascending: false }).limit(1)
    const u: any = col?.[0]
    if (u?.situacao === 'erro' && new Date(u.inicio).getTime() > Date.now() - 24 * 3600_000) {
      sinais.push('A última atualização dos dados deu erro: os números podem não refletir tudo o que aconteceu. Confira no painel de administração.')
    }
  }

  return { nome, hoje, meses, periodo: doMes, atualizadoEm, diario, sinais, linhas }
}

// ── A mensagem ───────────────────────────────────────────────────────────────

/**
 * A mensagem em PARTES: uma por assunto, cada uma curta o bastante para ler
 * sem rolar. Um bloco único misturava tudo e o WhatsApp o mostrava como um
 * paredão (dono, 22/10/2026, vendo no celular). A primeira parte traz o que
 * pede decisão (os alertas); o detalhe vem depois, na ordem de importância.
 */
export async function montarResumo(salaoId: string, itens: string[], nomeEscolhido = '', quando = new Date()): Promise<string[]> {
  const hoje = agoraBR(quando)
  const n = await reunir(salaoId, hoje, itens, nomeEscolhido)
  const tem = (id: string) => itens.includes(id)
  const bloco = (titulo: string, l?: string[]) => l && l.length ? [`*${titulo}*`, '', ...l] : []

  const mes = MES_NOME[hoje.mes]
  const partes: string[][] = [
    tem('alertas')
      ? bloco('Alertas', n.sinais.length ? n.sinais.flatMap((s, i) => i ? ['', '- ' + s] : ['- ' + s]) : ['Nenhum alerta hoje.'])
      : [],
    [...(tem('dia') ? bloco('Hoje', n.linhas.dia) : []), ...(tem('dia') && tem('meta') ? [''] : []), ...(tem('meta') ? bloco(`Meta de ${mes}`, n.linhas.meta) : [])],
    tem('indicadores') ? bloco(`Indicadores de ${mes} (1 a ${hoje.dia})`, n.linhas.indicadores?.[0] === '' ? n.linhas.indicadores.slice(1) : n.linhas.indicadores) : [],
    tem('acoes') ? bloco('Ações comerciais', n.linhas.acoes) : [],
    tem('corridas') ? bloco('Corridas internas', n.linhas.corridas) : [],
    [...(tem('agenda') ? bloco('Próximos 7 dias', n.linhas.agenda) : []), ...(tem('agenda') && tem('espera') ? [''] : []), ...(tem('espera') ? bloco('Lista de espera', n.linhas.espera) : [])],
    tem('profissionais') ? bloco('Profissionais no mês', n.linhas.profissionais) : [],
    // Uma mensagem só (pedido do dono): a contagem do mês em cima e, embaixo, o que foi registrado hoje.
    tem('feedback_prof')
      ? bloco('Feedbacks dos profissionais no mês', [...(n.linhas.feedback_prof_mes || []), '', '*Feedbacks do dia*', '', ...(n.linhas.feedback_prof_dia || [])])
      : [],
    tem('qualidade') ? bloco('Qualidade', n.linhas.qualidade) : [],
  ].filter(p => p.length)

  const cabecalho = [`*Resumo do dia - ${n.nome}*`, `${DIA_CURTO[hoje.dow]}, ${p2(hoje.dia)}/${p2(hoje.mes)}/${hoje.ano}`]
  if (!partes.length) return [cabecalho.join('\n')]
  // O título abre a primeira parte, separado do conteúdo.
  partes[0] = [...cabecalho, '', ...partes[0]]
  return partes.map(p => p.join('\n').replace(/\n{3,}/g, '\n\n').trim())
}

// ── Envio ────────────────────────────────────────────────────────────────────

/**
 * Põe a mensagem na fila da ponte para cada telefone. A conversa fica fechada
 * (`sem_conversao`, que o relógio do CRM não mexe) e marcada com a origem do
 * resumo, que é o que a esconde da recepção.
 */
export async function enviarResumo(salaoId: string, partes: string[], destinos: DestinoResumo[]) {
  let enviados = 0
  const falhas: string[] = []
  for (const d of destinos) {
    try {
      const contato: any = await acharOuCriarContato(salaoId, d.telefone, d.nome || undefined)
      if (!contato) { falhas.push(d.telefone); continue }
      const etiquetas: string[] = Array.isArray(contato.etiquetas) ? contato.etiquetas : []
      if (!etiquetas.includes(ETIQUETA_NAO_PERTURBE)) {
        await supabaseAdmin.from('crm_contatos').update({ etiquetas: [...etiquetas, ETIQUETA_NAO_PERTURBE] }).eq('id', contato.id)
      }
      const agora = new Date().toISOString()
      const { data: ja } = await supabaseAdmin.from('crm_conversas').select('id')
        .eq('salao_id', salaoId).eq('contato_id', contato.id).eq('origem', ORIGEM_RESUMO_DONO).limit(1)
      let conversaId: string | null = ja?.[0]?.id || null
      if (!conversaId) {
        const { data: nova } = await supabaseAdmin.from('crm_conversas').insert({
          salao_id: salaoId, contato_id: contato.id, estado: 'sem_conversao', origem: ORIGEM_RESUMO_DONO,
          importada: true, ultima_em: agora, ultima_de: 'salao', nao_lidas: 0, fechada_em: agora,
        }).select('id').maybeSingle()
        conversaId = nova?.id || null
      }
      if (!conversaId) { falhas.push(d.telefone); continue }
      // Uma mensagem por parte, 4 s uma da outra: a ponte só pega a que já
      // venceu, então chegam na ordem certa e não de uma vez só.
      const inicio = Date.now()
      const { error } = await supabaseAdmin.from('crm_mensagens').insert(partes.map((texto, i) => ({
        salao_id: salaoId, conversa_id: conversaId, direcao: 'saida', texto, tipo: 'texto',
        situacao: 'na_fila', autor_nome: AUTOR_RESUMO, em_massa: false,
        criado_em: new Date(inicio + i * 4000).toISOString(),
      })))
      if (error) { falhas.push(d.telefone); continue }
      await supabaseAdmin.from('crm_conversas').update({ ultima_em: agora, ultima_de: 'salao', atualizado_em: agora }).eq('id', conversaId)
      enviados++
    } catch { falhas.push(d.telefone) }
  }
  return { enviados, falhas }
}

// ── Relógio ──────────────────────────────────────────────────────────────────

let _rodando = false

async function rodarDoSalao(salaoId: string, c: ConfigResumo, agora: Agora): Promise<string> {
  if (!c.ligado || !c.telefones.length || !c.itens.length) return 'desligado'
  if (!c.dias.includes(agora.dow)) return 'fora do dia'
  const [h, m] = c.hora.split(':').map(Number)
  const desde = agora.minutos - (h * 60 + m)
  if (desde < 0) return 'ainda não é a hora'

  const estado = await carregarEstado(salaoId)
  if (estado.dia === agora.iso) return 'já tratado hoje'

  if (desde > JANELA_MIN) {
    await gravarEstado(salaoId, { dia: agora.iso, enviado_em: null, situacao: 'nao_enviado', para: 0, motivo: 'A janela de envio fechou sem o WhatsApp do salão estar conectado.' })
    return 'janela fechada'
  }

  // Só manda com o WhatsApp do salão no ar; senão tenta de novo no próximo minuto.
  const { data: canal } = await supabaseAdmin.from('crm_canais').select('situacao').eq('salao_id', salaoId).maybeSingle()
  if (String((canal as any)?.situacao || '') !== 'conectado') return 'WhatsApp desconectado, aguardando'

  // Marca ANTES de montar: duas voltas seguidas nunca mandam duas vezes.
  await gravarEstado(salaoId, { dia: agora.iso, enviado_em: null, situacao: '', para: 0, motivo: 'enviando' })
  try {
    const partes = await montarResumo(salaoId, c.itens, c.nome)
    const r = await enviarResumo(salaoId, partes, c.telefones)
    await gravarEstado(salaoId, {
      dia: agora.iso, enviado_em: new Date().toISOString(), para: r.enviados,
      situacao: r.enviados ? 'enviado' : 'erro',
      motivo: r.falhas.length ? `Não consegui enfileirar para: ${r.falhas.join(', ')}` : '',
    })
    return r.enviados ? `enviado para ${r.enviados}` : 'erro ao enfileirar'
  } catch (e: any) {
    await gravarEstado(salaoId, { dia: agora.iso, enviado_em: null, situacao: 'erro', para: 0, motivo: String(e?.message || e).slice(0, 300) })
    return 'erro: ' + String(e?.message || e).slice(0, 120)
  }
}

export async function rodarResumoDono() {
  if (_rodando) return { ok: true, pulado: 'volta anterior ainda rodando' }
  _rodando = true
  try {
    const agora = agoraBR()
    const { data } = await supabaseAdmin.from('salao_config').select('salao_id, valor').eq('chave', CHAVE_RESUMO_DONO)
    const saida: Record<string, string> = {}
    for (const r of data || []) {
      const c = lerConfig(r.valor)
      if (!c.ligado) continue
      try { saida[r.salao_id] = await rodarDoSalao(r.salao_id, c, agora) }
      catch (e: any) { saida[r.salao_id] = 'erro: ' + String(e?.message || e).slice(0, 120) }
    }
    return { ok: true, saloes: saida }
  } finally { _rodando = false }
}
