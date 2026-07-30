// ─── Leitura de código de boleto ────────────────────────────────────────────
// Dois padrões convivem no Brasil:
//
// 1) BOLETO BANCÁRIO (fornecedor, financiamento, DAVINES...)
//    44 dígitos no código de barras · 47 na linha digitável.
//    Traz VALOR e VENCIMENTO dentro do código.
//
// 2) ARRECADAÇÃO / CONSUMO (água, luz, telefone, tributo) — começa com 8
//    44 dígitos no código de barras · 48 na linha digitável.
//    Traz VALOR, mas NÃO tem vencimento no código (o padrão não reserva campo
//    pra isso) — a data fica pro usuário preencher.
//
// 3) Pix copia-e-cola / QR do boleto: valor sai da tag 54 quando é fixo.
//
// A câmera devolve os 44 dígitos das barras; o app do banco pede a linha
// digitável. Por isso convertemos os dois sentidos.

export interface BoletoLido {
  ok: boolean
  tipo: 'banco' | 'arrecadacao' | 'pix' | ''
  valor: number | null   // em reais; null quando o código não traz valor
  venc: string           // ISO 'YYYY-MM-DD'; '' quando o código não traz
  linha: string          // linha digitável (47/48 dígitos) ou copia-e-cola do Pix
  barras: string         // 44 dígitos ('' no Pix)
  erro?: string
}

const soDigitos = (s: string) => String(s || '').replace(/\D/g, '')

// DV módulo 10 (usado nos campos da linha digitável bancária)
function dvMod10(bloco: string): number {
  let soma = 0, peso = 2
  for (let i = bloco.length - 1; i >= 0; i--) {
    let r = Number(bloco[i]) * peso
    if (r > 9) r = Math.floor(r / 10) + (r % 10)
    soma += r
    peso = peso === 2 ? 1 : 2
  }
  const resto = soma % 10
  return resto === 0 ? 0 : 10 - resto
}

// DV módulo 11 (arrecadação, quando o dígito identificador de valor é 8 ou 9)
function dvMod11(bloco: string): number {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9]
  let soma = 0, i = 0
  for (let k = bloco.length - 1; k >= 0; k--) { soma += Number(bloco[k]) * pesos[i % 8]; i++ }
  const resto = soma % 11
  if (resto === 0 || resto === 1) return 0
  if (resto === 10) return 1
  return 11 - resto
}

// ── Vencimento: "fator de vencimento" de 4 dígitos ──────────────────────────
// Data-base 07/10/1997 (fator 1000 = 03/07/2000, fator 9999 = 21/02/2025).
// Em 22/02/2025 o contador da Febraban REINICIOU em 1000 — sem tratar isso,
// todo boleto de 2025/2026 sairia com data de 2001.
const DIA = 86400000
function dataDoFator(fator: number): string {
  if (!fator || fator < 1000) return ''
  const cicloAntigo = Date.UTC(1997, 9, 7) + fator * DIA          // data-base original
  const cicloNovo = Date.UTC(2025, 1, 22) + (fator - 1000) * DIA   // após o reinício
  // O mesmo fator cabe nos dois ciclos; vale o que cai perto de hoje (o outro
  // dá uma data absurda — 2001 ou 2049).
  const hoje = Date.now()
  const ms = Math.abs(cicloAntigo - hoje) <= Math.abs(cicloNovo - hoje) ? cicloAntigo : cicloNovo
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// ── Conversões: bancário ────────────────────────────────────────────────────
export function barras44ParaLinha47(b: string): string {
  const bancoMoeda = b.slice(0, 4)
  const dvGeral = b.slice(4, 5)
  const fatorValor = b.slice(5, 19)
  const livre = b.slice(19, 44)
  const c1 = bancoMoeda + livre.slice(0, 5)
  const c2 = livre.slice(5, 15)
  const c3 = livre.slice(15, 25)
  return `${c1}${dvMod10(c1)}${c2}${dvMod10(c2)}${c3}${dvMod10(c3)}${dvGeral}${fatorValor}`
}
export function linha47ParaBarras44(l: string): string {
  const c1 = l.slice(0, 9), c2 = l.slice(10, 20), c3 = l.slice(21, 31)
  return c1.slice(0, 4) + l.slice(32, 33) + l.slice(33, 47) + c1.slice(4, 9) + c2 + c3
}

// ── Conversões: arrecadação (começa com 8) ──────────────────────────────────
function dvArrecadacao(bloco: string, idValor: string): number {
  return (idValor === '6' || idValor === '7') ? dvMod10(bloco) : dvMod11(bloco)
}
export function barras44ParaLinha48(b: string): string {
  const id = b.slice(2, 3)
  let out = ''
  for (let i = 0; i < 4; i++) {
    const bloco = b.slice(i * 11, i * 11 + 11)
    out += bloco + dvArrecadacao(bloco, id)
  }
  return out
}
export function linha48ParaBarras44(l: string): string {
  return l.slice(0, 11) + l.slice(12, 23) + l.slice(24, 35) + l.slice(36, 47)
}

// ── Pix copia-e-cola (EMV): pega só o valor (tag 54), quando existe ─────────
function lerPix(txt: string): BoletoLido {
  const s = txt.trim()
  let valor: number | null = null
  // TLV: cada campo é ID(2) + tamanho(2) + conteúdo
  let i = 0
  while (i + 4 <= s.length) {
    const id = s.slice(i, i + 2)
    const tam = Number(s.slice(i + 2, i + 4))
    if (!Number.isFinite(tam) || tam < 0) break
    const conteudo = s.slice(i + 4, i + 4 + tam)
    if (id === '54') { const v = Number(conteudo); if (Number.isFinite(v) && v > 0) valor = v }
    i += 4 + tam
  }
  return { ok: true, tipo: 'pix', valor, venc: '', linha: s, barras: '' }
}

// ── Entrada única: aceita 44/47/48 dígitos ou o copia-e-cola do Pix ─────────
export function lerCodigoBoleto(entrada: string): BoletoLido {
  const bruto = String(entrada || '').trim()
  const vazio: BoletoLido = { ok: false, tipo: '', valor: null, venc: '', linha: '', barras: '' }
  if (!bruto) return { ...vazio, erro: 'Cole ou escaneie o código do boleto.' }

  if (/br\.gov\.bcb\.pix/i.test(bruto)) return lerPix(bruto)

  const d = soDigitos(bruto)

  // Bancário
  if (d.length === 47 || (d.length === 44 && d[0] !== '8')) {
    const barras = d.length === 44 ? d : linha47ParaBarras44(d)
    const linha = d.length === 47 ? d : barras44ParaLinha47(barras)
    const centavos = Number(barras.slice(9, 19))
    const valor = Number.isFinite(centavos) && centavos > 0 ? centavos / 100 : null
    return { ok: true, tipo: 'banco', valor, venc: dataDoFator(Number(barras.slice(5, 9))), linha, barras }
  }

  // Arrecadação / conta de consumo
  if (d.length === 48 || (d.length === 44 && d[0] === '8')) {
    const barras = d.length === 44 ? d : linha48ParaBarras44(d)
    const linha = d.length === 48 ? d : barras44ParaLinha48(barras)
    const centavos = Number(barras.slice(4, 15))
    const valor = Number.isFinite(centavos) && centavos > 0 ? centavos / 100 : null
    return { ok: true, tipo: 'arrecadacao', valor, venc: '', linha, barras }
  }

  return { ...vazio, erro: `Código com ${d.length} dígito(s) — o esperado é 44, 47 ou 48.` }
}

// Formata pra leitura humana (igual ao impresso no boleto)
export function formatarLinha(linha: string): string {
  const s = String(linha || '')
  const d = soDigitos(s)
  if (d.length === 47) return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`
  if (d.length === 48) return `${d.slice(0, 12)} ${d.slice(12, 24)} ${d.slice(24, 36)} ${d.slice(36)}`
  return s   // Pix copia-e-cola ou algo fora do padrão: mostra como está
}

export const ehPix = (cod: string) => /br\.gov\.bcb\.pix/i.test(String(cod || ''))
