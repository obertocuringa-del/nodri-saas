// Quinzenas do mês (1ª = dia 1 ao 15, 2ª = dia 16 ao último dia).
// Mesmo espírito das janelas do Check List: o período "vira" sozinho pela data
// de hoje, sem robô nem cron. Nada é apagado — cada quinzena fica no histórico.
export type Quinzena = 0 | 1 | 2 // 0 = mês inteiro

export function quinzenaDeHoje(): 1 | 2 {
  return new Date().getDate() <= 15 ? 1 : 2
}

// Intervalo de dias [ini, fim] de uma quinzena dentro de um mês
export function diasQuinzena(ano: number, mes: number, q: Quinzena): [number, number] {
  const ultimo = new Date(ano, mes, 0).getDate()
  if (q === 1) return [1, 15]
  if (q === 2) return [16, ultimo]
  return [1, ultimo] // mês inteiro
}

// mesStr no formato 'YYYY-MM'
export function labelQuinzena(mesStr: string, q: Quinzena): string {
  const [ano, mes] = mesStr.split('-').map(Number)
  if (!ano || !mes) return q === 1 ? '1ª quinzena' : q === 2 ? '2ª quinzena' : 'Mês inteiro'
  const [ini, fim] = diasQuinzena(ano, mes, q)
  const mm = String(mes).padStart(2, '0')
  return `${String(ini).padStart(2, '0')}–${String(fim).padStart(2, '0')}/${mm}`
}

export function nomeQuinzena(q: Quinzena): string {
  return q === 1 ? '1ª quinzena' : q === 2 ? '2ª quinzena' : 'Mês inteiro'
}

// Uma data cai na quinzena q do mês 'YYYY-MM'? Aceita 'dd/mm/aaaa' e 'aaaa-mm-dd'
// (o input type=date às vezes deixa no formato ISO). Datas inválidas/vazias só
// contam no "mês inteiro" (q = 0), para nunca sumir um lançamento sem dia.
export function dataNaQuinzena(dataStr: string, mesStr: string, q: Quinzena): boolean {
  const s = String(dataStr || '').trim()
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const [ano, mes] = mesStr.split('-').map(Number)
  let dia: number, mesD: number, anoD: number
  if (br) { dia = +br[1]; mesD = +br[2]; anoD = +br[3] }
  else if (iso) { anoD = +iso[1]; mesD = +iso[2]; dia = +iso[3] }
  else return q === 0
  if (mesD !== mes || anoD !== ano) return false
  const [ini, fim] = diasQuinzena(ano, mes, q)
  return dia >= ini && dia <= fim
}

// ── Parcelamento por quinzena ───────────────────────────────────────────────
//
// Compra parcelada do profissional (kits, por exemplo) não desconta tudo de
// uma vez: cada parcela cai numa quinzena, a partir da quinzena em que o
// pedido foi feito. Pedido na 2ª quinzena de agosto em 2×: a 1ª parcela sai
// no fechamento de 16–31/08 e a 2ª no de 01–15/09.
//
// Antes o desconto lançava o valor inteiro na quinzena do pedido, e a segunda
// parcela simplesmente não existia em lugar nenhum — a manicure pagava tudo
// no primeiro fechamento sem ter combinado isso.

export interface PeriodoQuinzena { mes: string; q: 1 | 2 }

/** A quinzena seguinte a esta. Depois da 2ª vem a 1ª do mês que vem. */
export function quinzenaSeguinte(p: PeriodoQuinzena): PeriodoQuinzena {
  if (p.q === 1) return { mes: p.mes, q: 2 }
  const [ano, mes] = p.mes.split('-').map(Number)
  const d = new Date(ano, mes, 1)   // mes é 1-based aqui: já aponta para o próximo
  return { mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, q: 1 }
}

/** Em que mês/quinzena caiu uma data ('dd/mm/aaaa' ou 'aaaa-mm-dd'). */
export function periodoDaData(dataStr: string): PeriodoQuinzena | null {
  const s = String(dataStr || '').trim()
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  let dia: number, mes: number, ano: number
  if (br) { dia = +br[1]; mes = +br[2]; ano = +br[3] }
  else if (iso) { ano = +iso[1]; mes = +iso[2]; dia = +iso[3] }
  else return null
  return { mes: `${ano}-${String(mes).padStart(2, '0')}`, q: dia <= 15 ? 1 : 2 }
}

/**
 * As quinzenas em que as N parcelas de um pedido vão cair, na ordem.
 * A primeira é sempre a quinzena do próprio pedido.
 */
export function periodosDasParcelas(dataPedido: string, n: number): PeriodoQuinzena[] {
  const inicio = periodoDaData(dataPedido)
  if (!inicio) return []
  const total = Math.max(1, Math.floor(Number(n) || 1))
  const out: PeriodoQuinzena[] = [inicio]
  for (let i = 1; i < total; i++) out.push(quinzenaSeguinte(out[i - 1]))
  return out
}

/**
 * Qual parcela deste pedido cai na quinzena consultada.
 * Devolve o número (1-based) e o total, ou null quando não cai nenhuma.
 * Com `q = 0` (mês inteiro) vale qualquer parcela daquele mês.
 */
export function parcelaNoPeriodo(
  dataPedido: string, parcelas: number, mesStr: string, q: Quinzena,
): { numero: number; total: number } | null {
  const periodos = periodosDasParcelas(dataPedido, parcelas)
  if (!periodos.length) return null
  const i = periodos.findIndex(p => p.mes === mesStr && (q === 0 || p.q === q))
  return i < 0 ? null : { numero: i + 1, total: periodos.length }
}
