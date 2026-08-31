// ─────────────────────────────────────────────────────────────────────────────
// ARTE DE ANIVERSÁRIO — o desenho, separado da tela
//
// Este arquivo só sabe desenhar. Ele recebe um contexto de canvas, o tamanho e
// o que deve aparecer, e pinta. Não sabe o que é React, não abre janela, não
// baixa arquivo.
//
// A separação existe por causa dos DOIS tamanhos. Stories é 1080x1920 e o feed
// é 1080x1350 — proporções diferentes. Se a arte fosse desenhada uma vez e
// recortada, o feed sairia com a cabeça ou o rodapé cortados, que é exatamente
// o que não pode acontecer. Aqui cada tamanho é DESENHADO do zero: a largura é
// a mesma nos dois (1080), então o texto tem o mesmo corpo; o que muda é o
// espaçamento vertical, que se distribui pela altura disponível.
// ─────────────────────────────────────────────────────────────────────────────

export interface Tema {
  id: string
  nome: string
  familia: 'feminino' | 'masculino' | 'neutro'
  faixaTopo: string      // topo da faixa decorativa
  faixaBaixo: string     // onde a faixa decorativa se dissolve no fundo
  fundo: string          // corpo da arte
  fita: string           // tarja atrás do nome
  fitaSombra: string     // dobra lateral da tarja
  titulo: string         // "Parabéns"
  nome_: string          // o nome dentro da tarja
  texto: string          // mensagem
  aro: string            // anel em volta da foto
  baloes: string[]       // cores dos balões
  brilho: string         // pontinhos da faixa de cima
}

export const TEMAS: Tema[] = [
  {
    id: 'rose', nome: 'Rosé', familia: 'feminino',
    faixaTopo: '#f0c3ce', faixaBaixo: '#fbf1f3', fundo: '#fdfaf9',
    fita: '#d8a0ad', fitaSombra: '#bf8794',
    titulo: '#6f4450', nome_: '#ffffff', texto: '#8b7078',
    aro: '#ffffff', baloes: ['#e9bcc7', '#f6dde3', '#cf9aa7', '#ffffff'],
    brilho: 'rgba(255,255,255,.75)',
  },
  {
    id: 'lavanda', nome: 'Lavanda', familia: 'feminino',
    faixaTopo: '#d3c6ef', faixaBaixo: '#f5f2fd', fundo: '#fcfaff',
    fita: '#9d86cd', fitaSombra: '#8570b5',
    titulo: '#4d4177', nome_: '#ffffff', texto: '#7c749b',
    aro: '#ffffff', baloes: ['#c7b6e8', '#e8e0f7', '#a692d6', '#ffffff'],
    brilho: 'rgba(255,255,255,.78)',
  },
  {
    id: 'champagne', nome: 'Champanhe', familia: 'neutro',
    faixaTopo: '#e6d3b4', faixaBaixo: '#faf5ec', fundo: '#fdfbf6',
    fita: '#bd9c6c', fitaSombra: '#a2834f',
    titulo: '#63502f', nome_: '#ffffff', texto: '#8a7a62',
    aro: '#ffffff', baloes: ['#dcc59c', '#f2e6d1', '#c0a274', '#ffffff'],
    brilho: 'rgba(255,255,255,.8)',
  },
  {
    id: 'noite', nome: 'Azul-noite', familia: 'masculino',
    faixaTopo: '#26405f', faixaBaixo: '#132339', fundo: '#0e1b2c',
    fita: '#2f5580', fitaSombra: '#24425f',
    titulo: '#ffffff', nome_: '#ffffff', texto: '#9db4cd',
    aro: '#ffffff', baloes: ['#2c4a6b', '#3d6690', '#1d3350', '#8fa7c2'],
    brilho: 'rgba(255,255,255,.35)',
  },
  {
    id: 'grafite', nome: 'Grafite', familia: 'masculino',
    faixaTopo: '#33363b', faixaBaixo: '#1d1f22', fundo: '#17181a',
    fita: '#3f8d7d', fitaSombra: '#317063',
    titulo: '#ffffff', nome_: '#ffffff', texto: '#a9aeb4',
    aro: '#ffffff', baloes: ['#3a3e44', '#50565e', '#2b8574', '#8b9299'],
    brilho: 'rgba(255,255,255,.3)',
  },
]

export const FORMATOS = {
  stories: { w: 1080, h: 1920, rotulo: 'Stories', sufixo: 'stories' },
  feed: { w: 1080, h: 1350, rotulo: 'Feed', sufixo: 'feed' },
} as const

export type FormatoId = keyof typeof FORMATOS

/** Enquadramento da foto dentro do círculo. */
export interface Enquadre { x: number; y: number; zoom: number }

export interface DadosArte {
  tema: Tema
  foto: HTMLImageElement | null
  enquadre: Enquadre
  titulo: string       // "Parabéns"
  nome: string         // nome do profissional
  mensagem: string
  logo: HTMLImageElement | null
  assinatura: string   // nome do salão, usado quando não há logo
}

// Ruído sempre igual: as duas artes (stories e feed) precisam ter os brilhos e
// os balões nos mesmos lugares relativos, senão parecem duas peças diferentes.
function aleatorio(semente: number) {
  let s = semente
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

function arredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Um balão: corpo com luz vinda de cima à esquerda, nó e barbante. */
function balao(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, cor: string, ate: number) {
  ctx.save()

  // barbante primeiro, para nascer atrás do corpo
  ctx.strokeStyle = 'rgba(0,0,0,.13)'
  ctx.lineWidth = Math.max(1.4, r * 0.035)
  ctx.beginPath()
  ctx.moveTo(cx, cy + r * 1.12)
  ctx.quadraticCurveTo(cx + r * 0.42, cy + r * 1.9, cx - r * 0.12, ate)
  ctx.stroke()

  const g = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.42, r * 0.08, cx, cy, r * 1.12)
  g.addColorStop(0, 'rgba(255,255,255,.92)')
  g.addColorStop(0.28, cor)
  g.addColorStop(1, 'rgba(0,0,0,.16)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * 0.88, r, 0, 0, Math.PI * 2)
  ctx.fill()

  // nó
  ctx.fillStyle = cor
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.11, cy + r * 0.98)
  ctx.lineTo(cx + r * 0.11, cy + r * 0.98)
  ctx.lineTo(cx, cy + r * 1.16)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

/** Quebra o texto em linhas que cabem na largura, com um teto de linhas. */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maxLinhas: number): string[] {
  const palavras = String(texto || '').trim().split(/\s+/)
  const linhas: string[] = []
  let atual = ''
  for (const p of palavras) {
    const teste = atual ? atual + ' ' + p : p
    if (ctx.measureText(teste).width <= largura || !atual) {
      atual = teste
    } else {
      linhas.push(atual)
      atual = p
      if (linhas.length >= maxLinhas) break
    }
  }
  if (atual && linhas.length < maxLinhas) linhas.push(atual)
  return linhas
}

/**
 * Desenha a arte inteira no contexto, no tamanho pedido.
 * As posições verticais são frações da ALTURA e os corpos de letra são frações
 * da LARGURA — é isso que faz o feed (mais baixo) apertar o espaçamento sem
 * encolher o texto nem cortar nada.
 */
export function desenharArte(ctx: CanvasRenderingContext2D, W: number, H: number, d: DadosArte) {
  const { tema } = d
  const rnd = aleatorio(20260831)

  // ── fundo ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = tema.fundo
  ctx.fillRect(0, 0, W, H)

  // ── faixa decorativa do topo, dissolvendo no fundo ─────────────────────────
  const alturaFaixa = H * 0.3
  const gf = ctx.createLinearGradient(0, 0, 0, alturaFaixa)
  gf.addColorStop(0, tema.faixaTopo)
  gf.addColorStop(1, tema.faixaBaixo)
  ctx.fillStyle = gf
  ctx.fillRect(0, 0, W, alturaFaixa)

  // brilhos na faixa
  for (let i = 0; i < 190; i++) {
    const x = rnd() * W
    const y = rnd() * alturaFaixa
    const r = rnd() * (W * 0.0042) + W * 0.0009
    const opacidade = (1 - y / alturaFaixa) * 0.85
    ctx.globalAlpha = Math.max(0, opacidade) * (0.35 + rnd() * 0.65)
    ctx.fillStyle = tema.brilho
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // ── foto ───────────────────────────────────────────────────────────────────
  const raio = Math.min(W * 0.295, H * 0.158)
  const cx = W / 2
  const cy = alturaFaixa * 0.86

  // balões em volta, sem invadir o círculo da foto
  const posicoes: [number, number, number][] = [
    [cx - raio * 1.72, cy - raio * 0.62, raio * 0.40],
    [cx - raio * 2.02, cy + raio * 0.42, raio * 0.31],
    [cx - raio * 1.45, cy + raio * 1.02, raio * 0.35],
    [cx + raio * 1.70, cy - raio * 0.70, raio * 0.38],
    [cx + raio * 2.04, cy + raio * 0.30, raio * 0.33],
    [cx + raio * 1.48, cy + raio * 1.06, raio * 0.36],
    [cx - raio * 1.30, cy - raio * 1.30, raio * 0.24],
    [cx + raio * 1.32, cy - raio * 1.34, raio * 0.26],
  ]
  posicoes.forEach(([bx, by, br], i) => {
    balao(ctx, bx, by, br, tema.baloes[i % tema.baloes.length], cy + raio * 1.9)
  })

  // anel e recorte redondo
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, raio + W * 0.014, 0, Math.PI * 2)
  ctx.fillStyle = tema.aro
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, raio, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (d.foto && d.foto.naturalWidth) {
    // A foto cobre o círculo: o menor lado dela vira o diâmetro, e o zoom e o
    // arrasto do usuário entram por cima disso.
    const base = (raio * 2) / Math.min(d.foto.naturalWidth, d.foto.naturalHeight)
    const esc = base * d.enquadre.zoom
    const lw = d.foto.naturalWidth * esc
    const lh = d.foto.naturalHeight * esc
    ctx.drawImage(
      d.foto,
      cx - lw / 2 + d.enquadre.x * raio,
      cy - lh / 2 + d.enquadre.y * raio,
      lw, lh,
    )
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.07)'
    ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2)
    ctx.fillStyle = 'rgba(0,0,0,.30)'
    ctx.font = `600 ${Math.round(W * 0.028)}px 'DM Sans', sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('foto aqui', cx, cy)
  }
  ctx.restore()

  // ── "Parabéns" ─────────────────────────────────────────────────────────────
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const yTitulo = cy + raio + H * 0.072
  ctx.fillStyle = tema.titulo
  ctx.font = `800 ${Math.round(W * 0.108)}px 'Syne', 'Segoe UI', sans-serif`
  ctx.fillText(d.titulo, cx, yTitulo)

  // ── tarja com o nome ───────────────────────────────────────────────────────
  const corpoNome = Math.round(W * 0.082)
  ctx.font = `700 ${corpoNome}px 'Syne', 'Segoe UI', sans-serif`
  const larguraNome = Math.min(ctx.measureText(d.nome).width, W * 0.74)
  const fitaW = larguraNome + W * 0.13
  const fitaH = corpoNome * 1.52
  const fitaY = yTitulo + H * 0.014
  const fitaX = cx - fitaW / 2

  // dobras laterais, que dão o ar de fita
  ctx.fillStyle = tema.fitaSombra
  ctx.beginPath()
  ctx.moveTo(fitaX, fitaY + fitaH * 0.1)
  ctx.lineTo(fitaX - W * 0.032, fitaY + fitaH * 0.32)
  ctx.lineTo(fitaX, fitaY + fitaH * 0.62)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(fitaX + fitaW, fitaY + fitaH * 0.1)
  ctx.lineTo(fitaX + fitaW + W * 0.032, fitaY + fitaH * 0.32)
  ctx.lineTo(fitaX + fitaW, fitaY + fitaH * 0.62)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = tema.fita
  arredondado(ctx, fitaX, fitaY, fitaW, fitaH, fitaH * 0.16)
  ctx.fill()

  ctx.fillStyle = tema.nome_
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${corpoNome}px 'Syne', 'Segoe UI', sans-serif`
  ctx.save()
  ctx.beginPath()
  ctx.rect(fitaX, fitaY, fitaW, fitaH)
  ctx.clip()
  ctx.fillText(d.nome, cx, fitaY + fitaH * 0.54)
  ctx.restore()
  ctx.textBaseline = 'alphabetic'

  // ── mensagem ───────────────────────────────────────────────────────────────
  // O espaço entre a tarja e o rodapé é o que sobrou; o corpo da letra diminui
  // até o texto caber nele. É o que impede a mensagem de invadir a logo no
  // formato de feed, que é mais baixo.
  const topoMsg = fitaY + fitaH + H * 0.045
  const baseRodape = H * 0.855
  const alturaDisponivel = baseRodape - topoMsg
  const larguraMsg = W * 0.78

  let corpoMsg = Math.round(W * 0.037)
  let linhas: string[] = []
  for (; corpoMsg >= Math.round(W * 0.023); corpoMsg -= 2) {
    ctx.font = `400 ${corpoMsg}px 'DM Sans', 'Segoe UI', sans-serif`
    linhas = quebrar(ctx, d.mensagem, larguraMsg, 6)
    if (linhas.length * corpoMsg * 1.52 <= alturaDisponivel) break
  }

  // Centrado no vao: o Stories e mais alto que o feed e, com o texto preso no
  // topo, sobrava um buraco entre a mensagem e a assinatura.
  const alturaTexto = linhas.length * corpoMsg * 1.52
  const yPrimeira = topoMsg + (alturaDisponivel - alturaTexto) / 2 + corpoMsg

  ctx.fillStyle = tema.texto
  ctx.font = `400 ${corpoMsg}px 'DM Sans', 'Segoe UI', sans-serif`
  linhas.forEach((l, i) => {
    ctx.fillText(l, cx, yPrimeira + i * corpoMsg * 1.52)
  })

  // ── assinatura do salão ────────────────────────────────────────────────────
  const yAssinatura = H * 0.925
  if (d.logo && d.logo.naturalWidth) {
    const alturaLogo = Math.min(H * 0.062, W * 0.11)
    const larguraLogo = (d.logo.naturalWidth / d.logo.naturalHeight) * alturaLogo
    const maxLargura = W * 0.5
    const escala = larguraLogo > maxLargura ? maxLargura / larguraLogo : 1
    ctx.drawImage(
      d.logo,
      cx - (larguraLogo * escala) / 2,
      yAssinatura - (alturaLogo * escala) / 2,
      larguraLogo * escala,
      alturaLogo * escala,
    )
  } else if (d.assinatura) {
    ctx.fillStyle = tema.texto
    ctx.font = `700 ${Math.round(W * 0.036)}px 'Syne', 'Segoe UI', sans-serif`
    ctx.fillText(d.assinatura, cx, yAssinatura + W * 0.012)
  }
}
