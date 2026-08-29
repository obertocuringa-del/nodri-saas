// Módulo "Corridas Internas" — motor de competições entre os profissionais.
// O salão cria a corrida (título, métrica, período, prêmio) e o sistema monta o
// RANKING automático puxando os dados do relatório importado (relatorio_periodos).
// O profissional vê a corrida e sua posição no card "Corrida Interna" do portal.
// Client-safe: só tipos e helpers de formatação (o cálculo do ranking é no server).

// Métricas que o sistema consegue responder hoje (todas "quanto maior, melhor").
export type MetricaCorrida =
  | 'faturamento'
  | 'atendimentos'
  | 'clientes'
  | 'ticket'
  | 'produtos'
  | 'servico'
  | 'ocupacao'
  | 'novos'
  | 'serv_cliente'
  | 'pct_meta'
  | 'feedback_neg'

export interface MetricaInfo {
  chave: MetricaCorrida
  label: string
  unidade: 'R$' | 'qtd' | '%'
  desc: string
  precisaServico?: boolean
  /** Pede escolher um tipo de ocorrência do Feedback Profissional. */
  precisaOcorrido?: boolean
  /**
   * Menos é melhor.
   *
   * Vira a corrida do avesso em três pontos: ordena crescente, o "bateu" passa
   * a ser `valor <= meta` (aí a meta é um TETO, não um alvo) e quem não tem
   * nenhum registro entra no ranking em vez de ficar de fora — zero ocorrência
   * é o melhor resultado possível, e some-lo esconderia justo quem se quer
   * premiar.
   */
  inversa?: boolean
  /**
   * Sai do menu de corrida nova, mas continua calculando.
   *
   * Apagar a métrica da lista faria `metricaInfo` cair no primeiro item, e
   * uma corrida antiga passaria a ser exibida como se fosse de faturamento —
   * mudando o sentido de uma disputa já rodada.
   */
  oculta?: boolean
  emoji: string
}

export const METRICAS_CORRIDA: MetricaInfo[] = [
  { chave: 'faturamento', label: 'Faturamento',            unidade: 'R$',  emoji: '', desc: 'Quem mais faturou no período' },
  { chave: 'atendimentos', label: 'Atendimentos (serviços)', unidade: 'qtd', emoji: '', desc: 'Quem mais atendeu (nº de serviços realizados)', oculta: true },
  { chave: 'clientes',    label: 'Clientes atendidos',      unidade: 'qtd', emoji: '', desc: 'Total de clientes atendidos no período', oculta: true },
  { chave: 'ticket',      label: 'Ticket médio',            unidade: 'R$',  emoji: '', desc: 'Maior valor médio por atendimento' },
  { chave: 'produtos',    label: 'Produtos vendidos',       unidade: 'qtd', emoji: '', desc: 'Quem mais vendeu produtos de revenda' },
  { chave: 'servico',     label: 'Serviço específico',      unidade: 'qtd', emoji: '', desc: 'Quem mais vendeu UM serviço (você escolhe qual)', precisaServico: true },
  { chave: 'ocupacao',    label: 'Taxa de ocupação',        unidade: '%',   emoji: '', desc: 'Maior ocupação da agenda no período' },
  { chave: 'novos',       label: 'Clientes novos',          unidade: 'qtd', emoji: '', desc: 'Quem trouxe mais clientes novos (sem preferência)', oculta: true },
  { chave: 'serv_cliente', label: 'Serviços por cliente',   unidade: 'qtd', emoji: '', desc: 'Venda casada: quem faz a cliente sair com mais de um procedimento' },
  { chave: 'pct_meta',    label: '% da meta batida',        unidade: '%',   emoji: '', desc: 'Cada uma contra a própria meta — quem tem ticket menor disputa de igual para igual' },
  { chave: 'feedback_neg', label: 'Menos ocorrências (feedback)', unidade: 'qtd', emoji: '', desc: 'Ganha quem MENOS teve a ocorrência escolhida (atraso, falta…) no período', precisaOcorrido: true, inversa: true },
]

/** As que aparecem ao criar uma corrida — as ocultas seguem só para ler. */
export const METRICAS_ESCOLHIVEIS = METRICAS_CORRIDA.filter(m => !m.oculta)

export function metricaInfo(m: MetricaCorrida): MetricaInfo {
  return METRICAS_CORRIDA.find(x => x.chave === m) || METRICAS_CORRIDA[0]
}

export interface CorridaInterna {
  id: string
  titulo: string
  descricao?: string          // regra / observação livre (opcional)
  metrica: MetricaCorrida
  servico?: string            // usado quando metrica === 'servico'
  ocorrido?: string           // usado quando metrica === 'feedback_neg'
  de: string                  // 'YYYY-MM'
  ate: string                 // 'YYYY-MM'
  premio?: string             // texto do prêmio (opcional)
  meta?: number               // meta a bater (opcional) — mostra % e "bateu"
  participantes?: string[]    // ids de profissionais; vazio/undefined = todos
  topPremiado?: number        // tamanho do pódio destacado (default 3)
  ocultarValores?: boolean    // esconder os números dos colegas (só posição)
  ativa: boolean              // publicada (aparece para o profissional)
  criadoEm: number
}

export interface LinhaRanking {
  profId: string
  nome: string
  valor: number
  pos: number                 // 1, 2, 3...
  bateuMeta?: boolean
  pctMeta?: number | null     // % da meta (quando há meta)
}

export type StatusCorrida = 'ativa' | 'agendada' | 'encerrada' | 'inativa'

export const STATUS_CORRIDA: Record<StatusCorrida, { label: string; bg: string; cor: string }> = {
  ativa:     { label: 'Em andamento', bg: '#16a34a22', cor: '#15803d' },
  agendada:  { label: 'Agendada',     bg: '#8b5cf622', cor: '#7c3aed' },
  encerrada: { label: 'Encerrada',    bg: '#6b728022', cor: '#4b5563' },
  inativa:   { label: 'Rascunho',     bg: '#9ca3af22', cor: '#6b7280' },
}

// Status derivado do publicado + período (comparando com o mês atual).
export function statusCorrida(c: CorridaInterna, hoje = new Date()): StatusCorrida {
  if (!c.ativa) return 'inativa'
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  if (c.de && c.de > mesAtual) return 'agendada'
  if (c.ate && c.ate < mesAtual) return 'encerrada'
  return 'ativa'
}

// 'YYYY-MM' → 'Jul/2026'
const MESES_ABR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
export function mesLabel(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '')
  if (!m) return ym || ''
  return `${MESES_ABR[Number(m[2]) - 1] || '?'}/${m[1]}`
}
export function periodoLabel(c: CorridaInterna): string {
  if (c.de && c.ate && c.de === c.ate) return mesLabel(c.de)
  return `${mesLabel(c.de)} → ${mesLabel(c.ate)}`
}

export function formataValor(m: MetricaCorrida, v: number): string {
  const info = metricaInfo(m)
  if (info.unidade === 'R$') {
    return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  if (info.unidade === '%') return `${Math.round(Number(v) || 0)}%`
  return (Math.round(Number(v) || 0)).toLocaleString('pt-BR')
}

export const MEDALHAS = ['', '', '']

export const ridC = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
