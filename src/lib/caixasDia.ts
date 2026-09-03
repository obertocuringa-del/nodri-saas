// Os caixas de um dia, como o Avec os fecha.
//
// Este dado NÃO existe em nenhum relatório numerado do Avec — conferi o 0031,
// que é de onde vêm os atendimentos, e ele traz o serviço e o profissional que
// executou, nunca quem fechou o caixa nem em que forma o cliente pagou. Por
// isso ele chega pela extensão, que lê a tela de histórico de caixa.
//
// Sem ele, a conferência só sabe o que foi LANÇADO. Com ele, passa a saber o
// que foi RECEBIDO — e a diferença entre as duas é exatamente o que se procura
// numa conferência de caixa.

/** Uma comanda como ela aparece dentro de um caixa. */
export interface ComandaNoCaixa {
  comanda: string
  valor: number
  /** "Dinheiro", "Cartão Crédito", "Pix"… como o Avec escreve. */
  forma: string
  bandeira?: string
  parcelas?: number
}

export interface CaixaDoDia {
  /** Quem abriu/fechou. É por ele que a conferência se divide. */
  responsavel: string
  abertura?: string
  fechamento?: string
  /** Total por forma de pagamento, como o Avec soma. */
  totais?: Record<string, number>
  comandas: ComandaNoCaixa[]
  /** Quando a extensão trouxe. */
  em?: number
}

/** Folha do mês: "01/09/2026" → caixas daquele dia. */
export type FolhaCaixas = Record<string, CaixaDoDia[]>

/**
 * Chave da folha, por mês.
 *
 * Termina em _AAAA-MM de propósito: é o padrão que o salão modelo reconhece
 * como folha mensal e NÃO copia. Movimento de caixa é dinheiro de gente real —
 * não pode viajar para o modelo nem, dali, para salão novo.
 */
export function chaveDoMes(dataBR: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dataBR || '').trim())
  return m ? `caixas_${m[3]}-${m[2]}` : ''
}

export function totalDoCaixa(c: CaixaDoDia): number {
  return (c.comandas || []).reduce((s, x) => s + (Number(x.valor) || 0), 0)
}

/** Mapa comanda → responsável, para dividir os achados por caixa. */
export function donoDaComanda(caixas: CaixaDoDia[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const c of caixas || []) {
    for (const x of c.comandas || []) {
      const k = String(x.comanda || '').trim()
      if (k) m.set(k, c.responsavel)
    }
  }
  return m
}

/** Quanto entrou por comanda, somando as formas de pagamento daquela comanda. */
export function recebidoPorComanda(caixas: CaixaDoDia[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const c of caixas || []) {
    for (const x of c.comandas || []) {
      const k = String(x.comanda || '').trim()
      if (!k) continue
      m.set(k, (m.get(k) || 0) + (Number(x.valor) || 0))
    }
  }
  return m
}
