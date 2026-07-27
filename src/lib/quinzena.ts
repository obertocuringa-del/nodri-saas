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

// Uma data 'dd/mm/yyyy' cai na quinzena q do mês 'YYYY-MM'?
// Datas inválidas/vazias só contam no "mês inteiro" (q = 0), para nunca sumir
// um lançamento antigo que não tem dia registrado.
export function dataNaQuinzena(dataBR: string, mesStr: string, q: Quinzena): boolean {
  const m = String(dataBR || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const [ano, mes] = mesStr.split('-').map(Number)
  if (!m) return q === 0
  const dia = Number(m[1]), mesD = Number(m[2]), anoD = Number(m[3])
  if (mesD !== mes || anoD !== ano) return false
  const [ini, fim] = diasQuinzena(ano, mes, q)
  return dia >= ini && dia <= fim
}
