// ─────────────────────────────────────────────────────────────────────────────
// SALÃO MODELO
//
// Um salão é marcado como MODELO (saloes.is_modelo). Ele é a fonte da
// ESTRUTURA que os outros salões recebem:
//   · salão novo NASCE com a estrutura do modelo (cópia na criação);
//   · salão que já existe RECEBE UM AVISO e decide se aplica.
//
// ── A regra que não pode ser quebrada ───────────────────────────────────────
// Só viaja ESTRUTURA (quais páginas/check lists/categorias existem).
// NUNCA viaja PREENCHIMENTO (o que foi marcado, os preços, os profissionais,
// os clientes). Em julho/2026 dado do Rouge vazou para salões novos porque a
// estrutura vinha junto com o conteúdo — por isso aqui a lista é ALLOWLIST:
// o que não estiver listado abaixo simplesmente não é copiado. Esquecer uma
// chave deixa o modelo incompleto; o contrário vazaria dado de cliente.
// ─────────────────────────────────────────────────────────────────────────────

/** Como limpar o preenchimento antes de copiar. */
export type Sanitizador =
  | 'inteiro'      // copia como está (é só estrutura)
  | 'checklist'    // tira marcações: feito / feito_em / historico
  | 'gradeVazia'   // mantém títulos e cabeçalhos, zera as linhas

export interface ChaveModelo {
  chave: string           // nome exato, ou prefixo quando `prefixo: true`
  prefixo?: boolean
  como: Sanitizador
  rotulo: string          // como aparece na tela do painel master
}

// ── ESTRUTURA: isto o modelo distribui ──────────────────────────────────────
export const CHAVES_MODELO: ChaveModelo[] = [
  // Navegação e organização
  { chave: 'menu_estrutura', como: 'inteiro', rotulo: 'Estrutura do menu' },
  { chave: 'menu_links', como: 'inteiro', rotulo: 'Links do menu' },
  { chave: 'organograma', como: 'inteiro', rotulo: 'Organograma dos setores' },

  // Check lists — a estrutura vai, as marcações ficam
  { chave: 'checklist', como: 'checklist', rotulo: 'Check list do salão' },
  { chave: 'checklist_coordenacao', como: 'checklist', rotulo: 'Check list — Coordenação' },
  { chave: 'checklist_manutencao', como: 'checklist', rotulo: 'Check list — Manutenção Predial' },
  { chave: 'checklist_processos', como: 'checklist', rotulo: 'Check list — Processos & Qualidade' },
  { chave: 'checklist_contabilidade', como: 'checklist', rotulo: 'Check list — Contabilidade' },
  { chave: 'demanda_checklist_administrativo', como: 'checklist', rotulo: 'Check list — Administrativo' },

  // Páginas de procedimento (manual_<setor>)
  { chave: 'manual_', prefixo: true, como: 'inteiro', rotulo: 'Páginas de procedimento' },

  // POPs e documentos padrão
  { chave: 'pop_', prefixo: true, como: 'inteiro', rotulo: 'POPs' },

  // Catálogos e modelos de trabalho
  { chave: 'avaliacao_modelo', como: 'inteiro', rotulo: 'Modelo de avaliação' },
  { chave: 'prof_categorias', como: 'inteiro', rotulo: 'Categorias de profissional' },
  { chave: 'plano_carreira_pj', como: 'inteiro', rotulo: 'Plano de carreira (estrutura)' },
  { chave: 'escala_config', como: 'inteiro', rotulo: 'Configuração da escala' },
  { chave: 'enxovais_config', como: 'inteiro', rotulo: 'Configuração de enxovais' },
  { chave: 'kits_config', como: 'inteiro', rotulo: 'Configuração de kits' },
  { chave: 'lojistas_config', como: 'inteiro', rotulo: 'Configuração de lojistas' },
  { chave: 'lojistas_segmentos', como: 'inteiro', rotulo: 'Segmentos de lojistas' },
  { chave: 'lojistas_servicos', como: 'inteiro', rotulo: 'Serviços para lojistas' },
  { chave: 'planejamento_estrutura', como: 'inteiro', rotulo: 'Planejamento estratégico (estrutura)' },
]

// ── O QUE NUNCA VIAJA ───────────────────────────────────────────────────────
// Regra virou: TUDO vai para o salão novo — o dono decide o que usar. As
// planilhas e listas chegam EM BRANCO (só títulos e cabeçalhos), então ele
// recebe a página pronta para preencher, sem o conteúdo de ninguém.
//
// A exceção abaixo é o que não é molde de jeito nenhum: é dado de pessoa,
// dinheiro ou identidade. Isso não tem versão "em branco" que faça sentido,
// e ver o conteúdo de outro salão aqui seria grave.
const NUNCA: { chave: string; prefixo?: boolean; motivo: string }[] = [
  { chave: 'senhas', prefixo: true, motivo: 'senhas do salão' },
  { chave: 'grid_senhas', prefixo: true, motivo: 'senhas do salão' },
  { chave: 'logo_salao', prefixo: true, motivo: 'identidade visual' },
  { chave: 'grid_logo_salao', prefixo: true, motivo: 'identidade visual' },
  { chave: 'landing_config', motivo: 'página pública do salão' },
  { chave: 'curriculos', prefixo: true, motivo: 'currículos de pessoas reais' },
  { chave: 'notificacoes_prof', motivo: 'avisos para a equipe dele' },
  { chave: 'mural_avisos', motivo: 'recados internos' },
  { chave: 'esterilizacao_fluxo', motivo: 'movimento do dia a dia' },
  { chave: 'boletos_pagos', motivo: 'financeiro' },
  { chave: 'acesso_oculto_global', motivo: 'permissões da equipe dele' },
]
// Trechos que denunciam dado de gente/dinheiro em qualquer chave.
const NUNCA_CONTEM = [
  'avaliacao_pop_', 'feedback_msg_', 'plano_carreira_prof_',
  'comissoes_quinzenas', 'conferencia_caixas', 'licencas_contratos',
]

/** Texto para o painel master explicar o que fica de fora. */
export const NUNCA_COPIA = [
  'Folhas do mês (terminam em _AAAA-MM): o movimento de cada salão',
  'Senhas do salão',
  'Logo e página pública (identidade visual)',
  'Currículos, avaliações de profissionais e mensagens de clientes',
  'Comissões, conferência de caixas, boletos e licenças/contratos',
  'Avisos da equipe, mural e permissões',
  'Todo o resto VIAJA — planilhas e listas chegam em branco, prontas para preencher',
]

/** Chave mensal (folha do mês) — sempre preenchimento. */
// Cobre `_2026-08` e variações com sufixo de quinzena (`_2026-08_q1`).
const ehMensal = (chave: string) => /_\d{4}-\d{2}(_q\d)?$/.test(chave)

// As grades editáveis (/api/salon/grid) gravam com o namespace `grid_`:
// `checklist` vira `grid_checklist` no banco. Para casar com a lista acima
// o prefixo é retirado só na COMPARAÇÃO — a cópia mantém o nome original.
const semNamespace = (chave: string) => chave.startsWith('grid_') ? chave.slice(5) : chave

/** Nome legível para uma chave que não está no catálogo (vai em branco). */
function rotuloGenerico(c: string): string {
  const limpo = c.replace(/_/g, ' ').trim()
  return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : c
}

/**
 * O que fazer com a chave: viajar inteira, viajar em branco, ou não viajar.
 *
 * A regra é "TUDO viaja" — o dono do salão novo decide o que usar. Só não
 * viaja o que é dado de pessoa, dinheiro ou identidade (NUNCA/NUNCA_CONTEM),
 * e as folhas do mês. O que não está no catálogo de estrutura viaja EM BRANCO:
 * a página chega montada, sem o conteúdo do salão de origem.
 */
export function regraDaChave(chave: string): ChaveModelo | null {
  if (!chave || ehMensal(chave)) return null
  const c = semNamespace(chave)
  if (ehMensal(c)) return null

  // 1) Dado de gente / dinheiro / identidade — não viaja de forma alguma
  if (NUNCA_CONTEM.some(t => chave.includes(t))) return null
  for (const n of NUNCA) {
    if (n.prefixo ? (chave.startsWith(n.chave) || c.startsWith(n.chave)) : (chave === n.chave || c === n.chave)) return null
  }

  // 2) Estrutura conhecida — viaja inteira (check list sem as marcações)
  for (const r of CHAVES_MODELO) {
    if (r.prefixo ? c.startsWith(r.chave) : c === r.chave) return r
  }

  // 3) Todo o resto — viaja EM BRANCO
  return { chave: c, como: 'gradeVazia', rotulo: rotuloGenerico(c) }
}
export const ehChaveDoModelo = (chave: string) => !!regraDaChave(chave)

// ── Limpeza do preenchimento ────────────────────────────────────────────────

/** Tira de um doc de check list tudo que é marcação de execução. */
function limparChecklist(valor: any): any {
  if (!valor || !Array.isArray(valor.categorias)) return valor
  return {
    ...valor,
    categorias: valor.categorias.map((c: any) => ({
      ...c,
      demandas: (c.demandas || []).map((d: any) => {
        const { feito, feito_em, historico, ...resto } = d || {}
        return { ...resto, feito: false }
      }),
    })),
  }
}

/**
 * Esvazia o CONTEÚDO preservando o MOLDE.
 *
 * - Planilha (`tabelas`): mantém título, cabeçalho e larguras; as linhas vão
 *   em branco — o salão novo recebe a grade montada, pronta para preencher.
 * - Lista (`itens`, `registros`, `cards`, `linhas`): chega vazia.
 * - Documento (`texto`, `blocos`, `paginas`): vai INTEIRO. Aqui o texto é o
 *   molde — esvaziar uma carta modelo ou um processo entregaria papel em
 *   branco, que é o oposto do que se quer.
 */
const LISTAS_QUE_ESVAZIAM = ['itens', 'registros', 'cards', 'linhas', 'lista']

function limparGrade(valor: any): any {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return valor
  const out: any = { ...valor }

  if (Array.isArray(out.tabelas)) {
    out.tabelas = out.tabelas.map((t: any) => ({
      ...t,
      linhas: (t.linhas || []).map((l: any[]) => (l || []).map(() => ({ t: '' }))),
    }))
  }
  for (const campo of LISTAS_QUE_ESVAZIAM) {
    if (Array.isArray(out[campo])) out[campo] = []
  }
  return out
}

/** Valor pronto para viajar: estrutura sim, preenchimento não. */
export function sanitizar(chave: string, valor: any): any {
  const r = regraDaChave(chave)
  if (!r) return null
  const copia = JSON.parse(JSON.stringify(valor ?? null))
  if (r.como === 'checklist') return limparChecklist(copia)
  if (r.como === 'gradeVazia') return limparGrade(copia)
  return copia
}

// ── Versão do modelo ────────────────────────────────────────────────────────
// O salão guarda qual versão já aplicou; quando o modelo muda, ele vê o aviso.

/**
 * Assinatura do modelo — muda quando a estrutura muda.
 *
 * Sai das DATAS de alteração, não do conteúdo. Serializar os documentos
 * inteiros (os check lists passam de centenas de itens) deixava a criação
 * de salão lenta a ponto de o botão travar em "Salvando…". Toda gravação em
 * salao_config atualiza `atualizado_em`, então a data detecta mudança do
 * mesmo jeito — e a conta fica barata.
 */
export function versaoDoModelo(linhas: { chave: string; atualizado_em?: string | null }[]): string {
  const partes = linhas
    .filter(l => ehChaveDoModelo(l.chave))
    .map(l => `${l.chave}@${l.atualizado_em || ''}`)
    .sort()
  const base = partes.join('|')
  // hash curto e determinístico (djb2) — só precisa detectar mudança
  let h = 5381
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h + base.charCodeAt(i)) >>> 0
  return `${h.toString(36)}.${partes.length.toString(36)}`
}

/** O que mudaria no salão se ele aplicasse o modelo agora. */
export interface Diferenca { chave: string; rotulo: string; situacao: 'novo' | 'diferente' }

export function compararComModelo(
  modelo: { chave: string; valor: any }[],
  salao: { chave: string; valor: any }[],
): Diferenca[] {
  const doSalao = new Map(salao.map(l => [l.chave, l.valor]))
  const out: Diferenca[] = []
  for (const l of modelo) {
    const r = regraDaChave(l.chave)
    if (!r) continue
    const novo = sanitizar(l.chave, l.valor)
    if (!doSalao.has(l.chave)) { out.push({ chave: l.chave, rotulo: r.rotulo, situacao: 'novo' }); continue }
    if (JSON.stringify(doSalao.get(l.chave)) !== JSON.stringify(novo)) {
      out.push({ chave: l.chave, rotulo: r.rotulo, situacao: 'diferente' })
    }
  }
  return out
}
