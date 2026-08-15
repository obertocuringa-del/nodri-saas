// ── Critério de liberação do link do Google ─────────────────────────────────
//
// O salão só quer convidar para avaliar no Google quem saiu satisfeito. A
// regra não pode ficar amarrada a "a 1ª pergunta é a nota": cada salão edita,
// apaga e cria pergunta no próprio formulário, e uma regra por posição (ou
// por título) quebraria em silêncio no dia em que alguém renomeasse algo —
// ninguém perceberia, o link simplesmente pararia de aparecer.
//
// Por isso o critério mora NA PERGUNTA (`feedback_perguntas.criterio`).
// Pergunta sem critério não participa: não libera nem bloqueia.
//
// Só o que indica insatisfação bloqueia. Pergunta não respondida nunca
// bloqueia — quem pulou não reclamou.

export type TipoPergunta = 'escala' | 'multipla_escolha' | 'texto' | 'sim_nao' | 'grid'

export type Criterio =
  | { modo: 'escala_min'; min: number }        // nota do salão: 9 ou 10
  | { modo: 'opcoes_ok'; aceitas: string[] }   // só estas respostas liberam
  | { modo: 'grid_min'; min: number }          // cada serviço avaliado: 4 ou 5
  | { modo: 'sim_obrigatorio'; itens: string[] } // estes itens têm que ser SIM

export interface PerguntaComCriterio {
  id: string
  titulo: string
  tipo: TipoPergunta
  opcoes: string[]
  criterio?: Criterio | null
}

// Critério que faz sentido oferecer para cada tipo de pergunta.
export function modoPadraoDoTipo(tipo: TipoPergunta): Criterio | null {
  if (tipo === 'escala') return { modo: 'escala_min', min: 9 }
  if (tipo === 'multipla_escolha') return { modo: 'opcoes_ok', aceitas: [] }
  if (tipo === 'grid') return { modo: 'grid_min', min: 4 }
  if (tipo === 'sim_nao') return { modo: 'sim_obrigatorio', itens: [] }
  return null // texto não entra na regra
}

export interface Avaliacao {
  liberado: boolean
  /** O que bloqueou, para o salão conferir a regra na tela de configuração. */
  motivos: string[]
  /** Quantas perguntas realmente participaram da decisão. */
  criteriosAtivos: number
}

export function avaliarLiberacao(
  perguntas: PerguntaComCriterio[],
  respostas: Record<string, unknown>,
): Avaliacao {
  const motivos: string[] = []
  let criteriosAtivos = 0

  for (const p of perguntas) {
    const c = p.criterio
    if (!c) continue

    const resposta = respostas[p.id]
    // Não respondeu: não conta como insatisfação.
    if (resposta === undefined || resposta === null || resposta === '') continue

    criteriosAtivos++

    if (c.modo === 'escala_min') {
      const n = Number(resposta)
      if (!Number.isFinite(n) || n < c.min) motivos.push(`${p.titulo}: ${resposta}`)
      continue
    }

    if (c.modo === 'opcoes_ok') {
      // Lista vazia = o salão ainda não escolheu quais opções liberam. Nesse
      // estado a pergunta não bloqueia, senão a regra travaria tudo por
      // esquecimento de configuração.
      if (c.aceitas.length === 0) { criteriosAtivos--; continue }
      const escolhida = String(resposta)
      if (!c.aceitas.includes(escolhida)) motivos.push(`${p.titulo}: ${escolhida}`)
      continue
    }

    if (c.modo === 'grid_min') {
      const mapa = (resposta || {}) as Record<string, string>
      const notas = Object.entries(mapa).filter(([, v]) => v !== '' && v != null)
      if (notas.length === 0) { criteriosAtivos--; continue }
      for (const [item, v] of notas) {
        const n = Number(v)
        if (!Number.isFinite(n) || n < c.min) motivos.push(`${item}: ${v}`)
      }
      continue
    }

    if (c.modo === 'sim_obrigatorio') {
      if (c.itens.length === 0) { criteriosAtivos--; continue }
      const mapa = (resposta || {}) as Record<string, string>
      for (const item of c.itens) {
        // Só o NÃO explícito bloqueia. Item em branco é item pulado.
        if (mapa[item] === 'nao') motivos.push(`${item}: não`)
      }
      continue
    }
  }

  // Nenhum critério configurado = o salão não montou a regra. Não convidar
  // para o Google é o lado seguro: melhor não convidar ninguém do que mandar
  // cliente insatisfeito avaliar publicamente.
  if (criteriosAtivos === 0) return { liberado: false, motivos: ['Nenhum critério configurado'], criteriosAtivos: 0 }

  return { liberado: motivos.length === 0, motivos, criteriosAtivos }
}

export function resumoCriterio(c: Criterio | null | undefined): string {
  if (!c) return 'Não participa da regra'
  if (c.modo === 'escala_min') return `Libera com nota ${c.min} ou mais`
  if (c.modo === 'grid_min') return `Libera com ${c.min} ou mais em cada item avaliado`
  if (c.modo === 'opcoes_ok') {
    return c.aceitas.length ? `Libera só com: ${c.aceitas.join(', ')}` : 'Nenhuma opção marcada — não participa'
  }
  if (c.modo === 'sim_obrigatorio') {
    return c.itens.length ? `Exige SIM em: ${c.itens.join(', ')}` : 'Nenhum item marcado — não participa'
  }
  return 'Não participa da regra'
}
