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
  /** de qual setor veio — preenchido no envio */
  area?: string
  areaTitulo?: string
  /** 'pedido' = valor avulso; 'lista' = a lista de reposição enviada inteira */
  tipo?: 'pedido' | 'lista'
  /** cópia dos itens no momento do envio (só quando tipo = 'lista') */
  itens?: ItemLista[]
}

export const STATUS_PEDIDO: Record<StatusPedido, { rotulo: string; cor: string; fundo: string; borda: string }> = {
  rascunho:          { rotulo: 'RASCUNHO',            cor: '#6b7280', fundo: '#fff',    borda: '#eceae4' },
  enviado:           { rotulo: 'AGUARDANDO FINANCEIRO', cor: '#b45309', fundo: '#fffbeb', borda: '#fde68a' },
  aprovado:          { rotulo: 'APROVADO',            cor: '#16a34a', fundo: '#f0fdf4', borda: '#bbf7d0' },
  negado:            { rotulo: 'NÃO APROVADO',        cor: '#dc2626', fundo: '#fef2f2', borda: '#fecaca' },
  financeiro_compra: { rotulo: 'FINANCEIRO VAI COMPRAR', cor: '#5b4fcf', fundo: '#f5f3ff', borda: '#ddd6f5' },
  comprado:          { rotulo: 'COMPRA FEITA',        cor: '#15803d', fundo: '#f0fdf4', borda: '#bbf7d0' },
}

/**
 * Uma página de compra por SETOR — assim cada setor pede o que é dele e as
 * listas não se misturam. São os mesmos setores do organograma; para incluir um
 * setor novo, basta acrescentar uma linha aqui.
 */
export const AREAS_COMPRAS: { id: string; titulo: string }[] = [
  { id: 'recepcao',       titulo: 'Recepção' },
  { id: 'profissionais',  titulo: 'Profissionais' },
  { id: 'dosagem',        titulo: 'Dosagem' },
  { id: 'cafe',           titulo: 'Café' },
  { id: 'servicos_gerais', titulo: 'Serviços Gerais' },
  { id: 'manutencao',     titulo: 'Manutenção' },
  { id: 'marketing',      titulo: 'Marketing' },
  { id: 'comercial',      titulo: 'Comercial / Vendas' },
  { id: 'administrativo', titulo: 'Administrativo' },
  { id: 'financeiro',     titulo: 'Financeiro' },
  { id: 'rh',             titulo: 'RH / Gestão de Pessoas' },
  { id: 'qualidade',      titulo: 'Processo / Qualidade' },
  { id: 'tecnica',        titulo: 'Responsável Técnica' },
  { id: 'gerencia',       titulo: 'Gerência' },
]

/** Chave no salao_config onde a lista e os pedidos daquele setor ficam. */
export const chavePedidos = (area: string) => `compras_${area}`
