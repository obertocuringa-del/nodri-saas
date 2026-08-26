// ── Planos NODRI × módulos ──────────────────────────────────────────────────
//
// FONTE ÚNICA da relação plano → módulo → tela. Antes disso a informação
// estava espalhada: o webhook do Mercado Pago tinha uma lista de nomes de
// módulo que não existem mais no banco, a landing tinha outra lista escrita
// à mão, e a tela do salão decidia sozinha o que abrir. Mexer em um lugar
// não refletia nos outros.
//
// ── O que é módulo e o que é base ──────────────────────────────────────────
// O sistema tem 28 telas em /salon. Só 4 pertencem a módulo. As outras 24
// (check list, administrativo, calendários, feedback, departamentos,
// corridas, lojistas, currículos, ações comerciais, etc.) NÃO pertencem a
// módulo nenhum e são VERSÃO BASE: todo salão tem, em qualquer plano.
// Isso não é uma decisão nova — é como o sistema já funciona hoje. Registrar
// aqui só torna explícito o que estava implícito.
//
// ── Os nomes vêm do banco ──────────────────────────────────────────────────
// `nomesNoBanco` são os valores REAIS da coluna `modulos.nome`. A Suite são
// 4 linhas separadas no banco que a tela junta num card só — por isso o
// módulo 'suite' lista quatro nomes. Comparação sempre normalizada (caixa e
// acento), porque os nomes foram cadastrados em épocas diferentes: uns em
// maiúsculas ('RELATÓRIOS'), outros capitalizados ('Enviar Lista').

export type ChaveModulo = 'profissionais' | 'academia' | 'calculadora' | 'relatorios' | 'suite'

export interface ModuloNodri {
  chave: ChaveModulo
  rotulo: string
  descricao: string
  nomesNoBanco: string[]
}

export const MODULOS_NODRI: ModuloNodri[] = [
  {
    chave: 'profissionais',
    rotulo: 'Profissionais',
    descricao: 'Ficha completa da equipe, contratação, avaliações, metas e documentos.',
    nomesNoBanco: ['PROFISSIONAIS'],
  },
  {
    chave: 'academia',
    rotulo: 'Academia NODRI',
    descricao: 'Aulas e materiais de gestão de salão.',
    nomesNoBanco: ['ACADEMIA NODRI'],
  },
  {
    chave: 'calculadora',
    rotulo: 'Calculadora / Financeira',
    descricao: 'Custo operacional, ponto de equilíbrio, precificação, boletos e empréstimos.',
    nomesNoBanco: ['CALCULADORA / FINANCEIRA'],
  },
  {
    chave: 'relatorios',
    rotulo: 'Relatórios',
    descricao: 'Importação dos atendimentos e todos os relatórios que nascem dela.',
    nomesNoBanco: ['RELATÓRIOS'],
  },
  {
    chave: 'suite',
    rotulo: 'Suite NODRI',
    descricao: 'Aplicativo de WhatsApp: confirmar agendamento, enviar feedback e listas.',
    nomesNoBanco: ['Confirmar Agendamento', 'Enviar Feedback', 'Enviar Lista', 'Enviar Lista c/ Arquivo'],
  },
]

export interface PlanoNodri {
  slug: string
  nome: string
  preco: number
  resumo: string
  modulos: ChaveModulo[]
}

// Cada plano CONTÉM os módulos do anterior. A ordem importa: é ela que
// define o que aparece como "a partir do plano X" quando falta acesso.
export const PLANOS_NODRI: PlanoNodri[] = [
  {
    slug: 'inicial',
    nome: 'Inicial',
    preco: 50,
    resumo: 'A base do sistema com a gestão da equipe.',
    modulos: ['profissionais', 'academia'],
  },
  {
    slug: 'essencial',
    nome: 'Essencial',
    preco: 100,
    resumo: 'Some o controle financeiro do salão.',
    modulos: ['profissionais', 'academia', 'calculadora'],
  },
  {
    slug: 'gestao',
    nome: 'Gestão',
    preco: 150,
    resumo: 'Importa seus atendimentos e liga os relatórios.',
    modulos: ['profissionais', 'academia', 'calculadora', 'relatorios'],
  },
  {
    slug: 'completo',
    nome: 'Completo',
    preco: 300,
    resumo: 'Tudo, mais o aplicativo de WhatsApp.',
    modulos: ['profissionais', 'academia', 'calculadora', 'relatorios', 'suite'],
  },
]

function normalizar(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// Nome vindo do banco → chave do módulo. Usa `includes` porque a
// 'CALCULADORA / FINANCEIRA' já apareceu escrita como 'Custo Operacional'
// em versões anteriores do cadastro.
export function chaveDoModulo(nomeNoBanco: string): ChaveModulo | null {
  const n = normalizar(nomeNoBanco)
  if (!n) return null
  for (const m of MODULOS_NODRI) {
    if (m.nomesNoBanco.some(x => normalizar(x) === n)) return m.chave
  }
  if (n.includes('profission')) return 'profissionais'
  if (n.includes('academ')) return 'academia'
  if (n.includes('calcul') || n.includes('custo') || n.includes('financeir')) return 'calculadora'
  if (n.includes('relator')) return 'relatorios'
  return null
}

export function moduloPorChave(chave: ChaveModulo): ModuloNodri | undefined {
  return MODULOS_NODRI.find(m => m.chave === chave)
}

/** Chaves dos módulos que o plano dá direito. */
export function chavesDoPlano(slugOuNome: string): ChaveModulo[] {
  const alvo = normalizar(slugOuNome)
  const plano =
    PLANOS_NODRI.find(p => p.slug === alvo || normalizar(p.nome) === alvo) ||
    // Planos antigos (Básico / Profissional / Premium) ainda aparecem em
    // salões cadastrados antes da troca de nomes.
    (alvo.includes('premium') ? PLANOS_NODRI.find(p => p.slug === 'completo') : undefined) ||
    (alvo.includes('profission') ? PLANOS_NODRI.find(p => p.slug === 'gestao') : undefined) ||
    (alvo.includes('basic') ? PLANOS_NODRI.find(p => p.slug === 'inicial') : undefined)
  return plano ? plano.modulos : []
}

// Menor plano que inclui o módulo — é o que a tela mostra quando falta acesso.
export function planoMinimoPara(chave: ChaveModulo): PlanoNodri | undefined {
  return PLANOS_NODRI.find(p => p.modulos.includes(chave))
}

// Removida daqui a antiga `nomesDeBancoDoPlano()`. Ela devolvia os nomes
// canônicos dos módulos para procurar no banco por nome exato, e foi assim
// que a Calculadora ficou sem ser liberada: no cadastro ela está gravada como
// 'CALCULADORA / FINANCEIRA ', com um espaço no fim, e a comparação exata
// nunca batia. Quem precisa saber o que um plano contém usa `chavesDoPlano()`
// e casa cada linha do banco com `chaveDoModulo()`, que normaliza o texto.

// ── Rotas protegidas ────────────────────────────────────────────────────────
//
// Só entra aqui o que É do módulo. O que muitas telas da base consomem fica
// DE FORA de propósito: `/api/profissionais` alimenta check list, setores,
// feedback e escala; bloquear a API esvaziaria telas da base por tabela.
// Quando uma tela da base depende de dado de módulo, quem avisa é o
// <AvisoPlano>, não um 403 no meio do carregamento.
export const ROTAS_POR_MODULO: Array<{ prefixo: string; chave: ChaveModulo }> = [
  { prefixo: '/salon/academia', chave: 'academia' },
  { prefixo: '/api/academia', chave: 'academia' },
  { prefixo: '/salon/calculadora-custo', chave: 'calculadora' },
  { prefixo: '/api/salon/calculadora', chave: 'calculadora' },
  { prefixo: '/salon/relatorios', chave: 'relatorios' },
  { prefixo: '/api/relatorios', chave: 'relatorios' },
  { prefixo: '/salon/profissionais', chave: 'profissionais' },
]

export function moduloExigidoPelaRota(pathname: string): ChaveModulo | null {
  const hit = ROTAS_POR_MODULO.find(r => pathname.startsWith(r.prefixo))
  return hit ? hit.chave : null
}
