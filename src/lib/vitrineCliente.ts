// Peças de apoio da vitrine do cliente (client-safe: sem Supabase aqui).

export interface AcaoPublica {
  id: string
  titulo: string
  descricao: string
  categoria: string
  status: string
  capa: string | null
  dataInicio?: string
  dataFim?: string
}

export interface ServicoPublico {
  id: string
  categoria: string
  nome: string
  precoFixo: number | null
  precoMin: number | null
  observacao: string | null
}

export interface ProfissionalPublico {
  id: string
  nome: string
  servicos: string[]
}

export interface DadosVitrine {
  salao: { nome: string; logo: string | null; whatsapp: string | null }
  acoes: AcaoPublica[]
  servicos: ServicoPublico[]
  profissionais: ProfissionalPublico[]
}

/** Preço como o cliente lê. Serviço sem preço não mostra "—" para ele: some. */
export function precoDoServico(s: ServicoPublico): string | null {
  if (s.precoFixo) return `R$ ${Number(s.precoFixo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  if (s.precoMin) return `A partir de R$ ${Number(s.precoMin).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  return null
}

export function agruparPorCategoria<T extends { categoria: string }>(itens: T[]): Array<[string, T[]]> {
  const mapa = new Map<string, T[]>()
  for (const i of itens) {
    const c = i.categoria || 'Outros'
    if (!mapa.has(c)) mapa.set(c, [])
    mapa.get(c)!.push(i)
  }
  return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
}

/** Horários de 30 em 30, das 00:00 às 23:30 — o salão acerta na conversa. */
// Salão nenhum atende de madrugada. A lista inteira do dia obrigava a rolar
// por doze horários impossíveis antes de chegar no primeiro que serve.
const PRIMEIRA_HORA = 7
const ULTIMA_HORA = 23

export function horariosDoDia(): string[] {
  const out: string[] = []
  for (let h = PRIMEIRA_HORA; h <= ULTIMA_HORA; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    // 23:30 fica de fora: o último horário é 23h em ponto.
    if (h < ULTIMA_HORA) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
}

export function dataPorExtenso(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(a, m - 1, d)
  const txt = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  // O pt-BR devolve o dia da semana em minúscula ("quinta-feira"). No começo
  // da linha isso parece erro de digitação, então a primeira letra sobe.
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export interface EscolhaAgendamento {
  /** id do serviço, ou `acao:<id>` quando é uma ação comercial */
  chave: string
  nome: string
  profissional: string | null
  /** A ressalva do serviço, quando existe: o que muda o valor ou fica de fora. */
  observacao?: string | null
}

/**
 * A mensagem que chega no WhatsApp do salão.
 *
 * Escrita para ser lida em dois segundos por quem está atendendo: uma linha
 * por procedimento, com a preferência de profissional do lado, e a data e a
 * hora no fim. Sem isso a recepção precisa perguntar tudo de novo, e o
 * agendamento pelo link deixa de economizar tempo.
 */
export function mensagemAgendamento(dados: {
  data: string
  hora: string
  escolhas: EscolhaAgendamento[]
  /** Detalhe da promocão, quando o pedido nasceu de uma. */
  descricao?: string
}): string {
  const linhas: string[] = []
  linhas.push('Olá! Gostaria de agendar:')
  linhas.push('')

  // O `*` é o negrito do WhatsApp. O procedimento em negrito; o profissional
  // fica em texto normal e recuado — o contraste é o que faz ele se destacar
  // sem competir com o procedimento. Linha em branco entre os itens para a
  // recepção separar um do outro de relance.
  //
  // O valor NÃO vai na mensagem, mesma razão de ele não aparecer na hora de
  // escolher: preço só na aba Preços, onde vem com o "a partir de" e a
  // ressalva que explica a variação. Solto no pedido ele vira combinado.
  dados.escolhas.forEach((e, i) => {
    linhas.push(`• *${e.nome}*`)
    linhas.push(e.profissional
      ? `   com ${e.profissional}`
      : '   sem preferência de profissional')
    if (i < dados.escolhas.length - 1) linhas.push('')
  })

  if (dados.descricao?.trim()) {
    linhas.push('', dados.descricao.trim())
  }

  linhas.push('')
  // Negrito só no rótulo: a linha inteira em negrito perde o destaque, e o
  // que precisa saltar é o que se procura de relance ("Data", "Horário").
  linhas.push(`*Data:* ${dataPorExtenso(dados.data)}`)
  linhas.push(`*Horário:* ${dados.hora}`)
  linhas.push('')
  // "Estou ciente de" — as ressalvas dos serviços escolhidos, escritas na
  // mensagem que a própria cliente manda.
  //
  // A observação já aparece na tabela de preços, mas ler lá e concordar aqui
  // são coisas diferentes: é aí que mora a discussão no caixa ("ninguém me
  // falou que a higienização era à parte"). Repetida no pedido, a ressalva sai
  // da boca da cliente, e não do salão.
  //
  // Fica depois de data e horário e antes da pergunta final: o que se lê por
  // último é o que se responde, e a pergunta é o fecho da mensagem.
  const ressalvas: string[] = []
  const jaDito = new Set<string>()
  for (const e of dados.escolhas) {
    const obs = (e.observacao || '').replace(/\s+/g, ' ').trim()
    if (!obs) continue
    // A mesma ressalva em dois serviços (a regra costuma valer para a
    // categoria inteira) rende uma linha só.
    const marca = `${e.nome}|${obs}`.toLowerCase()
    if (jaDito.has(marca)) continue
    jaDito.add(marca)
    ressalvas.push(`• ${e.nome}: ${obs}`)
  }
  if (ressalvas.length) {
    linhas.push('')
    linhas.push('Estou ciente de:')
    linhas.push(...ressalvas)
  }

  linhas.push('Tem disponibilidade para esses agendamentos?')
  return linhas.join('\n')
}

export function linkWhatsapp(numero: string | null, texto: string): string {
  const msg = encodeURIComponent(texto)
  return numero ? `https://wa.me/${numero}?text=${msg}` : `https://wa.me/?text=${msg}`
}
