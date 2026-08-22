// ─────────────────────────────────────────────────────────────────────────────
// PARA ONDE UM ITEM DO CHECK LIST PODE SER MANDADO
//
// Os check lists do salão não moram todos no mesmo documento. Uns são
// CATEGORIAS de `checklist` (Abertura, Gerente, Dosagem...) e outros são
// documentos próprios (`checklist_coordenacao`, `checklist_processos`...).
//
// Dentro do MESMO documento o botão "Mover para..." já resolvia — é por isso
// que a Gerência conseguia mandar item para Limpeza, mas a Coordenação não
// conseguia mandar para lugar nenhum: o check list dela vive em outra chave.
//
// Esta tabela é o mapa que faltava. Ela repete o que `ferramentasSetor.tsx`
// monta na tela; se um check list novo for criado lá, precisa entrar aqui
// também, senão ele não aparece como destino.
// ─────────────────────────────────────────────────────────────────────────────

export type CatPadrao = { nome: string; itens: { texto: string; freq?: string }[] }

export interface DestinoChecklist {
  id: string
  /**
   * Como o documento guarda os dados. 'categorias' e o formato do
   * ChecklistPainel (item com periodo proprio e data de feito). 'blocos' e o
   * do Administrativo: o periodo e do bloco, e o item tem data e observacao.
   * Reescrever a tela dele so para uniformizar custaria os dados de quem ja
   * usa, entao o envio fala os dois.
   */
  formato?: 'categorias' | 'blocos'
  /** Nome do setor como a pessoa conhece — é o que aparece no menu. */
  label: string
  /** Documento no salao_config. */
  chave: string
  /** Categoria dentro do documento. Vazio = documento inteiro é do setor. */
  categoria?: string
  /**
   * Lista que o setor recebe quando abre o check list pela primeira vez.
   * Só é usada se o documento ainda não existir: sem isso, mandar um item para
   * um setor que nunca abriu a tela dele apagaria a lista-padrão que ele
   * receberia. Carregada sob demanda porque são arquivos grandes.
   */
  carregarPadrao?: () => Promise<CatPadrao[]>
  /** Mesma ideia do `carregarPadrao`, para os destinos em formato de blocos. */
  carregarPadraoBlocos?: () => Promise<BlocoDestino[]>
}

export interface ItemDestino { id: string; texto: string; feito?: boolean; data?: string; obs?: string }
export interface BlocoDestino { id: string; titulo: string; freq: string; itens: ItemDestino[] }

export const DESTINOS_CHECKLIST: DestinoChecklist[] = [
  // ── categorias de `checklist` ──
  { id: 'ck_abertura', label: 'Recepção — Abertura', chave: 'checklist', categoria: 'Abertura' },
  { id: 'ck_intermediario', label: 'Recepção — Intermediário', chave: 'checklist', categoria: 'Intermediário' },
  { id: 'ck_fechamento', label: 'Recepção — Fechamento', chave: 'checklist', categoria: 'Fechamento' },
  { id: 'ck_manutencao', label: 'Serviços Gerais / Limpeza', chave: 'checklist', categoria: 'Manutenção / Limpeza' },
  { id: 'ck_dosagem', label: 'Dosagem', chave: 'checklist', categoria: 'Dosagem' },
  { id: 'ck_gerente', label: 'Gerência', chave: 'checklist', categoria: 'Gerente' },
  { id: 'ck_coordenado', label: 'Coordenado', chave: 'checklist', categoria: 'Coordenado' },
  { id: 'ck_padrao', label: 'Padrão de Atendimento', chave: 'checklist', categoria: 'Padrão de Atendimento' },

  // ── documentos próprios ──
  {
    id: 'ck_manut_predial', label: 'Manutenção Predial', chave: 'checklist_manutencao',
    carregarPadrao: () => import('@/lib/checklistManutencaoDefaults').then(m => m.CHECKLIST_MANUTENCAO as CatPadrao[]),
  },
  {
    id: 'ck_coordenacao', label: 'Coordenação Operacional', chave: 'checklist_coordenacao',
    carregarPadrao: () => import('@/lib/checklistCoordenacaoDefaults').then(m => m.CHECKLIST_COORDENACAO as CatPadrao[]),
  },
  {
    id: 'ck_processos', label: 'Processos & Qualidade', chave: 'checklist_processos',
    carregarPadrao: () => import('@/lib/checklistProcessosDefaults').then(m => m.CHECKLIST_PROCESSOS as CatPadrao[]),
  },
  {
    id: 'ck_financeiro', label: 'Financeiro / Contabilidade', chave: 'checklist_financeiro',
    carregarPadrao: () => import('@/lib/checklistFinanceiroDefaults').then(m => m.CHECKLIST_FINANCEIRO as CatPadrao[]),
  },

  {
    id: 'ck_rh', label: 'RH', chave: 'checklist_rh',
    carregarPadrao: () => import('@/lib/checklistSetoresDefaults').then(m => m.CHECKLIST_RH as CatPadrao[]),
  },
  {
    id: 'ck_comercial', label: 'Comercial', chave: 'checklist_comercial',
    carregarPadrao: () => import('@/lib/checklistSetoresDefaults').then(m => m.CHECKLIST_COMERCIAL as CatPadrao[]),
  },
  {
    id: 'ck_marketing', label: 'Marketing', chave: 'checklist_marketing',
    carregarPadrao: () => import('@/lib/checklistSetoresDefaults').then(m => m.CHECKLIST_MARKETING as CatPadrao[]),
  },
  {
    id: 'ck_tecnica', label: 'Responsável Técnica', chave: 'checklist_tecnica',
    carregarPadrao: () => import('@/lib/checklistSetoresDefaults').then(m => m.CHECKLIST_TECNICA as CatPadrao[]),
  },
  {
    id: 'ck_profissionais', label: 'Profissionais', chave: 'checklist_profissionais',
    carregarPadrao: () => import('@/lib/checklistSetoresDefaults').then(m => m.CHECKLIST_PROFISSIONAIS as CatPadrao[]),
  },
  // A copa nasce vazia de propósito (a rotina muda de salão para salão).
  { id: 'ck_cafe', label: 'Café / Copa', chave: 'checklist_cafe', carregarPadrao: async () => [] },
  {
    id: 'ck_administrativo', label: 'Administrativo', chave: 'demanda_checklist_administrativo',
    formato: 'blocos',
    carregarPadraoBlocos: () => import('@/lib/checklistAdministrativoDefaults').then(m => m.CHECKLIST_ADMINISTRATIVO()),
  },
]

/** Categoria onde caem os itens recebidos num check list que é um documento
 *  inteiro — nesses não existe "a categoria do setor" para mirar. */
export const CATEGORIA_RECEBIDOS = 'RECEBIDOS DE OUTROS SETORES'
