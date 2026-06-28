'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2, Check, Megaphone, X, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

interface Lido { k: string; nome: string; em: string }
interface Aviso { id: string; titulo: string; texto: string; data: string; prioridade: string; lidos?: Lido[] }
const rid = () => Math.random().toString(36).slice(2, 8)
const PRIOS: Record<string, { cor: string; label: string }> = {
  normal: { cor: '#5b4fcf', label: 'Normal' }, importante: { cor: '#ea580c', label: 'Importante' }, urgente: { cor: '#dc2626', label: 'Urgente' },
}

export default function MuralPage() {
  const router = useRouter()
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [me, setMe] = useState<{ userKey: string; dono: boolean }>({ userKey: '', dono: false })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [verLidosId, setVerLidosId] = useState<string | null>(null)
  // form
  const [editId, setEditId] = useState<string | null>(null)
  const [fTitulo, setFTitulo] = useState('')
  const [fTexto, setFTexto] = useState('')
  const [fPrio, setFPrio] = useState('normal')
  const [form, setForm] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/mural').then(r => r.ok ? r.json() : null)
      if (d) { setAvisos((d.avisos || []).sort((a: Aviso, b: Aviso) => (b.data || '').localeCompare(a.data || ''))); setMe(d.me || { userKey: '', dono: false }) }
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function salvarLista(lista: Aviso[]) {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/mural', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avisos: lista }) })
      if (res.ok) { setAvisos([...lista].sort((a, b) => (b.data || '').localeCompare(a.data || ''))) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirNovo() { setEditId(null); setFTitulo(''); setFTexto(''); setFPrio('normal'); setForm(true) }
  function abrirEdit(a: Aviso) { setEditId(a.id); setFTitulo(a.titulo); setFTexto(a.texto); setFPrio(a.prioridade || 'normal'); setForm(true) }
  async function publicar() {
    if (!fTitulo.trim() || !fTexto.trim()) { toast.error('Preencha título e mensagem'); return }
    let lista: Aviso[]
    if (editId) lista = avisos.map(a => a.id === editId ? { ...a, titulo: fTitulo.trim(), texto: fTexto.trim(), prioridade: fPrio } : a)
    else lista = [{ id: rid(), titulo: fTitulo.trim(), texto: fTexto.trim(), prioridade: fPrio, data: new Date().toISOString().slice(0, 10), lidos: [] }, ...avisos]
    await salvarLista(lista); setForm(false); toast.success(editId ? 'Aviso atualizado!' : 'Aviso publicado!')
  }
  async function excluir(id: string) { if (!confirm('Excluir este aviso?')) return; await salvarLista(avisos.filter(a => a.id !== id)); toast.success('Excluído') }

  async function marcarLido(id: string) {
    setAvisos(p => p.map(a => a.id === id ? { ...a, lidos: [...(a.lidos || []), { k: me.userKey, nome: 'Você', em: new Date().toISOString() }] } : a))
    try { await fetch('/api/salon/mural', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }) } catch { /* */ }
  }
  const euLi = (a: Aviso) => (a.lidos || []).some(l => l.k === me.userKey)

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}><Megaphone size={15} style={{ display: 'inline', verticalAlign: -2, marginRight: 6, color: '#5b4fcf' }} />Mural de Avisos</span>
        {me.dono && <button onClick={abrirNovo} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}><Plus size={15} /> Novo aviso</button>}
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={26} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> :
          avisos.length === 0 ? <div style={{ textAlign: 'center', padding: 50, color: '#9ca3af', fontSize: 14 }}>Nenhum aviso ainda.{me.dono ? ' Clique em “Novo aviso”.' : ''}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {avisos.map(a => {
                const pr = PRIOS[a.prioridade] || PRIOS.normal
                const li = euLi(a)
                return (
                  <div key={a.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderLeft: `5px solid ${pr.cor}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: pr.cor, borderRadius: 20, padding: '2px 9px' }}>{pr.label.toUpperCase()}</span>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a' }}>{a.titulo}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{(a.data || '').split('-').reverse().join('/')}</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.55, wordBreak: 'break-word' }}>{a.texto}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                      {li
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: '#16a34a' }}><Check size={15} /> Você confirmou a leitura</span>
                        : <button onClick={() => marcarLido(a.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Check size={15} /> Marcar como lido</button>}
                      {me.dono && (
                        <>
                          <button onClick={() => setVerLidosId(verLidosId === a.id ? null : a.id)} style={{ fontSize: 12, color: '#5b4fcf', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}>👁️ Lido por {(a.lidos || []).length}</button>
                          <div style={{ flex: 1 }} />
                          <button onClick={() => abrirEdit(a)} title="Editar" style={{ border: '1px solid #e0ddd8', background: '#fff', color: '#5b4fcf', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}><Pencil size={13} /></button>
                          <button onClick={() => excluir(a.id)} title="Excluir" style={{ border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                    {me.dono && verLidosId === a.id && (
                      <div style={{ marginTop: 10, borderTop: '1px dashed #e8e6e0', paddingTop: 10, fontSize: 12, color: '#6b6860' }}>
                        {(a.lidos || []).length === 0 ? 'Ninguém leu ainda.' : (a.lidos || []).map((l, i) => <div key={i}>✓ {l.nome} — {new Date(l.em).toLocaleString('pt-BR')}</div>)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
      </div>

      {form && me.dono && (
        <div onClick={() => setForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{editId ? 'Editar aviso' : 'Novo aviso'}</h3>
              <button onClick={() => setForm(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <input value={fTitulo} onChange={e => setFTitulo(e.target.value)} placeholder="Título do aviso" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 14, marginBottom: 10 }} />
            <textarea value={fTexto} onChange={e => setFTexto(e.target.value)} placeholder="Mensagem para a equipe..." rows={5} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {Object.entries(PRIOS).map(([k, v]) => (
                <button key={k} onClick={() => setFPrio(k)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: fPrio === k ? `2px solid ${v.cor}` : '1.5px solid #d0cdc7', background: fPrio === k ? v.cor + '15' : '#fff', color: fPrio === k ? v.cor : '#6b6860', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{v.label}</button>
              ))}
            </div>
            <button onClick={publicar} disabled={salvando} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : (editId ? 'Salvar alterações' : 'Publicar aviso')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
