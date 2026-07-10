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
