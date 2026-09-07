import { getLogoSalao } from '@/lib/logoSalao'

// ── Impressão A4 da Academia ────────────────────────────────────────────────
//
// Abre uma janela nova já com o CSS e manda imprimir. O "Salvar como PDF" sai
// de graça na própria caixa de impressão do navegador — por isso não entra
// biblioteca de PDF aqui: ela pesaria no bundle para entregar, com fonte pior,
// o que o sistema operacional já entrega.
//
// Usado pelos materiais em branco e pelos artigos. Ter um CSS só é o que
// garante que os dois saiam com o mesmo cabeçalho e a mesma cara.

export const CSS_A4 = `
@page { size: A4 portrait; margin: 16mm 14mm }
* { box-sizing: border-box; margin: 0; padding: 0 }
body {
  font-family: 'Segoe UI', Arial, sans-serif; color: #33313f; font-size: 11.5px;
  line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.hd {
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 3px solid #5b4fcf; padding-bottom: 9px; margin-bottom: 16px;
}
.hd .logo { max-height: 50px; max-width: 180px; object-fit: contain }
.hd .brand { font-size: 21px; font-weight: 900; color: #5b4fcf; letter-spacing: 1px }
.hd .dt { font-size: 10px; color: #8480a0; text-align: right }
h1 { font-size: 18px; color: #2a2350; margin: 0 0 12px; font-weight: 800 }
h2 {
  font-size: 12.5px; color: #5b4fcf; margin: 16px 0 7px; padding-bottom: 4px;
  border-bottom: 1.5px solid #efedf6; font-weight: 700; break-after: avoid;
}
h3 {
  font-size: 10.5px; color: #8480a0; margin: 11px 0 3px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px; break-after: avoid;
}
p { margin: 5px 0 }
p.sub { font-size: 10px; color: #8480a0; font-style: italic; margin: 2px 0 7px }
strong { color: #2a2350 }
ul, ol { margin: 5px 0 5px 20px }
li { margin: 3px 0; break-inside: avoid }
.resumo {
  border-left: 3px solid #5b4fcf; background: #f8f9fc; padding: 8px 12px;
  margin: 0 0 12px; font-style: italic; color: #4a4760; border-radius: 0 6px 6px 0;
}
.linha { border-bottom: 1px solid #c9ccd6; height: 24px; margin: 3px 0 }
table.grade { width: 100%; border-collapse: collapse; margin: 6px 0 }
.grade td, .grade th { border: 1px solid #c9ccd6; padding: 6px 7px; height: 25px; vertical-align: top }
.grade th {
  background: #f2f4f8; font-size: 9.5px; text-transform: uppercase;
  letter-spacing: .4px; color: #5f6070; font-weight: 700; text-align: left;
}
.grade td.rot { background: #f8f9fc; font-weight: 600; width: 25%; white-space: nowrap }
.grade.num td.n { width: 26px; text-align: center; color: #a8a6b4; background: #f8f9fc }
.grade.sn td:nth-child(2), .grade.sn td:nth-child(3) { width: 44px }
.grade.sn th:nth-child(2), .grade.sn th:nth-child(3) { width: 44px; text-align: center }
.grade.ck td:first-child, .grade.ck th:first-child { width: 46px; text-align: center }
.grade.q td:last-child { height: 38px }
.quadro {
  border: 1px solid #c9ccd6; background: #f8f9fc; padding: 9px 11px;
  margin: 13px 0; font-size: 10.5px; break-inside: avoid;
}
.assin { display: flex; gap: 38px; margin-top: 30px; break-inside: avoid }
.assin > div { flex: 1; text-align: center }
.assin span { font-size: 9.5px; color: #8480a0 }
.ft {
  margin-top: 20px; border-top: 1px solid #ececf2; padding-top: 7px;
  text-align: center; font-size: 9px; color: #a8a6b4;
}
tr, .quadro, .assin, h2, h3 { break-inside: avoid }
`

export function escaparHtml(v: string) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function abrirImpressaoA4(titulo: string, corpo: string, rodape = '') {
  const logo = await getLogoSalao()
  const hoje = new Date().toLocaleDateString('pt-BR')
  const cab = logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`

  // O fecha-script vai quebrado ao meio porque a string está dentro de um
  // arquivo que também é script: escrito inteiro, o parser fecharia aqui.
  const html =
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">` +
    `<title>${escaparHtml(titulo)}</title><style>${CSS_A4}</style></head><body>` +
    `<div class="hd">${cab}<div class="dt"><strong>${escaparHtml(titulo)}</strong><br>${hoje}</div></div>` +
    corpo +
    (rodape ? `<div class="ft">${escaparHtml(rodape)}</div>` : '') +
    `<script>window.onload=function(){window.print()}</` + `script></body></html>`

  const w = window.open('', '_blank', 'width=1000,height=760')
  if (!w) {
    alert('O navegador bloqueou a janela de impressão. Libere os pop-ups deste site e tente de novo.')
    return
  }
  w.document.write(html)
  w.document.close()
  w.focus()
}

// Converte o texto do artigo (o mesmo markdown simples que a tela renderiza)
// para HTML de impressão. Reaproveitar o DOM da tela não serviria: as classes
// do Tailwind não existem na janela nova, e o artigo sairia sem formatação.
export function conteudoArtigoParaHtml(texto: string) {
  const linhas = String(texto || '').split('\n')
  const out: string[] = []
  let lista: 'ul' | 'ol' | null = null

  const fechaLista = () => {
    if (lista) { out.push(`</${lista}>`); lista = null }
  }
  const negrito = (t: string) =>
    escaparHtml(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  for (const bruta of linhas) {
    const l = bruta.trim()

    if (!l) { fechaLista(); continue }

    if (l.startsWith('## ')) { fechaLista(); out.push(`<h2>${negrito(l.slice(3))}</h2>`); continue }
    if (l.startsWith('### ')) { fechaLista(); out.push(`<h3>${negrito(l.slice(4))}</h3>`); continue }

    if (l.startsWith('• ') || l.startsWith('- ')) {
      if (lista !== 'ul') { fechaLista(); out.push('<ul>'); lista = 'ul' }
      out.push(`<li>${negrito(l.slice(2))}</li>`)
      continue
    }

    const num = l.match(/^(\d+)\.\s+(.*)$/)
    if (num) {
      if (lista !== 'ol') { fechaLista(); out.push('<ol>'); lista = 'ol' }
      out.push(`<li>${negrito(num[2])}</li>`)
      continue
    }

    fechaLista()
    out.push(`<p>${negrito(l)}</p>`)
  }

  fechaLista()
  return out.join('\n')
}
