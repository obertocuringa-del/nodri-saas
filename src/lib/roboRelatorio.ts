// ── Robô do relatório no servidor (28/09/2026) ───────────────────────────────
//
// O robô (robo-relatorio/, Python) usa o MESMO código do executável do
// Windows para coletar o mês atual no Avec e gerar o Excel. Aqui, no NODRI:
//   1) a AGENDA de cada salão (quando roda, quantas vezes por dia);
//   2) a CONFERÊNCIA antes de importar -- o dono não abre mais o Excel à mão,
//      então o sistema compara com o que já está no banco e SEGURA o que
//      parecer errado ("aguardando aprovação");
//   3) a IMPORTAÇÃO, pelas MESMAS rotas que a tela /salon/relatorios/importar-excel
//      chama, na mesma ordem. Nenhuma regra de importação é duplicada.

import fs from 'fs'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabase'
import { signJWT } from '@/lib/auth'

export const CHAVE_AGENDA = 'robo_relatorio_agenda'
export const PASTA_COLETAS = process.env.ROBO_PASTA_COLETAS || '/home/nodri/robo/coletas'
/** Quanto dura uma coleta, para a grade de horários (o dono mediu ~15 min). */
export const MINUTOS_POR_COLETA = 15

export interface AgendaRobo {
  ligado: boolean
  horarios: string[]          // 'HH:MM', um por execução no dia
  rodar_agora_em?: string | null
  // ── O mês que o "rodar agora" deve coletar ────────────────────────────────
  //
  // 'MM/AAAA', e só existe quando o dono escolheu um mês na tela. Vazio é o
  // caminho de sempre: o robô coleta o mês corrente, como fez a vida toda.
  //
  // Existe porque o robô só enxerga o mês de HOJE. Se o último dia do mês
  // falhar e ninguém perceber antes da meia-noite, aquele dia fica pela
  // metade para sempre -- a partir do dia 01 o robô já só pega o mês novo.
  // Aconteceu em 31/08/2026 e de novo em 30/09/2026, quando a coleta parou às
  // 20:00 e o salão fechou às 22:00.
  rodar_mes?: string | null
  // ── A que horas o pedido deve entrar na fila ──────────────────────────────
  //
  // 'HH:MM' ou vazio (= agora). Serve para o dono mandar uma recoleta pesada
  // para a madrugada, quando o servidor está vazio.
  //
  // NÃO serve para evitar que dois salões se atropelem: isso a fila já resolve
  // sozinha (o agendador roda um salão por vez e os outros esperam a vez).
  // Esta máquina tem UM núcleo: duas coletas ao mesmo tempo não vão mais
  // rápido, vão mais devagar, e levam o site junto.
  rodar_as?: string | null
}

export function lerAgenda(v: any): AgendaRobo {
  const horarios = Array.isArray(v?.horarios)
    ? v.horarios.map((h: any) => String(h || '').trim()).filter((h: string) => /^\d{2}:\d{2}$/.test(h)).sort()
    : []
  const mes = String(v?.rodar_mes || '').trim()
  const as = String(v?.rodar_as || '').trim()
  return {
    ligado: v?.ligado === true, horarios, rodar_agora_em: v?.rodar_agora_em || null,
    rodar_mes: /^\d{2}\/\d{4}$/.test(mes) ? mes : null,
    rodar_as: /^\d{2}:\d{2}$/.test(as) ? as : null,
  }
}

/**
 * Já chegou a hora marcada do pedido? Sem hora marcada, a hora é agora.
 *
 * Contar pelo relógio ("passou das 02:00?") erra o caso mais comum: pedido
 * feito às 10:00 para rodar às 02:00 sairia às 10:01, porque "10:01" é maior
 * que "02:00". O que vale é quanto falta DO PEDIDO até a próxima vez que o
 * relógio marcar aquela hora -- e esperar isso.
 */
export function pedidoNaHora(a: AgendaRobo, agora = new Date()): boolean {
  if (!a.rodar_agora_em) return false
  if (!a.rodar_as) return true
  const minutos = (d: Date) => {
    const [h, m] = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(d).split(':').map(Number)
    return h * 60 + m
  }
  const [ah, am] = a.rodar_as.split(':').map(Number)
  const pedido = new Date(a.rodar_agora_em)
  let faltam = (ah * 60 + am) - minutos(pedido)
  if (faltam <= 0) faltam += 24 * 60          // é para amanhã
  // Contar o tempo CORRIDO desde o pedido já resolve o pedido que perdeu a
  // hora: se o servidor estava fora às 02:00, na volta seguinte o tempo
  // corrido já passou do alvo e ele entra na fila -- não espera outro dia.
  return (agora.getTime() - pedido.getTime()) / 60_000 >= faltam
}

export async function carregarAgenda(salaoId: string): Promise<AgendaRobo> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_AGENDA).maybeSingle()
  return lerAgenda(data?.valor)
}

export async function gravarAgenda(salaoId: string, a: AgendaRobo) {
  const agora = new Date().toISOString()
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_AGENDA, valor: a, atualizado_em: agora,
  }, { onConflict: 'salao_id,chave' })
}

// ── Leitura do Excel (igual à tela) ─────────────────────────────────────────
const ABAS = ['PERIODOS', 'RESUMO_MENSAL', 'FATURAMENTO_DIARIO', 'SERVICOS', 'PRODUTOS', 'PROF_PAGAMENTOS',
  'PROF_TICKET', 'PROF_PREFERENCIA', 'PROF_OCUPACAO', 'PROF_SERVICOS', 'PROF_PRODUTOS', 'METAS', 'FEEDBACK',
  'ATENDIMENTOS_RAW', 'AGENDAMENTOS_RAW', 'TABELA_PRECOS', 'PRODUTOS_RAW', 'COMANDAS_RAW'] as const

async function lerPlanilha(buffer: Buffer): Promise<Record<string, any[]>> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: true })
  const out: Record<string, any[]> = {}
  for (const aba of ABAS) {
    const ws = wb.Sheets[aba]
    out[aba] = ws ? XLSX.utils.sheet_to_json(ws, { defval: null }) as any[] : []
  }
  return out
}

const num = (v: any) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }

// ── Conferência ─────────────────────────────────────────────────────────────
export interface Conferencia {
  ok: boolean
  motivos: string[]
  linhas: number
  faturamento: number
  dias_com_dados: number
  anterior: { linhas: number; faturamento: number; dias_com_dados: number }
}

/**
 * Compara a planilha nova com o que o banco já tem do MESMO mês. Dado de mês
 * que já passou não some: se a planilha nova tem menos, algo deu errado na
 * coleta (Avec lento, página que não carregou) e o dono decide.
 */
export async function conferir(salaoId: string, ano: number, mes: number, abas: Record<string, any[]>): Promise<Conferencia> {
  const doMes = (r: any) => Number(r?.ano) === ano && Number(r?.mes) === mes
  const atend = (abas.ATENDIMENTOS_RAW || []).filter(doMes)
  const resumo = (abas.RESUMO_MENSAL || []).find(doMes)
  const faturamento = num(resumo?.faturamento_total)
  const diasNovos = new Set((abas.FATURAMENTO_DIARIO || []).filter(doMes).filter(r => num(r.valor) > 0).map(r => String(r.data)))

  const { count: linhasAntes } = await supabaseAdmin.from('atendimentos_raw')
    .select('id', { count: 'exact', head: true }).eq('salao_id', salaoId).eq('ano', ano).eq('mes', mes)
  const { data: per } = await supabaseAdmin.from('relatorio_periodos')
    .select('resumo_mensal, faturamento_diario').eq('salao_id', salaoId).eq('ano', ano).eq('mes', mes).maybeSingle()
  const resumoAntes = Array.isArray((per as any)?.resumo_mensal) ? (per as any).resumo_mensal[0] : null
  const fatAntes = num(resumoAntes?.faturamento_total)
  const diasAntes = new Set<string>(Array.isArray((per as any)?.faturamento_diario)
    ? (per as any).faturamento_diario.filter((d: any) => num(d?.valor) > 0).map((d: any) => String(d.data)) : [])

  const motivos: string[] = []
  if (!atend.length) motivos.push('A planilha veio sem nenhum atendimento do mês.')
  if ((linhasAntes || 0) > 0 && atend.length < (linhasAntes || 0)) {
    motivos.push(`Veio com MENOS atendimentos (${atend.length}) do que o sistema já tem (${linhasAntes}).`)
  }
  if (fatAntes > 0 && faturamento < fatAntes * 0.95) {
    motivos.push(`Faturamento caiu mais de 5% (de R$ ${fatAntes.toFixed(2)} para R$ ${faturamento.toFixed(2)}).`)
  }
  const sumiram = [...diasAntes].filter(d => !diasNovos.has(d))
  if (sumiram.length) motivos.push(`Dias que tinham movimento e vieram vazios: ${sumiram.slice(0, 6).join(', ')}${sumiram.length > 6 ? '…' : ''}.`)

  return {
    ok: motivos.length === 0, motivos,
    linhas: atend.length, faturamento, dias_com_dados: diasNovos.size,
    anterior: { linhas: linhasAntes || 0, faturamento: fatAntes, dias_com_dados: diasAntes.size },
  }
}

// ── Importação pelas rotas da tela ──────────────────────────────────────────
/** Sessão de dono do salão, só para esta importação (não sai do servidor). */
async function cookieDoDono(salaoId: string): Promise<string> {
  const { data: u } = await supabaseAdmin.from('usuarios').select('id, email')
    .eq('salao_id', salaoId).eq('role', 'salon').limit(1).maybeSingle()
  if (!u) throw new Error('Salão sem usuário dono para importar')
  const token = await signJWT({ userId: u.id, email: u.email, role: 'salon', salaoId })
  return `nodri_token=${token}`
}

const BASE_INTERNA = process.env.NODRI_INTERNO || 'http://127.0.0.1:3000'

async function post(caminho: string, corpo: any, cookie: string) {
  const r = await fetch(BASE_INTERNA + caminho, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(corpo),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j?.ok === false) throw new Error(`${caminho}: ${j?.error || r.status}`)
  return j
}

/** A mesma sequência da tela importar-excel (page.tsx, função enviar). */
export async function importarComoATela(salaoId: string, a: Record<string, any[]>) {
  const cookie = await cookieDoDono(salaoId)
  const r1 = await post('/api/relatorios/importar-excel', {
    periodos: a.PERIODOS, resumo: a.RESUMO_MENSAL, fatDiario: a.FATURAMENTO_DIARIO, servicos: a.SERVICOS,
    produtos: a.PRODUTOS, profPag: a.PROF_PAGAMENTOS, profTicket: a.PROF_TICKET, profPref: a.PROF_PREFERENCIA,
    profOcup: a.PROF_OCUPACAO, profServicos: a.PROF_SERVICOS, profProdutos: a.PROF_PRODUTOS, metas: a.METAS,
    feedbacks: a.FEEDBACK,
  }, cookie)

  const periodosDe = (rows: any[]) => Array.from(new Set(rows.map(r => `${Number(r.ano)}-${Number(r.mes)}`)))
    .map(k => { const [ano, mes] = k.split('-'); return { ano: Number(ano), mes: Number(mes) } })

  let atendimentos = 0
  const at = a.ATENDIMENTOS_RAW || []
  for (let i = 0, n = Math.ceil(at.length / 500); i < n; i++) {
    const d = await post('/api/relatorios/importar-atendimentos', {
      rows: at.slice(i * 500, (i + 1) * 500), periodos_para_limpar: i === 0 ? periodosDe(at) : [], ultimo_chunk: i === n - 1,
    }, cookie)
    atendimentos += d.salvos || 0
  }
  let precos = 0, produtos = 0, comandas = 0, agendamentos = 0
  if (a.TABELA_PRECOS?.length) precos = (await post('/api/salon/tabela-precos', { linhas: a.TABELA_PRECOS }, cookie)).total || 0
  for (let i = 0; i < (a.PRODUTOS_RAW || []).length; i += 2000) {
    produtos += (await post('/api/salon/produtos-dia', { linhas: a.PRODUTOS_RAW.slice(i, i + 2000) }, cookie)).total || 0
  }
  for (let i = 0; i < (a.COMANDAS_RAW || []).length; i += 2000) {
    comandas += (await post('/api/salon/caixas-dia', { linhas: a.COMANDAS_RAW.slice(i, i + 2000) }, cookie)).comandas || 0
  }
  const ag = a.AGENDAMENTOS_RAW || []
  for (let i = 0, n = Math.ceil(ag.length / 500); i < n; i++) {
    agendamentos += (await post('/api/relatorios/importar-agendamentos', {
      rows: ag.slice(i * 500, (i + 1) * 500), periodos_para_limpar: i === 0 ? periodosDe(ag) : [],
    }, cookie)).salvos || 0
  }
  return { periodos: r1.periodos_salvos, atendimentos, agendamentos, precos, produtos, comandas }
}

/** Coleta que chegou do robô: guarda o Excel, confere e importa (ou segura). */
export async function receberColeta(coletaId: string, salaoId: string, buffer: Buffer, alertas: string[] = []) {
  const { data: c } = await supabaseAdmin.from('robo_coletas').select('ano, mes').eq('id', coletaId).maybeSingle()
  const hoje = new Date()
  const ano = c?.ano || hoje.getFullYear(), mes = c?.mes || hoje.getMonth() + 1
  const pasta = path.join(PASTA_COLETAS, salaoId)
  fs.mkdirSync(pasta, { recursive: true })
  const arquivo = path.join(pasta, `${coletaId}.xlsx`)
  fs.writeFileSync(arquivo, buffer)

  const abas = await lerPlanilha(buffer)
  const conf = await conferir(salaoId, ano, mes, abas)
  // Vigia do robô: relatório que veio com menos linhas do que a tela do Avec mostrava.
  if (alertas.length) { conf.ok = false; conf.motivos.push(...alertas) }
  const base = {
    fim: new Date().toISOString(), arquivo, ano, mes,
    linhas: conf.linhas, faturamento: conf.faturamento, dias_com_dados: conf.dias_com_dados, anterior: conf.anterior,
  }
  if (!conf.ok) {
    await supabaseAdmin.from('robo_coletas').update({ ...base, situacao: 'aguardando', motivo: conf.motivos.join(' ') }).eq('id', coletaId)
    return { situacao: 'aguardando', motivos: conf.motivos }
  }
  const resultado = await importarComoATela(salaoId, abas)
  await supabaseAdmin.from('robo_coletas').update({ ...base, situacao: 'aplicado', motivo: null, resultado }).eq('id', coletaId)
  return { situacao: 'aplicado', resultado }
}

/** O dono aprovou uma coleta que ficou segura: importa o Excel guardado. */
export async function aprovarColeta(coletaId: string) {
  const { data: c } = await supabaseAdmin.from('robo_coletas').select('*').eq('id', coletaId).maybeSingle()
  if (!c || c.situacao !== 'aguardando' || !c.arquivo) throw new Error('Coleta não está aguardando aprovação')
  const abas = await lerPlanilha(fs.readFileSync(c.arquivo))
  const resultado = await importarComoATela(c.salao_id, abas)
  await supabaseAdmin.from('robo_coletas').update({ situacao: 'aplicado', resultado, motivo: `Aprovado à mão. ${c.motivo || ''}`.trim() }).eq('id', coletaId)
  return resultado
}
