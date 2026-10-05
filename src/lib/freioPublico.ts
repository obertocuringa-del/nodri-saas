// ── Freio para rotas públicas de escrita ────────────────────────────────────
//
// A rota do cupom cria registro sem login nenhum: basta um telefone. Sem
// freio, um script sobe milhares de cupons com números inventados numa
// tarde, e o estrago não é só uma tabela grande -- cada cupom criado também
// cria contato no CRM, e a agenda do salão fica impossível de usar.
//
// O limite mora na MEMÓRIA do processo, não no banco. É de propósito:
//
//  - gravar cada tentativa no banco para contar tentativas seria dar ao
//    atacante exatamente o que ele quer, escrita barata;
//  - o servidor é de um núcleo e roda um processo só (pm2 fork), então a
//    memória do processo vê todas as requisições.
//
// Se o processo reiniciar, o contador zera. Isso é aceitável: o freio existe
// contra volume, e volume não sobrevive a um reinício.

interface Marca {
  /** Quando a janela atual começou. */
  desde: number
  /** Quantas tentativas nela. */
  n: number
}

const marcas = new Map<string, Marca>()

/** De quanto em quanto tempo a contagem recomeça. */
const JANELA_MS = 10 * 60_000

/**
 * A faixa de limpeza: sem isto o mapa cresce para sempre num processo que
 * fica semanas no ar, e vira vazamento de memória lento.
 */
const TETO_CHAVES = 5000

function limpar(agora: number) {
  for (const [k, m] of marcas) {
    if (agora - m.desde > JANELA_MS) marcas.delete(k)
  }
  // Se ainda estiver grande depois da poda, descarta o mais antigo até caber.
  if (marcas.size > TETO_CHAVES) {
    const ordenadas = [...marcas.entries()].sort((a, b) => a[1].desde - b[1].desde)
    for (const [k] of ordenadas.slice(0, marcas.size - TETO_CHAVES)) marcas.delete(k)
  }
}

/**
 * Identifica quem está chamando, para contar por origem e não no total.
 *
 * Contar no total deixaria um atacante derrubar o cupom para o salão
 * inteiro: ele estoura o limite e as clientes de verdade levam a recusa.
 */
export function origemDaChamada(req: Request): string {
  const h = req.headers
  // Atrás do nginx, o IP real vem no cabeçalho; `x-forwarded-for` pode ter
  // vários, e o primeiro é o do cliente.
  const encaminhado = (h.get('x-forwarded-for') || '').split(',')[0].trim()
  return encaminhado || h.get('x-real-ip') || 'desconhecido'
}

/**
 * Deixa passar? `false` quando a origem já estourou o limite na janela.
 *
 * Cada chamada aprovada conta. Chamar isto sem usar o resultado é gastar a
 * cota de quem não fez nada.
 */
export function podePassar(chave: string, maximo: number): boolean {
  const agora = Date.now()
  if (marcas.size > 200 && Math.random() < 0.05) limpar(agora)

  const m = marcas.get(chave)
  if (!m || agora - m.desde > JANELA_MS) {
    marcas.set(chave, { desde: agora, n: 1 })
    return true
  }
  m.n++
  return m.n <= maximo
}
