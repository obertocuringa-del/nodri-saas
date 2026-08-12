// Compras e Estoque — tipos e áreas compartilhados entre a tela do setor
// (ListaCompras) e a tela de decisão do Financeiro (PedidosCompraFinanceiro).

export const rid = () => Math.random().toString(36).slice(2, 9)
export const num = (v: any) => parseFloat(String(v ?? '0').replace(',', '.')) || 0
export const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export interface ItemLista { id: string; nome: string; minimo: string; atual: string; comprar: string }

export type StatusPedido = 'rascunho' | 'enviado' | 'aprovado' | 'negado' | 'financeiro_compra' | 'comprado'

export interface Pedido {
  id: string
  descricao: string
  valor: string
  status: StatusPedido
  criadoEm: number
  enviadoEm?: number
  decididoEm?: number
  compradoEm?: number
  motivo?: string
  pendenciaId?: string
  /** de qual área do estoque veio — preenchido no envio */
  area?: string
  areaTitulo?: string
}

export const STATUS_PEDIDO: Record<StatusPedido, { rotulo: string; cor: string; fundo: string; borda: string }> = {
  rascunho:          { rotulo: 'RASCUNHO',            cor: '#6b7280', fundo: '#fff',    borda: '#eceae4' },
  enviado:           { rotulo: 'AGUARDANDO FINANCEIRO', cor: '#b45309', fundo: '#fffbeb', borda: '#fde68a' },
  aprovado:          { rotulo: 'APROVADO',            cor: '#16a34a', fundo: '#f0fdf4', borda: '#bbf7d0' },
  negado:            { rotulo: 'NÃO APROVADO',        cor: '#dc2626', fundo: '#fef2f2', borda: '#fecaca' },
  financeiro_compra: { rotulo: 'FINANCEIRO VAI COMPRAR', cor: '#5b4fcf', fundo: '#f5f3ff', borda: '#ddd6f5' },
  comprado:          { rotulo: 'COMPRA FEITA',        cor: '#15803d', fundo: '#f0fdf4', borda: '#bbf7d0' },
}

/** As áreas do setor Compras/Estoque. Cada uma é uma página com sua lista. */
export const AREAS_COMPRAS: { id: string; titulo: string }[] = [
  { id: 'dosagem',        titulo: 'Dosagem' },
  { id: 'coloracao',      titulo: 'Coloração e química' },
  { id: 'cabelo',         titulo: 'Produtos de cabelo' },
  { id: 'manicure',       titulo: 'Manicure e pedicure' },
  { id: 'estetica',       titulo: 'Estética' },
  { id: 'descartaveis',   titulo: 'Descartáveis' },
  { id: 'limpeza',        titulo: 'Limpeza e higiene' },
  { id: 'copa',           titulo: 'Copa e cortesias' },
  { id: 'escritorio',     titulo: 'Escritório e papelaria' },
  { id: 'enxoval',        titulo: 'Enxoval e uniformes' },
  { id: 'equipamentos',   titulo: 'Equipamentos e ferramentas' },
  { id: 'manutencao',     titulo: 'Manutenção e reposição' },
  { id: 'revenda',        titulo: 'Produtos de revenda' },
  { id: 'embalagens',     titulo: 'Embalagens e brindes' },
]

/** Chave no salao_config onde a lista e os pedidos daquela área ficam. */
export const chavePedidos = (area: string) => `compras_${area}`
