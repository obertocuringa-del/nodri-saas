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

// ── PREENCHIMENTO: nunca sai do salão ───────────────────────────────────────
// Não é usado para decidir a cópia (a allowlist já basta) — está aqui para
// documentar e para o painel master conseguir explicar o que ficou de fora.
export const NUNCA_COPIA = [
  'Qualquer chave mensal (termina em _AAAA-MM): folhas do mês do salão',
  'avaliacao_pop_<profissional>: avaliações de gente real',
  'plano_carreira_prof_<profissional>: progresso individual',
  'feedback_msg_<id>: mensagens de clientes',
  'esterilizacao_fluxo, notificacoes_prof: movimento do dia a dia',
  'conferencia_caixas, comissoes_quinzenas, acoes_comerciais: financeiro',
  'telefones, logo_salao, landing_config: identidade e contatos do salão',
  'escala_valores_padrao, calc_servicos_global: valores em R$ do salão',
]

/** Chave mensal (folha do mês) — sempre preenchimento. */
// Cobre `_2026-08` e variações com sufixo de quinzena (`_2026-08_q1`).
const ehMensal = (chave: string) => /_\d{4}-\d{2}(_q\d)?$/.test(chave)

// As grades editáveis (/api/salon/grid) gravam com o namespace `grid_`:
// `checklist` vira `grid_checklist` no banco. Para casar com a lista acima
// o prefixo é retirado só na COMPARAÇÃO — a cópia mantém o nome original.
const semNamespace = (chave: string) => chave.startsWith('grid_') ? chave.slice(5) : chave

/** A chave faz parte da estrutura que o modelo distribui? */
export function regraDaChave(chave: string): ChaveModelo | null {
  if (!chave || ehMensal(chave)) return null
  const c = semNamespace(chave)
  if (ehMensal(c)) return null
  for (const r of CHAVES_MODELO) {
    if (r.prefixo ? c.startsWith(r.chave) : c === r.chave) return r
  }
  return null
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

/** Mantém títulos/cabeçalhos/larguras e devolve as linhas em branco. */
function limparGrade(valor: any): any {
  if (!valor || !Array.isArray(valor.tabelas)) return valor
  return {
    ...valor,
    tabelas: valor.tabelas.map((t: any) => ({
      ...t,
      linhas: (t.linhas || []).map((l: any[]) => (l || []).map(() => ({ t: '' }))),
    })),
  }
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

/** Assinatura estável do conteúdo — muda quando a estrutura muda. */
export function versaoDoModelo(linhas: { chave: string; valor: any }[]): string {
  const base = linhas
    .filter(l => ehChaveDoModelo(l.chave))
    .map(l => `${l.chave}:${JSON.stringify(sanitizar(l.chave, l.valor))}`)
    .sort()
    .join('|')
  // hash curto e determinístico (djb2) — só precisa detectar mudança
  let h = 5381
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h + base.charCodeAt(i)) >>> 0
  return `${h.toString(36)}.${base.length.toString(36)}`
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
