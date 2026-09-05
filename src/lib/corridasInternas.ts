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
  /** Casas decimais no ranking. Sem isto, 1,4 serviço por cliente vira 1. */
  casas?: number
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
  { chave: 'serv_cliente', label: 'Serviços por cliente',   unidade: 'qtd', emoji: '', desc: 'Venda casada: quem faz a cliente sair com mais de um procedimento', casas: 2 },
  { chave: 'pct_meta',    label: '% da meta batida',        unidade: '%',   emoji: '', desc: 'Cada uma contra a própria meta — quem tem ticket menor disputa de igual para igual' },
  { chave: 'feedback_neg', label: 'Menos ocorrências (feedback)', unidade: 'qtd', emoji: '', desc: 'Ganha quem MENOS teve a ocorrência escolhida (atraso, falta…) no período', precisaOcorrido: true, inversa: true },
]

/** As que aparecem ao criar uma corrida — as ocultas seguem só para ler. */
export const METRICAS_ESCOLHIVEIS = METRICAS_CORRIDA.filter(m => !m.oculta)

export function metricaInfo(m: MetricaCorrida): MetricaInfo {
  return METRICAS_CORRIDA.find(x => x.chave === m) || METRICAS_CORRIDA[0]
}

/**
 * Uma doacao de excedente na corrida em grupo.
 *
 * Nao move dinheiro nem faturamento: e um gesto dentro do grafico. Quem passou
 * da propria meta empresta a sobra para uma colega que ainda nao bateu, para o
 * grupo fechar junto. Por isso a producao de quem doa continua inteira na
 * coluna dela -- encolher a barra de quem mais produziu seria punir o gesto.
 */
export interface DoacaoMeta {
  de: string      // profId de quem doou
  para: string    // profId de quem recebeu
  valor: number
  em: number
  /**
   * Nasceu de sobra simulada.
   *
   * A simulação vive só na tela do dono, mas a doação é gravada na corrida e
   * valeria para todo mundo — a profissional veria no portal que ganhou de uma
   * colega que, no número real, não produziu nada. Marcada assim, ela não sai
   * do servidor para o portal e some junto com a simulação que a criou.
   */
  teste?: boolean
}

export interface CorridaInterna {
  id: string
  titulo: string
  /**
   * 'ranking' (padrao) e a disputa de sempre: uma metrica, um alvo unico, um
   * primeiro lugar. 'grupo' vira a corrida do avesso -- nao ha vencedor, cada
   * uma corre contra a PROPRIA meta (a mesma do perfil dela) e o placar e do
   * conjunto.
   *
   * O campo e opcional de proposito: toda corrida ja gravada nao tem 'modo', e
   * ausente tem de continuar significando 'ranking'. Um default obrigatorio
   * reescreveria disputas antigas.
   */
  modo?: 'ranking' | 'grupo'
  doacoes?: DoacaoMeta[]
  /**
   * Faturamento de mentira, por profissional, para o dono testar o gráfico.
   *
   * Só vale na tela do salão: o servidor não aplica simulação para o
   * profissional. Se aplicasse, ela abriria o portal e veria um número
   * inventado sobre o próprio trabalho, sem forma de saber que é teste.
   */
  simulacoes?: Record<string, number>
  descricao?: string          // regra / observação livre (opcional) — APARECE no portal
  /**
   * Recado do gerente para ele mesmo. NÃO aparece no portal.
   *
   * Separado de `descricao` de propósito: aquela é a regra da disputa, escrita
   * para as profissionais lerem. Esta é a anotação de bastidor ("combinar o
   * prêmio com a dona", "a Vera entrou no meio do mês"), e é podada no servidor
   * antes de a resposta sair — esconder só na tela deixaria o texto no
   * navegador de quem abrisse o inspetor.
   */
  observacaoInterna?: string
  metrica: MetricaCorrida
  servico?: string            // usado quando metrica === 'servico'
  ocorrido?: string           // usado quando metrica === 'feedback_neg'
  de: string                  // 'YYYY-MM'
  ate: string                 // 'YYYY-MM'
  premio?: string             // texto do prêmio (opcional)
  meta?: number               // meta a bater (opcional) — mostra % e "bateu"
  /**
   * Cada uma corre contra a PROPRIA meta, sem deixar de ser ranking.
   *
   * A corrida em grupo ja fazia isso, mas ali nao ha vencedor. Aqui a disputa
   * continua: ordena por faturamento, ha 1o lugar — so que "bateu" passa a ser
   * a meta DELA, e nao um numero unico. E o unico jeito honesto de premiar
   * quando as metas sao diferentes: com alvo unico, quem tem meta menor nunca
   * ganha e quem tem meta maior ganha sem esforco.
   *
   * A meta vem da mesma fonte do card do perfil: a manual manda; vazia, vale a
   * redistribuida automatica. Some com `meta` (o alvo unico) quando ligada.
   */
  metaIndividual?: boolean
  /**
   * Dias que cada uma realmente TRABALHA no mes, por profissional.
   *
   * Sem isto o "quanto por dia" divide pelos dias do calendario e mente: a
   * manicure trabalha dois domingos e folga um dia por semana, entao setembro
   * tem 30 dias mas ela trabalha uns 24. Dividir por 30 da uma meta diaria
   * menor do que a real, e ela chega no fim do mes achando que estava no ritmo.
   *
   * Numero digitado, e nao calculado da folga do cadastro, porque a folga muda
   * (troca de escala, feriado, falta combinada) e quem sabe o mes que vem e a
   * gerencia, nao a tabela.
   */
  diasTrabalho?: Record<string, number>
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
  // ── Só no modo grupo ──
  metaPessoal?: number        // a meta DELA no período (manual, ou a redistribuída)
  excedente?: number          // quanto passou da própria meta (0 se não passou)
  doado?: number              // quanto já entregou para colegas
  recebido?: number           // quanto ganhou de colegas
  /**
   * A geometria do gráfico, em % da própria meta.
   *
   * O desenho sai daqui e NÃO de `valor / metaPessoal`, porque no portal do
   * profissional os reais dos colegas nem chegam ao navegador. Percentual não
   * entrega quanto a colega ganha; a divisão de dois reais, sim.
   */
  pctProprio?: number         // o que ela mesma produziu
  pctRecebidoMeta?: number    // o que veio de colega
  pctDoadoMeta?: number       // o que ela já entregou
  /** Os valores em R$ desta linha foram omitidos (é de outra pessoa). */
  valorOculto?: boolean
  /** Este faturamento é simulado — não veio do relatório. */
  simulado?: boolean
  /** Dias de trabalho no mês desta pessoa (só na linha dela, no portal). */
  diasTrabalho?: number
}

/**
 * O ritmo que falta: quanto ainda tem de sair, em quantos dias, por dia.
 *
 * Só faz sentido enquanto o mês corre — corrida que ainda não começou não tem
 * ritmo, e a que acabou não tem mais o que correr atrás. Nesses casos devolve
 * `null` e a tela não desenha o bloco, em vez de mostrar "faltam 0 dias".
 *
 * `diasTrabalho` é o total de dias que ela trabalha no mês. Os que ainda faltam
 * saem proporcionalmente ao que resta do calendário: é aproximação, e por isso
 * a tela diz "dias de trabalho que faltam" e não finge precisão de escala.
 */
export function ritmoQueFalta(
  meta: number, feito: number, diasTrabalho?: number, hoje = new Date(),
): { falta: number; dias: number; porDia: number; estimado: boolean } | null {
  if (!(meta > 0)) return null
  const falta = Math.max(meta - feito, 0)

  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()

  // MESMA conta da tela de Metas do perfil (metasAnalitico): o dia de hoje NAO
  // entra. Contar hoje daria 26 onde a outra tela diz 25, e a mesma pessoa
  // veria dois "dias restantes" diferentes para o mesmo mes — a partir dai ela
  // para de confiar nos dois numeros, nao so no errado.
  const corridosQueFaltam = Math.max(diasNoMes - hoje.getDate(), 0)

  const total = Number(diasTrabalho) || 0
  const estimado = total > 0
  const dias = estimado
    ? Math.round((total * corridosQueFaltam) / diasNoMes)
    : corridosQueFaltam

  // Ultimo dia do mes: nao ha "por dia", ha o que falta. Dividir por zero ou
  // por um dia inventado daria um numero que nao ajuda ninguem.
  return { falta, dias, porDia: dias > 0 ? falta / dias : falta, estimado }
}

/** O mês de hoje cai dentro do período da corrida? */
export function mesCorrente(c: CorridaInterna, hoje = new Date()): boolean {
  const ym = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  return (!c.de || c.de <= ym) && (!c.ate || c.ate >= ym)
}

export interface ResumoGrupo {
  /** Ausentes no portal do profissional: os dois juntos revelam o R$ do grupo. */
  metaTotal?: number
  produzido?: number
  pct: number
  bateram: number
  participantes: number
}

/**
 * Placar do conjunto.
 *
 * `produzido` soma só o que cada uma produziu de fato — doação NÃO entra. Uma
 * doação move altura entre duas colunas; se ela também somasse aqui, o grupo
 * apareceria mais perto da meta só por ter movido número de lado.
 */
export function resumoGrupo(linhas: LinhaRanking[]): ResumoGrupo {
  let metaTotal = 0, produzido = 0, bateram = 0
  for (const l of linhas) {
    metaTotal += Number(l.metaPessoal || 0)
    produzido += Number(l.valor || 0)
    if (l.bateuMeta) bateram++
  }
  return {
    metaTotal, produzido,
    pct: metaTotal > 0 ? (produzido / metaTotal) * 100 : 0,
    bateram, participantes: linhas.length,
  }
}

/** Excedente que a pessoa ainda pode entregar (o que passou da meta, menos o já doado). */
export function sobraDisponivel(l: LinhaRanking): number {
  return Math.max(Number(l.excedente || 0) - Number(l.doado || 0), 0)
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
  // Arredondar para inteiro empatava metade do ranking em "1" quando a métrica
  // é uma média — e aí não dá para ver por que um está na frente do outro.
  const casas = info.casas ?? 0
  return (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export const MEDALHAS = ['', '', '']

export const ridC = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
