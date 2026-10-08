// ─────────────────────────────────────────────────────────────────────────────
// ZIP — montador mínimo, método "guardado" (sem compressão).
//
// Por que escrever em vez de usar uma biblioteca: extensão MV3 não carrega
// script de fora, e empacotar um JSZip inteiro para juntar algumas centenas de
// arquivos XML de poucos KB seria mais código do que isto. Sem compressão o
// arquivo fica um pouco maior e abre em qualquer descompactador — inclusive no
// Explorer do Windows, que é onde este .zip vai ser aberto.
//
// Nota sobre acentuação: o nome do cliente tem acento, e o ZIP antigo guardava
// nome em CP437. Ligamos o bit 11 das flags (nome em UTF-8), que é o que o
// Windows 10+ e qualquer descompactador moderno entendem.
// ─────────────────────────────────────────────────────────────────────────────

const TABELA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

/** Data/hora no formato MS-DOS que o ZIP usa. Antes de 1980 não existe. */
function dataDos(d) {
  const ano = Math.max(1980, d.getFullYear())
  const data = ((ano - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  return { data, hora }
}

class Escritor {
  constructor() { this.partes = []; this.tamanho = 0 }
  bytes(b) { this.partes.push(b); this.tamanho += b.length }
  u16(n) { this.bytes(new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF])) }
  u32(n) {
    this.bytes(new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]))
  }
  juntar() {
    const saida = new Uint8Array(this.tamanho)
    let p = 0
    for (const b of this.partes) { saida.set(b, p); p += b.length }
    return saida
  }
}

/**
 * Monta o .zip.
 *
 * @param {Array<{nome: string, bytes: Uint8Array}>} arquivos
 * @param {Date} [quando] data que vai gravada em cada entrada
 * @returns {Blob}
 */
function montarZip(arquivos, quando) {
  const agora = quando || new Date()
  const { data, hora } = dataDos(agora)
  const enc = new TextEncoder()

  const corpo = new Escritor()
  const central = []

  for (const arq of arquivos) {
    const nome = enc.encode(arq.nome)
    const conteudo = arq.bytes
    const crc = crc32(conteudo)
    const deslocamento = corpo.tamanho

    // ── Cabeçalho local ──
    corpo.u32(0x04034b50)
    corpo.u16(20)        // versão necessária
    corpo.u16(0x0800)    // nome em UTF-8
    corpo.u16(0)         // método: guardado
    corpo.u16(hora); corpo.u16(data)
    corpo.u32(crc)
    corpo.u32(conteudo.length)  // comprimido
    corpo.u32(conteudo.length)  // original
    corpo.u16(nome.length)
    corpo.u16(0)         // sem campo extra
    corpo.bytes(nome)
    corpo.bytes(conteudo)

    central.push({ nome, crc, tamanho: conteudo.length, deslocamento })
  }

  // ── Diretório central ──
  const dir = new Escritor()
  for (const e of central) {
    dir.u32(0x02014b50)
    dir.u16(20)          // versão de quem escreveu
    dir.u16(20)          // versão necessária
    dir.u16(0x0800)
    dir.u16(0)
    dir.u16(hora); dir.u16(data)
    dir.u32(e.crc)
    dir.u32(e.tamanho)
    dir.u32(e.tamanho)
    dir.u16(e.nome.length)
    dir.u16(0); dir.u16(0)   // extra, comentário
    dir.u16(0); dir.u16(0)   // disco, atributos internos
    dir.u32(0)               // atributos externos
    dir.u32(e.deslocamento)
    dir.bytes(e.nome)
  }

  // ── Fim do diretório central ──
  const fim = new Escritor()
  fim.u32(0x06054b50)
  fim.u16(0); fim.u16(0)
  fim.u16(central.length); fim.u16(central.length)
  fim.u32(dir.tamanho)
  fim.u32(corpo.tamanho)
  fim.u16(0)

  return new Blob([corpo.juntar(), dir.juntar(), fim.juntar()], { type: 'application/zip' })
}

// Em content script tudo vive no mesmo escopo isolado; em Node (o teste) sai
// pelo module.exports.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { montarZip, crc32 }
}
