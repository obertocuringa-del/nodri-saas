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

/** Um grupo de pontos propostos, para se escolher por bloco e não um a um. */
export interface GrupoProposto {
  rotulo: string
  criterios: CriterioAval[]
}

/**
 * Propõe os pontos de avaliação a partir da descrição de cargo, em GRUPOS.
 *
 * Em grupos porque descrição de cargo bem escrita é longa: a do Coordenador
 * Operacional do Rouge rende 103 pontos. Formulário de 103 perguntas não se
 * responde -- se abandona na vigésima. Então o gerador propõe e quem monta a
 * ficha escolhe quais blocos entram, com um clique por bloco em vez de cem.
 *
 * Regras, nesta ordem:
 *  - cada bloco de lista ou de permissão é um grupo, com o título dele;
 *  - os parágrafos COM TÍTULO que vêm seguidos formam um grupo só (nos
 *    parágrafos técnicos o título é a atividade e o corpo é a explicação
 *    dela, que não vira pergunta);
 *  - parágrafo sem título, destaque e divisor não viram ponto -- são
 *    princípio e contexto, não há o que notar de 0 a 10;
 *  - repetido sai, olhando o documento inteiro: "Organização" aparece na
 *    lista de deveres e de novo nas habilidades comportamentais, e avaliar
 *    duas vezes a mesma coisa infla a média e cansa quem responde.
 */
export function proporDaDescricao(doc: DocCargo): GrupoProposto[] {
  const grupos: GrupoProposto[] = []
  const vistos = new Set<string>()

  // Os parágrafos com título entram juntos, e o grupo só fecha quando vem
  // outra coisa pelo caminho.
  let correndo: CriterioAval[] = []
  const fecharCorrendo = () => {
    if (!correndo.length) return
    grupos.push({ rotulo: 'Atividades descritas em parágrafo', criterios: correndo })
    correndo = []
  }

  const guardar = (texto: string, secao: string): CriterioAval | null => {
    const limpo = comoPergunta(texto)
    if (!limpo) return null
    const k = norm(limpo)
    if (!k || vistos.has(k)) return null
    vistos.add(k)
    return { id: novoIdCrit(), texto: limpo, secao, para: ['auto', 'gerente', 'equipe'] }
  }

  for (const b of doc.blocos || []) {
    if (b.tipo === 'lista' || b.tipo === 'checklist') {
      fecharCorrendo()
      const rotulo = comoPergunta(b.titulo) || 'Deveres'
      const criterios = (b.itens || [])
        .map(i => guardar(i, rotulo))
        .filter((c): c is CriterioAval => !!c)
      if (criterios.length) grupos.push({ rotulo, criterios })
      continue
    }
    if (b.tipo === 'texto' && b.titulo.trim()) {
      const c = guardar(b.titulo, 'Atividades descritas em parágrafo')
      if (c) correndo.push(c)
      continue
    }
    // Destaque, divisor e parágrafo solto não propõem nada, mas cortam a
    // sequência de parágrafos: o que vem depois é outro assunto.
    fecharCorrendo()
  }
  fecharCorrendo()
  return grupos
}

/** Tudo de uma vez, achatado. Usado quando não há escolha a fazer. */
export function criteriosDaDescricao(doc: DocCargo): CriterioAval[] {
  return proporDaDescricao(doc).flatMap(g => g.criterios)
}

/** Avaliação boa é curta o bastante para a pessoa terminar com atenção. */
export const PONTOS_CONFORTAVEIS = 30

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
}

const arred = (v: number) => Math.round(v * 10) / 10

function media(ns: number[]): { media: number; n: number } | null {
  if (!ns.length) return null
  return { media: arred(ns.reduce((a, b) => a + b, 0) / ns.length), n: ns.length }
}

export function calcular(ficha: FichaAval, respostas: RespostaAval[]): {
  linhas: MediaCriterio[]
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

    return {
      criterio: c,
      por: { auto, gerente, equipe },
      geral: media(todas),
      diferenca: auto && mOutras ? arred(auto.media - mOutras.media) : null,
    }
  })

  const notasDoTipo = (t: TipoAvaliador) => linhas
    .map(l => l.por[t]?.media).filter((v): v is number => typeof v === 'number')

  return {
    linhas,
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
