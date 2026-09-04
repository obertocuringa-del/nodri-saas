// A conferência do papel — a única fonte independente que existe.
//
// Todo o resto compara Avec com Avec: os itens lançados contra o caixa do
// próprio Avec. Se a recepcionista digitou R$ 180 onde a comanda de papel dizia
// R$ 200, os dois lados dizem 180 e ninguém vê nada. O papel é o terceiro
// ponto de apoio, e é ele que fecha o ciclo.
//
// Guardado como folha do mês (papel_AAAA-MM) pelo mesmo motivo dos caixas: é
// movimento de dinheiro de gente real e não pode viajar ao salão modelo.

/** Comanda → valor escrito no papel. */
export type ValoresDoPapel = Record<string, number>

/** Folha do mês: "DD/MM/AAAA" → valores daquele dia. */
export type FolhaPapel = Record<string, ValoresDoPapel>

export function chaveDoMes(dataBR: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dataBR || '').trim())
  return m ? `papel_${m[3]}-${m[2]}` : ''
}

/** Comanda → observação escrita à mão na conferência. */
export type ObsDoPapel = Record<string, string>

/** Folha do mês das observações: "DD/MM/AAAA" → observações daquele dia. */
export type FolhaObs = Record<string, ObsDoPapel>

/**
 * Chave das observações — separada da dos valores.
 *
 * Poderia ir junto, mas aí o formato de `papel_AAAA-MM` mudaria de
 * `{comanda: número}` para `{comanda: {valor, obs}}`, e tudo o que já está
 * gravado precisaria de migração. Chave nova não migra nada e não arrisca o
 * que já foi conferido.
 */
export function chaveObs(dataBR: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dataBR || '').trim())
  return m ? `papelobs_${m[3]}-${m[2]}` : ''
}

/** Normaliza as observações vindas da tela. */
export function lerObs(bruto: any): ObsDoPapel {
  const saida: ObsDoPapel = {}
  for (const [k, v] of Object.entries(bruto || {})) {
    const comanda = numeroComanda(k)
    if (!comanda) continue
    const texto = String(v ?? '').trim().slice(0, 400)
    if (texto) saida[comanda] = texto
  }
  return saida
}

/** Só os dígitos, sem zero à esquerda — igual ao robô e à extensão. */
export function numeroComanda(v: any): string {
  const so = String(v ?? '').replace(/\D/g, '')
  return so.replace(/^0+/, '') || so
}

/**
 * Normaliza o que veio da tela.
 *
 * Campo vazio é DESCARTADO, não gravado como zero: quem não digitou não disse
 * "foi zero", disse "não conferi". A diferença entre as duas coisas é o que
 * mantém a gaveta NÃO CONFERIDO honesta.
 */
export function lerValores(bruto: any): ValoresDoPapel {
  const saida: ValoresDoPapel = {}
  for (const [k, v] of Object.entries(bruto || {})) {
    const comanda = numeroComanda(k)
    if (!comanda) continue
    if (v === null || v === undefined || v === '') continue
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) continue
    saida[comanda] = Number(n.toFixed(2))
  }
  return saida
}
