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
  /**
   * O que o módulo entrega, em linhas curtas — para VENDER, não para catalogar.
   *
   * A vitrine mostrava só o nome do módulo com um cadeado. "Relatórios" com
   * cadeado não diz a ninguém que ali dentro está quem sumiu, quanto cada
   * cliente vale e a corrida da equipe — e ninguém compra o que não sabe que
   * existe.
   *
   * Escrito a partir do inventário real do sistema (01/09/2026), e não do que
   * seria bonito prometer: cada linha aponta para uma tela que existe.
   */
  destaques: string[]
  nomesNoBanco: string[]
}

export const MODULOS_NODRI: ModuloNodri[] = [
  {
    chave: 'profissionais',
    rotulo: 'Profissionais',
    descricao: 'Ficha completa da equipe, contratação, avaliações, metas e documentos.',
    destaques: [
      'Ficha com 19 abas por profissional',
      'Contrato, distrato, entrevista e plano de carreira',
      'Avaliações, POPs e ocorrências',
      'Metas individuais e faturamento de cada uma',
      'Portal com login próprio para a profissional',
    ],
    nomesNoBanco: ['PROFISSIONAIS'],
  },
  {
    chave: 'academia',
    rotulo: 'Academia NODRI',
    descricao: 'Aulas e materiais de gestão de salão.',
    destaques: [
      'Aulas de gestão de salão',
      'Materiais para aplicar na sua equipe',
    ],
    nomesNoBanco: ['ACADEMIA NODRI'],
  },
  {
    chave: 'calculadora',
    rotulo: 'Calculadora / Financeira',
    descricao: 'As oito calculadoras, boletos, fluxo de caixa, comissões, empréstimos e descontos consolidados.',
    destaques: [
      'Custo real de cada serviço — o custo, não o preço',
      'Ponto de equilíbrio: quanto precisa entrar para não faltar',
      'Receitas, despesas e gráficos com médias de mercado',
      'Aluguel de cadeira e faturamento por m²',
      'DRE, fluxo de caixa, comissões e boletos a pagar',
    ],
    nomesNoBanco: ['CALCULADORA / FINANCEIRA'],
  },
  {
    chave: 'relatorios',
    rotulo: 'Relatórios',
    descricao: 'Importação dos atendimentos, análise de clientes, metas, corridas com ranking e DRE.',
    destaques: [
      'Quem sumiu, quem voltou e quem está em risco de sumir',
      'Quanto cada cliente já deixou no salão, e o ticket dela',
      'O que vender junto: combos que a sua base já compra',
      'Metas por profissional, com redistribuição automática',
      'Corridas internas com ranking — 11 formas de disputar',
    ],
    nomesNoBanco: ['RELATÓRIOS'],
  },
  {
    chave: 'suite',
    rotulo: 'Suite NODRI e alcance',
    descricao: 'Aplicativo de WhatsApp, vitrine pública do salão, ações comerciais e parcerias com lojistas.',
    destaques: [
      'Confirmação de agendamento pelo WhatsApp, em lote',
      'Envio de listas, arquivos e pesquisas para a base inteira',
      'Vitrine própria: um link com promoções, preços e agendamento',
      'Campanhas e ações comerciais com foto e preço',
      'Parcerias com lojistas da região',
    ],
    nomesNoBanco: ['Confirmar Agendamento', 'Enviar Feedback', 'Enviar Lista', 'Enviar Lista c/ Arquivo'],
  },
]

export interface PlanoNodri {
  slug: string
  nome: string
  preco: number
  /** A promessa do plano em três palavras — o que ele resolve. */
  tema: string
  resumo: string
  /** A pergunta que abre a venda: aquela que o dono não sabe responder. */
  perguntaDeVenda: string
  modulos: ChaveModulo[]
}

// ── A régua da divisão ──────────────────────────────────────────────────────
//
// Os planos não são separados por assunto, e sim por DE ONDE VEM O DADO que
// alimenta cada ferramenta. É essa régua que impede o defeito que existia
// antes: ferramenta vendida num plano mas alimentada por dado de outro, que
// chegava ao cliente pela metade.
//
//   Inicial   → o que o salão digita sobre si mesmo (equipe, rotina, processo)
//   Essencial → o que o salão digita sobre dinheiro (custo, preço, contas)
//   Gestão    → a planilha de atendimentos importada (clientes, metas, DRE)
//   Completo  → o contato com o mercado (vitrine, campanhas, WhatsApp)
//
// Cada plano CONTÉM os módulos do anterior. A ordem importa: é ela que
// define o que aparece como "a partir do plano X" quando falta acesso.
export const PLANOS_NODRI: PlanoNodri[] = [
  {
    slug: 'inicial',
    nome: 'Inicial',
    preco: 50,
    tema: 'A casa em ordem',
    resumo: 'O salão para de depender da cabeça do dono: rotina escrita, equipe cadastrada, cada setor com dono e cada tarefa com prazo.',
    perguntaDeVenda: 'Se você ficar duas semanas fora, o salão anda?',
    modulos: ['profissionais', 'academia'],
  },
  {
    slug: 'essencial',
    nome: 'Essencial',
    preco: 100,
    tema: 'O dinheiro',
    resumo: 'A resposta para a pergunta que tira o sono: sobrou dinheiro esse mês, e por quê.',
    perguntaDeVenda: 'Quanto custa fazer uma escova no seu salão? Não o preço — o custo.',
    modulos: ['profissionais', 'academia', 'calculadora'],
  },
  {
    slug: 'gestao',
    nome: 'Gestão',
    preco: 150,
    tema: 'O cliente',
    resumo: 'A leitura da sua base: quem volta, quem sumiu, quem dá lucro e quanto ainda dá para tirar de quem já é seu cliente.',
    perguntaDeVenda: 'Quantas clientes você perdeu nos últimos noventa dias?',
    modulos: ['profissionais', 'academia', 'calculadora', 'relatorios'],
  },
  {
    slug: 'completo',
    nome: 'Completo',
    preco: 300,
    tema: 'O alcance',
    resumo: 'O salão falando com o mercado: vitrine própria, campanhas, parcerias e WhatsApp em escala.',
    perguntaDeVenda: 'Quantos horários furaram no seu salão semana passada?',
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

  // ── Redistribuição (set/2026) ─────────────────────────────────────────────
  //
  // Estas telas eram base e passaram a pertencer ao plano que TEM O DADO delas.
  // Não é encarecimento: é o conserto de ferramentas que chegavam pela metade.
  //
  // Corridas internas: o ranking é calculado a partir de `relatorio_periodos`.
  // Sem o módulo Relatórios a tela criava a corrida e não classificava
  // ninguém — a competição existia no papel e não acontecia.
  { prefixo: '/salon/corridas', chave: 'relatorios' },
  { prefixo: '/api/salon/corridas', chave: 'relatorios' },

  // Vitrine, ações comerciais e lojistas são o salão falando com o mercado:
  // a mesma família da Suite, que é o WhatsApp em escala. Vão juntas no
  // Completo para o plano ter um tema inteiro, e não um aplicativo solto.
  // ATENÇÃO: só as telas DE DENTRO do painel entram aqui. A página pública
  // /vitrine/[token] fica fora de propósito — quem a abre é a cliente do
  // salão, que não tem login e não pode levar um bloqueio na cara.
  { prefixo: '/salon/acoes-comerciais', chave: 'suite' },
  { prefixo: '/salon/lojistas', chave: 'suite' },
  { prefixo: '/api/salon/lojistas', chave: 'suite' },
  { prefixo: '/api/salon/acoes-comerciais', chave: 'suite' },
]

export function moduloExigidoPelaRota(pathname: string): ChaveModulo | null {
  const hit = ROTAS_POR_MODULO.find(r => pathname.startsWith(r.prefixo))
  return hit ? hit.chave : null
}
