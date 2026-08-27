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
export function horariosDoDia(): string[] {
  const out: string[] = []
  for (let h = 0; h < 24; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    out.push(`${String(h).padStart(2, '0')}:30`)
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
  preco: string | null
  profissional: string | null
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

  // O `*` é o negrito do WhatsApp. Serviço e valor em negrito; o profissional
  // fica em texto normal e recuado — o contraste é o que faz ele se destacar
  // sem competir com o procedimento. Linha em branco entre os itens para a
  // recepção separar um do outro de relance.
  dados.escolhas.forEach((e, i) => {
    const preco = e.preco ? ` — *${e.preco}*` : ''
    linhas.push(`• *${e.nome}*${preco}`)
    linhas.push(e.profissional
      ? `   com ${e.profissional}`
      : '   sem preferência de profissional')
    if (i < dados.escolhas.length - 1) linhas.push('')
  })

  if (dados.descricao?.trim()) {
    linhas.push('', dados.descricao.trim())
  }

  linhas.push('')
  linhas.push(`*Data: ${dataPorExtenso(dados.data)}*`)
  linhas.push(`*Horário: ${dados.hora}*`)
  linhas.push('')
  linhas.push('Tem disponibilidade para esses agendamentos?')
  return linhas.join('\n')
}

export function linkWhatsapp(numero: string | null, texto: string): string {
  const msg = encodeURIComponent(texto)
  return numero ? `https://wa.me/${numero}?text=${msg}` : `https://wa.me/?text=${msg}`
}
