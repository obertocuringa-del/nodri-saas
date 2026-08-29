import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'
import type { CorridaInterna, LinhaRanking, MetricaCorrida } from '@/lib/corridasInternas'

const CHAVE = 'corridas_internas'

async function ler(salaoId: string): Promise<CorridaInterna[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE).maybeSingle()
  const v = (data as any)?.valor
  return Array.isArray(v) ? v : []
}
async function gravar(salaoId: string, lista: CorridaInterna[]) {
  return supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE, valor: lista, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}

// ── Match de nome (mesma lógica de metricas/route.ts e metasAnalitico.ts) ──
const STOPWORDS_NOME = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
function fazMatcher(prof: { nome_completo?: string | null; apelido?: string | null }) {
  const nomeCompleto = (prof.nome_completo || '').toLowerCase().trim()
  const apelido = (prof.apelido || '').toLowerCase().trim()
  const tokens = nomeCompleto.split(/\s+/).filter(t => t && !STOPWORDS_NOME.has(t)).slice(0, 2)
  return (item: any): boolean => {
    const n = (item.profissional || item.profissional_original || '').toLowerCase().trim()
    if (!n) return false
    if (n === nomeCompleto) return true
    if (apelido && (n === apelido || n.includes(apelido) || apelido.includes(n))) return true
    const nTokens = n.split(/\s+/).filter((t: string) => t && !STOPWORDS_NOME.has(t))
    if (tokens.length === 0 || nTokens.length === 0) return false
    const matchCount = tokens.filter((t: string) => nTokens.some((nt: string) => nt.startsWith(t) || t.startsWith(nt))).length
    return matchCount >= Math.min(tokens.length, 2)
  }
}

function normalizaServico(s: string): string {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

function mesesEntre(de: string, ate: string): Array<{ ano: number; mes: number }> {
  const mI = /^(\d{4})-(\d{2})$/.exec(de || '')
  const mF = /^(\d{4})-(\d{2})$/.exec(ate || '')
  if (!mI || !mF) return []
  const out: Array<{ ano: number; mes: number }> = []
  let ano = +mI[1], mes = +mI[2]
  const fAno = +mF[1], fMes = +mF[2]
  while (ano < fAno || (ano === fAno && mes <= fMes)) {
    out.push({ ano, mes })
    mes++; if (mes > 12) { mes = 1; ano++ }
    if (out.length > 60) break
  }
  return out
}

interface Acc {
  fat: number; serv: number; clientes: number; novos: number; prod: number
  ocupSum: number; ocupCount: number; ticketSum: number; ticketCount: number; servAlvo: number
}
const zeroAcc = (): Acc => ({ fat: 0, serv: 0, clientes: 0, novos: 0, prod: 0, ocupSum: 0, ocupCount: 0, ticketSum: 0, ticketCount: 0, servAlvo: 0 })

function valorDaMetrica(a: Acc, metrica: MetricaCorrida): number {
  switch (metrica) {
    case 'faturamento': return a.fat
    case 'atendimentos': return a.serv
    case 'clientes': return a.clientes
    case 'novos': return a.novos
    case 'produtos': return a.prod
    case 'servico': return a.servAlvo
    // Serviços por cliente: mede venda casada. Sem cliente no período dá zero
    // em vez de divisão por zero, e quem não atendeu fica fora do ranking.
    case 'serv_cliente': return a.clientes > 0 ? a.serv / a.clientes : 0
    case 'ocupacao': return a.ocupCount > 0 ? a.ocupSum / a.ocupCount : 0
    case 'ticket': return a.ticketCount > 0 ? a.ticketSum / a.ticketCount : (a.serv > 0 ? a.fat / a.serv : 0)
    default: return 0
  }
}

// GET — dono/sub veem todas; profissional só as ativas em que participa.
// Sempre devolve o ranking calculado de cada corrida.
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const todas = await ler(sess.salaoId)
  const ehProf = sess.role === 'profissional'
  const voceId = ehProf ? (sess.profissionalId || '') : ''

  // Corridas visíveis para este usuário
  let visiveis = todas
  if (ehProf) {
    visiveis = todas.filter(c => c.ativa &&
      (!c.participantes || c.participantes.length === 0 || (voceId && c.participantes.includes(voceId))))
  }

  // O quadro de medalhas conta TODAS as corridas publicadas, e não só as que
  // esta pessoa vê. Senão cada profissional veria um quadro diferente, e o
  // que motiva é justamente comparar com a colega — um quadro que muda
  // conforme quem olha não serve para isso.
  const publicadas = todas.filter(c => c.ativa)
  const paraCalcular = [...visiveis]
  for (const c of publicadas) if (!paraCalcular.some(v => v.id === c.id)) paraCalcular.push(c)

  // Profissionais ativos (não-departamentos) para o ranking
  const { data: profsRaw } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, ativo, is_departamento')
    .eq('salao_id', sess.salaoId)
  const profs = (profsRaw || []).filter((p: any) => p.ativo !== false && !p.is_departamento)

  // União de todos os meses cobertos pelas corridas visíveis (uma leitura só)
  const chaveMes = new Set<string>()
  for (const c of paraCalcular) for (const m of mesesEntre(c.de, c.ate)) chaveMes.add(`${m.ano}-${m.mes}`)
  const anos = new Set<number>()
  for (const k of chaveMes) anos.add(Number(k.split('-')[0]))

  let periodos: any[] = []
  if (anos.size > 0) {
    const { data } = await supabaseAdmin
      .from('relatorio_periodos')
      .select('ano, mes, prof_pagamentos, prof_ticket, prof_preferencia, prof_ocupacao, prof_servicos, prof_produtos')
      .eq('salao_id', sess.salaoId)
      .in('ano', Array.from(anos))
    periodos = (data || []) as any[]
  }

  // Pré-computa o matcher de cada profissional uma vez
  const matchers = profs.map((p: any) => ({ p, match: fazMatcher(p) }))

  const rankings: Record<string, LinhaRanking[]> = {}
  for (const c of paraCalcular) {
    const meses = mesesEntre(c.de, c.ate)
    const rows = periodos.filter(r => meses.some(m => m.ano === r.ano && m.mes === r.mes))
    const alvoServico = c.metrica === 'servico' ? normalizaServico(c.servico || '') : ''

    // Filtra participantes (vazio = todos)
    const participantesSet = (c.participantes && c.participantes.length > 0) ? new Set(c.participantes) : null
    const elegiveis = participantesSet ? matchers.filter(m => participantesSet.has(m.p.id)) : matchers

    const linhas: LinhaRanking[] = []
    for (const { p, match } of elegiveis) {
      const a = zeroAcc()
      let achou = false
      for (const row of rows) {
        for (const it of (row.prof_pagamentos || [])) if (match(it)) { a.fat += Number(it.valor_a_pagar || 0) + Number(it.desconto || 0); achou = true }
        for (const it of (row.prof_ticket || [])) if (match(it)) { a.ticketSum += Number(it.ticket_medio || 0); a.ticketCount++; achou = true }
        for (const it of (row.prof_preferencia || [])) if (match(it)) { a.clientes += Number(it.clientes_preferencia || 0) + Number(it.clientes_sem_preferencia || 0); a.novos += Number(it.clientes_sem_preferencia || 0); achou = true }
        for (const it of (row.prof_ocupacao || [])) if (match(it)) { a.ocupSum += Number(it.taxa_ocupacao || 0); a.ocupCount++; achou = true }
        for (const it of (row.prof_servicos || [])) if (match(it)) { a.serv += Number(it.quantidade || 0); achou = true; if (alvoServico && normalizaServico(it.servico) === alvoServico) a.servAlvo += Number(it.quantidade || 0) }
        for (const it of (row.prof_produtos || [])) if (match(it)) { a.prod += Number(it.quantidade || 0); achou = true }
      }
      const valor = valorDaMetrica(a, c.metrica)
      // Só entra no ranking quem teve dado no período (evita fila de zeros)
      if (!achou && valor === 0) continue
      linhas.push({ profId: p.id, nome: p.apelido || p.nome_completo || 'Profissional', valor, pos: 0 })
    }

    linhas.sort((x, y) => y.valor - x.valor)
    linhas.forEach((l, i) => {
      l.pos = i + 1
      if (typeof c.meta === 'number' && c.meta > 0) {
        l.pctMeta = Number(((l.valor / c.meta) * 100).toFixed(0))
        l.bateuMeta = l.valor >= c.meta
      }
    })
    rankings[c.id] = linhas
  }

  // ── Medalhas ────────────────────────────────────────────────────────────
  //
  // Uma medalha por corrida publicada em que a pessoa bateu a meta. Não há
  // tabela nem gravação: a medalha é a leitura do próprio ranking. Guardar
  // exigiria decidir a hora exata de premiar e manter em dia depois de cada
  // importação — e um número guardado que ninguém recalcula envelhece calado.
  //
  // Corrida sem meta não dá medalha: sem alvo não há o que bater.
  const porProf = new Map<string, { profId: string; nome: string; corridas: { id: string; titulo: string }[] }>()
  for (const p of profs) porProf.set(p.id, { profId: p.id, nome: p.apelido || p.nome_completo || 'Profissional', corridas: [] })
  for (const c of publicadas) {
    if (!(typeof c.meta === 'number' && c.meta > 0)) continue
    for (const l of (rankings[c.id] || [])) {
      if (!l.bateuMeta) continue
      porProf.get(l.profId)?.corridas.push({ id: c.id, titulo: c.titulo })
    }
  }
  const medalhas = [...porProf.values()]
    .map(m => ({ ...m, total: m.corridas.length }))
    .filter(m => m.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))

  // Só vai para a tela o ranking do que a pessoa pode ver.
  //
  // Passei a calcular corridas além das visíveis para montar o quadro de
  // medalhas; mandar todas na resposta entregaria ao navegador do profissional
  // os valores dos colegas em disputas das quais ele nem participa. Não basta a
  // tela não desenhar — o dado não pode sair daqui.
  const rankingsVisiveis: Record<string, LinhaRanking[]> = {}
  for (const c of visiveis) if (rankings[c.id]) rankingsVisiveis[c.id] = rankings[c.id]

  return NextResponse.json({ corridas: visiveis, rankings: rankingsVisiveis, voceId, medalhas })
}

// PUT — só o dono grava a lista inteira (criar/editar/excluir/reordenar).
export async function PUT(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.corridas)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { error } = await gravar(sess.salaoId, body.corridas)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Editou', 'Corridas Internas', `${body.corridas.length} corrida(s)`)
  return NextResponse.json({ ok: true })
}
