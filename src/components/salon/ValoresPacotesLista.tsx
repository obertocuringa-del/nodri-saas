'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, Share2, Pencil, Package } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

interface Pacote { id: string; nome: string; sessoes: string; valor: string; obs?: string }
interface Categoria { id: string; nome: string; pacotes: Pacote[] }
interface Doc { categorias: Categoria[] }

const rid = () => Math.random().toString(36).slice(2, 8)

const PALETA = [
  { bg: '#f0eefb', fg: '#5b4fcf' }, { bg: '#e1f5ee', fg: '#0f6e56' }, { bg: '#fbeaf0', fg: '#993556' },
  { bg: '#faece7', fg: '#993c1d' }, { bg: '#e6f1fb', fg: '#185fa5' }, { bg: '#faeeda', fg: '#854f0b' },
]
function corDoNome(nome: string) {
  let h = 0; for (const ch of (nome || '?')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETA[h % PALETA.length]
}
function slug(s: string) { return (s || 'pacotes').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'pacotes' }
function fmtReais(v: string) { const n = Number(String(v || '').replace(/\./g, '').replace(',', '.')); return isFinite(n) && n > 0 ? 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '' }

// Modelo GENÉRICO (usado só quando o salão ainda não salvou os próprios
// pacotes). NUNCA colocar aqui pacotes/preços de um salão específico.
const DEFAULT_DOC: Doc = {
  categorias: [
    {
      id: rid(), nome: 'Massagens', pacotes: [
        { id: rid(), nome: 'Pacote Massagem Relaxante', sessoes: '10', valor: '' },
        { id: rid(), nome: 'Pacote Massagem Relaxante', sessoes: '5', valor: '' },
      ]
    },
    {
      id: rid(), nome: 'Terapia Capilar', pacotes: [
        { id: rid(), nome: 'Pacote Terapia Capilar', sessoes: '4', valor: '' },
      ]
    },
  ]
}

export default function ValoresPacotesLista({ chave = 'pacotes_valores' }: { chave?: string }) {
  const [doc, setDoc] = useState<Doc>({ categorias: [] })
  const [catSel, setCatSel] = useState(0)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Valores de Pacotes') // avisa "Deseja salvar?" antes de sair sem salvar

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.categorias) && d.categorias.length) setDoc({ categorias: d.categorias })
      else setDoc(DEFAULT_DOC)
    } catch { setDoc(DEFAULT_DOC) }
    setDirty(false); setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  function mut(fn: (d: Doc) => void) { setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); fn(n); return n }); setDirty(true) }

  function addCategoria() { mut(d => { d.categorias.push({ id: rid(), nome: 'Nova categoria', pacotes: [] }) }); setCatSel(doc.categorias.length) }
  function renCategoria(ci: number, v: string) { mut(d => { d.categorias[ci].nome = v }) }
  function delCategoria(ci: number) {
    if (!confirm('Excluir esta categoria e todos os seus pacotes?')) return
    mut(d => { d.categorias.splice(ci, 1) }); setCatSel(0)
  }
  function addPacote(ci: number) { mut(d => { d.categorias[ci].pacotes.push({ id: rid(), nome: '', sessoes: '', valor: '' }) }) }
  function updPacote(ci: number, pi: number, campo: keyof Pacote, v: string) { mut(d => { (d.categorias[ci].pacotes[pi] as any)[campo] = v }) }
  function delPacote(ci: number, pi: number) { mut(d => { d.categorias[ci].pacotes.splice(pi, 1) }) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function htmlCategoria(cat: Categoria, logo: string, esc: (v: any) => string) {
    const cards = cat.pacotes.map(p => {
      const cor = corDoNome(p.nome)
      return `<div class="card" style="border-top-color:${cor.fg}">
        <div class="nm">${esc(p.nome || '—')}</div>
        ${p.sessoes ? `<div class="sess" style="background:${cor.bg};color:${cor.fg}">${esc(p.sessoes)} sessões</div>` : ''}
        ${p.obs ? `<div class="obs">${esc(p.obs)}</div>` : ''}
        <div class="val" style="background:${cor.bg}"><span style="color:${cor.fg}">VALOR</span><b style="color:${cor.fg}">${esc(fmtReais(p.valor) || '—')}</b></div>
      </div>`
    }).join('')
    return `<h1>${esc(cat.nome.toUpperCase())}</h1><div class="grid">${cards}</div>`
  }

  async function imprimir(soCategoria?: number) {
    const logo = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const cats = typeof soCategoria === 'number' ? [doc.categorias[soCategoria]] : doc.categorias
    const titulo = typeof soCategoria === 'number' ? doc.categorias[soCategoria].nome : 'Valores de Pacotes'
    const cab = logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const hoje = new Date().toLocaleDateString('pt-BR')
    const css = `
@page{size:A4 portrait;margin:12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #5b4fcf;padding-bottom:10px;margin-bottom:6px}
.logo{max-height:58px;max-width:200px;object-fit:contain}
.brand{font-size:24px;font-weight:900;color:#5b4fcf;letter-spacing:1px}
.hd .dt{font-size:10px;color:#777;text-align:right}
h1{font-size:16px;font-weight:900;color:#5b4fcf;margin:16px 0 8px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #eee;padding-bottom:4px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:6px}
.card{border:1px solid #e5e2db;border-top:3px solid #5b4fcf;border-radius:10px;padding:9px 10px;break-inside:avoid;background:#fff}
.nm{font-weight:800;font-size:11px;line-height:1.3;margin-bottom:6px}
.sess{display:inline-block;font-size:9px;font-weight:800;border-radius:8px;padding:2px 8px;margin-bottom:6px}
.obs{font-size:9px;color:#888;font-style:italic;margin-bottom:6px}
.val{display:flex;align-items:center;justify-content:space-between;border-radius:8px;padding:5px 9px;font-size:8px;font-weight:800;letter-spacing:.4px}
.val b{font-size:12.5px}
.ft{margin-top:14px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body>
<div class="hd">${cab}<div class="dt"><b>Valores de Pacotes</b><br>${hoje}</div></div>
${cats.map(c => htmlCategoria(c, logo, esc)).join('')}
<div class="ft">Documento gerado em ${hoje}</div>
<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  async function compartilharPdf(ci: number) {
    const cat = doc.categorias[ci]
    if (!cat || !cat.pacotes.length) { toast('Adicione pelo menos um pacote antes de compartilhar', { icon: '' }); return }
    setGerandoPdf(cat.id)
    try {
      const [jsPdfMod, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
      const JsPDF: any = (jsPdfMod as any).jsPDF || (jsPdfMod as any).default || jsPdfMod
      const autoTable: any = (autoTableMod as any).default || (autoTableMod as any)
      const logo = await getLogoSalao()
      const pdf = new JsPDF({ unit: 'pt', format: 'a4' })
      let y = 40
      if (logo) {
        try { pdf.addImage(logo, 'PNG', 40, y, 130, 46) } catch { /* logo em formato não suportado, segue sem ela */ }
        y += 62
      }
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(91, 79, 207)
      pdf.text(cat.nome.toUpperCase(), 40, y)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(140, 140, 140)
      pdf.text(new Date().toLocaleDateString('pt-BR'), 40, y + 14)
      autoTable(pdf, {
        startY: y + 26,
        head: [['Pacote', 'Sessões', 'Valor', 'Observação']],
        body: cat.pacotes.map(p => [p.nome || '—', p.sessoes || '—', fmtReais(p.valor) || '—', p.obs || '']),
        headStyles: { fillColor: [91, 79, 207], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 7 },
        alternateRowStyles: { fillColor: [246, 244, 255] },
      })
      const blob: Blob = pdf.output('blob')
      const nomeArq = `pacotes-${slug(cat.nome)}.pdf`
      const file = new File([blob], nomeArq, { type: 'application/pdf' })
      const nav: any = navigator
      if (typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `Pacotes — ${cat.nome}`, text: `Confira nossos pacotes de ${cat.nome}!` })
        toast.success('Compartilhado!')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = nomeArq; document.body.appendChild(a); a.click(); a.remove()
        URL.revokeObjectURL(url)
        toast('PDF baixado! Abra o WhatsApp e anexe o arquivo para enviar ao cliente (o navegador não permite anexar automaticamente).', { icon: '', duration: 7000 })
        window.open('https://web.whatsapp.com/', '_blank')
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Erro ao gerar o PDF')
    }
    setGerandoPdf(null)
  }

  const cat = doc.categorias[catSel]

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#5b4fcf', margin: 0, flex: 1, minWidth: 160, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Package size={18} /> Valores de Pacotes</h3>
        <button onClick={() => imprimir()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir tudo</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>
      <p style={{ fontSize: 12, color: '#6b6860', marginBottom: 14 }}>Organize os pacotes por categoria (ex.: Terapia Capilar, Massagens). Cada pacote pode ter de 1 a 12 ou mais sessões. Use <strong>Compartilhar</strong> para enviar via WhatsApp em PDF (não editável pelo cliente).</p>

      {/* Abas de categorias */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {doc.categorias.map((c, i) => (
          <button key={c.id} onClick={() => setCatSel(i)} style={{ padding: '8px 14px', borderRadius: 10, border: catSel === i ? 'none' : '1.5px solid #e0ddd8', background: catSel === i ? '#1a1a1a' : '#fff', color: catSel === i ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {c.nome} <span style={{ opacity: .7, fontSize: 11 }}>{c.pacotes.length}</span>
          </button>
        ))}
        <button onClick={addCategoria} style={{ padding: '8px 14px', borderRadius: 10, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Plus size={14} /> Categoria</button>
      </div>

      {cat && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <Pencil size={14} color="#9ca3af" />
            <input value={cat.nome} onChange={e => renCategoria(catSel, e.target.value)} style={{ flex: 1, minWidth: 140, fontSize: 16, fontWeight: 800, color: '#5b4fcf', border: 'none', borderBottom: '1px solid #eee', outline: 'none', padding: '2px 0' }} />
            <button onClick={() => imprimir(catSel)} title="Imprimir esta categoria" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 700 }}><Printer size={13} /> Imprimir</button>
            <button onClick={() => compartilharPdf(catSel)} disabled={gerandoPdf === cat.id} title="Compartilhar via WhatsApp (PDF)" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: '#25D366', color: '#fff', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 700 }}>{gerandoPdf === cat.id ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} Compartilhar</button>
            <button onClick={() => delCategoria(catSel)} title="Excluir categoria" style={{ border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Trash2 size={13} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {cat.pacotes.map((p, pi) => {
              const cor = corDoNome(p.nome)
              return (
                <div key={p.id} style={{ position: 'relative', background: '#fff', border: '1px solid #e8e6e0', borderTop: `3px solid ${cor.fg}`, borderRadius: 14, padding: '12px 14px', transition: 'box-shadow .15s, transform .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <input value={p.nome} onChange={e => updPacote(catSel, pi, 'nome', e.target.value)} placeholder="Nome do pacote"
                      style={{ flex: 1, minWidth: 0, border: '1px solid transparent', borderRadius: 6, padding: '5px 6px', outline: 'none', fontSize: 13.5, fontWeight: 700, color: '#1a1a1a', background: 'transparent' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#c9c4f0')} onBlur={e => (e.currentTarget.style.borderColor = 'transparent')} />
                    <button onClick={() => delPacote(catSel, pi)} title="Excluir" style={{ border: 'none', background: 'transparent', color: '#d4cfc7', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')} onMouseLeave={e => (e.currentTarget.style.color = '#d4cfc7')}><Trash2 size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <input value={p.sessoes} onChange={e => updPacote(catSel, pi, 'sessoes', e.target.value.replace(/[^0-9]/g, ''))} placeholder="Sessões" inputMode="numeric"
                      style={{ width: 62, border: '1.5px solid #e0ddd8', borderRadius: 8, padding: '5px 8px', outline: 'none', fontSize: 12.5, fontWeight: 700, color: '#374151', textAlign: 'center' }} />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>sessões</span>
                  </div>
                  <input value={p.obs || ''} onChange={e => updPacote(catSel, pi, 'obs', e.target.value)} placeholder="Observação (opcional)"
                    style={{ width: '100%', border: 'none', borderBottom: '1px dashed #e8e6e0', padding: '3px 2px', outline: 'none', fontSize: 11.5, color: '#8a8578', marginBottom: 8, fontStyle: 'italic' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: cor.bg, borderRadius: 10, padding: '7px 12px' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: cor.fg, textTransform: 'uppercase', letterSpacing: '.4px' }}>Valor</span>
                    <input value={p.valor} onChange={e => updPacote(catSel, pi, 'valor', e.target.value)} placeholder="0,00"
                      style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: 15.5, fontWeight: 800, color: cor.fg, background: 'transparent', textAlign: 'right' }} />
                  </div>
                </div>
              )
            })}

            <button onClick={() => addPacote(catSel)}
              style={{ minHeight: 104, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, border: '2px dashed #c9c4f0', background: '#faf9ff', color: '#5b4fcf', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = '#faf9ff')}>
              <Plus size={20} /> Adicionar pacote
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
