'use client'

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

export interface Bloco { id: string; titulo: string; corpo: string; dataElab?: string; dataRev?: string }
const rid = () => Math.random().toString(36).slice(2, 8)

function AutoTextarea({ value, onChange, style, placeholder }: { value: string; onChange: (v: string) => void; style: React.CSSProperties; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [value])
  return <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={1}
    style={{ resize: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, fontFamily: 'inherit', ...style }} />
}

export default function DocEditavel({ chave, tituloPadrao, blocosPadrao, corTema = '#5b4fcf', comData }: { chave: string; tituloPadrao: string; blocosPadrao: { titulo: string; corpo: string }[]; corTema?: string; comData?: boolean }) {
  const [titulo, setTitulo] = useState(tituloPadrao)
  const [blocos, setBlocos] = useState<Bloco[]>(() => blocosPadrao.map(b => ({ id: rid(), ...b })))
  const [logo, setLogo] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return }
    if (f.size > 1.5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 1,5 MB)'); return }
    const reader = new FileReader()
    reader.onload = () => { setLogo(String(reader.result || '')); setDirty(true) }
    reader.readAsDataURL(f)
  }

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chave)}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.blocos)) { setTitulo(d.titulo || tituloPadrao); setBlocos(d.blocos); setLogo(d.logo || '') }
    } catch { /* */ }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  function updBloco(id: string, campo: 'titulo' | 'corpo' | 'dataElab' | 'dataRev', v: string) { setBlocos(b => b.map(x => x.id === id ? { ...x, [campo]: v } : x)); setDirty(true) }
  function addBloco() { setBlocos(b => [...b, { id: rid(), titulo: 'NOVO TÓPICO', corpo: '' }]); setDirty(true) }
  function delBloco(id: string) { if (!confirm('Excluir este tópico?')) return; setBlocos(b => b.filter(x => x.id !== id)); setDirty(true) }
  function mover(id: string, dir: -1 | 1) {
    setBlocos(b => { const i = b.findIndex(x => x.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= b.length) return b; const n = [...b];[n[i], n[j]] = [n[j], n[i]]; return n }); setDirty(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { titulo, blocos, logo } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function imprimir() {
    const esc = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    const corpo = blocos.map(b => {
      const dt = comData ? `<div class="dt">Data de elaboração: <b>${esc(b.dataElab || '____/____/______')}</b> &nbsp;&nbsp; Data de revisão: <b>${esc(b.dataRev || '____/____/______')}</b></div>` : ''
      return `<div class="bl"><h2>${esc(b.titulo)}</h2>${dt}<div class="tx">${esc(b.corpo)}</div></div>`
    }).join('')
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:12px;line-height:1.5}.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${corTema};padding-bottom:8px;margin-bottom:14px}.brand{font-size:24px;font-weight:900;color:${corTema}}h1{font-size:16px;text-align:center;margin-bottom:14px;color:#1a1a2e}.bl{margin-bottom:14px;break-inside:avoid}h2{font-size:13px;color:${corTema};font-weight:800;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:5px}.dt{font-size:10px;color:#555;margin-bottom:5px}.tx{white-space:pre-wrap;font-size:11.5px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const cabec = logo ? `<img src="${logo}" style="max-height:64px;max-width:220px"/>` : `<div class="brand">NODRI</div>`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body><div class="hd">${cabec}<div style="text-align:right;font-size:11px">${new Date().toLocaleDateString('pt-BR')}</div></div><h1>${esc(titulo)}</h1>${corpo}<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: corTema }} /></div>

  return (
    <div>
      {/* Espaço para anexar a logo */}
      <div style={{ marginBottom: 12 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
        {logo ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="logo" style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain', borderRadius: 6 }} />
            <button onClick={() => fileRef.current?.click()} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Trocar</button>
            <button onClick={() => { setLogo(''); setDirty(true) }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Remover</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderRadius: 12, border: '2px dashed #c9c4f0', background: '#f6f4ff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            🖼️ Anexar logo (clique para escolher a imagem)
          </button>
        )}
        <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>A logo aparece no topo e na impressão. Lembre de <strong>Salvar</strong>. (imagem até 1,5 MB)</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input value={titulo} onChange={e => { setTitulo(e.target.value); setDirty(true) }} style={{ fontSize: 16, fontWeight: 800, color: corTema, border: 'none', background: 'transparent', outline: 'none', flex: 1, minWidth: 200 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>

      {blocos.map((b, i) => (
        <div key={b.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <input value={b.titulo} onChange={e => updBloco(b.id, 'titulo', e.target.value)} style={{ flex: 1, fontSize: 14, fontWeight: 800, color: corTema, border: 'none', borderBottom: '1px solid #eee', background: 'transparent', outline: 'none', padding: '2px 0' }} />
            <button onClick={() => mover(b.id, -1)} disabled={i === 0} title="Subir" style={miniBtn}><ChevronUp size={14} /></button>
            <button onClick={() => mover(b.id, 1)} disabled={i === blocos.length - 1} title="Descer" style={miniBtn}><ChevronDown size={14} /></button>
            <button onClick={() => delBloco(b.id)} title="Excluir tópico" style={{ ...miniBtn, color: '#dc2626' }}><Trash2 size={14} /></button>
          </div>
          {comData && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: '#6b6860', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Data de elaboração:
                <input type="date" value={b.dataElab || ''} onChange={e => updBloco(b.id, 'dataElab', e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d0cdc7', fontSize: 12 }} /></label>
              <label style={{ fontSize: 12, color: '#6b6860', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Data de revisão:
                <input type="date" value={b.dataRev || ''} onChange={e => updBloco(b.id, 'dataRev', e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d0cdc7', fontSize: 12 }} /></label>
            </div>
          )}
          <AutoTextarea value={b.corpo} onChange={v => updBloco(b.id, 'corpo', v)} placeholder="Escreva o conteúdo deste tópico..." style={{ width: '100%', border: '1px solid #ece9e2', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#374151', outline: 'none' }} />
        </div>
      ))}

      <button onClick={addBloco} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Adicionar tópico</button>
    </div>
  )
}

const miniBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid #e0ddd8', background: '#fff', color: '#6b6860', cursor: 'pointer', flexShrink: 0 }
