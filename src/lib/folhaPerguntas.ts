// ── A folha de PERGUNTAS, para ler no papel ─────────────────────────────────
//
// O sistema já imprimia o RESULTADO de uma avaliação. Faltava imprimir a
// avaliação em branco: o dono quis ler as perguntas no papel, com calma, e
// quem avalia fora da tela precisa de uma folha que dê para preencher à mão
// (pedido dele em 12/10/2026).
//
// Vive num arquivo só porque são DOIS lugares que imprimem — a avaliação do
// profissional e a avaliação 360 por cargo. Com o CSS duplicado, um dia as
// duas folhas ficariam diferentes e ninguém saberia qual é a certa.
//
// As decisões de impressão que não são óbvias:
//
//  - `break-inside: avoid` em cada LINHA e `break-after: avoid` no título da
//    seção. Sem isso a quebra de página corta a pergunta no meio e deixa
//    título órfão no pé da folha.
//  - A escala é repetida no cabeçalho de CADA seção, não só no topo. Em papel
//    ninguém volta à primeira página para lembrar o que é 3.
//  - As caixinhas de nota são desenhadas (borda), não caracteres: caneta cabe
//    dentro, e não dependem de fonte instalada.
//  - `print-color-adjust: exact`, senão o navegador come as cores das seções
//    e a folha sai cinza.
//  - Numeração contínua: quem lê no papel e vai conferir na tela acha o ponto
//    pelo número.

export interface LinhaFolha {
  texto: string
  /** Ponto não negociável: ganha a tarja e sai marcado na folha. */
  critico?: boolean
  /** Observação curta embaixo da pergunta (quem responde, ajuda etc.). */
  nota?: string
}
export interface SecaoFolha {
  titulo: string
  cor?: string
  linhas: LinhaFolha[]
}
export interface FolhaPerguntas {
  titulo: string
  subtitulo?: string
  /** Logo do salão em data URL; sem ela, sai o nome do salão escrito. */
  logo?: string
  nomeSalao?: string
  /** Rótulos da escala, do menor para o maior. Ex.: ['1 = Muito abaixo', ...] */
  escala: string[]
  /** Campos para preencher à mão no topo (Avaliado, Avaliador, Data...). */
  campos?: string[]
  /** Texto de abertura, se a ficha tiver um. */
  apresentacao?: string
  secoes: SecaoFolha[]
}

const esc = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const CSS = `
@page { size: A4 portrait; margin: 14mm 13mm 16mm; }

*{ box-sizing:border-box; margin:0; padding:0; }
html,body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body{
  font-family:'Segoe UI', Calibri, Arial, sans-serif;
  color:#23262f; font-size:10pt; line-height:1.45;
  orphans:3; widows:3;
}

/* ── Cabeçalho ─────────────────────────────────────────────────────────── */
.capa{ border-bottom:2.5px solid #5b4fcf; padding-bottom:9px; margin-bottom:13px;
       display:flex; justify-content:space-between; align-items:flex-end; gap:16px; }
.capa .logo{ height:30px; width:auto; display:block; margin-bottom:5px; }
.capa .marca{ font-size:15pt; font-weight:900; color:#5b4fcf; letter-spacing:-.3px; }
.capa .t{ font-size:16pt; font-weight:800; line-height:1.12; }
.capa .s{ font-size:8pt; letter-spacing:2.2px; text-transform:uppercase; color:#7a756d; margin-top:4px; }
.capa .d{ font-size:8.5pt; color:#7a756d; text-align:right; white-space:nowrap; }

/* ── Campos para preencher à mão ───────────────────────────────────────── */
.campos{ display:flex; flex-wrap:wrap; gap:9px 16px; margin-bottom:12px; }
.campos .c{ flex:1 1 180px; }
.campos .c b{ display:block; font-size:7.5pt; text-transform:uppercase; letter-spacing:1px;
              color:#7a756d; font-weight:700; margin-bottom:11px; }
.campos .c i{ display:block; border-bottom:1px solid #c9c4bd; }

.abertura{ background:#f7f6fb; border-left:3px solid #5b4fcf; border-radius:0 6px 6px 0;
           padding:9px 12px; margin-bottom:13px; font-size:9pt; color:#4a4e5a; break-inside:avoid; }

/* ── Escala ────────────────────────────────────────────────────────────── */
.escala{ display:flex; flex-wrap:wrap; gap:5px; margin-bottom:14px; }
.escala span{ border:1px solid #dcd8d2; border-radius:4px; padding:3px 8px;
              font-size:7.5pt; color:#5c5750; background:#fbfaf8; }

/* ── Seções ────────────────────────────────────────────────────────────── */
.sec{ margin-bottom:14px; }
.sec > h2{
  font-size:9.5pt; font-weight:800; color:#fff; letter-spacing:.4px;
  padding:5px 10px; border-radius:5px; margin-bottom:0;
  break-after:avoid; page-break-after:avoid;
}
/* A escala volta em cada seção: no papel ninguém folheia de volta. */
.sec > .mini{ display:flex; gap:12px; padding:4px 10px 5px; font-size:7pt; color:#9a948c;
              letter-spacing:.3px; break-after:avoid; page-break-after:avoid; }

table{ width:100%; border-collapse:collapse; }
tr{ break-inside:avoid; page-break-inside:avoid; }
td{ padding:5.5px 0; border-bottom:1px dotted #ddd9d3; vertical-align:top; }
td.n{ width:22px; font-size:8pt; color:#9a948c; font-weight:700; padding-right:4px; }
td.q{ font-size:9.5pt; }
td.q .obs{ display:block; font-size:7.5pt; color:#9a948c; margin-top:1px; }
td.b{ width:132px; text-align:right; white-space:nowrap; padding-left:8px; }
td.b i{ display:inline-block; width:19px; height:17px; margin-left:3px;
        border:1px solid #c9c4bd; border-radius:3px; vertical-align:middle; }

/* Ponto não negociável: tem de saltar no papel, não só na tela. */
tr.critico td{ background:#fff7f6; }
tr.critico td.q::after{
  content:'NAO NEGOCIAVEL'; display:inline-block; margin-left:7px;
  font-size:6.5pt; font-weight:800; letter-spacing:.7px;
  color:#b4322a; border:1px solid #e9b9b4; border-radius:3px; padding:0 4px;
}

.pe{ margin-top:16px; padding-top:7px; border-top:1px solid #e4e0da;
     font-size:7.5pt; color:#9a948c; display:flex; justify-content:space-between; }
`

export function folhaDePerguntas(f: FolhaPerguntas): string {
  const data = new Date().toLocaleDateString('pt-BR')
  const totalLinhas = f.secoes.reduce((a, s) => a + s.linhas.length, 0)

  const topo = f.logo
    ? `<img class="logo" src="${esc(f.logo)}" alt="">`
    : `<div class="marca">${esc(f.nomeSalao || 'NODRI')}</div>`

  const campos = (f.campos && f.campos.length)
    ? `<div class="campos">${f.campos.map(c => `<div class="c"><b>${esc(c)}</b><i></i></div>`).join('')}</div>`
    : ''

  const abertura = f.apresentacao
    ? `<div class="abertura">${esc(f.apresentacao).replace(/\n/g, '<br>')}</div>`
    : ''

  const escala = f.escala.length
    ? `<div class="escala">${f.escala.map(e => `<span>${esc(e)}</span>`).join('')}</div>`
    : ''

  // As caixinhas: uma por nota da escala.
  const caixas = '<i></i>'.repeat(Math.max(f.escala.length, 1))

  let n = 0
  const secoes = f.secoes.map(s => {
    const cor = s.cor || '#5b4fcf'
    const linhas = s.linhas.map(l => {
      n++
      return `<tr class="${l.critico ? 'critico' : ''}">`
        + `<td class="n">${n}</td>`
        + `<td class="q">${esc(l.texto)}${l.nota ? `<span class="obs">${esc(l.nota)}</span>` : ''}</td>`
        + `<td class="b">${caixas}</td></tr>`
    }).join('')
    return `<section class="sec">`
      + `<h2 style="background:${esc(cor)}">${esc(s.titulo)}</h2>`
      + `<div class="mini">${f.escala.map(e => `<span>${esc(e)}</span>`).join('')}</div>`
      + `<table>${linhas}</table></section>`
  }).join('')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>${esc(f.titulo)}${f.subtitulo ? ' — ' + esc(f.subtitulo) : ''}</title>
<style>${CSS}</style></head><body>
<header class="capa">
  <div>
    ${topo}
    <div class="t">${esc(f.titulo)}</div>
    ${f.subtitulo ? `<div class="s">${esc(f.subtitulo)}</div>` : ''}
  </div>
  <div class="d">${totalLinhas} ponto${totalLinhas === 1 ? '' : 's'}<br>${esc(data)}</div>
</header>
${campos}${abertura}${escala}${secoes}
<div class="pe"><span>${esc(f.subtitulo || f.titulo)}</span><span>${esc(data)}</span></div>
<script>window.onload=function(){setTimeout(function(){window.print()},120)}</script>
</body></html>`
}
