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

/**
 * Raio do círculo da foto. Exportado porque a tela de edição precisa da MESMA
 * conta para transformar o arrasto do dedo em deslocamento — com duas cópias
 * da fórmula, uma muda e a outra fica para trás, e o arrasto passa a andar
 * mais (ou menos) que o dedo.
 */
export function raioDoCirculo(W: number, H: number): number {
  return Math.min(W * 0.295, H * 0.158)
}

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
  logoLuminancia?: number  // 0 a 1; decide se a logo ainda se enxerga no tema
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
  const raio = raioDoCirculo(W, H)
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

  // ── bloco de texto: MEDIDO antes de ser pintado ────────────────────────────
  //
  // Antes o título nascia numa altura fixa e só a mensagem era centrada no que
  // sobrava. Com mensagem curta, toda a folga se acumulava num lugar só — o
  // vão entre o texto e a logo, que era o que ficava feio.
  //
  // Agora o conjunto inteiro (Parabéns, o nome na tarja, "Feliz aniversário" e
  // a mensagem) é medido primeiro e centrado como um bloco único no espaço
  // entre a foto e a assinatura. Assim a folga que sobra se divide por igual
  // em cima e embaixo, e mensagem curta apenas aproxima o conjunto, em vez de
  // abrir um buraco no rodapé.
  const yAssinatura = H * 0.925

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const corpoTitulo = Math.round(W * 0.100)
  const corpoNome = Math.round(W * 0.076)
  const corpoSub = Math.round(W * 0.040)
  const fitaH = corpoNome * 1.5

  const vaoTituloFita = H * 0.010
  const vaoFitaSub = H * 0.022
  const vaoSubMsg = H * 0.026

  const regiaoTopo = cy + raio + H * 0.030
  const regiaoBase = yAssinatura - H * 0.052

  const alturaFixa = corpoTitulo + vaoTituloFita + fitaH + vaoFitaSub + corpoSub + vaoSubMsg
  const larguraMsg = W * 0.78
  const sobraParaMsg = Math.max(corpoSub, regiaoBase - regiaoTopo - alturaFixa)

  // O corpo da mensagem começa grande e só encolhe se precisar caber. Frase
  // curta fica com letra maior, o que ajuda a ocupar a página com dignidade.
  let corpoMsg = Math.round(W * 0.040)
  let linhas: string[] = []
  for (; corpoMsg >= Math.round(W * 0.024); corpoMsg -= 2) {
    ctx.font = `400 ${corpoMsg}px 'DM Sans', 'Segoe UI', sans-serif`
    linhas = quebrar(ctx, d.mensagem, larguraMsg, 5)
    if (linhas.length * corpoMsg * 1.5 <= sobraParaMsg) break
  }
  const alturaBloco = alturaFixa + linhas.length * corpoMsg * 1.5
  let y = regiaoTopo + Math.max(0, (regiaoBase - regiaoTopo - alturaBloco) / 2)

  // ── "Parabéns" ─────────────────────────────────────────────────────────────
  ctx.fillStyle = tema.titulo
  ctx.font = `800 ${corpoTitulo}px 'Syne', 'Segoe UI', sans-serif`
  ctx.fillText(d.titulo, cx, y)
  y += corpoTitulo + vaoTituloFita

  // ── tarja com o nome ───────────────────────────────────────────────────────
  ctx.font = `700 ${corpoNome}px 'Syne', 'Segoe UI', sans-serif`
  const larguraNome = Math.min(ctx.measureText(d.nome).width, W * 0.72)
  const fitaW = larguraNome + W * 0.13
  const fitaY = y
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
  ctx.textBaseline = 'top'
  y += fitaH + vaoFitaSub

  // ── "Feliz aniversário" ────────────────────────────────────────────────────
  // A data precisa estar dita na arte, e não depender de a mensagem lembrar de
  // dizê-la. Em versalete espaçado, logo abaixo do nome: lê como legenda do
  // nome, não compete com o "Parabéns" e ainda encurta o caminho entre a tarja
  // e o texto, que era onde o vazio aparecia.
  ctx.fillStyle = tema.titulo
  ctx.font = `700 ${corpoSub}px 'Syne', 'Segoe UI', sans-serif`
  try { (ctx as any).letterSpacing = `${Math.round(W * 0.007)}px` } catch { /* navegador antigo ignora */ }
  ctx.fillText('FELIZ ANIVERSÁRIO', cx, y)
  try { (ctx as any).letterSpacing = '0px' } catch { /* idem */ }
  y += corpoSub + vaoSubMsg

  // ── mensagem ───────────────────────────────────────────────────────────────
  ctx.fillStyle = tema.texto
  ctx.font = `400 ${corpoMsg}px 'DM Sans', 'Segoe UI', sans-serif`
  linhas.forEach((l, i) => {
    ctx.fillText(l, cx, y + i * corpoMsg * 1.5)
  })
  ctx.textBaseline = 'alphabetic'

  // ── assinatura do salão ────────────────────────────────────────────────────
  if (d.logo && d.logo.naturalWidth) {
    const alturaLogo = Math.min(H * 0.062, W * 0.11)
    const larguraLogo = (d.logo.naturalWidth / d.logo.naturalHeight) * alturaLogo
    const maxLargura = W * 0.5
    const escala = larguraLogo > maxLargura ? maxLargura / larguraLogo : 1
    const lw = larguraLogo * escala
    const lh = alturaLogo * escala

    // Depois de tirar o fundo branco pode sobrar o problema oposto: logo escura
    // sobre tema escuro (ou clara sobre tema claro) simplesmente some. Quando
    // logo e fundo têm brilho parecido, entra uma plaquinha de contraste — bem
    // arredondada e com folga, para ler como escolha de desenho, e não como o
    // retângulo branco que veio junto do arquivo.
    const lumLogo = typeof d.logoLuminancia === 'number' ? d.logoLuminancia : 0.5
    const lumFundo = luminanciaDe(tema.fundo)
    if (Math.abs(lumLogo - lumFundo) < 0.34) {
      const folga = lh * 0.42
      ctx.fillStyle = lumFundo < 0.5 ? 'rgba(255,255,255,.93)' : 'rgba(20,18,16,.06)'
      arredondado(ctx, cx - lw / 2 - folga, yAssinatura - lh / 2 - folga * 0.75,
        lw + folga * 2, lh + folga * 1.5, (lh + folga * 1.5) * 0.34)
      ctx.fill()
    }

    ctx.drawImage(d.logo, cx - lw / 2, yAssinatura - lh / 2, lw, lh)
  } else if (d.assinatura) {
    ctx.fillStyle = tema.texto
    ctx.font = `700 ${Math.round(W * 0.036)}px 'Syne', 'Segoe UI', sans-serif`
    ctx.fillText(d.assinatura, cx, yAssinatura + W * 0.012)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO: tirar o fundo branco que veio dentro do arquivo
//
// A logo do salão é salva como imagem comum, e quase toda logo que a gente
// recebe vem com fundo branco chapado — foi exportada assim. Sobre a arte
// clara ninguém nota; sobre o tema escuro vira um retângulo branco no meio do
// rodapé.
//
// Trocar a extensão para .png NÃO resolve: o branco não é "falta de fundo", são
// pixels brancos de verdade. PNG só permite transparência, não a cria.
//
// O que resolve é apagar o branco. E apagar só o do FUNDO: varrendo a partir
// das bordas para dentro, parando onde a cor muda. Assim o branco que faz parte
// do desenho (o miolo de uma letra, um brilho) fica de pé — se fosse por
// "apague todo pixel claro", a logo sairia esburacada.
// ─────────────────────────────────────────────────────────────────────────────

export interface LogoPreparada {
  imagem: HTMLImageElement
  luminancia: number   // 0 a 1, média do que sobrou visível
}

function quaseBranco(d: Uint8ClampedArray, i: number): boolean {
  const r = d[i], g = d[i + 1], b = d[i + 2]
  const menor = Math.min(r, g, b)
  const maior = Math.max(r, g, b)
  // claro E sem cor: branco sujo e cinza clarinho entram, amarelo claro não
  return menor > 228 && maior - menor < 26
}

export async function prepararLogo(original: HTMLImageElement): Promise<LogoPreparada | null> {
  const L = original.naturalWidth, A = original.naturalHeight
  if (!L || !A) return null

  const tela = document.createElement('canvas')
  tela.width = L
  tela.height = A
  const ctx = tela.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(original, 0, 0)

  let dados: ImageData
  try {
    dados = ctx.getImageData(0, 0, L, A)
  } catch {
    // Imagem de outro domínio suja o canvas e a leitura é proibida. Devolve a
    // logo como veio: melhor com fundo branco do que sem logo nenhuma.
    return { imagem: original, luminancia: 0.5 }
  }

  const d = dados.data
  const total = L * A

  // Primeiro a pergunta que decide tudo: o branco é o FUNDO ou é a MARCA?
  // Logo branca sobre fundo colorido existe, e nela apagar o branco apagaria a
  // logo inteira. A conta é simples — se quase tudo que está opaco é branco,
  // o branco é a marca, e a imagem sai como veio (a plaquinha de contraste
  // resolve a leitura dela sobre fundo claro).
  let brancos = 0, opacos = 0
  for (let p = 0; p < total; p++) {
    const i = p * 4
    if (d[i + 3] < 40) continue
    opacos++
    if (quaseBranco(d, i)) brancos++
  }
  const proporcaoBranca = opacos ? brancos / opacos : 0

  if (proporcaoBranca < 0.9) {
    // Apaga TODO pixel quase branco, não só o que encosta na borda.
    //
    // A primeira versão varria só a partir das bordas, para preservar branco
    // que fosse parte do desenho. Ficou errado no caso mais comum: o vazado
    // das letras. O miolo do "o" é cercado pela tinta da própria letra, então
    // a varredura nunca chega lá — e a logo saiu com bolhas brancas dentro das
    // letras sobre o fundo escuro, que é justamente o defeito que se queria
    // corrigir.
    for (let p = 0; p < total; p++) {
      const i = p * 4
      if (d[i + 3] >= 40 && quaseBranco(d, i)) d[i + 3] = 0
    }
  }

  ctx.putImageData(dados, 0, 0)

  // Média do que sobrou: é o que diz se a logo é escura ou clara, e portanto se
  // ela ainda se enxerga sobre o fundo do tema escolhido.
  let soma = 0, contados = 0
  for (let p = 0; p < L * A; p += 7) {
    const i = p * 4
    if (d[i + 3] < 40) continue
    soma += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
    contados++
  }

  const limpa = new Image()
  await new Promise<void>(pronto => {
    limpa.onload = () => pronto()
    limpa.onerror = () => pronto()
    limpa.src = tela.toDataURL('image/png')
  })

  return { imagem: limpa, luminancia: contados ? soma / contados : 0.5 }
}

/** Luminância de uma cor #rrggbb, para comparar logo e fundo. */
export function luminanciaDe(hex: string): number {
  let h = (hex || '').replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return 1
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
