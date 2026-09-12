// ── O teto de mil linhas do Supabase ────────────────────────────────────────
//
// O PostgREST devolve no máximo 1000 linhas por requisição, e NÃO avisa: pedir
// `.limit(12000)` devolve 1000 sem erro nenhum. O código segue achando que
// recebeu tudo, e a conta sai errada sem ninguém desconfiar.
//
// Em 12/09/2026 isso mordeu quatro vezes no mesmo dia:
//
//   - a varredura de telefones parava e dizia "faltam 0";
//   - a busca de contato não achava do contato 1001 em diante, tentava criar
//     quem já existia e derrubava lotes inteiros do histórico;
//   - a fila mostrava 300 conversas de 900, e as abas contavam só essas;
//   - o painel pedia 12000 eventos, recebia 1000, e mostrava tempo de resposta
//     e produtividade calculados em cima de uma fatia.
//
// Por isso isto existe num lugar só: quem precisa de tudo chama daqui e não
// precisa lembrar do teto.

/** Quanto o PostgREST entrega por requisição, faça o pedido que fizer. */
export const TETO_SUPABASE = 1000

/**
 * Busca todas as linhas, em páginas, até a consulta se esgotar.
 *
 * `consulta` recebe a faixa e devolve o mesmo objeto do supabase-js. Exemplo:
 *
 *   const { dados, erro } = await paginar((de, ate) =>
 *     supabaseAdmin.from('crm_eventos').select('*')
 *       .eq('salao_id', salaoId).order('criado_em').range(de, ate))
 *
 * O `teto` existe para o dia em que a tabela tiver milhões: melhor devolver
 * muito do que derrubar a requisição. Quem chama escolhe o seu.
 */
export async function paginar<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: any }>,
  teto = 20000,
): Promise<{ dados: T[]; erro: any }> {
  const dados: T[] = []
  for (let de = 0; de < teto; de += TETO_SUPABASE) {
    const { data, error } = await consulta(de, de + TETO_SUPABASE - 1)
    if (error) return { dados, erro: error }
    const lote = data || []
    dados.push(...lote)
    // Página incompleta quer dizer que acabou. É o único sinal confiável:
    // contar antes custaria uma consulta a mais e ainda poderia mudar no meio.
    if (lote.length < TETO_SUPABASE) break
  }
  return { dados, erro: null }
}
