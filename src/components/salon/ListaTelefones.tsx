'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, MessageCircle } from 'lucide-react'

interface Contato { id: string; nome: string; servico: string; telefone: string }

const rid = () => Math.random().toString(36).slice(2, 8)
const novo = (): Contato => ({ id: rid(), nome: '', servico: '', telefone: '' })

export default function ListaTelefones() {
  const [titulo, setTitulo] = useState('TELEFONES IMPORTANTES / FORNECEDORES')
  const [rows, setRows] = useState<Contato[]>(Array.from({ length: 8 }, novo))
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/grid?chave=telefones').then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.rows) && d.rows.length) { setRows(d.rows); if (d.titulo) setTitulo(d.titulo) }
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function upd(id: string, campo: keyof Contato, v: string) { setRows(r => r.map(x => x.id === id ? { ...x, [campo]: v } : x)); setDirty(true) }
  function add() { setRows(r => [...r, novo()]); setDirty(true) }
  function del(id: string) { setRows(r => r.filter(x => x.id !== id)); setDirty(true) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'telefones', doc: { titulo, rows } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function whats(c: Contato) {
    const fone = String(c.telefone || '').replace(/\D/g, '')
    if (!fone) { toast.error('Sem telefone nesta linha.'); return }
    const numero = fone.startsWith('55') ? fone : '55' + fone
    window.open(`https://wa.me/${numero}`, '_blank')
  }

  function imprimir() {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const body = rows.map(c => `<tr><td>${esc(c.nome)}</td><td>${esc(c.servico)}</td><td>${esc(c.telefone)}</td></tr>`).join('')
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}h1{text-align:center;font-size:15px;color:#5b4fcf;margin-bottom:8px}table{width:100%;border-collapse:collapse}th,td{border:none;border-bottom:1px solid #eee;padding:7px 9px;text-align:left}th{background:#f6f4ff;color:#5b4fcf;border-bottom:2px solid #5b4fcf;font-size:10px;text-transform:uppercase;letter-spacing:.4px}tbody tr:nth-child(even) td{background:#fbfaf8}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body><h1>${esc(titulo)}</h1><table><thead><tr><th>Nome</th><th>Serviço</th><th>Telefone</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  const inp: React.CSSProperties = { width: '100%', border: '1px solid transparent', borderRadius: 4, padding: '7px 8px', outline: 'none', fontSize: 13, background: 'transparent' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input value={titulo} onChange={e => { setTitulo(e.target.value); setDirty(true) }} style={{ fontSize: 16, fontWeight: 800, color: '#5b4fcf', border: 'none', background: 'transparent', outline: 'none', flex: 1, minWidth: 180 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> : (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 540 }}>
            <thead>
              <tr>
                <th style={thSt}>Nome</th><th style={thSt}>Serviço</th><th style={{ ...thSt, width: 150 }}>Telefone</th><th style={{ ...thSt, width: 130 }}>WhatsApp</th><th style={{ ...thSt, width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id}>
                  <td style={tdSt}><input value={c.nome} onChange={e => upd(c.id, 'nome', e.target.value)} style={inp} placeholder="—" /></td>
                  <td style={tdSt}><input value={c.servico} onChange={e => upd(c.id, 'servico', e.target.value)} style={inp} placeholder="—" /></td>
                  <td style={tdSt}><input value={c.telefone} onChange={e => upd(c.id, 'telefone', e.target.value)} style={inp} placeholder="(00) 00000-0000" /></td>
                  <td style={{ ...tdSt, textAlign: 'center' }}>
                    <button onClick={() => whats(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><MessageCircle size={12} /> Enviar</button>
                  </td>
                  <td style={{ ...tdSt, textAlign: 'center' }}><button onClick={() => del(c.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 6 }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={add} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px dashed #d0cdc7', background: '#faf9f7', color: '#6b6860', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Plus size={13} /> Adicionar contato</button>
        </div>
      )}
    </div>
  )
}

const thSt: React.CSSProperties = { borderBottom: '2px solid #e8e6e0', padding: '10px 10px', fontSize: 11, fontWeight: 700, color: '#6b6860', background: '#faf9f7', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.4px' }
const tdSt: React.CSSProperties = { borderBottom: '1px solid #f0eee8', padding: '5px 6px' }
