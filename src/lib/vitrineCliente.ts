// Peças de apoio da vitrine do cliente (client-safe: sem Supabase aqui).

export interface AcaoPublica {
  id: string
  titulo: string
  descricao: string
  categoria: string
  status: string
  capa: string | null
  /** Ja formatado pelo servidor — ver precoDaCampanha em lib/acoesComerciais. */
  preco?: { de: string | null; por: string; parcela: string | null; descontoPct: number | null } | null
  dataInicio?: string
  dataFim?: string
}

export interface HorarioAtendimento { abertura: string; fechamento: string }

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
  /** Faixa de atendimento do salão; null usa o padrão. */
  horario?: HorarioAtendimento | null
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
// Faixa de atendimento.
//
// 7h–23h era o padrão para caber qualquer salão, mas cada um abre a sua hora
// e a cliente pedia horário que não existe. Agora vem da configuração do link;
// estes valores ficam só para quem ainda não configurou.
export const ABERTURA_PADRAO = '07:00'
export const FECHAMENTO_PADRAO = '23:00'

/** 'HH:MM' em minutos desde a meia-noite; -1 quando não dá para ler. */
function emMinutos(hhmm: string): number {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return -1
  const h = Number(m[1]), min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return -1
  return h * 60 + min
}

export function horariosDoDia(abertura?: string, fechamento?: string): string[] {
  let ini = emMinutos(abertura || ABERTURA_PADRAO)
  let fim = emMinutos(fechamento || FECHAMENTO_PADRAO)
  // Faixa impossível (invertida ou mal digitada) volta para o padrão em vez
  // de devolver lista vazia: sem horário nenhum, ninguém consegue agendar.
  if (ini < 0 || fim < 0 || fim <= ini) {
    ini = emMinutos(ABERTURA_PADRAO)
    fim = emMinutos(FECHAMENTO_PADRAO)
  }
  const out: string[] = []
  // De 30 em 30, começando na abertura: salão que abre 9:30 tem 9:30, 10:00…
  for (let t = ini; t <= fim; t += 30) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)
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

  linhas.push('')
  linhas.push('Tem disponibilidade para esses agendamentos?')
  return linhas.join('\n')
}

export function linkWhatsapp(numero: string | null, texto: string): string {
  const msg = encodeURIComponent(texto)
  return numero ? `https://wa.me/${numero}?text=${msg}` : `https://wa.me/?text=${msg}`
}
