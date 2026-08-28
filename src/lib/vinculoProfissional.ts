// Quem é CNPJ — a definição, num lugar só.
//
// O campo `vinculo` só guarda 'CLT' (ou vazio). Não existe o valor 'CNPJ'
// gravado em lugar nenhum: CNPJ é o que SOBRA depois de tirar setor, cargo
// administrativo, recepção e quem é CLT. Quem procurar por `vinculo = 'CNPJ'`
// não acha ninguém — foi exatamente o que aconteceu na primeira tentativa de
// filtrar o aviso de habilitação, e a lista inteira sumiu.
//
// Esta era a regra da aba CNPJ de ProfissionaisPainel. Está aqui para que a
// aba e o aviso não possam discordar sobre quem é da cadeira.

const CATEGORIAS_ADMIN = ['ADMINISTRATIVO', 'FINANCEIRO', 'GERENCIA']

export function normalizarTexto(s: string): string {
  return (s || '').toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export interface ComoVinculo {
  cargo?: string | null
  nome_completo?: string | null
  vinculo?: string | null
  is_departamento?: boolean | null
}

/** Atende cliente na cadeira e emite nota: nem setor, nem interno, nem CLT. */
export function ehCnpj(p: ComoVinculo): boolean {
  // Setor não é pessoa: departamento mora na mesma tabela de profissionais,
  // mas não tem CNPJ nem atende ninguém.
  if (p.is_departamento) return false
  const cargo = normalizarTexto(p.cargo || '')
  const nome = normalizarTexto(p.nome_completo || '')
  if (CATEGORIAS_ADMIN.includes(cargo) || CATEGORIAS_ADMIN.includes(nome)) return false
  // Recepção é equipe interna, contratada como CLT.
  if (cargo.startsWith('RECEP') || nome.startsWith('RECEP')) return false
  if (normalizarTexto(p.vinculo || '') === 'CLT') return false
  return true
}
