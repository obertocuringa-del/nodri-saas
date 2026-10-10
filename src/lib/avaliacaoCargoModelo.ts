import type { DocCargo } from '@/lib/descricaoCargoModelo'

// ── Avaliação 360 do cargo ─────────────────────────────────────────────────
//
// Avaliar um cargo é diferente de avaliar uma pessoa de fora. Aqui a régua
// é a própria descrição de cargo: cada ponto avaliado é um dever que já está
// escrito no documento, e por isso a nota tem onde se justificar.
//
// Três olhares sobre a mesma régua:
//   - autoavaliação (como a pessoa se vê),
//   - gerente (quem responde pelo resultado),
//   - equipe (quem convive com a entrega todo dia).
//
// O valor do 360 não está na média: está na DIFERENÇA entre os três. Quando
// a pessoa se dá 9 num ponto em que a equipe dá 5, isso é a conversa que
// precisa acontecer -- e é o que o painel de resultado destaca.

export type TipoAvaliador = 'auto' | 'gerente' | 'equipe'

export const TIPOS_AVALIADOR: Array<{ tipo: TipoAvaliador; rotulo: string; descricao: string }> = [
  { tipo: 'auto',    rotulo: 'Autoavaliação', descricao: 'A própria pessoa que ocupa o cargo.' },
  { tipo: 'gerente', rotulo: 'Gerente',       descricao: 'Quem responde pelo resultado da área.' },
  { tipo: 'equipe',  rotulo: 'Equipe',        descricao: 'Quem trabalha junto no dia a dia.' },
]

export const ROTULO_TIPO: Record<TipoAvaliador, string> = {
  auto: 'Autoavaliação', gerente: 'Gerente', equipe: 'Equipe',
}

export interface CriterioAval {
  id: string
  /** A pergunta como ela aparece para quem avalia. */
  texto: string
  /** Agrupa os pontos na tela. Vazio cai em "Geral". */
  secao: string
  /** Quem responde este ponto. Lista vazia = ninguém, e o ponto não aparece. */
  para: TipoAvaliador[]
  /**
   * Ponto NÃO NEGOCIÁVEL.
   *
   * Existe porque média esconde o que não pode ser escondido. Alguém com 8,4
   * de média e um 2 em "registra o valor que recebeu" não é uma pessoa boa
   * com um detalhe a corrigir -- e a média sozinha diria que é.
   *
   * Nota baixa aqui aparece em separado no resultado, fora da média, com a
   * justificativa de quem deu. Não decide nada por si: aponta o que precisa
   * ser apurado com fato, não com nota.
   */
  critico?: boolean
}

export interface FichaAval {
  cargo: string
  criterios: CriterioAval[]
  /** Texto de abertura que a pessoa lê antes de começar. */
  apresentacao?: string
  atualizado_em?: string
}

/** Uma avaliação aberta: a ficha fica CONGELADA aqui dentro, para que mexer
 *  nos critérios depois não mude o que já foi respondido. */
export interface RodadaAval {
  id: string
  setor_id: string
  cargo: string
  titulo: string
  /** Um link por papel: quem responde nao escolhe de onde avalia. */
  token_auto: string
  token_gerente: string
  token_equipe: string
  aberta: boolean
  avaliado: string | null
  ficha: FichaAval
  criado_em: string
  respostas?: RespostaAval[]
}

export interface RespostaAval {
  id: string
  tipo: TipoAvaliador
  avaliador: string | null
  notas: Record<string, number>
  observacoes: Record<string, string>
  comentario: string | null
  criado_em: string
}

export const NOTA_MIN = 0
export const NOTA_MAX = 10

/**
 * O que cada faixa da régua QUER DIZER.
 *
 * Sem isto, 0 a 10 é impressão: cada pessoa calibra de um jeito e a média
 * soma coisas diferentes. Quem é exigente dá 6 para quem quem é
 * complacente dá 9, e o número final não significa nada.
 *
 * As faixas falam de FREQUÊNCIA do comportamento, não de simpatia pela
 * pessoa -- é o que uma avaliação precisa sustentar se um dia for
 * questionada.
 */
export const FAIXAS_DA_NOTA: Array<{ de: number; ate: number; rotulo: string; ajuda: string }> = [
  { de: 9, ate: 10, rotulo: 'Sempre, e é referência', ajuda: 'Faz sem falhar e os outros aprendem olhando.' },
  { de: 7, ate: 8,  rotulo: 'Faz o combinado',        ajuda: 'Cumpre o esperado; falha é exceção rara.' },
  { de: 5, ate: 6,  rotulo: 'Oscila',                 ajuda: 'Às vezes sim, às vezes não — precisa de cobrança.' },
  { de: 3, ate: 4,  rotulo: 'Quase nunca',            ajuda: 'Falha mais do que acerta.' },
  { de: 0, ate: 2,  rotulo: 'Não acontece',           ajuda: 'O combinado não está sendo feito.' },
]

export function faixaDaNota(n: number) {
  return FAIXAS_DA_NOTA.find(f => n >= f.de && n <= f.ate) || null
}

/** Abaixo disto a nota pede justificativa: número sem fato não sustenta nada. */
export const NOTA_QUE_PEDE_MOTIVO = 4

export function novoIdCrit(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

const norm = (s: string) => (s || '').toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')

/** Tira o "Para realizar X, são necessárias..." e devolve só o dever. Os
 *  parágrafos técnicos da descrição têm o dever no TÍTULO; o corpo é a
 *  explicação, e explicação não vira pergunta de avaliação. */
function comoPergunta(bruto: string): string {
  let t = String(bruto || '').trim()
    .replace(/^[-••\s]+/, '')
    .replace(/\s*[.:;]+\s*$/, '')
  // "Conferir se as atividades..." / "Conferência de..." ficam como estão:
  // quem lê entende que a nota é sobre fazer aquilo bem feito.
  if (t.length > 160) t = t.slice(0, 157).trimEnd() + '…'
  return t
}

// ── Por que não existe gerador automático aqui ────────────────────────────
//
// Houve um: lia os deveres escritos na descrição de cargo e virava cada um
// num ponto de 0 a 10. Saiu em 10/10/2026, por decisão do dono depois de
// usar: "as perguntas vêm de forma nada a ver".
//
// O motivo é que descrição de cargo e ficha de avaliação parecem a mesma
// coisa e não são. A descrição diz o que o cargo FAZ; a ficha pergunta se a
// pessoa faz BEM. Virar uma na outra mecanicamente produz pergunta torta --
// "Operar caixa" não é uma pergunta, e um parágrafo técnico de quarenta
// linhas não vira nota.
//
// As fichas dos seis cargos foram escritas à mão, ponto a ponto, e vivem no
// banco. Quem quiser mudar edita na tela: dá para corrigir o texto,
// acrescentar, apagar e mudar de ordem.

export function fichaVazia(cargo: string): FichaAval {
  return { cargo, criterios: [] }
}

/** Ficha guardada pode vir torta ou de versão antiga. Normaliza sem perder. */
export function lerFicha(bruto: any, cargoPadrao: string): FichaAval {
  const cargo = String(bruto?.cargo || cargoPadrao || '').slice(0, 120)
  const brutos = Array.isArray(bruto?.criterios) ? bruto.criterios : []
  const criterios: CriterioAval[] = brutos.map((c: any) => {
    const para = (Array.isArray(c?.para) ? c.para : ['auto', 'gerente', 'equipe'])
      .filter((p: any) => p === 'auto' || p === 'gerente' || p === 'equipe')
    return {
      id: String(c?.id || novoIdCrit()),
      texto: String(c?.texto || ''),
      secao: String(c?.secao || 'Geral'),
      para: para.length ? para : (['auto', 'gerente', 'equipe'] as TipoAvaliador[]),
      critico: c?.critico === true,
    }
  }).filter((c: CriterioAval) => c.texto.trim())
  return {
    cargo, criterios,
    apresentacao: String(bruto?.apresentacao || ''),
    atualizado_em: bruto?.atualizado_em,
  }
}

/** Os critérios que um tipo de avaliador vê, já agrupados por seção e na
 *  ordem da ficha. Seção sem nenhum critério daquele tipo some. */
export function porSecao(ficha: FichaAval, tipo?: TipoAvaliador)
  : Array<{ secao: string; criterios: CriterioAval[] }> {
  const ordem: string[] = []
  const mapa = new Map<string, CriterioAval[]>()
  for (const c of ficha.criterios) {
    if (tipo && !c.para.includes(tipo)) continue
    const s = c.secao.trim() || 'Geral'
    if (!mapa.has(s)) { mapa.set(s, []); ordem.push(s) }
    mapa.get(s)!.push(c)
  }
  return ordem.map(s => ({ secao: s, criterios: mapa.get(s)! }))
}

// ── Contas ────────────────────────────────────────────────────────────────

export interface MediaCriterio {
  criterio: CriterioAval
  /** Média e quantos responderam, por tipo. Tipo sem resposta fica nulo. */
  por: Record<TipoAvaliador, { media: number; n: number } | null>
  /** Média de todas as respostas, de qualquer tipo. */
  geral: { media: number; n: number } | null
  /** Autoavaliação menos a média dos OUTROS. Positivo = se vê melhor do que
   *  os outros a veem. Nulo quando falta um dos dois lados. */
  diferenca: number | null
  /** A MENOR nota que alguém deu neste ponto, fora a autoavaliação. */
  menorDeFora: number | null
  /** Distância entre a maior e a menor nota. Média de 6 com dois 10 e dois 2
   *  não é a mesma coisa que quatro 6 -- a primeira é desacordo, e desacordo
   *  é informação, não ruído. */
  amplitude: number | null
  /** Ponto não negociável com nota baixa de alguém que não é a própria
   *  pessoa. É o que o resultado mostra em separado. */
  alertaCritico: boolean
}

const arred = (v: number) => Math.round(v * 10) / 10

function media(ns: number[]): { media: number; n: number } | null {
  if (!ns.length) return null
  return { media: arred(ns.reduce((a, b) => a + b, 0) / ns.length), n: ns.length }
}

export function calcular(ficha: FichaAval, respostas: RespostaAval[]): {
  linhas: MediaCriterio[]
  criticos: MediaCriterio[]
  geral: Record<TipoAvaliador, { media: number; n: number } | null>
  geralTotal: { media: number; n: number } | null
  respondentes: Record<TipoAvaliador, number>
} {
  const linhas: MediaCriterio[] = ficha.criterios.map(c => {
    const colhe = (t: TipoAvaliador) => respostas
      .filter(r => r.tipo === t)
      .map(r => r.notas?.[c.id])
      .filter((n): n is number => typeof n === 'number' && isFinite(n))

    const auto = media(colhe('auto'))
    const gerente = media(colhe('gerente'))
    const equipe = media(colhe('equipe'))
    const todas = [...colhe('auto'), ...colhe('gerente'), ...colhe('equipe')]
    const outras = [...colhe('gerente'), ...colhe('equipe')]
    const mOutras = media(outras)

    const menorDeFora = outras.length ? Math.min(...outras) : null
    const amplitude = todas.length > 1 ? arred(Math.max(...todas) - Math.min(...todas)) : null

    return {
      criterio: c,
      por: { auto, gerente, equipe },
      geral: media(todas),
      diferenca: auto && mOutras ? arred(auto.media - mOutras.media) : null,
      menorDeFora,
      amplitude,
      alertaCritico: !!c.critico && menorDeFora != null && menorDeFora <= NOTA_QUE_PEDE_MOTIVO,
    }
  })

  const notasDoTipo = (t: TipoAvaliador) => linhas
    .map(l => l.por[t]?.media).filter((v): v is number => typeof v === 'number')

  return {
    linhas,
    // Os não negociáveis que alguém de fora pontuou em baixo. Vão em
    // separado de propósito: a média não pode engolir isto.
    criticos: linhas.filter(l => l.alertaCritico),
    geral: {
      auto: media(notasDoTipo('auto')),
      gerente: media(notasDoTipo('gerente')),
      equipe: media(notasDoTipo('equipe')),
    },
    geralTotal: media(linhas.map(l => l.geral?.media).filter((v): v is number => typeof v === 'number')),
    respondentes: {
      auto: respostas.filter(r => r.tipo === 'auto').length,
      gerente: respostas.filter(r => r.tipo === 'gerente').length,
      equipe: respostas.filter(r => r.tipo === 'equipe').length,
    },
  }
}

/** Verde / âmbar / vermelho de uma nota. Usado na tela e na impressão. */
export function corDaNota(n: number | null | undefined): string {
  if (n == null) return '#9a948c'
  if (n >= 8) return '#2F6B4F'
  if (n >= 6) return '#b4830e'
  return '#b23a3a'
}

/** Token do link público. Curto o bastante para caber numa mensagem e longo
 *  o bastante para não se adivinhar — e é a UNICA coisa que diz ao servidor
 *  de que papel a resposta vem, por isso não pode ser deduzível a partir do
 *  token de outro papel da mesma rodada. */
export function novoToken(): string {
  const a = 'abcdefghijkmnopqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 22; i++) s += a[Math.floor(Math.random() * a.length)]
  return s
}
