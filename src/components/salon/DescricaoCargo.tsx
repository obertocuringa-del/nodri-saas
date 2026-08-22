'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, ArrowLeft, Briefcase } from 'lucide-react'

const CHAVE = 'descricoes_cargos'
const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

export default function DescricaoCargo({ categorias }: { categorias: string[] }) {
  const [mapa, setMapa] = useState<Record<string, string>>({})
  const [sel, setSel] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${CHAVE}`).then(r => r.ok ? r.json() : null)
      if (d && d.mapa) setMapa(d.mapa)
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function abrir(cargo: string) { setSel(cargo); setTexto(mapa[cargo] || '') }

  async function salvar() {
    if (!sel) return
    setSalvando(true)
    const novo = { ...mapa, [sel]: texto }
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: CHAVE, doc: { mapa: novo } }) })
      if (res.ok) { toast.success('Descrição salva!'); setMapa(novo) } else { const e = await res.json().catch(() => ({})); toast.error(e?.error || 'Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function imprimir() {
    if (!sel) return
    const css = `@page{size:A4 portrait;margin:18mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:13px;line-height:1.6}.hd{border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:14px}.brand{font-size:22px;font-weight:900;color:#5b4fcf}h1{font-size:16px;margin-top:6px}@media print{body{-webkit-print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Descrição de Cargo — ${esc(sel)}</title><style>${css}</style></head><body><div class="hd"><div class="brand">NODRI</div><h1>Descrição de Cargo — ${esc(sel)}</h1></div><div>${esc(texto) || '<i>Sem descrição.</i>'}</div><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  // Editor de um cargo
  if (sel) {
    return (
      <div style={{ maxWidth: 800 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={() => setSel(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 13 }}><ArrowLeft size={15} /> Voltar aos cargos</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
            <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
          </div>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#5b4fcf', margin: '0 0 12px' }}>{sel}</h2>
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={18} placeholder={`Descreva o cargo de ${sel}: atribuições, responsabilidades, requisitos, competências, jornada…`} style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #d0cdc7', fontSize: 14, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }} />
      </div>
    )
  }

  // Lista de cargos
  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>Descrição de Cargo</h2>
      <p style={{ fontSize: 13, color: '#6b6860', margin: '0 0 16px' }}>Clique num cargo para ver/editar a descrição. Os cargos vêm do cadastro — ao criar uma <strong>nova categoria</strong>, ela aparece aqui automaticamente.</p>
      {categorias.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>Nenhum cargo/categoria ainda.</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {categorias.map(c => (
            <button key={c} onClick={() => abrir(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px', borderRadius: 12, border: '1px solid #e8e6e0', background: '#fff', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.08)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: '#f0eefb', color: '#5b4fcf', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Briefcase size={18} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{c}</div>
                <div style={{ fontSize: 11, color: mapa[c] ? '#16a34a' : '#9ca3af' }}>{mapa[c] ? '✓ com descrição' : 'sem descrição'}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
