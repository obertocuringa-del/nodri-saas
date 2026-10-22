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
  { id: 'agenda', titulo: 'Agenda dos próximos 7 dias', padrao: true,
    descricao: 'Agendamentos de cada dia contra o normal daquele dia da semana, para encher os dias fracos a tempo.' },
  { id: 'profissionais', titulo: 'Profissionais no mês', padrao: true,
    descricao: 'Faturamento e ticket de cada um até hoje e quanto a receita depende dos três primeiros.' },
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
const primeiroNome = (s: string) => {
  const p = String(s || '').trim().split(/\s+/)[0] || ''
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

async function reunir(salaoId: string, hoje: Agora, itens: string[]): Promise<Numeros> {
  const sinais: string[] = []
  const linhas: Record<string, string[]> = {}
  const quer = (id: string) => itens.includes(id)

  const meses: Array<{ ano: number; mes: number }> = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.UTC(hoje.ano, hoje.mes - 1 - i, 15))
    meses.push({ ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 })
  }

  const [{ data: salao }, { data: periodos }, { data: metaRow }] = await Promise.all([
    supabaseAdmin.from('saloes').select('nome').eq('id', salaoId).maybeSingle(),
    supabaseAdmin.from('relatorio_periodos')
      .select('ano, mes, atualizado_em, resumo_mensal, faturamento_diario, prof_servicos, prof_ticket')
      .eq('salao_id', salaoId).gte('ano', hoje.ano - 1),
    supabaseAdmin.from('ia_metas_salao').select('meta_valor')
      .eq('salao_id', salaoId).eq('ano', hoje.ano).eq('mes', hoje.mes).maybeSingle(),
  ])
  const nome = String((salao as any)?.nome || 'Seu salão')

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
    sinais.push(`Dados desatualizados: o relatório do Avec foi atualizado pela última vez em ${p2(q.dia)}/${p2(q.mes)} às ${p2(Math.floor(q.minutos / 60))}:${p2(q.minutos % 60)}. Os números de hoje podem estar incompletos.`)
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
      let cmp = ''
      if (base.n >= 2) {
        const d = (valorHoje / base.media - 1) * 100
        cmp = ` (${d >= 0 ? '+' : ''}${pct(d).replace('.', ',')} sobre a média de ${DIA_PLURAL[hoje.dow]}: ${moedaCurta(base.media)})`
        if (valorHoje < base.media * 0.7) sinais.push(`Dia fraco: ${moedaCurta(valorHoje)}, ${pct((valorHoje / base.media) * 100)} da média de ${DIA_PLURAL[hoje.dow]}.`)
      }
      l.push(`Faturamento: ${moeda(valorHoje)}${cmp}`)
      if (clientes > 0) l.push(`Clientes atendidas: ${clientes} | Ticket: ${moeda(valorHoje / clientes)}`)
      if (desconto > 0 && bruto > 0) {
        l.push(`Descontos: ${moeda(desconto)} (${pct((desconto / bruto) * 100)} do bruto)`)
        if (desconto / bruto > 0.1) sinais.push(`Descontos altos hoje: ${pct((desconto / bruto) * 100)} do bruto. Vale conferir quem concedeu e por quê.`)
      }
      if (comandas >= 500) l.push('Atenção: o Avec entrega no máximo 500 comandas por coleta; os números do dia podem estar incompletos.')
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
      l.push(`Realizado: ${moeda(realizado)} de ${moeda(meta)} (${pct((realizado / meta) * 100)})`)
      if (restante <= 0) l.push('Meta batida.')
      else {
        l.push(`Falta: ${moeda(restante)}`)
        if (abertos > 0) {
          l.push(`Ainda restam ${abertos} dias de atendimento: precisa de ${moedaCurta(restante / abertos)} por dia`)
          const proj = realizado + esperado
          l.push(`Projeção no ritmo atual: ${moedaCurta(proj)} (${pct((proj / meta) * 100)} da meta)`)
          if (proj < meta * 0.9) sinais.push(`Meta em risco: no ritmo atual o mês fecha em ${pct((proj / meta) * 100)} da meta. Faltam ${moedaCurta(restante)}; vale uma ação comercial nos dias fracos.`)
        } else l.push('Não restam dias de atendimento no mês.')
      }
    } else {
      l.push(`Realizado: ${moeda(realizado)}`)
      l.push(`A meta de ${MES_NOME[hoje.mes]} não está definida. Defina em Relatórios > Metas para ver a projeção.`)
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
    const sinal = (v: number | null) => v === null ? '' : ` (${v >= 0 ? '+' : ''}${pct(v)})`
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
      l.push(`Faturamento: ${moeda(num(atual.faturamento_total))}`)
      if (fatAnoPassado > 0) l.push(`  mesmo período de ${ano}: ${moedaCurta(fatAnoPassado)}${sinal(vAno)}`)
      if (fatMesPassado > 0) l.push(`  mesmo período do mês passado: ${moedaCurta(fatMesPassado)}${sinal(vMes)}`)
      if (vAno !== null && vAno <= -10) sinais.push(`Faturamento ${pct(Math.abs(vAno))} abaixo do mesmo período de ${ano}. O mês está andando mais devagar que o do ano passado.`)
      else if (vMes !== null && vMes <= -10) sinais.push(`Faturamento ${pct(Math.abs(vMes))} abaixo do mesmo período do mês passado.`)

      const tk = num(atual.ticket_medio), tkAnt = num(ant?.ticket_medio)
      l.push(`Ticket médio: ${moeda(tk)}${tkAnt > 0 ? ` | ${ano}: ${moeda(tkAnt)}${sinal(var_(tk, tkAnt))}` : ''}`)
      const vt = tkAnt > 0 ? var_(tk, tkAnt) : null
      if (vt !== null && vt <= -10) sinais.push(`Ticket médio ${pct(Math.abs(vt))} abaixo do de ${ano}: confira descontos e venda de serviços de maior valor.`)

      const linha = (nome: string, a: number, b: number, dinheiro: boolean) => {
        const f = (v: number) => dinheiro ? moedaCurta(v) : String(Math.round(v))
        const rit = a * fator
        return `${nome}: ${f(a)} até hoje | no ritmo fecha em ${dinheiro ? '' : '~'}${f(rit)}` +
          (b > 0 ? ` | ${ano} (mês inteiro): ${f(b)}${sinal(var_(rit, b))}` : '')
      }
      l.push(linha('Clientes atendidas', num(atual.clientes_atendidos), num(ant?.clientes_atendidos), false))
      l.push(linha('Clientes novas', num(atual.clientes_novos), num(ant?.clientes_novos), false))
      l.push(linha('Serviços', num(atual.faturamento_servicos), num(ant?.faturamento_servicos), true))
      l.push(linha('Produtos', num(atual.faturamento_produtos), num(ant?.faturamento_produtos), true))
      if (!ant) l.push(`Sem relatório de ${MES_NOME[hoje.mes]}/${ano} no sistema para comparar.`)
    } else l.push('Sem o resumo do mês importado.')
    linhas.indicadores = l
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
      l.push(`${curto(iso)}: ${n} agendados (normal ${Math.round(normal)})${fraco ? ' - fraco' : ''}`)
      if (fraco) fracos.push(`${curto(iso)} (${n} contra ${Math.round(normal)})`)
    }
    if (fracos.length) sinais.push(`Agenda fraca: ${fracos.join(', ')}. Ainda dá tempo de chamar a lista de espera e as clientes em retorno.`)
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
    ordem.slice(0, 6).forEach(([n, v], i) => {
      const t = ticket.get(semAcento(n))
      l.push(`${i + 1}. ${primeiroNome(n)}: ${moedaCurta(v)}${t ? ` | ticket ${moedaCurta(t)}` : ''}`)
    })
    if (ordem.length >= 4 && total > 0) {
      const top3 = ordem.slice(0, 3).reduce((s, [, v]) => s + v, 0) / total * 100
      l.push(`Os 3 primeiros respondem por ${pct(top3)} do faturamento de serviços`)
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
        l.push(`Nota média da semana: ${media.toFixed(1).replace('.', ',')} de 5 (${resp.dados.length} respostas, ${baixas} notas baixas)`)
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
      l.push(`Feedback do Avec no mês: ${pos} positivos e ${nega} negativos`)
      const piores = [...neg.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 3).slice(0, 3)
      if (piores.length) {
        l.push(`Mais negativos: ${piores.map(([n, c]) => `${n} (${c})`).join(', ')}`)
        sinais.push(`Feedback negativo recorrente no mês: ${piores.map(([n, c]) => `${n} (${c})`).join(', ')}. Vale uma conversa individual.`)
      }
    }
    linhas.qualidade = l.length ? l : ['Sem feedback registrado.']
  }

  // ── Lista de espera ──
  if (quer('espera')) {
    const { data } = await supabaseAdmin.from('lista_espera').select('criado_em, status')
      .eq('salao_id', salaoId).not('status', 'in', '("atendida","cancelada")')
    const aberta = data || []
    if (aberta.length) {
      const velha = Math.max(...aberta.map((x: any) => Math.floor((Date.now() - new Date(x.criado_em).getTime()) / 864e5)))
      linhas.espera = [`${aberta.length} aguardando vaga; a mais antiga espera há ${velha} dias`]
    } else linhas.espera = ['Ninguém aguardando vaga.']
  }

  // ── Robô de coleta ──
  if (quer('alertas')) {
    const { data: col } = await supabaseAdmin.from('robo_coletas').select('situacao, inicio')
      .eq('salao_id', salaoId).order('inicio', { ascending: false }).limit(1)
    const u: any = col?.[0]
    if (u?.situacao === 'erro' && new Date(u.inicio).getTime() > Date.now() - 24 * 3600_000) {
      sinais.push('A última coleta do Avec deu erro: os números podem não refletir tudo o que aconteceu. Confira em Central do servidor.')
    }
  }

  return { nome, hoje, meses, periodo: doMes, atualizadoEm, diario, sinais, linhas }
}

// ── A mensagem ───────────────────────────────────────────────────────────────

export async function montarResumo(salaoId: string, itens: string[], quando = new Date()): Promise<string> {
  const hoje = agoraBR(quando)
  const n = await reunir(salaoId, hoje, itens)
  const bloco = (titulo: string, l?: string[]) => l && l.length ? [`*${titulo}*`, ...l, ''] : []

  const saida: string[] = [
    `*Resumo do dia - ${n.nome}*`,
    `${DIA_CURTO[hoje.dow]}, ${p2(hoje.dia)}/${p2(hoje.mes)}/${hoje.ano}`,
    '',
    ...(itens.includes('dia') ? bloco('Hoje', n.linhas.dia) : []),
    ...(itens.includes('meta') ? bloco(`Meta de ${MES_NOME[hoje.mes]}`, n.linhas.meta) : []),
    ...(itens.includes('indicadores') ? bloco(`Indicadores de ${MES_NOME[hoje.mes]} (1 a ${hoje.dia})`, n.linhas.indicadores) : []),
    ...(itens.includes('agenda') ? bloco('Próximos 7 dias', n.linhas.agenda) : []),
    ...(itens.includes('profissionais') ? bloco('Profissionais no mês', n.linhas.profissionais) : []),
    ...(itens.includes('qualidade') ? bloco('Qualidade', n.linhas.qualidade) : []),
    ...(itens.includes('espera') ? bloco('Lista de espera', n.linhas.espera) : []),
    ...(itens.includes('alertas')
      ? bloco('Alertas', n.sinais.length ? n.sinais.map(s => '- ' + s) : ['Nenhum alerta hoje.'])
      : []),
  ]
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ── Envio ────────────────────────────────────────────────────────────────────

/**
 * Põe a mensagem na fila da ponte para cada telefone. A conversa fica fechada
 * (`sem_conversao`, que o relógio do CRM não mexe) e marcada com a origem do
 * resumo, que é o que a esconde da recepção.
 */
export async function enviarResumo(salaoId: string, texto: string, destinos: DestinoResumo[]) {
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
      const { error } = await supabaseAdmin.from('crm_mensagens').insert({
        salao_id: salaoId, conversa_id: conversaId, direcao: 'saida', texto, tipo: 'texto',
        situacao: 'na_fila', autor_nome: AUTOR_RESUMO, em_massa: false,
      })
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
    const texto = await montarResumo(salaoId, c.itens)
    const r = await enviarResumo(salaoId, texto, c.telefones)
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
