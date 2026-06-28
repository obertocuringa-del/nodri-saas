'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, Upload, Download, FileText } from 'lucide-react'

interface Item { id: string; nome: string; data?: string; url?: string; filename?: string }
const rid = () => Math.random().toString(36).slice(2, 8)
const hojeISO = () => new Date().toLocaleDateString('en-CA')

export default function AnexosLista({ chave, titulo, campoNome, comData = true, corTema = '#5b4fcf' }: { chave: string; titulo: string; campoNome: string; comData?: boolean; corTema?: string }) {
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [subindo, setSubindo] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.itens)) setItens(d.itens)
    } catch { /* */ }
    setDirty(false); setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  async function salvar(lista?: Item[]) {
    const dados = lista || itens
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { itens: dados } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else { const e = await res.json().catch(() => ({})); toast.error(e?.error || 'Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function add() { const lista = [...itens, { id: rid(), nome: '', data: comData ? hojeISO() : '' }]; setItens(lista); setDirty(true) }
  function remover(id: string) { if (!confirm('Remover este item?')) return; const lista = itens.filter(i => i.id !== id); setItens(lista); salvar(lista) }
  function setCampo(id: string, campo: keyof Item, v: string) { setItens(p => p.map(i => i.id === id ? { ...i, [campo]: v } : i)); setDirty(true) }

  async function anexar(id: string, file: File | null) {
    if (!file) return
    setSubindo(id)
    try {
      const fd = new FormData(); fd.append('arquivo', file)
      const res = await fetch('/api/salon/upload', { method: 'POST', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(d?.error || 'Erro ao enviar arquivo'); setSubindo(null); return }
      const lista = itens.map(i => i.id === id ? { ...i, url: d.url, filename: d.filename } : i)
      setItens(lista); salvar(lista); toast.success('Arquivo anexado!')
    } catch { toast.error('Erro de conexão') }
    setSubindo(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: corTema, margin: 0, flex: 1, minWidth: 160 }}>{titulo}</h3>
        <button onClick={() => salvar()} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>
      <p style={{ fontSize: 12, color: '#6b6860', marginBottom: 12 }}>Preencha o {campoNome.toLowerCase()}{comData ? ', a data' : ''} e <strong>anexe o arquivo</strong> (qualquer formato — PDF, Word, Excel, imagem…). Depois use <strong>Baixar</strong> para visualizar. Clique em <strong>+</strong> para adicionar mais.</p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: corTema }} /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {itens.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>Nenhum item ainda. Clique em <strong>+ Adicionar</strong> abaixo.</div>}
          {itens.map(it => (
            <div key={it.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '2 1 200px', minWidth: 160 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>{campoNome}</label>
                <input value={it.nome} onChange={e => setCampo(it.id, 'nome', e.target.value)} placeholder={campoNome} style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
              </div>
              {comData && (
                <div style={{ flex: '0 1 160px' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>Data de atualização</label>
                  <input type="date" value={it.data || ''} onChange={e => setCampo(it.id, 'data', e.target.value)} onClick={e => { try { (e.currentTarget as any).showPicker?.() } catch { /* */ } }} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, cursor: 'pointer' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input ref={el => { fileRefs.current[it.id] = el }} type="file" style={{ display: 'none' }} onChange={e => { anexar(it.id, e.target.files?.[0] || null); e.currentTarget.value = '' }} />
                <button onClick={() => fileRefs.current[it.id]?.click()} disabled={subindo === it.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 8, border: '1px dashed ' + corTema, background: '#f6f4ff', color: corTema, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {subindo === it.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {it.url ? 'Trocar arquivo' : 'Anexar arquivo'}
                </button>
                {it.url && (
                  <a href={`${it.url}?download=${encodeURIComponent(it.filename || 'arquivo')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    <Download size={14} /> Baixar
                  </a>
                )}
                {it.url && <span style={{ fontSize: 11, color: '#6b6860', display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><FileText size={12} /> {it.filename}</span>}
              </div>
              <button onClick={() => remover(it.id)} title="Remover" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 6 }}><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={add} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: `1px dashed ${corTema}`, background: '#f6f4ff', color: corTema, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Adicionar {campoNome.toLowerCase()}</button>
        </div>
      )}
    </div>
  )
}
