// Catálogo das ÁREAS do portal do profissional (os cards de "Minhas Áreas").
// É a fonte única: a grade que a profissional vê, o painel global de acesso no
// salão principal e a fusão feita na API leem esta lista. Card novo entra aqui
// e já aparece automaticamente no painel global — sem mexer em mais nada.
//
// `chave` = a mesma usada em acesso_oculto (por profissional) e em
// acesso_oculto_global (padrão do salão). O portal esconde a área quando
// QUALQUER um dos dois marcar como oculto.

export interface AreaPortal { chave: string; label: string }

export const AREAS_PORTAL: AreaPortal[] = [
  { chave: 'demandas',          label: 'Solicitação' },
  { chave: 'kits',              label: 'Kits Pé e Mão' },
  { chave: 'ester_fluxo',       label: 'Esterilização (solicitação)' },
  { chave: 'faturamento',       label: 'Faturamento' },
  { chave: 'metas',             label: 'Metas' },
  { chave: 'agendamentos',      label: 'Agendamentos' },
  { chave: 'desempenho',        label: 'Ocorrências' },
  { chave: 'dependencia',       label: 'Dependência (Faturamento Gerado)' },
  { chave: 'oportunidades',     label: 'Oportunidades' },
  { chave: 'bundle',            label: 'Combos que Vendem' },
  { chave: 'clientes-perdidos', label: 'Clientes Perdidos' },
  { chave: 'corrida',           label: 'Corrida Interna' },
  { chave: 'acoes',             label: 'Ações Comerciais' },
  { chave: 'avaliar',           label: 'Avaliações' },
  { chave: 'pops',              label: 'POPs & Avaliação' },
  { chave: 'ia',                label: 'IA / Assistente' },
  { chave: 'calendario_mkt',    label: 'Calendário' },
  { chave: 'cadastro',          label: 'Cadastro' },
  // Informações sensíveis dentro do resumo (não são cards, mas o salão pode ocultar)
  { chave: 'fat_acumulado',     label: 'Faturamento Acumulado (no resumo)' },
  { chave: 'ticket_medio',      label: 'Ticket Médio (no resumo)' },
  { chave: 'clientes_telefone', label: 'Telefone dos clientes (em Clientes Perdidos)' },
]

// Funde o padrão global do salão com a configuração individual do profissional.
// Uma área fica oculta quando o global OU o perfil a marcam como oculta.
export function fundirOcultos(
  global?: Record<string, boolean> | null,
  perfil?: Record<string, boolean> | null,
): Record<string, boolean> {
  const g = global && typeof global === 'object' ? global : {}
  const p = perfil && typeof perfil === 'object' ? perfil : {}
  const out: Record<string, boolean> = {}
  for (const k of new Set([...Object.keys(g), ...Object.keys(p)])) {
    if (g[k] || p[k]) out[k] = true
  }
  return out
}
