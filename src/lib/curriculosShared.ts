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

// Vagas que um salão NOVO começa tendo. A partir daí cada salão edita as suas
// pela tela de Currículos (salvas no próprio doc, em `vagas`) — ninguém precisa
// mexer no código pra abrir uma vaga nova.
export const VAGAS = ['Serviços Gerais', 'Recepção', 'Manicure', 'Cabeleireira', 'Assistente de Cabeleireira', 'Barista'] as const
export const EXPERIENCIAS = ['0 a 6 meses', '6 meses a 1 ano', '1 a 2 anos', '2 a 3 anos', '3 a 4 anos', 'Mais de 5 anos'] as const

export const MAX_VAGAS = 40
export const MAX_NOME_VAGA = 40

// Vagas configuradas do salão (cai no padrão enquanto ele nunca editou nada).
export function vagasDoDoc(doc: { vagas?: string[] } | null | undefined): string[] {
  const v = doc?.vagas
  return Array.isArray(v) && v.length ? v : [...VAGAS]
}

// O que a TELA deve listar: as vagas configuradas, mais qualquer vaga que ainda
// tenha candidato guardado. Sem isso, apagar uma vaga esconderia os currículos
// que já chegaram por ela — some da lista, mas o candidato continua no banco.
export function vagasParaExibir(vagas: string[], itens: { vaga: string }[]): string[] {
  const orfas = [...new Set((itens || []).map(c => c.vaga))].filter(v => v && !vagas.includes(v))
  return [...vagas, ...orfas.sort()]
}

// Nome de vaga válido e comparação sem depender de maiúscula/acento
export function normalizarVaga(nome: string): string {
  return String(nome || '').trim().replace(/\s+/g, ' ').slice(0, MAX_NOME_VAGA)
}
export function mesmaVaga(a: string, b: string): boolean {
  const k = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  return k(a) === k(b)
}

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
  /** Lista global de vagas. Ausente = salão nunca editou, vale o padrão VAGAS. */
  vagas?: string[]
  /** Links antigos (um por salão) que continuam válidos e caem neste mesmo banco. */
  tokens_legado?: string[]
  /** Só nos documentos antigos, de quando cada salão tinha o seu. */
  visto_em?: string
}

// Link wa.me a partir de um telefone brasileiro com DDD.
export function whatsappLink(telefone: string): string {
  let d = (telefone || '').replace(/\D/g, '')
  if (!d) return ''
  if (!d.startsWith('55')) d = '55' + d
  return `https://wa.me/${d}`
}
