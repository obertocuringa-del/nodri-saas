// Formatação "inteligente" dos campos do módulo Lojistas — aplicada
// enquanto a pessoa digita, para reduzir erro de preenchimento.

const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

export function capitalizarNome(valor: string): string {
  return valor
    .toLowerCase()
    .split(' ')
    .map((p, i) => {
      if (!p) return p
      if (i > 0 && CONECTORES.has(p)) return p
      return p.charAt(0).toUpperCase() + p.slice(1)
    })
    .join(' ')
}

export function maskCelular(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return d.replace(/^(\d{2})(\d*)/, '($1) $2')
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d*)/, '($1) $2-$3')
  return d.replace(/^(\d{2})(\d{5})(\d*)/, '($1) $2-$3')
}

export function formatInstagram(valor: string): string {
  const limpo = valor.trim().replace(/\s+/g, '').replace(/^@+/, '').toLowerCase()
  return limpo ? `@${limpo}` : ''
}

export function formatBloco(valor: string): string {
  return valor.toUpperCase()
}
