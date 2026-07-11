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
  data: string      // dd/mm/yyyy
  em: number         // timestamp de criação (ordenação)
  status: 'pendente' | 'separado'
  dataSeparado?: string
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
