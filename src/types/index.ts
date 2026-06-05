export interface Plano {
  id: string
  nome: string
  slug: string
  preco: number
  max_usuarios: number
  descricao: string
  ativo: boolean
}

export interface Salao {
  id: string
  nome: string
  responsavel: string
  email: string
  telefone?: string
  plano_id?: string
  status: 'ativo' | 'bloqueado' | 'vencido' | 'trial'
  licenca_vencimento?: string
  observacoes?: string
  criado_em: string
  plano?: Plano
  ia_ativa?: boolean
}

export interface Usuario {
  id: string
  salao_id?: string
  nome: string
  email: string
  role: 'master' | 'salon'
  ativo: boolean
  ultimo_acesso?: string
  criado_em: string
  salao?: Salao
}

export interface Modulo {
  id: string
  nome: string
  slug: string
  descricao: string
  versao: string
  icone: string
  cor_classe: string
  categoria: string
  ordem: number
  ativo: boolean
  em_manutencao?: boolean
  msg_manutencao?: string
}

export interface SalaoModulo {
  id: string
  salao_id: string
  modulo_id: string
  ativo: boolean
  habilitado_em: string
  modulo?: Modulo
}

export interface Notificacao {
  id: string
  salao_id?: string
  titulo?: string
  mensagem: string
  tipo: 'info' | 'success' | 'warning' | 'danger'
  para_todos: boolean
  lida: boolean
  metadata?: Record<string, any>
  criado_em: string
}

export interface Pagamento {
  id: string
  salao_id: string
  plano_id?: string
  valor: number
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado'
  data_vencimento: string
  data_pagamento?: string
}

export interface ModuloComStatus extends Modulo {
  habilitado: boolean
}

export interface Cupom {
  id: string
  codigo: string
  percentual: number
  ativo: boolean
  usos_maximos: number | null
  usos_atual: number
  criado_em: string
}
