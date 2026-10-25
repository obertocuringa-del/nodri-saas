// ── QR code em SVG, sem dependência ─────────────────────────────────────────
//
// O projeto não tem biblioteca de QR e a página de vagas precisa de um (o
// cartaz da vitrine aponta para o formulário). Este gerador é o algoritmo
// padrão do QR Code (ISO 18004) reduzido ao que se usa aqui: modo de bytes
// (UTF-8), correção de erro nível M, versões 1 a 10 -- até 213 bytes, mais que
// o suficiente para um endereço. Escolhe sozinho a menor versão e a melhor
// máscara. Roda no servidor; devolve um <svg> pronto para colar no HTML.

const ECC_POR_BLOCO_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]
const BLOCOS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5]

function modulosBrutos(v: number): number {
  let r = (16 * v + 128) * v + 64
  if (v >= 2) { const a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; if (v >= 7) r -= 36 }
  return r
}
const dadosDaVersao = (v: number) => Math.floor(modulosBrutos(v) / 8) - ECC_POR_BLOCO_M[v] * BLOCOS_M[v]

function gfMul(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x }
  return z
}
function rsDivisor(grau: number): number[] {
  const r: number[] = []
  for (let i = 0; i < grau - 1; i++) r.push(0)
  r.push(1)
  let raiz = 1
  for (let i = 0; i < grau; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], raiz); if (j + 1 < r.length) r[j] ^= r[j + 1] }
    raiz = gfMul(raiz, 2)
  }
  return r
}
function rsResto(dados: number[], divisor: number[]): number[] {
  const r = divisor.map(() => 0)
  for (const b of dados) {
    const fator = b ^ (r.shift() as number)
    r.push(0)
    divisor.forEach((c, i) => { r[i] ^= gfMul(c, fator) })
  }
  return r
}

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0

export function qrMatriz(texto: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(texto))
  let versao = 1
  for (; versao <= 10; versao++) {
    const cab = versao < 10 ? 8 : 16
    if (4 + cab + bytes.length * 8 <= dadosDaVersao(versao) * 8) break
  }
  if (versao > 10) throw new Error('Texto grande demais para o QR')
  const tam = versao * 4 + 17

  // ── dados + terminador + enchimento ──
  const bits: number[] = []
  const poe = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1) }
  poe(4, 4); poe(bytes.length, versao < 10 ? 8 : 16); bytes.forEach(b => poe(b, 8))
  const capacidade = dadosDaVersao(versao) * 8
  poe(0, Math.min(4, capacidade - bits.length))
  while (bits.length % 8) bits.push(0)
  for (let pad = 0xec; bits.length < capacidade; pad ^= 0xec ^ 0x11) poe(pad, 8)
  const dados: number[] = []
  for (let i = 0; i < bits.length; i += 8) dados.push(parseInt(bits.slice(i, i + 8).join(''), 2))

  // ── correção de erro por bloco e intercalação ──
  const nBlocos = BLOCOS_M[versao], eccLen = ECC_POR_BLOCO_M[versao]
  const brutas = Math.floor(modulosBrutos(versao) / 8)
  const curtos = nBlocos - (brutas % nBlocos), tamCurto = Math.floor(brutas / nBlocos)
  const div = rsDivisor(eccLen)
  const blocos: number[][] = []
  for (let i = 0, k = 0; i < nBlocos; i++) {
    const dat = dados.slice(k, k + tamCurto - eccLen + (i < curtos ? 0 : 1)); k += dat.length
    const ecc = rsResto(dat, div)
    if (i < curtos) dat.push(0)
    blocos.push(dat.concat(ecc))
  }
  const tudo: number[] = []
  for (let i = 0; i < blocos[0].length; i++) {
    blocos.forEach((b, j) => { if (i !== tamCurto - eccLen || j >= curtos) tudo.push(b[i]) })
  }

  // ── padrões de função ──
  const mod: boolean[][] = Array.from({ length: tam }, () => Array(tam).fill(false))
  const fun: boolean[][] = Array.from({ length: tam }, () => Array(tam).fill(false))
  const fixa = (x: number, y: number, escuro: boolean) => { mod[y][x] = escuro; fun[y][x] = true }

  for (let i = 0; i < tam; i++) { fixa(6, i, i % 2 === 0); fixa(i, 6, i % 2 === 0) }
  const localizador = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy
      if (x >= 0 && x < tam && y >= 0 && y < tam) fixa(x, y, d !== 2 && d !== 4)
    }
  }
  localizador(3, 3); localizador(tam - 4, 3); localizador(3, tam - 4)
  const alinhamentos: number[] = []
  if (versao > 1) {
    const n = Math.floor(versao / 7) + 2
    const passo = Math.ceil((versao * 4 + 4) / (n * 2 - 2)) * 2
    alinhamentos.push(6)
    for (let pos = tam - 7; alinhamentos.length < n; pos -= passo) alinhamentos.splice(1, 0, pos)
  }
  const ult = alinhamentos.length - 1
  alinhamentos.forEach((cx, i) => alinhamentos.forEach((cy, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === ult) || (i === ult && j === 0)) return
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) fixa(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
  }))

  const desenhaFormato = (mascara: number) => {
    // nível M tem código 0
    const d = (0 << 3) | mascara
    let r = d
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537)
    const bits15 = ((d << 10) | r) ^ 0x5412
    for (let i = 0; i <= 5; i++) fixa(8, i, bit(bits15, i))
    fixa(8, 7, bit(bits15, 6)); fixa(8, 8, bit(bits15, 7)); fixa(7, 8, bit(bits15, 8))
    for (let i = 9; i < 15; i++) fixa(14 - i, 8, bit(bits15, i))
    for (let i = 0; i < 8; i++) fixa(tam - 1 - i, 8, bit(bits15, i))
    for (let i = 8; i < 15; i++) fixa(8, tam - 15 + i, bit(bits15, i))
    fixa(8, tam - 8, true)
  }
  desenhaFormato(0)
  if (versao >= 7) {
    let r = versao
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25)
    const v18 = (versao << 12) | r
    for (let i = 0; i < 18; i++) {
      const cor = bit(v18, i), a = tam - 11 + (i % 3), b = Math.floor(i / 3)
      fixa(a, b, cor); fixa(b, a, cor)
    }
  }

  // ── codewords em zigue-zague ──
  let k = 0
  for (let dir = tam - 1; dir >= 1; dir -= 2) {
    if (dir === 6) dir = 5
    for (let vert = 0; vert < tam; vert++) for (let j = 0; j < 2; j++) {
      const x = dir - j, sobe = ((dir + 1) & 2) === 0, y = sobe ? tam - 1 - vert : vert
      if (!fun[y][x] && k < tudo.length * 8) { mod[y][x] = bit(tudo[k >>> 3], 7 - (k & 7)); k++ }
    }
  }

  // ── máscara: escolhe a de menor penalidade ──
  const aplica = (m: number) => {
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      const inv = [
        (x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0,
        (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, ((x * y) % 2) + ((x * y) % 3) === 0,
        (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
      ][m]
      if (inv && !fun[y][x]) mod[y][x] = !mod[y][x]
    }
  }
  const penalidade = (): number => {
    let p = 0
    for (let y = 0; y < tam; y++) for (const horizontal of [true, false]) {
      let corrida = 1
      for (let i = 1; i < tam; i++) {
        const a = horizontal ? mod[y][i] : mod[i][y], b = horizontal ? mod[y][i - 1] : mod[i - 1][y]
        if (a === b) { corrida++; if (corrida === 5) p += 3; else if (corrida > 5) p++ } else corrida = 1
      }
    }
    for (let y = 0; y < tam - 1; y++) for (let x = 0; x < tam - 1; x++) {
      const c = mod[y][x]
      if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3
    }
    const escuros = mod.reduce((t, l) => t + l.filter(Boolean).length, 0)
    p += Math.floor(Math.abs(escuros * 20 - tam * tam * 10) / (tam * tam)) * 10
    return p
  }
  let melhor = 0, menor = Infinity
  for (let m = 0; m < 8; m++) {
    aplica(m); desenhaFormato(m)
    const p = penalidade()
    if (p < menor) { menor = p; melhor = m }
    aplica(m)
  }
  aplica(melhor); desenhaFormato(melhor)
  return mod
}

/** SVG do QR, com a margem de 4 módulos que o padrão exige. */
export function qrSvg(texto: string, tamanhoPx = 220): string {
  const m = qrMatriz(texto), tam = m.length, borda = 4
  let d = ''
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (m[y][x]) d += `M${x + borda},${y + borda}h1v1h-1z`
  const total = tam + borda * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${tamanhoPx}" height="${tamanhoPx}" shape-rendering="crispEdges" role="img" aria-label="QR code do formulário de candidatura"><rect width="${total}" height="${total}" fill="#ffffff"/><path d="${d}" fill="#0d2a56"/></svg>`
}
