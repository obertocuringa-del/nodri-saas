// ── A arte do cupom, desenhada no navegador da própria cliente ─────────────
//
// Compartilhar só o texto some no meio da conversa. Uma arte a pessoa olha, e
// eventualmente reposta — que é o que faz a indicação circular.
//
// Desenhada em canvas, no aparelho dela, e não gerada no servidor: assim não
// custa nada ao servidor de um núcleo, funciona sem rede depois que a página
// abriu, e a imagem sai pronta para o `navigator.share` levar junto.
//
// Formato 1080x1350 (4:5) porque é o que o WhatsApp mostra inteiro na
// conversa, sem precisar abrir, e é o mesmo recorte do feed do Instagram.
//
// NADA aqui é do Rouge. A identidade que entra é a logo do salão, que vem do
// cadastro; as cores são neutras de propósito. Modelo com dado de um salão
// já vazou para salão novo antes — ver a regra dos defaults.

const L = 1080
const A = 1350

const FUNDO = '#17120F'       // quase preto, quente
const CREME = '#F3EBE3'
const ACENTO = '#C9A227'      // dourado contido, de presente

const SERIF = 'Georgia, "Times New Roman", serif'
const SANS = '"Helvetica Neue", Arial, sans-serif'

/** Carrega a logo sem sujar o canvas. Se o servidor da imagem não mandar o
 *  cabeçalho de CORS, o `onerror` dispara e seguimos sem logo — melhor isso
 *  do que um canvas contaminado, onde `toBlob` falha e a arte inteira se
 *  perde por causa de um enfeite. */
function carregarLogo(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
    // Rede ruim não pode travar o botão de compartilhar.
    setTimeout(() => resolve(null), 4000)
  })
}

/** Texto centrado, com a fonte já montada. */
function centro(ctx: CanvasRenderingContext2D, texto: string, y: number, fonte: string, cor: string, espaco = 0) {
  ctx.font = fonte
  ctx.fillStyle = cor
  ctx.textAlign = 'center'
  if (!espaco) { ctx.fillText(texto, L / 2, y); return }
  // O canvas não tem letter-spacing confiável em todo navegador: desenhamos
  // caractere a caractere para o rótulo pequeno ficar espaçado de verdade.
  const larguras = [...texto].map(c => ctx.measureText(c).width)
  const total = larguras.reduce((s, w) => s + w, 0) + espaco * (texto.length - 1)
  let x = (L - total) / 2
  ctx.textAlign = 'left'
  ;[...texto].forEach((c, i) => { ctx.fillText(c, x, y); x += larguras[i] + espaco })
  ctx.textAlign = 'center'
}

export interface DadosArte {
  codigo: string
  nomeSalao: string
  logo: string | null
  percentual: number
  validoAte: string | null
}

export async function desenharCupom(d: DadosArte): Promise<Blob | null> {
  const cv = document.createElement('canvas')
  cv.width = L; cv.height = A
  const ctx = cv.getContext('2d')
  if (!ctx) return null

  // Fundo com um brilho quente atrás do código, para a arte não ficar chapada.
  ctx.fillStyle = FUNDO
  ctx.fillRect(0, 0, L, A)
  const brilho = ctx.createRadialGradient(L / 2, 700, 40, L / 2, 700, 620)
  brilho.addColorStop(0, 'rgba(201,162,39,.13)')
  brilho.addColorStop(1, 'rgba(201,162,39,0)')
  ctx.fillStyle = brilho
  ctx.fillRect(0, 0, L, A)

  // Moldura fina, a um respiro da borda: dá o ar de convite impresso.
  ctx.strokeStyle = 'rgba(243,235,227,.22)'
  ctx.lineWidth = 2
  ctx.strokeRect(44, 44, L - 88, A - 88)

  // ── Posições fixas, não acumuladas ───────────────────────────────────────
  //
  // Antes isto era `y += altura` a cada bloco, e o "10%" subia por cima do
  // rótulo: `fillText` ancora na BASELINE, então um texto de 170px ocupa os
  // 130px ACIMA do y, não abaixo. Com marcas absolutas dá para ver o
  // espaçamento sem simular a soma de cabeça.
  const Y_MARCA = 168
  const Y_SELO = 348
  const Y_PCT = 580          // baseline do número grande
  const Y_SUB = 672
  const Y_CAIXA = 782        // topo da moldura tracejada
  const H_CAIXA = 232
  const Y_RECEP = A - 196
  const Y_VAL = A - 150

  // ── Topo: a identidade é do salão, nunca do sistema ──
  //
  // A logo entra recolorida em creme, e o recorte é feito pela LUMINÂNCIA,
  // não pelo canal alfa.
  //
  // Esta é a segunda tentativa. A primeira usava `source-in`, que pinta onde
  // o pixel é opaco -- e funcionou no PNG da pasta de artes, mas a logo que
  // o salão tem cadastrada é JPEG. JPEG não tem transparência: TODO pixel é
  // opaco, inclusive o fundo branco. O resultado foi uma tarja creme sólida
  // no lugar da marca, que foi para o WhatsApp antes de alguém ver.
  //
  // Pela luminância, o fundo claro vira transparente e o desenho fica, em
  // qualquer um dos dois formatos. A faixa de corte é generosa (0,72 a 0,96)
  // porque a logo do salão pode ser clara -- a do Rouge é laranja, perto de
  // 0,6 -- e um limiar apertado a apagaria junto com o fundo.
  const logo = d.logo ? await carregarLogo(d.logo) : null
  let marcaDesenhada = false

  if (logo && logo.width && logo.height) {
    const lg = Math.min((logo.width / logo.height) * 104, 560)
    const al = lg * (logo.height / logo.width)

    const aux = document.createElement('canvas')
    aux.width = Math.max(1, Math.round(lg))
    aux.height = Math.max(1, Math.round(al))
    const ax = aux.getContext('2d')

    if (ax) {
      ax.drawImage(logo, 0, 0, aux.width, aux.height)
      try {
        const img = ax.getImageData(0, 0, aux.width, aux.height)
        const px = img.data
        const [cr, cg, cb] = [243, 235, 227]      // CREME em rgb
        const CLARO = 0.96, ESCURO = 0.72
        let visiveis = 0
        for (let i = 0; i < px.length; i += 4) {
          const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255
          // Degrau suave entre as duas marcas: evita serrilhado na borda.
          let k = (CLARO - lum) / (CLARO - ESCURO)
          k = k < 0 ? 0 : k > 1 ? 1 : k
          const a = Math.round((px[i + 3] / 255) * k * 255)
          px[i] = cr; px[i + 1] = cg; px[i + 2] = cb; px[i + 3] = a
          if (a > 40) visiveis++
        }
        // Se quase nada sobrou, a logo era clara demais para este tratamento
        // e insistir desenharia um borrão. Melhor cair no nome do salão.
        if (visiveis > aux.width * aux.height * 0.01) {
          ax.putImageData(img, 0, 0)
          ctx.drawImage(aux, (L - lg) / 2, Y_MARCA - al / 2, lg, al)
          marcaDesenhada = true
        }
      } catch {
        // getImageData falha se a imagem veio de outro domínio sem CORS.
        // Nesse caso a logo original ainda serve: ela é feita para fundo
        // claro, então entra sobre uma placa, como último recurso.
        ctx.fillStyle = CREME
        ctx.fillRect((L - lg) / 2 - 28, Y_MARCA - al / 2 - 18, lg + 56, al + 36)
        ctx.drawImage(logo, (L - lg) / 2, Y_MARCA - al / 2, lg, al)
        marcaDesenhada = true
      }
    }
  }

  if (!marcaDesenhada) {
    centro(ctx, d.nomeSalao.toUpperCase().slice(0, 30), Y_MARCA, `500 36px ${SANS}`, CREME, 6)
  }

  // Fio curto sob a marca: separa sem pesar.
  ctx.strokeStyle = 'rgba(201,162,39,.5)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(L / 2 - 46, Y_MARCA + 74); ctx.lineTo(L / 2 + 46, Y_MARCA + 74); ctx.stroke()

  // ── Presente ──
  centro(ctx, 'UM PRESENTE PARA VOCÊ', Y_SELO, `400 27px ${SANS}`, ACENTO, 7)

  // "10%" e "OFF" na mesma linha de base, medidos juntos para o par ficar
  // centrado de verdade -- centrar cada um por si deixaria o conjunto torto.
  ctx.save()
  ctx.textAlign = 'left'
  const pct = `${d.percentual}%`
  ctx.font = `700 186px ${SERIF}`
  const wPct = ctx.measureText(pct).width
  ctx.font = `400 54px ${SERIF}`
  const wOff = ctx.measureText(' OFF').width
  const inicio = (L - (wPct + wOff)) / 2
  ctx.font = `700 186px ${SERIF}`
  ctx.fillStyle = CREME
  ctx.fillText(pct, inicio, Y_PCT)
  ctx.font = `400 54px ${SERIF}`
  ctx.fillStyle = ACENTO
  ctx.fillText(' OFF', inicio + wPct, Y_PCT)
  ctx.restore()

  centro(ctx, 'na sua primeira visita', Y_SUB, `italic 400 46px ${SERIF}`, 'rgba(243,235,227,.84)')

  // ── O código, que é o motivo da imagem existir ──
  const bx = 112, bw = L - 224
  ctx.save()
  ctx.fillStyle = 'rgba(201,162,39,.06)'
  ctx.fillRect(bx, Y_CAIXA, bw, H_CAIXA)
  ctx.strokeStyle = 'rgba(201,162,39,.6)'
  ctx.lineWidth = 3
  ctx.setLineDash([13, 11])
  ctx.strokeRect(bx, Y_CAIXA, bw, H_CAIXA)
  ctx.restore()

  centro(ctx, 'SEU CUPOM', Y_CAIXA + 58, `400 24px ${SANS}`, 'rgba(243,235,227,.62)', 6)

  // O código encolhe se for longo, para nunca estourar a moldura.
  let tam = 92
  ctx.font = `700 ${tam}px ${SANS}`
  while (ctx.measureText(d.codigo).width > bw - 110 && tam > 40) {
    tam -= 4
    ctx.font = `700 ${tam}px ${SANS}`
  }
  centro(ctx, d.codigo, Y_CAIXA + 168, `700 ${tam}px ${SANS}`, CREME, 5)

  // ── Pé ──
  centro(ctx, 'Apresente este cupom na recepção', Y_RECEP, `400 31px ${SANS}`, 'rgba(243,235,227,.74)')
  centro(ctx, d.validoAte
    ? `Válido até ${d.validoAte.split('-').reverse().join('/')}`
    : d.nomeSalao, Y_VAL, `400 27px ${SANS}`, 'rgba(243,235,227,.46)')

  return new Promise(resolve => cv.toBlob(b => resolve(b), 'image/png', 0.95))
}
