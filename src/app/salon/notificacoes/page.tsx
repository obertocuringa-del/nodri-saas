'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { voltar } from '@/lib/historicoNav'
import { ArrowLeft, Bell, Send, Trash2, Pencil, Check, X, Loader2, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NotificacoesPage() {
  const router = useRouter()
  const [profs, setProfs] = useState<any[]>([])
  const [lista, setLista] = useState<any[]>([])
  const [texto, setTexto] = useState('')
  const [alvo, setAlvo] = useState('todos')
  const [enviando, setEnviando] = useState(false)
  const [editId, setEditId] = useState('')
  const [editTexto, setEditTexto] = useState('')
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    const [p, n] = await Promise.all([
      fetch('/api/profissionais?leve=1').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/salon/notificacoes').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    setProfs((Array.isArray(p) ? p : []).filter((x: any) => x.ativo !== false && !x.is_departamento))
    setLista(Array.isArray(n?.notificacoes) ? n.notificacoes : [])
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const nomeDe = (a: any) => {
    if (a.alvo === 'todos') return 'Todos os profissionais'
    const p = profs.find(x => x.id === a.alvo)
    return p ? (p.apelido || p.nome_completo) : 'Profissional'
  }
  const tempoAtras = (em: number) => {
    if (!em) return ''
    const s = Math.floor((Date.now() - em) / 1000)
    if (s < 60) return 'agora'; if (s < 3600) return `há ${Math.floor(s / 60)} min`
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`; return `há ${Math.floor(s / 86400)} d`
  }

  async function enviar() {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      const res = await fetch('/api/salon/notificacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: texto.trim(), alvo }) })
      if (res.ok) { toast.success('Notificação enviada!'); setTexto(''); carregar() } else toast.error('Erro ao enviar')
    } catch { toast.error('Erro ao enviar') } finally { setEnviando(false) }
  }
  async function excluir(id: string) {
    if (!confirm('Excluir esta notificação?')) return
    try { const r = await fetch(`/api/salon/notificacoes?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); if (r.ok) { toast.success('Excluída'); setLista(l => l.filter(x => x.id !== id)) } else toast.error('Erro') } catch { toast.error('Erro') }
  }
  async function salvarEdicao() {
    if (!editTexto.trim()) return
    try {
      const r = await fetch('/api/salon/notificacoes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, texto: editTexto.trim() }) })
      if (r.ok) { toast.success('Editada'); setLista(l => l.map(x => x.id === editId ? { ...x, texto: editTexto.trim() } : x)); setEditId('') } else toast.error('Erro')
    } catch { toast.error('Erro') }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1.5px solid #d0cdc7', fontSize: 14, fontFamily: 'inherit' }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f3fb' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', borderBottom: '1px solid #ece9e2', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => voltar(router, '/salon')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Bell size={17} color="#5b4fcf" /> Central de Notificações</span>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: 18 }}>
        {/* Enviar */}
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 16, padding: 18, marginBottom: 18, boxShadow: '0 8px 24px rgba(91,79,207,.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>Nova notificação</h3>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3} placeholder="Escreva o aviso que aparecerá no painel do profissional…" style={{ ...inp, resize: 'vertical', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={alvo} onChange={e => setAlvo(e.target.value)} style={{ ...inp, width: 'auto', minWidth: 240, flex: 1 }}>
              <option value="todos">Para TODOS os profissionais</option>
              {profs.map(p => <option key={p.id} value={p.id}>{p.apelido || p.nome_completo}</option>)}
            </select>
            <button onClick={enviar} disabled={enviando || !texto.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 10, border: 'none', background: texto.trim() ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: 14, fontWeight: 800, cursor: texto.trim() ? 'pointer' : 'not-allowed' }}>
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar
            </button>
          </div>
        </div>

        {/* Lista */}
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#6b6860', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Enviadas ({lista.length})</h3>
        {loading ? <div style={{ textAlign: 'center', padding: 30 }}><Loader2 size={22} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> :
          lista.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>Nenhuma notificação enviada ainda.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lista.map(n => (
                <div key={n.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: '14px 16px', boxShadow: '0 6px 18px rgba(91,79,207,.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: n.alvo === 'todos' ? '#e0e7ff' : '#dcfce7', color: n.alvo === 'todos' ? '#4338ca' : '#15803d' }}>
                      {n.alvo === 'todos' ? <Users size={12} /> : null}{nomeDe(n)}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{tempoAtras(n.em)}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      {editId === n.id ? (
                        <>
                          <button onClick={salvarEdicao} title="Salvar" style={{ border: '1px solid #86d99b', background: '#fff', color: '#16a34a', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}><Check size={14} /></button>
                          <button onClick={() => setEditId('')} title="Cancelar" style={{ border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(n.id); setEditTexto(n.texto) }} title="Editar" style={{ border: '1px solid #c7d2fe', background: '#fff', color: '#4338ca', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}><Pencil size={14} /></button>
                          <button onClick={() => excluir(n.id)} title="Excluir" style={{ border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                  {editId === n.id
                    ? <textarea value={editTexto} onChange={e => setEditTexto(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
                    : <div style={{ fontSize: 14.5, color: '#1a1a1a', whiteSpace: 'pre-wrap' }}>{n.texto}</div>}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
