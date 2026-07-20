import { supabaseAdmin } from '@/lib/supabase'

// ─── Constantes do módulo Currículos ────────────────────────────────────────
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
  estado: string   // UF
  idade: number
  telefone: string // com DDD, só dígitos ou formatado
  vaga: string
  experiencia: string
  criado_em: string // ISO
}
export interface CurriculosDoc {
  token: string
  itens: Curriculo[]
  visto_em?: string // ISO — última vez que o dono abriu a página
}

const CHAVE = 'curriculos'

function novoToken(): string {
  return 'cur-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

// Lê o doc do salão; cria com token se ainda não existir (só quando o dono acessa).
export async function getCurriculosDoc(salaoId: string, criarSeVazio = false): Promise<CurriculosDoc> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE).maybeSingle()
  if (data?.valor) return data.valor as CurriculosDoc
  const doc: CurriculosDoc = { token: novoToken(), itens: [] }
  if (criarSeVazio) {
    await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: CHAVE, valor: doc, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  }
  return doc
}

export async function salvarCurriculosDoc(salaoId: string, doc: CurriculosDoc): Promise<void> {
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: CHAVE, valor: doc, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
}

export async function getSalaoPorTokenCurriculo(token: string): Promise<{ salaoId: string; doc: CurriculosDoc } | null> {
  const chave = (token || '').replace(/[,()]/g, '')
  const { data } = await supabaseAdmin
    .from('salao_config')
    .select('salao_id, valor')
    .eq('chave', CHAVE)
    .eq('valor->>token', chave)
    .maybeSingle()
  if (!data) return null
  return { salaoId: data.salao_id, doc: data.valor as CurriculosDoc }
}

// Monta o link wa.me a partir de um telefone brasileiro com DDD.
export function whatsappLink(telefone: string): string {
  let d = (telefone || '').replace(/\D/g, '')
  if (!d) return ''
  if (!d.startsWith('55')) d = '55' + d
  return `https://wa.me/${d}`
}
