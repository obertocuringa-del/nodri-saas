// Produtos vendidos na comanda (relatório 0041 do Avec).
//
// Por que isto existe: o relatório que alimenta os atendimentos é o 0031, de
// SERVIÇOS. Produto entra no caixa e não aparece lá. Sem esta peça, toda
// comanda que vendeu produto acusa "entrou dinheiro a mais" — e a conferência
// vira alarme falso, que é o jeito mais rápido de ninguém mais ler.
//
// O robô já baixava o 0041 todo dia; só guardava a quantidade por profissional
// e jogava fora a comanda e o valor. Agora guarda a linha inteira.

export interface LinhaProduto {
  num_comanda: string
  data_venda: string
  produto: string
  categoria?: string
  marca?: string
  profissional?: string
  cliente?: string
  qtd: number
  valor: number
  total: number
}

/** Folha do mês: "produtos_AAAA-MM". Não viaja para o salão modelo. */
export function chaveDoMes(dataBR: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dataBR || '').trim())
  return m ? `produtos_${m[3]}-${m[2]}` : ''
}

/** Só os dígitos, sem zero à esquerda — igual ao que o robô e a extensão gravam. */
export function numeroComanda(v: any): string {
  const so = String(v ?? '').replace(/\D/g, '')
  return so.replace(/^0+/, '') || so
}

/** Quanto de PRODUTO cada comanda teve. */
export function totalPorComanda(linhas: LinhaProduto[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const l of linhas || []) {
    const k = numeroComanda(l.num_comanda)
    if (!k) continue
    m.set(k, (m.get(k) || 0) + (Number(l.total) || 0))
  }
  return m
}

/** Normaliza as linhas da aba PRODUTOS_RAW. */
export function lerLinhas(linhas: any[]): LinhaProduto[] {
  const num = (v: any) => {
    if (typeof v === 'number') return v
    const t = String(v ?? '').replace(/[^\d,.-]/g, '')
    if (!t) return 0
    const n = Number(t.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  const saida: LinhaProduto[] = []
  for (const l of linhas || []) {
    const comanda = numeroComanda(l?.num_comanda)
    if (!comanda) continue
    const qtd = Number(l?.qtd) || 1
    const valor = num(l?.valor)
    const total = num(l?.total) || Number((valor * qtd).toFixed(2))
    if (!total) continue
    saida.push({
      num_comanda: comanda,
      data_venda: String(l?.data_venda ?? '').trim().slice(0, 10),
      produto: String(l?.produto ?? '').trim(),
      categoria: String(l?.categoria ?? '').trim() || undefined,
      marca: String(l?.marca ?? '').trim() || undefined,
      profissional: String(l?.profissional ?? '').trim() || undefined,
      cliente: String(l?.cliente ?? '').trim() || undefined,
      qtd, valor, total,
    })
  }
  return saida
}
