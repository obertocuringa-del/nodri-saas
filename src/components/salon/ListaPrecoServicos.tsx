'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, RefreshCw } from 'lucide-react'

interface Item { id: string; nome: string; valor: string }
const rid = () => Math.random().toString(36).slice(2, 8)

export default function ListaPrecoServicos() {
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const salvo = await fetch('/api/salon/grid?chave=precos_servicos').then(r => r.ok ? r.json() : null)
      if (salvo && Array.isArray(salvo.itens) && salvo.itens.length) { setItens(salvo.itens) }
      else {
        const servs = await fetch('/api/servicos').then(r => r.ok ? r.json() : [])
        setItens((Array.isArray(servs) ? servs : []).map((s: any) => ({ id: s.id || rid(), nome: s.nome || '', valor: s.preco ? `R$ ${s.preco}` : '' })))
      }
    } catch { setItens([]) }
    setDirty(false); setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function sincronizar() {
    try {
      const servs = await fetch('/api/servicos').then(r => r.ok ? r.json() : [])
      const existentes = new Set(itens.map(i => i.id))
      const novos = (Array.isArray(servs) ? servs : []).filter((s: any) => !existentes.has(s.id)).map((s: any) => ({ id: s.id || rid(), nome: s.nome || '', valor: s.preco ? `R$ ${s.preco}` : '' }))
      if (novos.length) { setItens(i => [...i, ...novos]); setDirty(true); toast.success(`${novos.length} serviço(s) novo(s) adicionado(s)`) }
      else toast('Nenhum serviço novo', { icon: '✅' })
    } catch { toast.error('Erro ao sincronizar') }
  }

  function upd(id: string, campo: 'nome' | 'valor', v: string) { setItens(i => i.map(x => x.id === id ? { ...x, [campo]: v } : x)); setDirty(true) }
  function add() { setItens(i => [...i, { id: rid(), nome: '', valor: '' }]); setDirty(true) }
  function del(id: string) { setItens(i => i.filter(x => x.id !== id)); setDirty(true) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'precos_servicos', doc: { itens } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function imprimir() {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const body = itens.map((it, i) => `<tr style="background:${i % 2 ? '#fffde7' : '#fff'}"><td>${esc(it.nome)}</td><td style="text-align:right;font-weight:700">${esc(it.valor)}</td></tr>`).join('')
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:12px}h1{text-align:center;font-size:22px;font-weight:900;margin-bottom:12px}table{width:100%;border-collapse:collapse}td{border:1px solid #999;padding:7px 12px;font-size:13px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Serviço Interno</title><style>${css}</style></head><body><h1>SERVIÇO INTERNO</h1><table><tbody>${body}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=800,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#5b4fcf', margin: 0, flex: 1, minWidth: 160 }}>Serviços Internos — Valores</h3>
        <button onClick={sincronizar} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><RefreshCw size={14} /> Sincronizar serviços</button>
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>
      <p style={{ fontSize: 12, color: '#6b6860', marginBottom: 10 }}>Os serviços vêm da página <strong>Serviços do Salão</strong>. O <strong>valor</strong> você digita manualmente. Pode editar o nome, <strong>excluir</strong> serviços e adicionar novos. Use <strong>Sincronizar</strong> para trazer serviços recém-criados.</p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> : (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 8, maxWidth: 680 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thSt}>Serviço</th><th style={{ ...thSt, width: 150 }}>Valor</th><th style={{ ...thSt, width: 44 }}></th></tr></thead>
            <tbody>
              {itens.map((it, i) => (
                <tr key={it.id} style={{ background: i % 2 ? '#fffdf2' : '#fff' }}>
                  <td style={tdSt}><input value={it.nome} onChange={e => upd(it.id, 'nome', e.target.value)} placeholder="Nome do serviço" style={inp} /></td>
                  <td style={tdSt}><input value={it.valor} onChange={e => upd(it.id, 'valor', e.target.value)} placeholder="R$ 0,00" style={{ ...inp, fontWeight: 700, textAlign: 'right' }} /></td>
                  <td style={{ ...tdSt, textAlign: 'center' }}><button onClick={() => del(it.id)} title="Excluir" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 6 }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={add} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px dashed #d0cdc7', background: '#faf9f7', color: '#6b6860', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Plus size={13} /> Adicionar serviço</button>
        </div>
      )}
    </div>
  )
}

const thSt: React.CSSProperties = { border: '1px solid #e8e6e0', padding: '7px 10px', fontSize: 12, color: '#1a1a1a', background: '#f1eefb', textAlign: 'left' }
const tdSt: React.CSSProperties = { border: '1px solid #f0eee8', padding: 2 }
const inp: React.CSSProperties = { width: '100%', border: '1px solid transparent', borderRadius: 4, padding: '7px 8px', outline: 'none', fontSize: 13, background: 'transparent' }
