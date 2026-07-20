// Constantes e helpers do módulo Currículos SEGUROS para o cliente.
// (NÃO importar supabase/server aqui — este arquivo é usado por páginas 'use client')

export const ESTADOS_BR: { uf: string; nome: string }[] = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' }, { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' }, { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' }, { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' },
]

export const VAGAS = ['Serviços Gerais', 'Recepção', 'Manicure', 'Cabeleireira', 'Assistente de Cabeleireira'] as const
export const EXPERIENCIAS = ['0 a 6 meses', '6 meses a 1 ano', '1 a 2 anos', '2 a 3 anos', '3 a 4 anos', 'Mais de 5 anos'] as const

export interface Curriculo {
  id: string
  nome: string
  estado: string
  idade: number
  telefone: string
  vaga: string
  experiencia: string
  criado_em: string
}
export interface CurriculosDoc {
  token: string
  itens: Curriculo[]
  visto_em?: string
}

// Link wa.me a partir de um telefone brasileiro com DDD.
export function whatsappLink(telefone: string): string {
  let d = (telefone || '').replace(/\D/g, '')
  if (!d) return ''
  if (!d.startsWith('55')) d = '55' + d
  return `https://wa.me/${d}`
}
