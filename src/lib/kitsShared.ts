// Utilidades e formato compartilhados do módulo "Kits Pé e Mão" (pedido de
// kits de manicure/pedicure pelas próprias profissionais, separação pelo
// salão e cruzamento com os atendimentos).
export { normaliza, mesmoProf } from './esterilizacaoShared'

export interface KitsConfig { precoMao: number; precoPe: number }

export interface KitsSolicitacao {
  id: string
  profissionalId: string
  profissionalNome: string
  kitsMao: number
  kitsPe: number
  valor: number
  parcelas?: number  // em quantas vezes a profissional quer dividir (1 = à vista)
  data: string      // dd/mm/yyyy
  em: number         // timestamp de criação (ordenação)
  status: 'pendente' | 'separado'
  dataSeparado?: string
}

// Máximo de parcelas permitido: só libera 2× quando o total pedido atinge o
// DOBRO da média mensal de atendimentos, 3× no triplo, e assim por diante.
// Ex.: média 108 → até 215 = 1×; 216 a 323 = 2×; 324+ = 3×.
export function parcelasMax(totalKits: number, mediaMensal: number): number {
  const t = Math.max(0, Math.floor(Number(totalKits) || 0))
  const m = Math.floor(Number(mediaMensal) || 0)
  if (t <= 0 || m <= 0) return 1
  return Math.max(1, Math.floor(t / m))
}

// Divide o valor em N parcelas com 2 casas; a última parcela absorve o
// arredondamento para o somatório fechar exatamente no total.
export function valorParcelas(total: number, n: number): number[] {
  const parc = Math.max(1, Math.floor(Number(n) || 1))
  const centavosTotal = Math.round(Number(total || 0) * 100)
  const base = Math.floor(centavosTotal / parc)
  const out = Array(parc).fill(base)
  out[parc - 1] = centavosTotal - base * (parc - 1)
  return out.map(c => c / 100)
}

export function calcularValor(kitsMao: number, kitsPe: number, cfg: KitsConfig): number {
  return Math.round((Number(kitsMao || 0) * Number(cfg.precoMao || 0) + Number(kitsPe || 0) * Number(cfg.precoPe || 0)) * 100) / 100
}

export function hojeBRKits() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Aceita vírgula OU ponto como separador decimal (ex: "1,99", "3.5", "R$ 28,80")
// — o Number() puro só entende ponto e quebra com prefixo "R$" ou espaços, o
// que aparece direto em dado digitado à mão ou migrado de planilha antiga.
export function parseBRLNumber(s: string): number {
  const raw = String(s || '').trim()
  if (!raw) return 0
  const somenteNumero = raw.replace(/[^\d,.-]/g, '')
  const cleaned = somenteNumero.includes(',') ? somenteNumero.replace(/\./g, '').replace(',', '.') : somenteNumero
  const n = Number(cleaned)
  return isNaN(n) ? 0 : n
}

// 'YYYY-MM' dos últimos n meses (incluindo o mês informado), do mais antigo pro mais novo.
export function ultimosMeses(mesRef: string, n: number): string[] {
  const [ano, mes] = mesRef.split('-').map(Number)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ano, mes - 1 - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}
