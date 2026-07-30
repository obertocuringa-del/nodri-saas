// ─── Decodificação de código de barras em duas camadas ──────────────────────
// 1) BarcodeDetector nativo: instantâneo, mas só existe no Chrome do Android e
//    às vezes vem sem o formato ITF (o do boleto).
// 2) ZXing: carregado SOB DEMANDA (import dinâmico), só baixa no aparelho que
//    precisa. Funciona em iPhone/Safari e na webcam do PC.
//
// Pegadinha do ZXing 0.23 que faz falhar calado: RGBLuminanceSource usa um
// Uint8ClampedArray DIRETO como luminância. Se você entregar o imageData.data
// (RGBA, 4 bytes por pixel), ele interpreta cada canal como um pixel e nunca
// acha nada. Tem que converter pra cinza (1 byte por pixel) antes.

const FORMATOS_NATIVOS = ['itf', 'code_128', 'qr_code', 'data_matrix', 'code_39', 'ean_13']

let zx: { Z: any; reader: any } | null = null
let zxFalhou = false

async function pegarZxing() {
  if (zx) return zx
  if (zxFalhou) return null
  try {
    const Z: any = await import('@zxing/library')
    const hints = new Map<any, any>()
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
      Z.BarcodeFormat.ITF, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.QR_CODE,
      Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.EAN_13,
    ])
    hints.set(Z.DecodeHintType.TRY_HARDER, true)
    // Boleto tem 44 dígitos. Sem essa dica o ITF só aceita 6/8/10/12/14 —
    // e leituras parciais entrariam como se fossem código bom.
    hints.set(Z.DecodeHintType.ALLOWED_LENGTHS, [44])
    const reader = new Z.MultiFormatReader()
    reader.setHints(hints)
    zx = { Z, reader }
    return zx
  } catch {
    zxFalhou = true
    return null
  }
}

// Deixa o ZXing pronto antes do usuário disparar (baixa o pacote em 2º plano)
export function prepararLeitor() { pegarZxing() }

function cinzaDe(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): Uint8ClampedArray {
  const d = ctx.getImageData(x, y, w, h).data
  const g = new Uint8ClampedArray(w * h)
  for (let i = 0, j = 0; j < g.length; i += 4, j++) {
    g[j] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0
  }
  return g
}

async function zxingNoRecorte(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): Promise<string | null> {
  const z = await pegarZxing()
  if (!z || w < 40 || h < 20) return null
  try {
    const src = new z.Z.RGBLuminanceSource(cinzaDe(ctx, x, y, w, h), w, h)
    const bmp = new z.Z.BinaryBitmap(new z.Z.HybridBinarizer(src))
    const r = z.reader.decode(bmp)
    const txt = r?.getText?.()
    return txt ? String(txt) : null
  } catch {
    return null            // NotFoundException é o caso normal: nada no quadro
  } finally {
    try { z.reader.reset() } catch { /* ok */ }
  }
}

// Tenta o nativo (quando existe) e depois o ZXing, no quadro inteiro e na faixa
// central — o código do boleto é largo e horizontal, a faixa do meio costuma
// isolar melhor as barras.
export async function decodificarCanvas(canvas: HTMLCanvasElement): Promise<string[]> {
  const achados: string[] = []
  const w = canvas.width, h = canvas.height
  if (!w || !h) return achados

  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const Det = (window as any).BarcodeDetector
      let det: any
      try { det = new Det({ formats: FORMATOS_NATIVOS }) } catch { det = new Det() }
      const res = await det.detect(canvas)
      for (const c of res || []) if (c?.rawValue) achados.push(String(c.rawValue))
    } catch { /* segue pro ZXing */ }
  }
  if (achados.length) return achados

  const ctx = canvas.getContext('2d', { willReadFrequently: true } as any)
  if (!ctx) return achados

  const inteiro = await zxingNoRecorte(ctx, 0, 0, w, h)
  if (inteiro) return [inteiro]

  const alturaFaixa = Math.max(40, Math.round(h * 0.5))
  const faixa = await zxingNoRecorte(ctx, 0, Math.round((h - alturaFaixa) / 2), w, alturaFaixa)
  if (faixa) return [faixa]

  return achados
}

// Desenha a fonte (vídeo ou imagem) num canvas, limitando a largura
export function paraCanvas(fonte: HTMLVideoElement | ImageBitmap, larguraMax: number): HTMLCanvasElement | null {
  const lw = (fonte as HTMLVideoElement).videoWidth || (fonte as ImageBitmap).width
  const lh = (fonte as HTMLVideoElement).videoHeight || (fonte as ImageBitmap).height
  if (!lw || !lh) return null
  const escala = Math.min(1, larguraMax / lw)
  const c = document.createElement('canvas')
  c.width = Math.round(lw * escala)
  c.height = Math.round(lh * escala)
  const ctx = c.getContext('2d', { willReadFrequently: true } as any)
  if (!ctx) return null
  ctx.drawImage(fonte as any, 0, 0, c.width, c.height)
  return c
}
