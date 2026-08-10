// Números do mês a partir do que a Calculadora já salvou.
//
// As fórmulas aqui são AS MESMAS de src/app/salon/calculadora-custo/page.tsx
// (Receitas e Despesas / Ponto de Equilíbrio). Nada é digitado de novo em
// nenhuma das telas que usam este arquivo — elas só leem e organizam, para não
// existir um segundo número que possa divergir do original.

export const num = (v: any) => parseFloat(String(v ?? '0').replace(',', '.')) || 0
export const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const soma = (l: any) => Array.isArray(l) ? l.reduce((s: number, d: any) => s + num(d?.valor), 0) : 0

/** O que veio dos relatórios importados do avec para aquele mês. */
export interface RealDoMes {
  faturamento: number
  /** O que os profissionais receberam no mês (A pagar da planilha) */
  profissionais: number
  /** Quantos dias do mês já têm faturamento importado */
  dias: number
}

export interface ResumoMes {
  temDados: boolean
  faturamento: number
  /** true quando o faturamento veio do relatório do avec; false = valor digitado na Calculadora */
  faturamentoReal: boolean
  diasImportados: number
  /** Comissões dos profissionais no mês, do relatório do avec */
  profissionais: number
  /** Imposto, produto, rateio, taxa de cartão e extras da Calculadora */
  diretasOutras: number
  /** Profissionais + diretasOutras */
  diretas: number
  margemR: number
  margemPct: number
  indiretas: number
  provisao: number
  depreciacao: number
  custoOp: number
  resultadoOp: number
  resultadoOpPct: number
  outras: number
  resultadoFin: number
  pe: number
  peLucro: number
  lucroDesejadoPct: number
  capitalGiro: number
  numProfs: number
  areaM2: number
}

const ZERO: ResumoMes = {
  temDados: false, faturamento: 0, faturamentoReal: false, diasImportados: 0,
  profissionais: 0, diretasOutras: 0, diretas: 0, margemR: 0, margemPct: 0,
  indiretas: 0, provisao: 0, depreciacao: 0, custoOp: 0, resultadoOp: 0,
  resultadoOpPct: 0, outras: 0, resultadoFin: 0, pe: 0, peLucro: 0,
  lucroDesejadoPct: 0, capitalGiro: 0, numProfs: 0, areaM2: 0,
}

/**
 * `real` vem dos relatórios importados do avec. Quando ele traz faturamento, é
 * ele que vale — o campo da Calculadora é a média/projeção que o salão usa para
 * dimensionar preço, não o que entrou no mês.
 */
export function resumoDoMes(dados: any, real?: RealDoMes): ResumoMes {
  const temReal = !!real && real.faturamento > 0
  if (!dados || typeof dados !== 'object') dados = {}
  const faturamento = temReal ? real!.faturamento : num(dados.fat)
  // Comissões: o campo Rateio/Comissão da Calculadora manda quando está
  // preenchido; senão vale o realizado do avec. Nunca os dois — senão o custo
  // dos profissionais entraria duas vezes.
  const rateioManual = num(dados.rateio)
  const profissionais = rateioManual > 0 ? rateioManual : (real?.profissionais || 0)
  const depreciacao = num(dados.totalDeprec) > 0 ? num(dados.totalDeprec) / 84 : 0
  const indiretas = soma(dados.despInd) + soma(dados.extrasDespInd)
  const provisao = num(dados.sal13) + num(dados.ferias) + num(dados.fgtsR)
  const custoOp = indiretas + provisao + depreciacao
  const diretasOutras = num(dados.imposto) + num(dados.produto)
    + num(dados.taxaC) + soma(dados.extrasDiretas)
  const diretas = diretasOutras + profissionais
  const margemR = faturamento - diretas
  const margemPct = faturamento > 0 ? margemR / faturamento : 0
  const resultadoOp = margemR - custoOp
  const outras = num(dados.aquisicaoEq) + num(dados.distSocios) + soma(dados.extrasOutras)
  // Depreciação é custo que não sai do caixa, então volta a somar no resultado
  // financeiro — mesma conta da linha 132 da planilha original.
  const resultadoFin = resultadoOp - outras + depreciacao
  const lucroDesejadoPct = num(dados.metaLucroPE) / 100 || num(dados.lucroD) / 100
  const margemPE = num(dados.margemPE) / 100 || margemPct
  const custoOpPE = custoOp > 0 ? custoOp : num(dados.simDespesa)

  return {
    temDados: faturamento > 0 || custoOp > 0 || diretas > 0,
    faturamento, faturamentoReal: temReal, diasImportados: real?.dias || 0,
    profissionais, diretasOutras, diretas, margemR, margemPct,
    indiretas, provisao, depreciacao, custoOp,
    resultadoOp, resultadoOpPct: faturamento > 0 ? resultadoOp / faturamento : 0,
    outras, resultadoFin,
    pe: margemPE > 0 ? custoOpPE / margemPE : 0,
    peLucro: (margemPE - lucroDesejadoPct) > 0 ? custoOpPE / (margemPE - lucroDesejadoPct) : 0,
    lucroDesejadoPct,
    capitalGiro: custoOp * 3,
    numProfs: num(dados.numProfs),
    areaM2: num(dados.areaM2),
  }
}

/**
 * Monta o realizado de cada mês a partir do que veio de /api/relatorios.
 * Chave do mapa: "2026-8".
 *
 * O valor_a_pagar que a API devolve já vem com o desconto somado (comissão
 * cheia); o que sai do caixa é o "A pagar" da planilha, então o desconto é
 * tirado de volta — a mesma conta da tela Faturamento dos Profissionais.
 */
export function realPorMes(rel: any): Map<string, RealDoMes> {
  const m = new Map<string, RealDoMes>()
  const pega = (a: any, ms: any) => {
    const k = `${Number(a)}-${Number(ms)}`
    if (!m.has(k)) m.set(k, { faturamento: 0, profissionais: 0, dias: 0 })
    return m.get(k)!
  }
  for (const r of (rel?.resumo_mensal || [])) {
    if (!r?.ano || !r?.mes) continue
    pega(r.ano, r.mes).faturamento += num(r.faturamento_total)
  }
  for (const d of (rel?.faturamento_diario || [])) {
    if (!d?.ano || !d?.mes) continue
    if (num(d.valor) > 0) pega(d.ano, d.mes).dias += 1
  }
  for (const p of (rel?.prof_pagamentos || [])) {
    if (!p?.ano || !p?.mes) continue
    pega(p.ano, p.mes).profissionais += num(p.valor_a_pagar) - num(p.desconto)
  }
  return m
}

/** Anos que aparecem no seletor: os que têm histórico + o ano corrente. */
export function anosDisponiveis(historico: any[], real?: Map<string, RealDoMes>): number[] {
  const s = new Set<number>((historico || []).map(h => Number(h.ano)).filter(Boolean))
  if (real) for (const k of real.keys()) s.add(Number(k.split('-')[0]))
  s.add(new Date().getFullYear())
  return [...s].filter(Boolean).sort((a, b) => b - a)
}
