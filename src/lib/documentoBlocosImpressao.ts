import type { DocCargo, BlocoCargo } from '@/lib/descricaoCargoModelo'

// ── A folha impressa ───────────────────────────────────────────────────────
//
// Separada do componente porque impressão é outro meio, com outras regras:
// não há rolagem, a página tem borda física, e o que quebra no lugar errado
// não se conserta rolando. Aqui o A4 é tratado como A4.

export interface OpcoesImpressao {
  /** Tinta dos títulos e dos fios. */
  cor: string
  /** Corpo do texto em pt. O resto da escala sai daqui. */
  tamanho: number
  /** Logo do salão no cabeçalho, quando houver. */
  comLogo: boolean
  /** Linha de assinatura no pé da última página. */
  comAssinatura: boolean
  /** Numeração "página X de Y" no rodapé. */
  comNumeracao: boolean
  /** Uma seção por página. Útil para POP que vira cartaz na parede. */
  quebrarSecoes: boolean
}

export const IMPRESSAO_PADRAO: OpcoesImpressao = {
  cor: '#5b4fcf',
  tamanho: 11,
  comLogo: true,
  comAssinatura: false,
  comNumeracao: true,
  quebrarSecoes: false,
}

export const CORES_IMPRESSAO: Array<{ nome: string; cor: string }> = [
  { nome: 'Roxo', cor: '#5b4fcf' },
  { nome: 'Grafite', cor: '#2f3542' },
  { nome: 'Terracota', cor: '#a8624f' },
  { nome: 'Verde', cor: '#2F6B4F' },
  { nome: 'Vinho', cor: '#8a2b4a' },
]

const esc = (v: any) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const comQuebras = (v: any) => esc(v).replace(/\n/g, '<br>')

function blocoHtml(b: BlocoCargo, o: OpcoesImpressao): string {
  if (b.tipo === 'divisor') return '<hr>'

  const titulo = b.titulo.trim()
    ? `<h2${o.quebrarSecoes ? ' class="nova-pagina"' : ''}>${esc(b.titulo)}</h2>`
    : ''

  if (b.tipo === 'destaque') {
    return `${titulo}<div class="destaque">${comQuebras(b.corpo)}</div>`
  }
  if (b.tipo === 'lista' || b.tipo === 'checklist') {
    const cls = b.tipo === 'checklist' ? 'check' : 'bola'
    const itens = (b.itens || []).filter(i => i.trim())
      .map(i => `<li class="${cls}">${esc(i)}</li>`).join('')
    return `${titulo}<ul>${itens}</ul>`
  }
  return `${titulo}<p>${comQuebras(b.corpo)}</p>`
}

/**
 * A folha inteira, pronta para o `window.print()`.
 *
 * Decisões que valem para qualquer documento daqui:
 *
 *  - `break-after: avoid` no título: título sozinho no pé da página, com o
 *    conteúdo na seguinte, é o erro mais comum de documento impresso.
 *  - `break-inside: avoid` na lista e no destaque: uma lista de onze deveres
 *    partida ao meio obriga a virar a folha para saber o décimo.
 *  - orfãs e viúvas em 2: uma linha solta de parágrafo no topo da página
 *    parece erro de impressão.
 *  - o cabeçalho se repete em TODA página, porque folha solta de POP circula
 *    separada e precisa dizer de onde veio.
 */
export function folhaParaImprimir(
  doc: DocCargo,
  o: OpcoesImpressao,
  extras: { salao?: string; logo?: string | null; subtitulo?: string } = {},
): string {
  const corpo = doc.blocos.map(b => blocoHtml(b, o)).join('\n')
  const t = o.tamanho

  const css = `
@page {
  size: A4 portrait;
  margin: 16mm 15mm 18mm;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Segoe UI', Calibri, Arial, sans-serif;
  color: #23262f;
  font-size: ${t}pt;
  line-height: 1.62;
  /* Orfas e viuvas: nunca uma linha sozinha no pe nem no topo da folha. */
  orphans: 2;
  widows: 2;
}

/* ── Cabecalho, repetido em toda pagina ── */
.cabeca {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 14px; border-bottom: 2.5px solid ${o.cor};
  padding-bottom: 8px; margin-bottom: 16px;
}
.cabeca .quem { min-width: 0; }
.cabeca .titulo {
  font-size: ${(t * 1.72).toFixed(1)}pt; font-weight: 800;
  color: #1a1d26; letter-spacing: -.2px; line-height: 1.2;
}
.cabeca .sub {
  font-size: ${(t * 0.72).toFixed(1)}pt; letter-spacing: 2.4px;
  text-transform: uppercase; color: #7a756d; margin-top: 3px;
}
.cabeca img { max-height: 42px; max-width: 150px; object-fit: contain; }
.cabeca .salao {
  font-size: ${(t * 0.78).toFixed(1)}pt; font-weight: 700;
  color: ${o.cor}; text-align: right; white-space: nowrap;
}

/* ── Secoes ── */
h2 {
  font-size: ${(t * 1.04).toFixed(1)}pt; font-weight: 800;
  color: ${o.cor}; text-transform: uppercase; letter-spacing: .7px;
  margin: 15px 0 6px;
  /* Titulo nunca fica sozinho no pe da pagina. */
  break-after: avoid; page-break-after: avoid;
}
h2.nova-pagina { break-before: page; page-break-before: page; }
h2.nova-pagina:first-of-type { break-before: auto; page-break-before: auto; }
h2 + p, h2 + ul, h2 + .destaque { break-before: avoid; page-break-before: avoid; }

p { margin-bottom: 7px; text-align: justify; hyphens: auto; }

ul { list-style: none; margin: 0 0 9px; break-inside: avoid; page-break-inside: avoid; }
li { position: relative; padding-left: 16px; margin-bottom: 3.5px; break-inside: avoid; }
li.bola::before {
  content: '•'; position: absolute; left: 3px; top: -1px;
  color: ${o.cor}; font-weight: 700; font-size: ${(t * 1.15).toFixed(1)}pt;
}
li.check::before {
  content: '\\2713'; position: absolute; left: 0; top: 0;
  color: #2F6B4F; font-weight: 700;
}

.destaque {
  background: ${o.cor}0F;
  border-left: 3px solid ${o.cor};
  padding: 9px 13px; margin: 0 0 10px;
  break-inside: avoid; page-break-inside: avoid;
}

hr { border: none; border-top: 1px solid #dcd8d2; margin: 16px 0; }

/* ── Assinatura ── */
.assinatura {
  margin-top: 26px; padding-top: 4px;
  display: flex; gap: 34px; break-inside: avoid;
}
.assinatura div { flex: 1; border-top: 1px solid #23262f; padding-top: 5px;
  font-size: ${(t * 0.76).toFixed(1)}pt; color: #5c5750; text-align: center; }

/* ── Rodape ── */
.rodape {
  position: fixed; bottom: -11mm; left: 0; right: 0;
  display: flex; justify-content: space-between;
  font-size: ${(t * 0.68).toFixed(1)}pt; color: #9a948c;
  border-top: 1px solid #e8e4de; padding-top: 4px;
}

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* O cabecalho vira cabecalho de PAGINA, nao so do documento: folha solta
     de POP circula separada e precisa dizer de onde veio. */
  thead .cabeca-wrap { display: table-header-group; }
}
@media screen {
  body { max-width: 190mm; margin: 0 auto; padding: 16mm 15mm; }
  .rodape { position: static; margin-top: 22px; }
}
`

  const cabeca = `
<div class="cabeca">
  <div class="quem">
    <div class="titulo">${esc(doc.cargo)}</div>
    ${extras.subtitulo ? `<div class="sub">${esc(extras.subtitulo)}</div>` : ''}
  </div>
  ${o.comLogo && extras.logo
      ? `<img src="${esc(extras.logo)}" alt="">`
      : extras.salao ? `<div class="salao">${esc(extras.salao)}</div>` : ''}
</div>`

  const assinatura = o.comAssinatura ? `
<div class="assinatura">
  <div>Colaborador</div>
  <div>Coordenação</div>
  <div>Data</div>
</div>` : ''

  const hoje = new Date().toLocaleDateString('pt-BR')
  const rodape = `
<div class="rodape">
  <span>${esc(extras.salao || '')}</span>
  <span>${o.comNumeracao ? `Impresso em ${hoje}` : ''}</span>
</div>`

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>${esc(doc.cargo)}</title><style>${css}</style></head><body>
${cabeca}
${corpo || '<p><i>Sem conteúdo.</i></p>'}
${assinatura}
${rodape}
<script>window.onload=function(){setTimeout(function(){window.print()},220)}</script>
</body></html>`
}
