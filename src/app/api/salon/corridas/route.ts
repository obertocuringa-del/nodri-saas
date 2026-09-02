import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'
import type { CorridaInterna, LinhaRanking, MetricaCorrida, ResumoGrupo } from '@/lib/corridasInternas'
import { metricaInfo, resumoGrupo } from '@/lib/corridasInternas'

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
  ocupSum: number; ocupCount: number; ticketSum: number; ticketCount: number; servAlvo: number; meta: number; ocorrencias: number
}
const zeroAcc = (): Acc => ({ fat: 0, serv: 0, clientes: 0, novos: 0, prod: 0, ocupSum: 0, ocupCount: 0, ticketSum: 0, ticketCount: 0, servAlvo: 0, meta: 0, ocorrencias: 0 })

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
    // % da meta: cada uma contra a própria. Sem meta lançada dá zero e a
    // pessoa fica fora do ranking — melhor do que aparecer com 0% e parecer
    // que não produziu, quando o que falta é a meta dela estar cadastrada.
    case 'pct_meta': return a.meta > 0 ? (a.fat / a.meta) * 100 : 0
    case 'feedback_neg': return a.ocorrencias
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

  // Metas por profissional, do próprio NODRI — e não da aba METAS da planilha,
  // cuja meta é do salão inteiro (a importação descarta a coluna do
  // profissional). Vem ligada por `profissional_id`, então aqui não há
  // casamento de nome para errar.
  // Ocorrências do Feedback Profissional (atraso, falta…) no período coberto
  // pelas corridas. Só busca se alguma corrida for dessa métrica — salão que
  // não usa essa disputa não paga a consulta.
  const ocorrencias: { nome: string; tipo: string; ano: number; mes: number }[] = []
  if (paraCalcular.some(c => c.metrica === 'feedback_neg') && chaveMes.size > 0) {
    const inicio = [...chaveMes].map(k => k.split('-').map(Number)).sort((x, y) => x[0] - y[0] || x[1] - y[1])[0]
    const { data: resp } = await supabaseAdmin
      .from('feedback_prof_respostas')
      .select('profissional_nome, ocorrido_descricao, criado_em')
      .eq('salao_id', sess.salaoId)
      .gte('criado_em', `${inicio[0]}-${String(inicio[1]).padStart(2, '0')}-01`)
    for (const r of (resp || []) as any[]) {
      const d = new Date(r.criado_em)
      if (isNaN(d.getTime())) continue
      ocorrencias.push({
        nome: String(r.profissional_nome || ''),
        tipo: String(r.ocorrido_descricao || '').trim().toUpperCase(),
        ano: d.getFullYear(), mes: d.getMonth() + 1,
      })
    }
  }

  const metaPorProfMes = new Map<string, number>()
  if (anos.size > 0) {
    const { data: metasRows } = await supabaseAdmin
      .from('metas_profissionais')
      .select('profissional_id, ano, mes, meta_manual, meta_redistribuida')
      .eq('salao_id', sess.salaoId)
      .in('ano', Array.from(anos))
    for (const r of (metasRows || []) as any[]) {
      // Mesma "META MENSAL" que aparece no card do perfil: a manual manda; se
      // estiver vazia, vale a automática da redistribuição.
      //
      // Testar por valor POSITIVO, e não por `??`: quem digitou uma meta manual
      // e depois apagou o campo deixa '' gravado, que não é null — com `??` a
      // meta virava zero e a pessoa sumia do ranking, justo depois de fazer o
      // que o próprio campo manda ("deixe vazio para usar a automática").
      const manual = Number(r.meta_manual) || 0
      const v = manual > 0 ? manual : (Number(r.meta_redistribuida) || 0)
      if (v > 0) metaPorProfMes.set(`${r.profissional_id}|${r.ano}-${r.mes}`, v)
    }
  }

  const ehDono = sess.role === 'salon'

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
      // Meta do período = soma das metas dos meses que a corrida cobre.
      for (const m of meses) a.meta += metaPorProfMes.get(`${p.id}|${m.ano}-${m.mes}`) || 0

      if (c.metrica === 'feedback_neg') {
        const tipoAlvo = String(c.ocorrido || '').trim().toUpperCase()
        for (const o of ocorrencias) {
          if (tipoAlvo && o.tipo !== tipoAlvo) continue
          if (!meses.some(m => m.ano === o.ano && m.mes === o.mes)) continue
          if (!match({ profissional: o.nome })) continue
          a.ocorrencias++
        }
        // Zero ocorrência é o melhor resultado, e não ausência de dado: quem
        // não aparece em lista nenhuma é exatamente quem se quer premiar.
        achou = true
      }

      // No modo grupo a métrica é sempre o faturamento contra a meta da própria
      // pessoa — não faz sentido escolher outra: a meta do perfil é em dinheiro.
      const ehGrupo = c.modo === 'grupo'

      // Faturamento simulado, só para o dono. O profissional recebe sempre o
      // número real: ver um valor inventado sobre o próprio mês, sem nenhum
      // aviso de que é teste, seria pior do que não ver a corrida.
      const fingido = ehGrupo && ehDono ? c.simulacoes?.[p.id] : undefined
      const ehSimulado = typeof fingido === 'number' && isFinite(fingido)
      if (ehSimulado) { a.fat = Number(fingido); achou = true }

      const valor = ehGrupo ? a.fat : valorDaMetrica(a, c.metrica)

      // Só entra no ranking quem teve dado no período (evita fila de zeros).
      //
      // No grupo isso se inverte: quem foi escolhido a dedo e produziu zero é
      // justamente quem o grupo precisa enxergar para ir buscar. Sumir com a
      // coluna dela esconderia o buraco que a corrida existe para tapar.
      if (!ehGrupo && !achou && valor === 0) continue
      if (ehGrupo && a.meta <= 0) continue

      linhas.push({
        profId: p.id, nome: p.apelido || p.nome_completo || 'Profissional', valor, pos: 0,
        ...(ehGrupo ? { metaPessoal: a.meta } : {}),
        ...(ehSimulado ? { simulado: true } : {}),
      })
    }

    if (c.modo === 'grupo') {
      // Doações: quanto cada uma entregou e quanto recebeu.
      const doado = new Map<string, number>(), recebido = new Map<string, number>()
      for (const d of (c.doacoes || [])) {
        const v = Number(d.valor) || 0
        if (v <= 0) continue
        // Entrega de teste só conta para quem está testando.
        if (d.teste && !ehDono) continue
        doado.set(d.de, (doado.get(d.de) || 0) + v)
        recebido.set(d.para, (recebido.get(d.para) || 0) + v)
      }
      for (const l of linhas) {
        const meta = Number(l.metaPessoal || 0)
        l.doado = doado.get(l.profId) || 0
        l.recebido = recebido.get(l.profId) || 0
        // O excedente nasce da produção dela, não do que recebeu — senão uma
        // doação viraria excedente para repassar adiante, e o mesmo dinheiro
        // circularia pelo grupo inflando todo mundo.
        l.excedente = Math.max(l.valor - meta, 0)
        // Geometria do gráfico em % — é o que vai para o portal no lugar dos R$.
        l.pctProprio = meta > 0 ? (l.valor / meta) * 100 : 0
        l.pctRecebidoMeta = meta > 0 ? (l.recebido / meta) * 100 : 0
        l.pctDoadoMeta = meta > 0 ? (l.doado / meta) * 100 : 0
        // Bateu contando o que recebeu: é o objetivo declarado da corrida em
        // grupo, fechar junto. Quem ajudou continua batida pela própria conta.
        l.pctMeta = meta > 0 ? Number((((l.valor + l.recebido) / meta) * 100).toFixed(0)) : null
        l.bateuMeta = meta > 0 && (l.valor + l.recebido) >= meta
      }
      // Ordena pela % da própria meta: é o que a corrida mede. Ordenar por R$
      // colocaria quem tem meta alta sempre na frente, e o gráfico mentiria.
      linhas.sort((x, y) => (y.pctMeta || 0) - (x.pctMeta || 0) || x.nome.localeCompare(y.nome, 'pt-BR'))
      linhas.forEach((l, i) => { l.pos = i + 1 })
      rankings[c.id] = linhas
      continue
    }

    // Métrica inversa ordena ao contrário: quem tem MENOS ocorrência lidera.
    const inversa = !!metricaInfo(c.metrica).inversa
    linhas.sort((x, y) => inversa ? x.valor - y.valor : y.valor - x.valor)
    linhas.forEach((l, i) => {
      l.pos = i + 1
      if (inversa) {
        // Aqui a meta é TETO: `c.meta` é o máximo aceito. Zero teto significa
        // "nenhuma ocorrência", e por isso o teste usa >= 0 e não > 0 como o
        // outro lado — senão a corrida mais exigente seria a única sem medalha.
        if (typeof c.meta === 'number' && c.meta >= 0) l.bateuMeta = l.valor <= c.meta
      } else if (typeof c.meta === 'number' && c.meta > 0) {
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
    // Corrida inversa premia com teto zero ("nenhuma falta"); nas demais, meta
    // zero significa que ninguém definiu alvo, e sem alvo não há o que bater.
    // Na corrida em grupo o alvo não é `c.meta` (não existe um só): cada uma tem
    // o seu, vindo do perfil. Quem bateu o próprio alvo leva medalha igual.
    const limiteVale = c.modo === 'grupo' ? true
      : metricaInfo(c.metrica).inversa
      ? (typeof c.meta === 'number' && c.meta >= 0)
      : (typeof c.meta === 'number' && c.meta > 0)
    if (!limiteVale) continue
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

  // ── Placar do grupo, e o que dele o profissional pode ver ────────────────
  //
  // O profissional vê o gráfico inteiro — nomes, colunas, quem bateu — mas
  // nenhum real que não seja o dele. Não é preciosismo: com "+R$ 1.000" escrito
  // em cima de uma coluna de 120%, qualquer um divide e descobre que a meta da
  // colega é R$ 5.000. Por isso a poda é AQUI, e não na tela: o dado não pode
  // sair do servidor. A tela sozinha esconderia só de quem não abre o DevTools.
  const resumosGrupo: Record<string, ResumoGrupo> = {}
  for (const c of visiveis) {
    if (c.modo !== 'grupo') continue
    const linhas = rankingsVisiveis[c.id] || []
    const r = resumoGrupo(linhas)
    if (ehDono) {
      resumosGrupo[c.id] = r
    } else {
      // Fica só a rosca (o %) e o placar de quantas bateram. O "R$ X de R$ Y" e
      // o "faltam R$ Z" saem inteiros — os dois revelam o dinheiro do grupo.
      resumosGrupo[c.id] = { pct: r.pct, bateram: r.bateram, participantes: r.participantes }
      rankingsVisiveis[c.id] = linhas.map(l => l.profId === voceId ? l : ({
        profId: l.profId, nome: l.nome, pos: l.pos, valor: 0, valorOculto: true,
        pctMeta: l.pctMeta, bateuMeta: l.bateuMeta,
        pctProprio: l.pctProprio, pctRecebidoMeta: l.pctRecebidoMeta, pctDoadoMeta: l.pctDoadoMeta,
      }))
    }
  }

  // A própria corrida também carrega dinheiro: `doacoes` traz "entregou R$ X" e
  // `simulacoes` traz os valores de teste. Com a coluna da colega em 120% na
  // tela, um "R$ 1.000" de doação entrega a meta dela por divisão — a mesma
  // fresta que a poda do ranking fecha. Então o objeto também vai podado.
  const corridasVisiveis = ehDono ? visiveis : visiveis.map(c => c.modo !== 'grupo' ? c : ({
    ...c,
    simulacoes: undefined,
    doacoes: (c.doacoes || []).filter(d => !d.teste).map(d => ({ de: d.de, para: d.para, em: d.em, valor: 0 })),
  }))

  return NextResponse.json({ corridas: corridasVisiveis, rankings: rankingsVisiveis, voceId, medalhas, resumosGrupo })
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
