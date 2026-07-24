// Fluxo de esterilização de alicates entre a profissional e o salão (client-safe).
// Ciclo: a profissional ENVIA a quantidade → o salão RECEBE (confere e pode
// deixar observação) → o salão ENTREGA (esterilizado) → a profissional CONFIRMA
// o recebimento (aí a notificação some).
//
// Caso especial: se a profissional deixou alicates SEM solicitar pelo sistema,
// o salão registra "avulso" (origem 'salao') e a profissional recebe um aviso
// de que a quantidade não foi informada e o salão não se responsabiliza por ela.

export type OrigemEster = 'profissional' | 'salao'
export type StatusEster = 'enviado' | 'recebido' | 'entregue' | 'concluido'

export interface PedidoEster {
  id: string
  origem: OrigemEster
  profissionalId: string
  profNome: string
  qtdEnviada?: number        // informada pela profissional
  dataEnvio?: string         // dd/mm/yyyy
  qtdRecebida?: number       // conferida pelo salão
  obsRecebimento?: string    // observação do salão (ex.: divergência de quantidade)
  dataRecebimento?: string
  qtdEntregue?: number       // quantidade esterilizada devolvida
  dataEntrega?: string
  confirmadoEm?: number      // quando a profissional confirmou o recebimento
  status: StatusEster
  em: number                 // criação (ordenação)
}

export const STATUS_ESTER: Record<StatusEster, { label: string; bg: string; cor: string }> = {
  enviado:   { label: 'Enviado — aguardando o salão receber', bg: '#fffbeb', cor: '#b45309' },
  recebido:  { label: 'Recebido — em esterilização',          bg: '#eff6ff', cor: '#2563eb' },
  entregue:  { label: 'Entregue — confirme o recebimento',    bg: '#f5f3ff', cor: '#7c3aed' },
  concluido: { label: 'Concluído',                            bg: '#f0fdf4', cor: '#16a34a' },
}

export function hojeBREster(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export const ridEster = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
