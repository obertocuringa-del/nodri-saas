'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, MessageCircle, Search, X, Phone } from 'lucide-react'
import { normaliza } from './SeletorNomes'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

interface Contato { id: string; nome: string; servico: string; telefone: string }

const COR = '#5b4fcf'
const CORES_AVATAR = ['#5b4fcf', '#0891b2', '#db2777', '#16a34a', '#d97706', '#dc2626', '#0d9488']
const rid = () => Math.random().toString(36).slice(2, 8)
const novo = (): Contato => ({ id: rid(), nome: '', servico: '', telefone: '' })
function corAvatar(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return CORES_AVATAR[h % CORES_AVATAR.length]
}
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase()
}

export default function ListaTelefones() {
  const [titulo, setTitulo] = useState('TELEFONES IMPORTANTES / FORNECEDORES')
  const [rows, setRows] = useState<Contato[]>(Array.from({ length: 8 }, novo))
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Telefones') // avisa "Deseja salvar?" antes de sair sem salvar
  const [busca, setBusca] = useState('')
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/grid?chave=telefones').then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.rows) && d.rows.length) { setRows(d.rows); if (d.titulo) setTitulo(d.titulo) }
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function upd(id: string, campo: keyof Contato, v: string) { setRows(r => r.map(x => x.id === id ? { ...x, [campo]: v } : x)); setDirty(true) }
  function add() { setRows(r => [novo(), ...r]); setDirty(true) }
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

  const buscaNorm = normaliza(busca)
  const rowsFiltradas = useMemo(() => {
    if (!buscaNorm) return rows
    return rows.filter(c => normaliza(c.nome).includes(buscaNorm) || normaliza(c.servico).includes(buscaNorm) || c.telefone.replace(/\D/g, '').includes(busca.replace(/\D/g, '') || '\0'))
  }, [rows, buscaNorm, busca])

  // Sugestões pra completar a digitação: nomes e serviços que batem com o que já foi digitado.
  const sugestoes = useMemo(() => {
    if (!buscaNorm) return []
    const vistos = new Set<string>()
    const out: { texto: string; tipo: 'nome' | 'servico' }[] = []
    for (const c of rows) {
      if (c.nome && normaliza(c.nome).includes(buscaNorm) && !vistos.has(normaliza(c.nome))) { vistos.add(normaliza(c.nome)); out.push({ texto: c.nome, tipo: 'nome' }) }
      if (c.servico && normaliza(c.servico).includes(buscaNorm) && !vistos.has(normaliza(c.servico))) { vistos.add(normaliza(c.servico)); out.push({ texto: c.servico, tipo: 'servico' }) }
      if (out.length >= 8) break
    }
    return out.slice(0, 8)
  }, [rows, buscaNorm])

  return (
    <div>
      <style>{`
        .tel-row { transition: background .1s; }
        .tel-row:hover { background: #f6f4ff !important; }
        .tel-input { width:100%; border:1px solid transparent; background:transparent; outline:none; font-family:inherit; padding:7px 8px; border-radius:6px; font-size:13px; }
        .tel-input:focus, .tel-input:hover { border-color:#d0cdc7; background:#fff; }
      `}</style>

      {/* ── Cabeçalho + busca inteligente ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '12px 14px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <Phone size={17} color={COR} />
          <input value={titulo} onChange={e => { setTitulo(e.target.value); setDirty(true) }} style={{ fontSize: 16, fontWeight: 800, color: COR, border: 'none', background: 'transparent', outline: 'none', flex: 1, minWidth: 180 }} />
          <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
          <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        </div>

        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setSugestoesAbertas(true) }}
            onFocus={() => setSugestoesAbertas(true)}
            onKeyDown={e => { if (e.key === 'Escape') { setBusca(''); setSugestoesAbertas(false) } }}
            placeholder="Buscar por nome, serviço ou telefone..."
            style={{ width: '100%', padding: '9px 34px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 13.5 }}
          />
          {busca && (
            <button onClick={() => { setBusca(''); setSugestoesAbertas(false) }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', padding: 4 }}><X size={15} /></button>
          )}
          {sugestoesAbertas && sugestoes.length > 0 && (
            <>
              <div onClick={() => setSugestoesAbertas(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
              <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,.12)', marginTop: 4, overflow: 'hidden' }}>
                {sugestoes.map((s, i) => (
                  <div key={i} onClick={() => { setBusca(s.texto); setSugestoesAbertas(false) }}
                    style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: i < sugestoes.length - 1 ? '1px solid #f5f4f2' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8f7ff')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <Search size={12} color="#c0bdb7" />
                    <span>{s.texto}</span>
                    <span style={{ fontSize: 10.5, color: '#9ca3af', textTransform: 'uppercase', marginLeft: 'auto' }}>{s.tipo === 'nome' ? 'nome' : 'serviço'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 6 }}>
          {busca ? `${rowsFiltradas.length} de ${rows.length} contatos` : `${rows.length} contatos`}
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 8 }}>
          {!busca && (
            <button onClick={add} style={{ margin: '4px 0 10px', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: `1.5px dashed ${COR}`, background: '#f8f7ff', color: COR, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}><Plus size={13} /> Adicionar contato</button>
          )}
          {rowsFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>
              Nenhum contato encontrado para "<strong>{busca}</strong>".
            </div>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, width: 40 }}></th>
                  <th style={thSt}>Nome</th><th style={thSt}>Serviço</th><th style={{ ...thSt, width: 150 }}>Telefone</th><th style={{ ...thSt, width: 130 }}>WhatsApp</th><th style={{ ...thSt, width: 44 }}></th>
                </tr>
              </thead>
              <tbody>
                {rowsFiltradas.map(c => (
                  <tr key={c.id} className="tel-row">
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: corAvatar(c.nome || c.servico || '?'), color: '#fff', fontSize: 10.5, fontWeight: 800 }}>{iniciais(c.nome || c.servico)}</span>
                    </td>
                    <td style={tdSt}><input value={c.nome} onChange={e => upd(c.id, 'nome', e.target.value)} className="tel-input" placeholder="—" /></td>
                    <td style={tdSt}><input value={c.servico} onChange={e => upd(c.id, 'servico', e.target.value)} className="tel-input" placeholder="—" /></td>
                    <td style={tdSt}><input value={c.telefone} onChange={e => upd(c.id, 'telefone', e.target.value)} className="tel-input" placeholder="(00) 00000-0000" /></td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <button onClick={() => whats(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><MessageCircle size={12} /> Enviar</button>
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}><button onClick={() => del(c.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 6 }}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

const thSt: React.CSSProperties = { borderBottom: '2px solid #e8e6e0', padding: '10px 10px', fontSize: 11, fontWeight: 700, color: '#6b6860', background: '#faf9f7', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.4px' }
const tdSt: React.CSSProperties = { borderBottom: '1px solid #f0eee8', padding: '6px 6px' }
