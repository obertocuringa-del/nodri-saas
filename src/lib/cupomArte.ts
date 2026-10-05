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
  // A logo entra como SILHUETA creme, não como imagem crua.
  //
  // A logo do salão é feita para papel branco: cores claras e often um
  // "hair" em cinza escuro que, sobre este fundo quase preto, sumiria. A
  // saída anterior foi pôr uma placa branca atrás -- e a placa virou um
  // retângulo duro no meio de uma arte que não tem nenhum outro.
  //
  // Recolorir resolve os dois: a marca aparece inteira, na cor da arte, e
  // sem moldura. É o mesmo tratamento que as artes do salão já dão à logo.
  const logo = d.logo ? await carregarLogo(d.logo) : null
  if (logo && logo.width && logo.height) {
    const lg = Math.min((logo.width / logo.height) * 104, 560)
    const al = lg * (logo.height / logo.width)

    // Canvas à parte: `source-in` pinta só onde a logo tem pixel, e usar o
    // canvas principal apagaria o fundo já desenhado.
    const aux = document.createElement('canvas')
    aux.width = Math.ceil(lg); aux.height = Math.ceil(al)
    const ax = aux.getContext('2d')
    if (ax) {
      ax.drawImage(logo, 0, 0, lg, al)
      ax.globalCompositeOperation = 'source-in'
      ax.fillStyle = CREME
      ax.fillRect(0, 0, lg, al)
      ctx.drawImage(aux, (L - lg) / 2, Y_MARCA - al / 2, lg, al)
    } else {
      ctx.drawImage(logo, (L - lg) / 2, Y_MARCA - al / 2, lg, al)
    }
  } else {
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
