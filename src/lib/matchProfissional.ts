// Comparador de nomes entre o CADASTRO e o RELATÓRIO importado.
//
// O relatório da Avec traz o nome como foi digitado lá — às vezes o nome
// completo, às vezes só o primeiro, às vezes com grafia diferente. Este arquivo
// decide quando duas grafias são a mesma pessoa.
//
// ── Por que ele existe (01/09/2026) ──────────────────────────────────────────
//
// A regra de apelido era `n.includes(apelido) || apelido.includes(n)`, ou seja,
// PEDAÇO DE TEXTO em qualquer posição. A Emilly Viegas de Oliveira, manicure
// que entrou em julho/2026, apareceu com R$ 8.675,96 de faturamento em 2025 e
// com TERAPIA CAPILAR e NUTRIÇÃO DAVINES no mix de serviços dela. O apelido
// "Viegas" casava com o miolo de "RAISSA HARUME **VIEGAS** AGUIR ROSA" — outra
// profissional, de outro cargo, de outro ano.
//
// Passou despercebido porque a Raissa não produziu nada em 2026: o vazamento
// somava zero no ano corrente e só sujava o histórico. Foi preciso alguém
// reparar num gráfico comparativo para o erro aparecer.
//
// A lição não é "o apelido da Emilly estava errado" — era um apelido razoável.
// É que casar por pedaço de palavra transforma qualquer sobrenome comum numa
// rede que pesca colega. Medido no cadastro real: "Oliveira" pescava a VERA
// OLIVEIRA, "Vi" pescava 4 pessoas e "V" pescava 21.
//
// Regra nova: compara PALAVRAS INTEIRAS, e só a partir do começo do nome. É
// assim que gente se identifica — pelo começo do nome, não por um pedaço solto
// do meio. "Viegas" deixa de pescar a Raissa; "Emilly Viegas" continua achando
// a própria Emilly.

const STOPWORDS_NOME = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

/** Minúsculas, sem espaço sobrando, sem preposição — o nome virado em palavras. */
export function tokensDoNome(nome: string | null | undefined): string[] {
  return String(nome || '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(t => t && !STOPWORDS_NOME.has(t))
}

/**
 * Duas palavras são a mesma?
 *
 * Aceita abreviação ("cristina" ~ "cris"), porque o relatório às vezes vem
 * encurtado — mas exige pelo menos 3 letras na mais curta. Sem esse piso,
 * um "v" solto casaria com meio salão.
 */
export function palavrasIguais(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const curta = a.length <= b.length ? a : b
  const longa = a.length <= b.length ? b : a
  return curta.length >= 3 && longa.startsWith(curta)
}

/** Uma sequência de palavras é o começo da outra (comparando palavras inteiras). */
function umComecaOOutro(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false
  const ate = Math.min(a.length, b.length)
  for (let i = 0; i < ate; i++) if (!palavrasIguais(a[i], b[i])) return false
  return true
}

/**
 * O apelido identifica esta pessoa no nome que veio do relatório?
 *
 * Vale pelo COMEÇO e por palavra inteira. "Cristina" acha "Cristina Alves";
 * não acha "Ana Cristina Alves", que é outra pessoa cujo nome apenas contém
 * a palavra.
 */
export function apelidoCasa(apelido: string | null | undefined, nomeDoRelatorio: string): boolean {
  const ap = String(apelido || '').toLowerCase().trim()
  // Apelido de uma ou duas letras não identifica ninguém: identifica todo mundo.
  if (ap.length < 3) return false
  return umComecaOOutro(tokensDoNome(ap), tokensDoNome(nomeDoRelatorio))
}

/**
 * Cria a função que reconhece uma profissional nas linhas do relatório.
 *
 * Ordem: nome idêntico, depois apelido, depois os dois primeiros nomes. Os dois
 * primeiros precisam casar JUNTOS — só o sobrenome nunca basta.
 */
export function criarMatchProfissional(prof: { nome_completo?: string | null; apelido?: string | null }) {
  const nomeCompleto = String(prof.nome_completo || '').toLowerCase().trim()
  const apelido = String(prof.apelido || '').toLowerCase().trim()
  const tokens = tokensDoNome(nomeCompleto).slice(0, 2)

  return (item: any): boolean => {
    const n = String(item?.profissional || item?.profissional_original || '').toLowerCase().trim()
    if (!n) return false
    if (n === nomeCompleto) return true
    if (apelidoCasa(apelido, n)) return true

    const nTokens = tokensDoNome(n)
    if (tokens.length === 0 || nTokens.length === 0) return false
    const quantosCasaram = tokens.filter(t => nTokens.some(nt => palavrasIguais(t, nt))).length
    return quantosCasaram >= Math.min(tokens.length, 2)
  }
}
