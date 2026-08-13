'use client'

// APRESENTAÇÃO DOS RESULTADOS À DIREÇÃO
//
// Síntese executiva do mês. A regra que orienta a tela: o sócio não quer 20
// gráficos — quer RESULTADO → DESVIO → CAUSA → IMPACTO → AÇÃO → DECISÃO.
//
// Quase tudo é puxado do que o sistema já tem:
//   • /api/relatorios      → faturamento, clientes, ticket, produtos (avec)
//   • /api/salon/calculadora + calcFinanceiro → DRE, margem, ponto de equilíbrio
//   • /api/relatorios/ranking → profissionais, ocupação, clientes perdidos, metas
//   • /api/pendencias      → o que está aberto em cada setor (semáforo)
//   • /api/salon/alertas   → kits, esterilização e solicitações do portal
//   • /api/salon/boletos   → contas a pagar vencidas/do mês
//
// O que depende de julgamento humano (causa, decisão dos sócios, investimento,
// plano de ação) tem campo próprio, com o formulário já direcionando o que
// escrever. Salvo por mês em salao_config.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  Loader2, Save, Printer, TrendingUp, TrendingDown, AlertTriangle, Rocket,
  CircleDollarSign, Gavel, ListChecks, Plus, Trash2, Users, Target,
  Smile, Gauge, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { getLogoSalao } from '@/lib/logoSalao'
import { MESES, anosDisponiveis, moeda, num, pct, realPorMes, resumoDoMes } from '@/lib/calcFinanceiro'

const rid = () => Math.random().toString(36).slice(2, 9)
const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const chaveDoc = (ano: number, mes: number) => `apresentacao_direcao_${ano}-${mes}`
/** Dias já corridos do mês, para projetar o fechamento. */
const painelDias = (r: any) => r.diasImportados > 0 ? r.diasImportados : new Date().getDate()

type Farol = 'verde' | 'amarelo' | 'vermelho'
const CORES: Record<Farol, { cor: string; fundo: string; borda: string; emoji: string }> = {
  verde:    { cor: '#16a34a', fundo: '#f0fdf4', borda: '#bbf7d0', emoji: '🟢' },
  amarelo:  { cor: '#b45309', fundo: '#fffbeb', borda: '#fde68a', emoji: '🟡' },
  vermelho: { cor: '#dc2626', fundo: '#fef2f2', borda: '#fecaca', emoji: '🔴' },
}

interface Linha { id: string; a: string; b: string; c: string; d: string }
interface Doc {
  causas?: Record<string, string>       // por indicador: por que ficou assim
  problemas?: Linha[]                   // problema | impacto | causa+ação | responsável/prazo
  oportunidades?: Linha[]               // oportunidade | potencial | plano | responsável
  investimentos?: Linha[]               // item | valor | retorno esperado | recomendação
  decisoes?: Linha[]                    // decisão | motivo/impacto | prazo | recomendação
  acoes?: Linha[]                       // ação | responsável | prazo | status
  observacoes?: string
}

export default function ApresentacaoDirecao() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [dados, setDados] = useState<any>(null)
  const [doc, setDoc] = useState<Doc>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Apresentação à Direção')

  const chave = chaveDoc(ano, mes)

  // Tudo que o sistema já sabe, de uma vez
  useEffect(() => {
    Promise.all([
      fetch('/api/relatorios', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/salon/calculadora', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/pendencias', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/profissionais', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/salon/alertas', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/salon/boletos', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/feedback/formularios', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/salon/acoes-comerciais', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/salon/corridas', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/salon/lojistas/relatorio', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/salon/grid?chave=checklist', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/salon/emprestimo', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/curriculos', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(async ([rel, calc, pend, profs, alertas, boletos, forms, acoes, corridas, lojistas, checklist, emprestimos, curriculos]) => {
      // Satisfação do cliente: puxa os resultados do formulário mais recente
      let feedback: any = null
      const lista = Array.isArray(forms) ? forms : []
      if (lista.length) {
        const f = lista[0]
        feedback = await fetch(`/api/feedback/resultados/${f.id}`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : null).catch(() => null)
      }
      setDados({
        rel, calc, pend: Array.isArray(pend) ? pend : [], profs: Array.isArray(profs) ? profs : [],
        alertas, boletos, feedback, acoes, corridas, lojistas, checklist, emprestimos, curriculos,
      })
    }).finally(() => setCarregando(false))
  }, [])

  // Ranking depende do mês escolhido
  const [ranking, setRanking] = useState<any[]>([])
  useEffect(() => {
    fetch(`/api/relatorios/ranking?ano=${ano}&mes=${mes}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setRanking(Array.isArray(d?.profissionais) ? d.profissionais : []))
      .catch(() => setRanking([]))
  }, [ano, mes])

  const carregarDoc = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${chave}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      setDoc(d && typeof d === 'object' ? d as Doc : {})
    } catch { setDoc({}) }
    setDirty(false)
  }, [chave])
  useEffect(() => { carregarDoc() }, [carregarDoc])

  const salvar = useCallback(async () => {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, doc }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [chave, doc])

  // ══ O QUE O SISTEMA CALCULA ═══════════════════════════════════════════
  const painel = useMemo(() => {
    if (!dados) return null
    const real = realPorMes(dados.rel)
    const hist = Array.isArray(dados.calc?.historico) ? dados.calc.historico : []
    const reg = (a: number, m: number) => hist.find((h: any) => Number(h.ano) === a && Number(h.mes) === m)
    const r = resumoDoMes(reg(ano, mes)?.dados, real.get(`${ano}-${mes}`))
    const ma = mes === 1 ? 12 : mes - 1, aa = mes === 1 ? ano - 1 : ano
    const ant = resumoDoMes(reg(aa, ma)?.dados, real.get(`${aa}-${ma}`))

    // Resumo do avec (clientes, ticket, produtos)
    const rm = (dados.rel?.resumo_mensal || []).find((x: any) => Number(x.ano) === ano && Number(x.mes) === mes) || {}
    const rmAnt = (dados.rel?.resumo_mensal || []).find((x: any) => Number(x.ano) === aa && Number(x.mes) === ma) || {}

    const varia = (atual: number, anterior: number) => anterior > 0 ? (atual - anterior) / anterior : null
    const farolPor = (v: number | null, bom = 0) => (v === null ? 'amarelo' : v >= bom ? 'verde' : v > -0.05 ? 'amarelo' : 'vermelho') as Farol

    // Indicadores principais
    const indicadores = [
      { id: 'faturamento', rotulo: 'Faturamento', valor: moeda(r.faturamento), varia: varia(r.faturamento, ant.faturamento), farol: farolPor(varia(r.faturamento, ant.faturamento)) },
      { id: 'resultado', rotulo: 'Resultado do mês', valor: moeda(r.resultadoOp), varia: varia(r.resultadoOp, ant.resultadoOp), farol: (r.resultadoOp < 0 ? 'vermelho' : r.resultadoOp > 0 ? 'verde' : 'amarelo') as Farol, sub: `margem ${pct(r.resultadoOpPct)}` },
      { id: 'clientes', rotulo: 'Clientes atendidos', valor: String(num(rm.clientes_atendidos) || '—'), varia: varia(num(rm.clientes_atendidos), num(rmAnt.clientes_atendidos)), farol: farolPor(varia(num(rm.clientes_atendidos), num(rmAnt.clientes_atendidos))) },
      { id: 'ticket', rotulo: 'Ticket médio', valor: num(rm.ticket_medio) ? moeda(num(rm.ticket_medio)) : '—', varia: varia(num(rm.ticket_medio), num(rmAnt.ticket_medio)), farol: farolPor(varia(num(rm.ticket_medio), num(rmAnt.ticket_medio))) },
      { id: 'novos', rotulo: 'Clientes novos', valor: String(num(rm.clientes_novos) || '—'), varia: varia(num(rm.clientes_novos), num(rmAnt.clientes_novos)), farol: farolPor(varia(num(rm.clientes_novos), num(rmAnt.clientes_novos))) },
      { id: 'produtos', rotulo: 'Venda de produtos', valor: num(rm.faturamento_produtos) ? moeda(num(rm.faturamento_produtos)) : '—', varia: varia(num(rm.faturamento_produtos), num(rmAnt.faturamento_produtos)), farol: farolPor(varia(num(rm.faturamento_produtos), num(rmAnt.faturamento_produtos))) },
    ]

    // Ponto de equilíbrio e ritmo do mês
    const atingidoPE = r.pe > 0 ? r.faturamento / r.pe : 0
    const diasNoMes = new Date(ano, mes, 0).getDate()
    const ehMesCorrente = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1
    const doMesPassado = ehMesCorrente ? hoje.getDate() / diasNoMes : 1

    // Semáforo por setor: pendências abertas + sinais próprios de cada área
    const abertas = dados.pend.filter((p: any) => !p.resolvido)
    const porSetor: Record<string, number> = {}
    for (const p of abertas) porSetor[p.profissional_id] = (porSetor[p.profissional_id] || 0) + 1
    const vencidas = abertas.filter((p: any) => p.data_limite && new Date(p.data_limite) < hoje).length
    const deps = dados.profs.filter((p: any) => p.is_departamento)
    const setores = deps.map((d: any) => {
      const n = porSetor[d.id] || 0
      const venc = abertas.filter((p: any) => p.profissional_id === d.id && p.data_limite && new Date(p.data_limite) < hoje).length
      const farol: Farol = venc > 0 ? 'vermelho' : n > 4 ? 'amarelo' : 'verde'
      return { id: d.id, nome: d.nome_completo, pendencias: n, vencidas: venc, farol }
    }).sort((a: any, b: any) => b.vencidas - a.vencidas || b.pendencias - a.pendencias)

    // Profissionais: quem puxa para cima e para baixo
    const comFat = ranking.filter(p => p.faturamento > 0)
    const abaixoMeta = comFat.filter(p => p.meta_pct > 0 && p.meta_pct < 80).sort((a, b) => a.meta_pct - b.meta_pct)
    const destaques = [...comFat].sort((a, b) => b.faturamento - a.faturamento).slice(0, 3)
    const perdidosTotal = ranking.reduce((s, p) => s + num(p.clientes_perdidos), 0)
    const ocupMedia = comFat.length ? comFat.reduce((s, p) => s + num(p.ocupacao), 0) / comFat.length : 0

    // Oportunidades calculadas
    const ticketMedio = num(rm.ticket_medio)
    const oportunidades: { titulo: string; potencial: number; detalhe: string }[] = []
    if (perdidosTotal > 0 && ticketMedio > 0) {
      oportunidades.push({ titulo: `${perdidosTotal} clientes perdidos`, potencial: perdidosTotal * ticketMedio, detalhe: 'Reativação: cada retorno vale um ticket médio' })
    }
    if (ocupMedia > 0 && ocupMedia < 85 && r.faturamento > 0) {
      const ganho = r.faturamento * ((85 - ocupMedia) / Math.max(1, ocupMedia))
      oportunidades.push({ titulo: `Ocupação média em ${ocupMedia.toFixed(0)}%`, potencial: ganho, detalhe: 'Levar a agenda a 85% de ocupação' })
    }
    if (abaixoMeta.length) {
      const falta = abaixoMeta.reduce((s, p) => s + num(p.falta), 0)
      oportunidades.push({ titulo: `${abaixoMeta.length} profissionais abaixo da meta`, potencial: falta, detalhe: 'Quanto falta para todos baterem a meta' })
    }
    if (num(rm.faturamento_produtos) >= 0 && r.faturamento > 0) {
      const pctProd = r.faturamento > 0 ? num(rm.faturamento_produtos) / r.faturamento : 0
      if (pctProd < 0.08) oportunidades.push({ titulo: `Produtos são ${pct(pctProd)} do faturamento`, potencial: r.faturamento * 0.08 - num(rm.faturamento_produtos), detalhe: 'Referência do setor: 8% a 12% em produtos' })
    }

    // Contas a pagar
    const bol = Array.isArray(dados.boletos?.boletos) ? dados.boletos.boletos : []
    const bolAbertos = bol.filter((b: any) => !b.pago)
    const bolVencidos = bolAbertos.filter((b: any) => b.venc && new Date(b.venc) < hoje)

    // Frase executiva
    const vf = varia(r.faturamento, ant.faturamento)
    const vt = varia(num(rm.ticket_medio), num(rmAnt.ticket_medio))
    const frase = [
      r.faturamento > 0 ? `Faturamento de ${moeda(r.faturamento)}${vf !== null ? ` (${vf >= 0 ? '+' : ''}${pct(vf)} vs. ${MESES[ma - 1]})` : ''}` : 'Sem faturamento importado no mês',
      r.temDados ? `resultado de ${moeda(r.resultadoOp)} (${pct(r.resultadoOpPct)} de margem)` : '',
      vt !== null ? `ticket médio ${vt >= 0 ? 'subiu' : 'caiu'} ${pct(Math.abs(vt))}` : '',
      atingidoPE > 0 ? `${pct(atingidoPE)} do ponto de equilíbrio` : '',
    ].filter(Boolean).join(' · ') + '.'

    // ── Evolução dos últimos 12 meses ──
    const evolucao: { rot: string; ano: number; mes: number; fat: number; res: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ano, mes - 1 - i, 1)
      const a = d.getFullYear(), m = d.getMonth() + 1
      const x = resumoDoMes(reg(a, m)?.dados, real.get(`${a}-${m}`))
      evolucao.push({ rot: MESES[m - 1].slice(0, 3), ano: a, mes: m, fat: x.faturamento, res: x.resultadoOp })
    }
    const comFatEvo = evolucao.filter(e => e.fat > 0)
    const mediaFat12 = comFatEvo.length ? comFatEvo.reduce((s, e) => s + e.fat, 0) / comFatEvo.length : 0
    const maxEvo = Math.max(1, ...evolucao.map(e => e.fat))

    // ── Mesmo mês do ano anterior ──
    const anoPassado = resumoDoMes(reg(ano - 1, mes)?.dados, real.get(`${ano - 1}-${mes}`))
    const varYoY = anoPassado.faturamento > 0 ? (r.faturamento - anoPassado.faturamento) / anoPassado.faturamento : null

    // ── Projeção de fechamento (mês corrente) ──
    const projecao = ehMesCorrente && painelDias(r) > 0
      ? (r.faturamento / painelDias(r)) * diasNoMes : null

    // ── Top serviços e produtos do mês ──
    const topServicos = (dados.rel?.servicos || [])
      .filter((s: any) => Number(s.ano) === ano && Number(s.mes) === mes)
      .map((s: any) => ({ nome: s.servico || '—', qtd: num(s.quantidade) }))
      .sort((a: any, b: any) => b.qtd - a.qtd).slice(0, 5)
    const topProdutos = (dados.rel?.produtos || [])
      .filter((p: any) => Number(p.ano) === ano && Number(p.mes) === mes)
      .map((p: any) => ({ nome: p.produto || '—', qtd: num(p.quantidade) }))
      .sort((a: any, b: any) => b.qtd - a.qtd).slice(0, 5)

    // ── Dias do mês: melhor, pior e média ──
    const diarios = (dados.rel?.faturamento_diario || [])
      .filter((d: any) => Number(d.ano) === ano && Number(d.mes) === mes && num(d.valor) > 0)
      .map((d: any) => ({ data: String(d.data || ''), dia: String(d.dia_semana || ''), valor: num(d.valor) }))
    const melhorDia = diarios.length ? [...diarios].sort((a, b) => b.valor - a.valor)[0] : null
    const piorDia = diarios.length ? [...diarios].sort((a, b) => a.valor - b.valor)[0] : null
    const mediaDia = diarios.length ? diarios.reduce((s: number, d: any) => s + d.valor, 0) / diarios.length : 0
    // Faturamento por dia da semana — mostra onde a agenda sobra
    const porDiaSemana: Record<string, { soma: number; n: number }> = {}
    for (const d of diarios) {
      const k = d.dia.split('-')[0].trim() || '—'
      porDiaSemana[k] = { soma: (porDiaSemana[k]?.soma || 0) + d.valor, n: (porDiaSemana[k]?.n || 0) + 1 }
    }
    const diasSemana = Object.entries(porDiaSemana)
      .map(([nome, v]) => ({ nome, media: v.soma / v.n, n: v.n }))
      .sort((a, b) => b.media - a.media)

    // ── DRE resumido ──
    const dre = [
      { rot: 'Faturamento', v: r.faturamento, tipo: 'entrada' },
      { rot: 'Profissionais (comissões)', v: -r.profissionais, tipo: 'saida' },
      { rot: 'Outros custos diretos', v: -r.diretasOutras, tipo: 'saida' },
      { rot: 'Margem operacional', v: r.margemR, tipo: 'sub' },
      { rot: 'Despesas indiretas', v: -r.indiretas, tipo: 'saida' },
      { rot: 'Provisão e depreciação', v: -(r.provisao + r.depreciacao), tipo: 'saida' },
      { rot: 'Resultado operacional', v: r.resultadoOp, tipo: 'total' },
    ]

    // ── Metas do mês ──
    const comMeta = ranking.filter(p => p.meta_pct > 0)
    const bateramMeta = comMeta.filter(p => p.meta_pct >= 100).length

    // ── Satisfação do cliente (NPS e notas do formulário) ──
    const fb = dados.feedback
    const statsFb: any[] = fb?.stats ? Object.values(fb.stats) : []
    const comNps = statsFb.filter((s: any) => typeof s?.nps === 'number')
    const npsMedio = comNps.length ? Math.round(comNps.reduce((s: number, x: any) => s + x.nps, 0) / comNps.length) : null
    const comMedia = statsFb.filter((s: any) => typeof s?.media === 'number' && s.media > 0)
    const notaMedia = comMedia.length ? comMedia.reduce((s: number, x: any) => s + x.media, 0) / comMedia.length : null
    const promotores = comNps.reduce((s: number, x: any) => s + num(x.promotores), 0)
    const detratores = comNps.reduce((s: number, x: any) => s + num(x.detratores), 0)
    const satisfacao = fb ? {
      respostas: num(fb.total_respostas), npsMedio, notaMedia, promotores, detratores,
      piorServico: fb.piorServico, taxaRetorno: fb.taxaRetorno,
      comentarios: Array.isArray(fb.comentarios) ? fb.comentarios.slice(-3).reverse() : [],
      titulo: fb.formulario?.titulo || 'Feedback',
    } : null

    // ── Campanhas do mês (ações comerciais) ──
    const camps = Array.isArray(dados.acoes?.campanhas) ? dados.acoes.campanhas : []
    const ini = new Date(ano, mes - 1, 1).getTime(), fim = new Date(ano, mes, 0, 23, 59).getTime()
    const campsMes = camps.filter((c: any) => (c.criadoEm || 0) >= ini && (c.criadoEm || 0) <= fim)
    const campanhas = camps.length ? {
      ativas: camps.filter((c: any) => c.ativa !== false).length,
      novas: campsMes.length,
      shares: camps.reduce((s: number, c: any) => s + num(c.shares), 0),
      views: camps.reduce((s: number, c: any) => s + num(c.views), 0),
      top: [...camps].sort((a: any, b: any) => num(b.shares) - num(a.shares)).slice(0, 3),
    } : null

    // ── Check lists: conformidade das rotinas ──
    const cats = Array.isArray(dados.checklist?.categorias) ? dados.checklist.categorias : []
    let ckTotal = 0, ckFeito = 0
    const ckPorCat: { nome: string; feito: number; total: number }[] = []
    for (const c of cats) {
      const dem = (c.demandas || []).filter((d: any) => String(d.texto || '').trim())
      const f = dem.filter((d: any) => d.feito_em || d.feito).length
      ckTotal += dem.length; ckFeito += f
      if (dem.length) ckPorCat.push({ nome: c.nome || '—', feito: f, total: dem.length })
    }
    const conformidade = ckTotal ? { pct: Math.round((ckFeito / ckTotal) * 100), feito: ckFeito, total: ckTotal, cats: ckPorCat.sort((a, b) => (a.feito / a.total) - (b.feito / b.total)) } : null

    // ── Equipe: composição, admissões e desligamentos ──
    const ativos = dados.profs.filter((p: any) => !p.is_departamento && p.ativo !== false)
    const pj = ativos.filter((p: any) => String(p.vinculo || '').toUpperCase() === 'MEI' || String(p.cnpj || '').trim()).length
    const clt = ativos.filter((p: any) => String(p.vinculo || '').toUpperCase() === 'CLT').length
    const admitidosMes = ativos.filter((p: any) => String(p.data_admissao || '').slice(0, 7) === `${ano}-${String(mes).padStart(2, '0')}`).length
    const inativos = dados.profs.filter((p: any) => !p.is_departamento && p.ativo === false).length
    const semContrato = ativos.filter((p: any) => !p.tem_contrato).length
    const equipe = { ativos: ativos.length, pj, clt, admitidosMes, inativos, semContrato }

    // ── Lojistas (CRM) e currículos ──
    const loj = dados.lojistas?.totais ? {
      total: num(dados.lojistas.totais.total), ativos: num(dados.lojistas.totais.ativos),
      novos: num(dados.lojistas.totais.novos_este_mes),
      aniversariantes: Array.isArray(dados.lojistas.aniversariantes) ? dados.lojistas.aniversariantes.length : 0,
    } : null
    const curriculosNovos = Array.isArray(dados.curriculos?.curriculos) ? dados.curriculos.curriculos.length
      : Array.isArray(dados.curriculos) ? dados.curriculos.length : null

    // ── Corridas internas ──
    const corridasAtivas = Array.isArray(dados.corridas?.corridas) ? dados.corridas.corridas.length : 0

    // ── Empréstimos em aberto ──
    const empr = Array.isArray(dados.emprestimos?.pedidos) ? dados.emprestimos.pedidos
      : Array.isArray(dados.emprestimos) ? dados.emprestimos : []
    const emprAbertos = empr.filter((e: any) => e.status && e.status !== 'quitado' && e.status !== 'negado').length

    // ── Custo por atendimento e por profissional ──
    const clientesMes = num(rm.clientes_atendidos)
    const custoPorAtend = clientesMes > 0 ? (r.diretas + r.custoOp) / clientesMes : null
    const fatPorProf = ativos.length ? r.faturamento / ativos.length : null
    const margemPorAtend = clientesMes > 0 ? r.resultadoOp / clientesMes : null

    return {
      r, ant, rm, indicadores, atingidoPE, doMesPassado, ehMesCorrente, setores, diasNoMes,
      abertasTotal: abertas.length, vencidas, destaques, abaixoMeta, perdidosTotal, ocupMedia,
      oportunidades, bolAbertos, bolVencidos, frase, alertas: dados.alertas, mesAnt: MESES[ma - 1],
      evolucao, mediaFat12, maxEvo, anoPassado, varYoY, projecao, topServicos, topProdutos,
      melhorDia, piorDia, mediaDia, diasSemana, dre, comMeta, bateramMeta, ranking,
      satisfacao, campanhas, conformidade, equipe, loj, curriculosNovos, corridasAtivas,
      emprAbertos, custoPorAtend, fatPorProf, margemPorAtend, clientesMes,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, ranking, ano, mes])

  // ══ Campos preenchidos por você ═══════════════════════════════════════
  const setLinhas = (campo: keyof Doc, l: Linha[]) => { setDoc(d => ({ ...d, [campo]: l })); setDirty(true) }
  const addLinha = (campo: keyof Doc) => setLinhas(campo, [...((doc[campo] as Linha[]) || []), { id: rid(), a: '', b: '', c: '', d: '' }])
  const mudLinha = (campo: keyof Doc, id: string, k: keyof Linha, v: string) =>
    setLinhas(campo, ((doc[campo] as Linha[]) || []).map(x => x.id === id ? { ...x, [k]: v } : x))
  const delLinha = (campo: keyof Doc, id: string) => setLinhas(campo, ((doc[campo] as Linha[]) || []).filter(x => x.id !== id))

  async function imprimir() {
    if (!painel) return
    const logo = await getLogoSalao()
    const tab = (titulo: string, cols: string[], linhas: string[][]) => linhas.length ? `
      <div class="bloco"><h2>${esc(titulo)}</h2><table><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${linhas.map(l => `<tr>${l.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''
    const linhasDe = (campo: keyof Doc) => ((doc[campo] as Linha[]) || []).filter(l => l.a.trim()).map(l => [l.a, l.b, l.c, l.d])

    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5px;color:#1a1a2e}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:12px}
.brand{font-size:21px;font-weight:900;color:#5b4fcf}.logo{max-height:52px;max-width:190px;object-fit:contain}
.tt{text-align:right;font-size:10px;color:#666}.tt strong{font-size:15px;color:#1a1a2e;display:block}
.frase{background:#f5f3ff;border-left:4px solid #5b4fcf;padding:9px 12px;font-size:11px;margin-bottom:12px;line-height:1.5}
.kpis{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:13px}
.kpi{flex:1 1 30%;border:1px solid #e8e6e0;border-radius:8px;padding:8px 10px}
.kpi span{display:block;font-size:8px;color:#888;text-transform:uppercase;font-weight:700;letter-spacing:.5px}
.kpi b{font-size:14px}
.bloco{margin-bottom:12px;break-inside:avoid}
h2{font-size:11px;color:#5b4fcf;border-bottom:1px solid #e5e3de;padding-bottom:4px;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
table{width:100%;border-collapse:collapse;font-size:9.5px}
th{background:#5b4fcf;color:#fff;text-align:left;padding:5px 7px;font-size:9px}
td{padding:5px 7px;border-bottom:1px solid #eee;vertical-align:top}
tbody tr:nth-child(even) td{background:#faf9ff}
.sem{display:flex;flex-wrap:wrap;gap:6px}
.sem span{border:1px solid #e8e6e0;border-radius:20px;padding:3px 10px;font-size:9.5px}
.rodape{margin-top:14px;border-top:1px solid #eee;padding-top:6px;font-size:8px;color:#999;text-align:center}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Resultados à Direção — ${MESES[mes - 1]}/${ano}</title><style>${css}</style></head><body>
<div class="hd">${logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`}
<div class="tt"><strong>Apresentação dos Resultados à Direção</strong>${MESES[mes - 1]} de ${ano}</div></div>
<div class="frase"><b>Resultado do mês:</b> ${esc(painel.frase)}</div>
<div class="kpis">${painel.indicadores.map(i => `<div class="kpi"><span>${esc(i.rotulo)}</span><b>${esc(i.valor)}</b>${i.varia !== null ? ` <small>${i.varia >= 0 ? '▲' : '▼'} ${esc(pct(Math.abs(i.varia)))}</small>` : ''}</div>`).join('')}</div>
<div class="bloco"><h2>Semáforo por setor</h2><div class="sem">${painel.setores.map((s: any) => `<span>${CORES[s.farol as Farol].emoji} ${esc(s.nome)}${s.pendencias ? ` · ${s.pendencias}` : ''}</span>`).join('')}</div></div>
${tab('Principais problemas', ['Problema', 'Impacto', 'Causa e ação', 'Responsável / prazo'], linhasDe('problemas'))}
${tab('Oportunidades', ['Oportunidade', 'Potencial', 'Plano', 'Responsável'], [
      ...painel.oportunidades.map((o: any) => [o.titulo, moeda(o.potencial), o.detalhe, '—']),
      ...linhasDe('oportunidades'),
    ])}
${tab('Investimentos', ['Item', 'Valor', 'Retorno esperado', 'Recomendação'], linhasDe('investimentos'))}
${tab('Decisões que dependem dos sócios', ['Decisão', 'Motivo / impacto', 'Prazo', 'Recomendação'], linhasDe('decisoes'))}
${tab('Plano de ação', ['Ação', 'Responsável', 'Prazo', 'Status'], linhasDe('acoes'))}
${doc.observacoes ? `<div class="bloco"><h2>Observações</h2><p style="font-size:10.5px;line-height:1.5">${esc(doc.observacoes).replace(/\n/g, '<br>')}</p></div>` : ''}
<div class="rodape">Gerado em ${new Date().toLocaleString('pt-BR')} · Apresentação dos Resultados à Direção</div>
<script>window.onload=function(){window.print()}<\/script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=760'); if (!w) return
    w.document.write(html); w.document.close(); w.focus()
  }

  if (carregando) return (
    <div style={{ padding: 50, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={22} className="animate-spin" style={{ display: 'inline' }} /> Reunindo os dados do mês…
    </div>
  )

  const anos = anosDisponiveis(Array.isArray(dados?.calc?.historico) ? dados.calc.historico : [])

  return (
    <div>
      {/* ═══ Cabeçalho ═══ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flexWrap: 'wrap', marginBottom: 13 }}>
        <div style={{ flex: 1, minWidth: 210 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-.4px' }}>Apresentação dos Resultados à Direção</h2>
          <p style={{ fontSize: 12.5, color: '#8a8680', margin: '3px 0 0' }}>Síntese executiva de {MESES[mes - 1]} de {ano} — o que o sistema já sabe, mais o que só você pode dizer.</p>
        </div>
        <select value={mes} onChange={e => setMes(Number(e.target.value))} style={sel}>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(Number(e.target.value))} style={sel}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={imprimir} style={{ ...btnSec, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando || !dirty}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 11, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: dirty ? 'pointer' : 'default' }}>
          <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {!painel ? (
        <div style={vazio}>Não foi possível reunir os dados do mês.</div>
      ) : (
        <>
          {/* ═══ Frase executiva ═══ */}
          <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#fff)', borderLeft: '4px solid #5b4fcf', borderRadius: '4px 12px 12px 4px', padding: '14px 17px', marginBottom: 13 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#5b4fcf', letterSpacing: '.6px', marginBottom: 3 }}>RESULTADO DO MÊS</div>
            <p style={{ fontSize: 14, color: '#1a1a2e', margin: 0, lineHeight: 1.55, fontWeight: 600 }}>{painel.frase}</p>
          </div>

          {/* ═══ BLOCO 1 — Indicadores ═══ */}
          <Secao icone={<TrendingUp size={15} />} titulo="1. Visão geral da empresa" nota={`comparado com ${painel.mesAnt}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 8 }}>
            {painel.indicadores.map((i: any) => {
              const c = CORES[i.farol as Farol]
              return (
                <div key={i.id} style={{ background: c.fundo, border: `1px solid ${c.borda}`, borderRadius: 12, padding: '11px 13px' }}>
                  <div style={{ fontSize: 9.5, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{i.rotulo}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', letterSpacing: '-.4px', lineHeight: 1.2 }}>{i.valor}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: c.cor, marginTop: 1 }}>
                    {i.varia !== null ? <>{i.varia >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{pct(Math.abs(i.varia))}</> : <span style={{ color: '#a8a49d' }}>sem comparação</span>}
                    {i.sub && <span style={{ color: '#8a8680', fontWeight: 600 }}>· {i.sub}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ponto de equilíbrio */}
          {painel.r.pe > 0 && (
            <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 12, padding: '12px 15px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 800, color: '#6b6860', marginBottom: 5 }}>
                <span>{moeda(painel.r.faturamento)} faturado</span>
                <span>ponto de equilíbrio {moeda(painel.r.pe)}</span>
              </div>
              <div style={{ position: 'relative', height: 11, borderRadius: 99, background: '#f0eee8', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, painel.atingidoPE * 100)}%`, height: '100%', background: painel.atingidoPE >= 1 ? '#16a34a' : painel.atingidoPE >= .8 ? '#f59e0b' : '#dc2626' }} />
                {painel.ehMesCorrente && <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${painel.doMesPassado * 100}%`, width: 2, background: '#1a1a2e', opacity: .45 }} />}
              </div>
              <div style={{ fontSize: 10.5, color: '#8a8680', marginTop: 4, fontWeight: 700 }}>
                {pct(painel.atingidoPE)} do ponto de equilíbrio
                {painel.ehMesCorrente && ` · o traço marca ${pct(painel.doMesPassado)} do mês`}
                {painel.r.diasImportados > 0 && ` · ${painel.r.diasImportados} dias importados`}
              </div>
            </div>
          )}

          {/* ── Comparações e projeção ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10, marginBottom: 13 }}>
            <Comp rotulo={`vs. ${painel.mesAnt}`} valor={painel.ant.faturamento} atual={painel.r.faturamento} />
            <Comp rotulo={`vs. ${MESES[mes - 1]}/${ano - 1}`} valor={painel.anoPassado.faturamento} atual={painel.r.faturamento} />
            <Comp rotulo="vs. média de 12 meses" valor={painel.mediaFat12} atual={painel.r.faturamento} />
            {painel.projecao !== null && (
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6f5', borderRadius: 12, padding: '11px 13px' }}>
                <div style={{ fontSize: 9.5, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>Projeção de fechamento</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#5b4fcf', letterSpacing: '-.3px' }}>{moeda(painel.projecao)}</div>
                <div style={{ fontSize: 10, color: '#8a8680', fontWeight: 700 }}>no ritmo atual do mês</div>
              </div>
            )}
          </div>

          {/* ── Evolução de 12 meses ── */}
          {painel.mediaFat12 > 0 && (
            <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 13, padding: '13px 15px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a2e', letterSpacing: '.3px' }}>EVOLUÇÃO — 12 MESES</span>
                <div style={{ flex: 1 }} />
                <Leg cor="#0891b2" txt="faturamento" /><Leg cor="#16a34a" txt="resultado" />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 108 }}>
                {painel.evolucao.map((e: any, i: number) => {
                  const hF = Math.max(2, (e.fat / painel.maxEvo) * 100)
                  const hR = e.fat > 0 ? Math.max(1, (Math.max(0, e.res) / painel.maxEvo) * 100) : 0
                  const atual = e.ano === ano && e.mes === mes
                  return (
                    <div key={i} title={`${e.rot}: ${moeda(e.fat)} · resultado ${moeda(e.res)}`}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4, height: '100%' }}>
                      <div style={{ position: 'relative', width: '100%', height: `${hF}%`, minHeight: 2, background: '#0891b2', opacity: atual ? 1 : .35, borderRadius: '4px 4px 2px 2px' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${e.fat > 0 ? (hR / hF) * 100 : 0}%`, background: '#16a34a', opacity: atual ? 1 : .55, borderRadius: '0 0 2px 2px' }} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: atual ? 900 : 700, color: atual ? '#5b4fcf' : '#a8a49d' }}>{e.rot}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: 10.5, color: '#8a8680', marginTop: 7, fontWeight: 700 }}>
                Média de 12 meses: {moeda(painel.mediaFat12)}
                {painel.varYoY !== null && ` · ${painel.varYoY >= 0 ? '+' : ''}${pct(painel.varYoY)} sobre o mesmo mês do ano passado`}
              </div>
            </div>
          )}

          {/* ── DRE resumido ── */}
          {painel.r.temDados && (
            <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 13, padding: '13px 15px', marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a2e', letterSpacing: '.3px', marginBottom: 9 }}>DE ONDE VEM O RESULTADO</div>
              {painel.dre.map((l: any, i: number) => {
                const forte = l.tipo === 'total' || l.tipo === 'sub'
                const larg = painel.r.faturamento > 0 ? Math.min(100, (Math.abs(l.v) / painel.r.faturamento) * 100) : 0
                const cor = l.tipo === 'entrada' ? '#0891b2' : l.tipo === 'saida' ? '#dc2626' : l.tipo === 'sub' ? '#f59e0b' : (l.v >= 0 ? '#16a34a' : '#dc2626')
                return (
                  <div key={i} style={{ padding: forte ? '8px 0' : '5px 0', borderTop: i ? '1px solid #f7f6f3' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                      <span style={{ flex: 1, fontSize: forte ? 12.5 : 12, fontWeight: forte ? 900 : 600, color: forte ? '#1a1a2e' : '#4b5563' }}>{l.rot}</span>
                      <span style={{ fontSize: forte ? 14 : 12.5, fontWeight: forte ? 900 : 700, color: cor, whiteSpace: 'nowrap' }}>{moeda(l.v)}</span>
                      <span style={{ fontSize: 10, color: '#a8a49d', width: 42, textAlign: 'right' }}>{painel.r.faturamento > 0 ? pct(Math.abs(l.v) / painel.r.faturamento) : ''}</span>
                    </div>
                    <div style={{ height: forte ? 5 : 3, borderRadius: 99, background: '#f5f4f0', overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ width: `${larg}%`, height: '100%', background: cor, borderRadius: 99 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ═══ BLOCO 2 — Semáforo ═══ */}
          <Secao icone={<Target size={15} />} titulo="2. Semáforo executivo" nota="onde olhar primeiro — baseado nas pendências abertas e vencidas de cada setor" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, marginBottom: 14 }}>
            {painel.setores.map((s: any) => {
              const c = CORES[s.farol as Farol]
              return (
                <div key={s.id} style={{ background: c.fundo, border: `1px solid ${c.borda}`, borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13 }}>{c.emoji}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</div>
                    <div style={{ fontSize: 10, color: c.cor, fontWeight: 700 }}>
                      {s.vencidas > 0 ? `${s.vencidas} vencida${s.vencidas > 1 ? 's' : ''}` : s.pendencias > 0 ? `${s.pendencias} aberta${s.pendencias > 1 ? 's' : ''}` : 'em dia'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ═══ BLOCO 3 — Equipe ═══ */}
          <Secao icone={<Users size={15} />} titulo="3. Resultados da equipe" nota="do relatório do avec e das metas do mês" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 14 }}>
            <Painelzinho titulo="Destaques do mês" cor="#16a34a">
              {painel.destaques.length === 0 ? <Nada /> : painel.destaques.map((p: any, i: number) => (
                <Linhazinha key={p.id} esq={`${i + 1}. ${p.nome}`} dir={moeda(p.faturamento)} />
              ))}
            </Painelzinho>
            <Painelzinho titulo="Abaixo da meta" cor="#dc2626">
              {painel.abaixoMeta.length === 0 ? <Nada texto="Todos dentro da meta" /> : painel.abaixoMeta.slice(0, 4).map((p: any) => (
                <Linhazinha key={p.id} esq={p.nome} dir={`${p.meta_pct.toFixed(0)}% · falta ${moeda(p.falta)}`} corDir="#dc2626" />
              ))}
            </Painelzinho>
            <Painelzinho titulo="Sinais de atenção" cor="#b45309">
              <Linhazinha esq="Ocupação média" dir={`${painel.ocupMedia.toFixed(0)}%`} corDir={painel.ocupMedia >= 85 ? '#16a34a' : '#b45309'} />
              <Linhazinha esq="Clientes perdidos" dir={String(painel.perdidosTotal)} corDir={painel.perdidosTotal > 0 ? '#dc2626' : '#16a34a'} />
              <Linhazinha esq="Pendências abertas" dir={`${painel.abertasTotal}${painel.vencidas ? ` · ${painel.vencidas} vencidas` : ''}`} corDir={painel.vencidas ? '#dc2626' : '#6b6860'} />
              {painel.bolAbertos.length > 0 && <Linhazinha esq="Contas a pagar" dir={`${painel.bolAbertos.length}${painel.bolVencidos.length ? ` · ${painel.bolVencidos.length} vencidas` : ''}`} corDir={painel.bolVencidos.length ? '#dc2626' : '#6b6860'} />}
              {painel.alertas?.solicitacoes > 0 && <Linhazinha esq="Solicitações do portal" dir={String(painel.alertas.solicitacoes)} corDir="#b45309" />}
            </Painelzinho>
          </div>

          {/* ── O que mais vendeu e como foram os dias ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 }}>
            <Painelzinho titulo="Serviços mais feitos" cor="#5b4fcf">
              {painel.topServicos.length === 0 ? <Nada /> : painel.topServicos.map((s: any, i: number) => (
                <Linhazinha key={i} esq={`${i + 1}. ${s.nome}`} dir={`${s.qtd}×`} />
              ))}
            </Painelzinho>
            <Painelzinho titulo="Produtos mais vendidos" cor="#db2777">
              {painel.topProdutos.length === 0 ? <Nada /> : painel.topProdutos.map((p: any, i: number) => (
                <Linhazinha key={i} esq={`${i + 1}. ${p.nome}`} dir={`${p.qtd}×`} />
              ))}
            </Painelzinho>
            <Painelzinho titulo="Dias do mês" cor="#0891b2">
              {!painel.melhorDia ? <Nada /> : <>
                <Linhazinha esq={`Melhor · ${painel.melhorDia.data}`} dir={moeda(painel.melhorDia.valor)} corDir="#16a34a" />
                <Linhazinha esq={`Pior · ${painel.piorDia.data}`} dir={moeda(painel.piorDia.valor)} corDir="#dc2626" />
                <Linhazinha esq="Média por dia" dir={moeda(painel.mediaDia)} />
              </>}
            </Painelzinho>
            <Painelzinho titulo="Média por dia da semana" cor="#b45309">
              {painel.diasSemana.length === 0 ? <Nada /> : painel.diasSemana.slice(0, 7).map((d: any, i: number) => (
                <Linhazinha key={i} esq={d.nome} dir={moeda(d.media)} corDir={i === painel.diasSemana.length - 1 ? '#dc2626' : '#1a1a2e'} />
              ))}
            </Painelzinho>
          </div>

          {/* ── Ranking completo ── */}
          {painel.ranking.filter((p: any) => p.faturamento > 0).length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 13, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 15px', borderBottom: '1px solid #f2f0ec', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a2e', letterSpacing: '.3px' }}>DESEMPENHO POR PROFISSIONAL</span>
                <div style={{ flex: 1 }} />
                {painel.comMeta.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: painel.bateramMeta === painel.comMeta.length ? '#16a34a' : '#b45309' }}>
                    {painel.bateramMeta} de {painel.comMeta.length} bateram a meta
                  </span>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fbfbfa' }}>
                      {['Profissional', 'Faturamento', 'Ticket', 'Ocupação', 'Meta', 'Perdidos'].map((h, i) => (
                        <th key={h} style={{ padding: '8px 11px', textAlign: i ? 'right' : 'left', fontSize: 9.5, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid #eceae4', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...painel.ranking].filter((p: any) => p.faturamento > 0).sort((a: any, b: any) => b.faturamento - a.faturamento).map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f7f6f3' }}>
                        <td style={{ padding: '7px 11px', fontWeight: 700, color: '#1a1a2e' }}>{p.nome}</td>
                        <td style={{ padding: '7px 11px', textAlign: 'right', fontWeight: 800 }}>{moeda(p.faturamento)}</td>
                        <td style={{ padding: '7px 11px', textAlign: 'right', color: '#6b6860' }}>{moeda(p.ticket_medio)}</td>
                        <td style={{ padding: '7px 11px', textAlign: 'right', color: p.ocupacao >= 85 ? '#15803d' : p.ocupacao >= 70 ? '#b45309' : '#dc2626', fontWeight: 700 }}>{p.ocupacao}%</td>
                        <td style={{ padding: '7px 11px', textAlign: 'right', fontWeight: 800, color: p.meta_pct >= 100 ? '#15803d' : p.meta_pct >= 80 ? '#b45309' : p.meta_pct > 0 ? '#dc2626' : '#c9c5be' }}>
                          {p.meta_pct > 0 ? `${p.meta_pct.toFixed(0)}%` : '—'}
                        </td>
                        <td style={{ padding: '7px 11px', textAlign: 'right', color: p.clientes_perdidos > 0 ? '#dc2626' : '#c9c5be', fontWeight: 700 }}>{p.clientes_perdidos || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Cliente: satisfação e NPS ── */}
          {painel.satisfacao && painel.satisfacao.respostas > 0 && (
            <>
              <Secao icone={<Smile size={15} />} titulo="O que o cliente está dizendo" nota={`${painel.satisfacao.titulo} · ${painel.satisfacao.respostas} respostas`} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 10 }}>
                {painel.satisfacao.npsMedio !== null && (
                  <div style={{ background: painel.satisfacao.npsMedio >= 50 ? '#f0fdf4' : painel.satisfacao.npsMedio >= 0 ? '#fffbeb' : '#fef2f2', border: `1px solid ${painel.satisfacao.npsMedio >= 50 ? '#bbf7d0' : painel.satisfacao.npsMedio >= 0 ? '#fde68a' : '#fecaca'}`, borderRadius: 12, padding: '11px 13px' }}>
                    <div style={{ fontSize: 9.5, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>NPS</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: painel.satisfacao.npsMedio >= 50 ? '#15803d' : painel.satisfacao.npsMedio >= 0 ? '#b45309' : '#dc2626', letterSpacing: '-.5px' }}>{painel.satisfacao.npsMedio}</div>
                    <div style={{ fontSize: 10, color: '#8a8680', fontWeight: 700 }}>{painel.satisfacao.promotores} promotores · {painel.satisfacao.detratores} detratores</div>
                  </div>
                )}
                {painel.satisfacao.notaMedia !== null && (
                  <Mini rotulo="Nota média" valor={painel.satisfacao.notaMedia.toFixed(1)} nota="média das perguntas" cor={painel.satisfacao.notaMedia >= 8 ? '#15803d' : painel.satisfacao.notaMedia >= 6 ? '#b45309' : '#dc2626'} />
                )}
                {painel.satisfacao.taxaRetorno != null && (
                  <Mini rotulo="Taxa de retorno" valor={typeof painel.satisfacao.taxaRetorno === 'number' ? `${painel.satisfacao.taxaRetorno}%` : String(painel.satisfacao.taxaRetorno)} nota="clientes que voltam" cor="#0891b2" />
                )}
                {painel.satisfacao.piorServico && (
                  <Mini rotulo="Serviço mais criticado" valor={String(painel.satisfacao.piorServico?.nome || painel.satisfacao.piorServico)} nota="ponto de atenção" cor="#dc2626" />
                )}
              </div>
              {painel.satisfacao.comentarios.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 12, padding: '11px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 900, color: '#8a8680', letterSpacing: '.5px', marginBottom: 6 }}>ÚLTIMOS COMENTÁRIOS</div>
                  {painel.satisfacao.comentarios.map((c: string, i: number) => (
                    <p key={i} style={{ fontSize: 12, color: '#4b5563', margin: '0 0 5px', paddingLeft: 10, borderLeft: '2px solid #ddd6f5', lineHeight: 1.45 }}>“{c}”</p>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Eficiência por atendimento ── */}
          {painel.clientesMes > 0 && (
            <>
              <Secao icone={<Gauge size={15} />} titulo="Eficiência" nota="quanto cada atendimento custa e rende" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10, marginBottom: 14 }}>
                <Mini rotulo="Custo por atendimento" valor={painel.custoPorAtend ? moeda(painel.custoPorAtend) : '—'} nota="tudo que sai ÷ clientes" cor="#b45309" />
                <Mini rotulo="Margem por atendimento" valor={painel.margemPorAtend ? moeda(painel.margemPorAtend) : '—'} nota="o que sobra por cliente" cor={num(painel.margemPorAtend) >= 0 ? '#15803d' : '#dc2626'} />
                <Mini rotulo="Faturamento por profissional" valor={painel.fatPorProf ? moeda(painel.fatPorProf) : '—'} nota={`${painel.equipe.ativos} profissionais ativos`} cor="#0891b2" />
                <Mini rotulo="Faturamento por dia" valor={moeda(painel.mediaDia)} nota={`média dos dias com movimento`} cor="#5b4fcf" />
              </div>
            </>
          )}

          {/* ── Equipe, rotinas e marketing ── */}
          <Secao icone={<Building2 size={15} />} titulo="A casa por dentro" nota="equipe, cumprimento das rotinas, campanhas e parcerias" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 14 }}>
            <Painelzinho titulo="Equipe" cor="#7c3aed">
              <Linhazinha esq="Profissionais ativos" dir={String(painel.equipe.ativos)} />
              <Linhazinha esq="PJ / CLT" dir={`${painel.equipe.pj} / ${painel.equipe.clt}`} />
              {painel.equipe.admitidosMes > 0 && <Linhazinha esq="Admitidos no mês" dir={String(painel.equipe.admitidosMes)} corDir="#16a34a" />}
              {painel.equipe.semContrato > 0 && <Linhazinha esq="Sem contrato" dir={String(painel.equipe.semContrato)} corDir="#dc2626" />}
              {painel.equipe.inativos > 0 && <Linhazinha esq="Inativos no cadastro" dir={String(painel.equipe.inativos)} corDir="#8a8680" />}
            </Painelzinho>

            {painel.conformidade && (
              <Painelzinho titulo={`Rotinas · ${painel.conformidade.pct}% cumpridas`} cor={painel.conformidade.pct >= 90 ? '#16a34a' : painel.conformidade.pct >= 70 ? '#b45309' : '#dc2626'}>
                <Linhazinha esq="Total de tarefas" dir={`${painel.conformidade.feito}/${painel.conformidade.total}`} />
                {painel.conformidade.cats.slice(0, 4).map((c: any, i: number) => {
                  const p = Math.round((c.feito / c.total) * 100)
                  return <Linhazinha key={i} esq={c.nome} dir={`${p}%`} corDir={p >= 90 ? '#16a34a' : p >= 70 ? '#b45309' : '#dc2626'} />
                })}
              </Painelzinho>
            )}

            {painel.campanhas && (
              <Painelzinho titulo="Marketing e campanhas" cor="#db2777">
                <Linhazinha esq="Campanhas ativas" dir={String(painel.campanhas.ativas)} />
                {painel.campanhas.novas > 0 && <Linhazinha esq="Criadas no mês" dir={String(painel.campanhas.novas)} corDir="#16a34a" />}
                <Linhazinha esq="Compartilhamentos" dir={String(painel.campanhas.shares)} corDir="#16a34a" />
                <Linhazinha esq="Visualizações" dir={String(painel.campanhas.views)} />
                {painel.campanhas.top[0] && <Linhazinha esq={`Top: ${painel.campanhas.top[0].titulo}`} dir={`${painel.campanhas.top[0].shares || 0}×`} corDir="#db2777" />}
              </Painelzinho>
            )}

            {(painel.loj || painel.curriculosNovos !== null || painel.corridasAtivas > 0 || painel.emprAbertos > 0) && (
              <Painelzinho titulo="Outros movimentos" cor="#0891b2">
                {painel.loj && <Linhazinha esq="Lojistas parceiros" dir={`${painel.loj.ativos} ativos${painel.loj.novos ? ` · +${painel.loj.novos}` : ''}`} />}
                {painel.loj && painel.loj.aniversariantes > 0 && <Linhazinha esq="Aniversariantes do mês" dir={String(painel.loj.aniversariantes)} corDir="#db2777" />}
                {painel.curriculosNovos !== null && <Linhazinha esq="Currículos recebidos" dir={String(painel.curriculosNovos)} />}
                {painel.corridasAtivas > 0 && <Linhazinha esq="Corridas internas" dir={String(painel.corridasAtivas)} corDir="#7c3aed" />}
                {painel.emprAbertos > 0 && <Linhazinha esq="Empréstimos em aberto" dir={String(painel.emprAbertos)} corDir="#b45309" />}
                {painel.alertas?.kitsPendentes > 0 && <Linhazinha esq="Kits pendentes" dir={String(painel.alertas.kitsPendentes)} corDir="#dc2626" />}
                {painel.alertas?.esterPendentes > 0 && <Linhazinha esq="Esterilização pendente" dir={String(painel.alertas.esterPendentes)} corDir="#dc2626" />}
              </Painelzinho>
            )}
          </div>

          {/* ═══ BLOCO 4 — Problemas ═══ */}
          <Secao icone={<AlertTriangle size={15} />} titulo="4. Principais problemas" nota="no máximo 5 — problema → impacto → causa e ação → responsável e prazo" />
          <Tabela campo="problemas" doc={doc} cols={['Problema', 'Impacto (R$ ou %)', 'Causa e ação', 'Responsável / prazo']}
            dicas={['Ex.: queda de produtividade', 'Ex.: -R$ 12.500 no mês', 'Ex.: horários ociosos → campanha', 'Ex.: Comercial · 20/08']}
            onAdd={() => addLinha('problemas')} onMud={(id, k, v) => mudLinha('problemas', id, k, v)} onDel={id => delLinha('problemas', id)} />

          {/* ═══ BLOCO 5 — Oportunidades ═══ */}
          <Secao icone={<Rocket size={15} />} titulo="5. Oportunidades" nota="o sistema calcula as de cima; acrescente as que só você enxerga" />
          {painel.oportunidades.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 9 }}>
              {painel.oportunidades.map((o: any, i: number) => (
                <div key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '11px 13px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1a1a2e' }}>{o.titulo}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#15803d', letterSpacing: '-.3px' }}>{moeda(o.potencial)}</div>
                  <div style={{ fontSize: 10.5, color: '#6b6860', marginTop: 1 }}>{o.detalhe}</div>
                </div>
              ))}
            </div>
          )}
          <Tabela campo="oportunidades" doc={doc} cols={['Oportunidade', 'Potencial (R$)', 'Plano', 'Responsável']}
            dicas={['Ex.: parceria com lojista', 'Ex.: R$ 8.000', 'Ex.: pacote conjunto', 'Ex.: Marketing']}
            onAdd={() => addLinha('oportunidades')} onMud={(id, k, v) => mudLinha('oportunidades', id, k, v)} onDel={id => delLinha('oportunidades', id)} />

          {/* ═══ BLOCO 6 — Investimentos ═══ */}
          <Secao icone={<CircleDollarSign size={15} />} titulo="6. Dinheiro e investimentos" nota="o que foi investido e o que se pede para investir" />
          <Tabela campo="investimentos" doc={doc} cols={['Item', 'Valor', 'Retorno esperado', 'Recomendação']}
            dicas={['Ex.: novo equipamento', 'Ex.: R$ 15.000', 'Ex.: +20% de capacidade, retorno em 7 meses', 'Aprovar / Avaliar / Adiar']}
            onAdd={() => addLinha('investimentos')} onMud={(id, k, v) => mudLinha('investimentos', id, k, v)} onDel={id => delLinha('investimentos', id)} />

          {/* ═══ BLOCO 7 — Decisões ═══ */}
          <Secao icone={<Gavel size={15} />} titulo="7. Decisões que dependem dos sócios" nota="a pergunta que a Direção quer respondida: o que vocês precisam de mim?" destaque />
          <Tabela campo="decisoes" doc={doc} cols={['Decisão', 'Motivo / impacto', 'Prazo', 'Recomendação']}
            dicas={['Ex.: aprovar contratação', 'Ex.: demanda acima da capacidade', 'Ex.: 30/08', 'Aprovar / Avaliar']}
            onAdd={() => addLinha('decisoes')} onMud={(id, k, v) => mudLinha('decisoes', id, k, v)} onDel={id => delLinha('decisoes', id)} />

          {/* ═══ BLOCO 8 — Plano de ação ═══ */}
          <Secao icone={<ListChecks size={15} />} titulo="8. Plano de ação" nota="o que já está em curso para corrigir e aproveitar" />
          <Tabela campo="acoes" doc={doc} cols={['Ação', 'Responsável', 'Prazo', 'Status / resultado esperado']}
            dicas={['Ex.: recuperar clientes inativos', 'Ex.: Comercial', 'Ex.: 20/08', 'Ex.: em andamento · +R$ 15 mil']}
            onAdd={() => addLinha('acoes')} onMud={(id, k, v) => mudLinha('acoes', id, k, v)} onDel={id => delLinha('acoes', id)} />

          <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 13, padding: 15, marginTop: 4 }}>
            <label style={rot}>Observações para a Direção</label>
            <textarea value={doc.observacoes || ''} onChange={e => { setDoc(d => ({ ...d, observacoes: e.target.value })); setDirty(true) }}
              rows={3} placeholder="Contexto, recados, o que não coube nos quadros acima…"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e0ddd8', fontSize: 13, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
          </div>

          <p style={{ fontSize: 11.5, color: '#a8a49d', margin: '12px 4px 0', lineHeight: 1.55 }}>
            Os indicadores, o semáforo, os resultados da equipe e as oportunidades de cima são calculados pelo sistema a partir do
            relatório do avec, da Calculadora, das metas e das pendências de cada setor. Os quadros que você preenche são os que
            dependem de julgamento — causa, decisão e plano. <b>Imprimir</b> gera a apresentação em A4 com a logo do salão.
          </p>
        </>
      )}
    </div>
  )
}

/* ─────────────── Peças ─────────────── */
const sel: CSSProperties = { padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const btnSec: CSSProperties = { padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', color: '#4b5563', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const rot: CSSProperties = { fontSize: 10, fontWeight: 800, color: '#8a8680', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 5 }
const vazio: CSSProperties = { textAlign: 'center', padding: '44px 20px', background: '#fff', border: '1px dashed #e0ddd8', borderRadius: 14, color: '#8a8680', fontSize: 13.5 }

function Secao({ icone, titulo, nota, destaque }: { icone: any; titulo: string; nota?: string; destaque?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '4px 2px 9px' }}>
      <div style={{ width: 28, height: 28, borderRadius: 9, background: destaque ? '#dc2626' : '#5b4fcf', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icone}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 900, color: '#1a1a2e', letterSpacing: '-.2px' }}>{titulo}</div>
        {nota && <div style={{ fontSize: 11, color: '#a8a49d' }}>{nota}</div>}
      </div>
    </div>
  )
}

function Painelzinho({ titulo, cor, children }: { titulo: string; cor: string; children: any }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: cor, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>{titulo}</div>
      {children}
    </div>
  )
}
const Nada = ({ texto = 'Sem dados no mês' }: { texto?: string }) => <div style={{ fontSize: 11.5, color: '#c9c5be' }}>{texto}</div>

/** Número solto com rótulo e nota — usado nos blocos de eficiência e cliente. */
function Mini({ rotulo, valor, nota, cor }: { rotulo: string; valor: string; nota?: string; cor: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 12, padding: '11px 13px' }}>
      <div style={{ fontSize: 9.5, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{rotulo}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: cor, letterSpacing: '-.3px', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis' }}>{valor}</div>
      {nota && <div style={{ fontSize: 10, color: '#a8a49d', fontWeight: 700 }}>{nota}</div>}
    </div>
  )
}

const Leg = ({ cor, txt }: { cor: string; txt: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#8a8680', fontWeight: 700 }}>
    <span style={{ width: 9, height: 9, borderRadius: 3, background: cor }} />{txt}
  </span>
)

/** Comparação do faturamento contra uma referência (mês anterior, ano passado, média). */
function Comp({ rotulo, valor, atual }: { rotulo: string; valor: number; atual: number }) {
  const v = valor > 0 ? (atual - valor) / valor : null
  const cor = v === null ? '#a8a49d' : v >= 0 ? '#16a34a' : '#dc2626'
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 12, padding: '11px 13px' }}>
      <div style={{ fontSize: 9.5, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{rotulo}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: cor, letterSpacing: '-.3px' }}>
        {v === null ? '—' : `${v >= 0 ? '+' : ''}${pct(v)}`}
      </div>
      <div style={{ fontSize: 10, color: '#a8a49d', fontWeight: 700 }}>{valor > 0 ? `era ${moeda(valor)}` : 'sem base de comparação'}</div>
    </div>
  )
}
function Linhazinha({ esq, dir, corDir = '#1a1a2e' }: { esq: string; dir: string; corDir?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderTop: '1px solid #f7f6f3', fontSize: 12 }}>
      <span style={{ flex: 1, color: '#4b5563', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{esq}</span>
      <span style={{ fontWeight: 800, color: corDir, whiteSpace: 'nowrap' }}>{dir}</span>
    </div>
  )
}

/** Quadro de 4 colunas que você preenche, com dica em cada campo. */
function Tabela({ campo, doc, cols, dicas, onAdd, onMud, onDel }: {
  campo: keyof Doc; doc: Doc; cols: string[]; dicas: string[]
  onAdd: () => void; onMud: (id: string, k: keyof Linha, v: string) => void; onDel: (id: string) => void
}) {
  const linhas = (doc[campo] as Linha[]) || []
  const chaves: (keyof Linha)[] = ['a', 'b', 'c', 'd']
  const inp: CSSProperties = { width: '100%', padding: '7px 9px', borderRadius: 8, border: '1.5px solid #e8e6e0', fontSize: 12, background: '#fff' }
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 13, padding: 13, marginBottom: 14 }}>
      {linhas.length === 0 && <p style={{ fontSize: 12, color: '#a8a49d', margin: '2px 0 9px' }}>Nada lançado. Clique em “Acrescentar” para incluir.</p>}
      {linhas.map(l => (
        <div key={l.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
          {chaves.map((k, i) => (
            <div key={k} style={{ flex: i === 0 ? '2 1 180px' : '1 1 120px', minWidth: 110 }}>
              <label style={{ fontSize: 9, fontWeight: 800, color: '#a8a49d', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 2 }}>{cols[i]}</label>
              <input value={l[k]} onChange={e => onMud(l.id, k, e.target.value)} placeholder={dicas[i]} style={{ ...inp, fontWeight: i === 0 ? 700 : 500 }} />
            </div>
          ))}
          <button onClick={() => onDel(l.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 3, marginTop: 16 }}><Trash2 size={13} /></button>
        </div>
      ))}
      <button onClick={onAdd}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 12, fontWeight: 800, padding: '7px 13px', borderRadius: 9, cursor: 'pointer' }}>
        <Plus size={12} /> Acrescentar
      </button>
    </div>
  )
}
