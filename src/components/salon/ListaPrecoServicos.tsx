'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, RefreshCw } from 'lucide-react'

interface Item { id: string; nome: string; valor: string }
interface Servico { id: string; nome: string; preco?: string }
const rid = () => Math.random().toString(36).slice(2, 8)

export default function ListaPrecoServicos({ chave = 'precos_servicos', titulo = 'Serviços Internos — Valores', comLogo = false }: { chave?: string; titulo?: string; comLogo?: boolean }) {
  const [itens, setItens] = useState<Item[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [logo, setLogo] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const servs: Servico[] = await fetch('/api/servicos').then(r => r.ok ? r.json() : [])
      setServicos(Array.isArray(servs) ? servs : [])
      const salvo = await fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null)
      if (salvo && Array.isArray(salvo.itens) && salvo.itens.length) { setItens(salvo.itens); setLogo(salvo.logo || '') }
      else setItens((Array.isArray(servs) ? servs : []).map(s => ({ id: s.id || rid(), nome: s.nome || '', valor: s.preco ? `R$ ${s.preco}` : '' })))
    } catch { setItens([]) }
    setDirty(false); setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return }
    if (f.size > 1.5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 1,5 MB)'); return }
    const reader = new FileReader(); reader.onload = () => { setLogo(String(reader.result || '')); setDirty(true) }; reader.readAsDataURL(f)
  }

  function upd(id: string, campo: 'nome' | 'valor', v: string) { setItens(i => i.map(x => x.id === id ? { ...x, [campo]: v } : x)); setDirty(true) }
  function add() { setItens(i => [...i, { id: rid(), nome: '', valor: '' }]); setDirty(true) }
  function del(id: string) { setItens(i => i.filter(x => x.id !== id)); setDirty(true) }
  function addServico(s: Servico) { setItens(i => [...i, { id: s.id || rid(), nome: s.nome || '', valor: s.preco ? `R$ ${s.preco}` : '' }]); setDirty(true); setPickerOpen(false) }

  const disponiveis = servicos.filter(s => !itens.some(i => i.id === s.id))

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { itens, logo } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function imprimir() {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const body = itens.map((it, i) => `<tr style="background:${i % 2 ? '#fffde7' : '#fff'}"><td>${esc(it.nome)}</td><td style="text-align:right;font-weight:700">${esc(it.valor)}</td></tr>`).join('')
    const cab = logo ? `<img src="${logo}" style="max-height:64px"/>` : ''
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:12px}.hd{text-align:center;margin-bottom:10px}h1{text-align:center;font-size:22px;font-weight:900;margin-bottom:12px}table{width:100%;border-collapse:collapse}td{border:1px solid #999;padding:7px 12px;font-size:13px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body><div class="hd">${cab}</div><h1>${esc(titulo.toUpperCase())}</h1><table><tbody>${body}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=800,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      {comLogo && (
        <div style={{ marginBottom: 12 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
          {logo ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="logo" style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain' }} />
              <button onClick={() => fileRef.current?.click()} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Trocar</button>
              <button onClick={() => { setLogo(''); setDirty(true) }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Remover</button>
            </div>
          ) : <button onClick={() => fileRef.current?.click()} style={{ padding: '12px 18px', borderRadius: 12, border: '2px dashed #c9c4f0', background: '#f6f4ff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🖼️ Anexar logo</button>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#5b4fcf', margin: 0, flex: 1, minWidth: 160 }}>{titulo}</h3>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setPickerOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar da lista de serviços</button>
          {pickerOpen && (
            <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 30, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', minWidth: 240, maxHeight: 300, overflowY: 'auto', padding: 6 }}>
              {disponiveis.length === 0 ? <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>Todos os serviços já estão na lista.</div> :
                disponiveis.map(s => <button key={s.id} onClick={() => addServico(s)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{s.nome}{s.preco ? ` — R$ ${s.preco}` : ''}</button>)}
            </div>
          )}
        </div>
        <button onClick={carregar} title="Recarregar dos serviços" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><RefreshCw size={14} /></button>
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>
      <p style={{ fontSize: 12, color: '#6b6860', marginBottom: 10 }}>Os itens vêm da página <strong>Serviços do Salão</strong>. O <strong>valor</strong> é editável. Use <strong>Adicionar da lista</strong> (mostra só o que ainda não está aqui), edite o nome ou <strong>exclua</strong> à vontade.</p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> : (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 8, maxWidth: 680 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thSt}>Serviço / Tratamento</th><th style={{ ...thSt, width: 150 }}>Valor</th><th style={{ ...thSt, width: 44 }}></th></tr></thead>
            <tbody>
              {itens.map((it, i) => (
                <tr key={it.id} style={{ background: i % 2 ? '#fffdf2' : '#fff' }}>
                  <td style={tdSt}><input value={it.nome} onChange={e => upd(it.id, 'nome', e.target.value)} placeholder="Nome" style={inp} /></td>
                  <td style={tdSt}><input value={it.valor} onChange={e => upd(it.id, 'valor', e.target.value)} placeholder="R$ 0,00" style={{ ...inp, fontWeight: 700, textAlign: 'right' }} /></td>
                  <td style={{ ...tdSt, textAlign: 'center' }}><button onClick={() => del(it.id)} title="Excluir" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 6 }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={add} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px dashed #d0cdc7', background: '#faf9f7', color: '#6b6860', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Plus size={13} /> Adicionar linha manual</button>
        </div>
      )}
    </div>
  )
}

const thSt: React.CSSProperties = { border: '1px solid #e8e6e0', padding: '7px 10px', fontSize: 12, color: '#1a1a1a', background: '#f1eefb', textAlign: 'left' }
const tdSt: React.CSSProperties = { border: '1px solid #f0eee8', padding: 2 }
const inp: React.CSSProperties = { width: '100%', border: '1px solid transparent', borderRadius: 4, padding: '7px 8px', outline: 'none', fontSize: 13, background: 'transparent' }
