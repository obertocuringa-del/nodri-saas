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

export interface ResumoMes {
  temDados: boolean
  faturamento: number
  /** Custos diretos: imposto, produto, rateio, taxa de cartão e extras */
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
  temDados: false, faturamento: 0, diretas: 0, margemR: 0, margemPct: 0,
  indiretas: 0, provisao: 0, depreciacao: 0, custoOp: 0, resultadoOp: 0,
  resultadoOpPct: 0, outras: 0, resultadoFin: 0, pe: 0, peLucro: 0,
  lucroDesejadoPct: 0, capitalGiro: 0, numProfs: 0, areaM2: 0,
}

export function resumoDoMes(dados: any): ResumoMes {
  if (!dados || typeof dados !== 'object') return { ...ZERO }
  const faturamento = num(dados.fat)
  const depreciacao = num(dados.totalDeprec) > 0 ? num(dados.totalDeprec) / 84 : 0
  const indiretas = soma(dados.despInd) + soma(dados.extrasDespInd)
  const provisao = num(dados.sal13) + num(dados.ferias) + num(dados.fgtsR)
  const custoOp = indiretas + provisao + depreciacao
  const diretas = num(dados.imposto) + num(dados.produto) + num(dados.rateio)
    + num(dados.taxaC) + soma(dados.extrasDiretas)
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
    faturamento, diretas, margemR, margemPct,
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

/** Anos que aparecem no seletor: os que têm histórico + o ano corrente. */
export function anosDisponiveis(historico: any[]): number[] {
  const s = new Set<number>((historico || []).map(h => Number(h.ano)).filter(Boolean))
  s.add(new Date().getFullYear())
  return [...s].sort((a, b) => b - a)
}
