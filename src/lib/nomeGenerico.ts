// ─────────────────────────────────────────────────────────────────────────────
// Trocar o nome do salão por uma palavra genérica.
//
// O conteúdo do salão MODELO é escrito a partir do que existe no salão de
// verdade — e o texto vem cheio de "Salão Rouge Hair". Nenhum outro salão pode
// receber isso. Aqui o nome sai e entra "salão", sem tirar nem reescrever mais
// nada: a frase continua a mesma, só deixa de ter dono.
//
// Cuidados que a substituição ingênua erra:
//  · "Salão Rouge Hair" viraria "Salão salão" — a palavra que já estava lá é
//    aproveitada, não duplicada.
//  · No começo da frase o resultado tem de vir com maiúscula.
// ─────────────────────────────────────────────────────────────────────────────

/** Troca o nome informado por "salão" dentro de um texto. */
export function trocarNomePorSalao(texto: string, nome = 'Rouge'): string {
  const n = nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  let s = String(texto)
    // "Salão Rouge Hair" / "salão Rouge" → mantém a palavra salão que já existia
    .replace(new RegExp(`\\bsal[ãa]o\\s+${n}(\\s+hair)?\\b`, 'gi'), m => (m[0] === m[0].toUpperCase() ? 'Salão' : 'salão'))
    // "Rouge Hair" e "Rouge" soltos
    .replace(new RegExp(`\\b${n}\\s+hair\\b`, 'gi'), 'salão')
    .replace(new RegExp(`\\b${n}\\b`, 'gi'), 'salão')

  // Começo de frase volta a ter maiúscula
  s = s.replace(/(^|[.!?:]\s+|\n\s*)salão/g, (_, antes) => `${antes}Salão`)
  return s
}

/** Aplica a troca em todo texto de uma estrutura, preservando o formato. */
export function documentoSemNome<T>(doc: T, nome = 'Rouge'): { doc: T; trocas: number } {
  let trocas = 0

  const anda = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const novo = trocarNomePorSalao(v, nome)
      if (novo !== v) trocas++
      return novo
    }
    if (Array.isArray(v)) return v.map(anda)
    if (v && typeof v === 'object') {
      const saida: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) saida[k] = anda(val)
      return saida
    }
    return v
  }

  return { doc: anda(doc) as T, trocas }
}
