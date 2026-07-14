'use client'
import { useState, useEffect, useMemo, CSSProperties } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Check, Trash2, CornerUpRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Prof { id: string; nome_completo: string; apelido?: string; cargo?: string; ativo?: boolean; is_departamento?: boolean; departamento_cor?: string }
interface Demanda {
  id: string; profissional_id: string; mensagem: string; data_limite: string | null
  resolvido: boolean; resolvido_em: string | null; criado_em: string
  solicitante_id?: string | null; solicitante_nome?: string | null
  resposta?: string | null; prioridade?: string | null; origem?: string | null
}

function iconeDe(nome: string) {
  return nome === 'ADMINISTRATIVO' ? '🗂️' : nome === 'FINANCEIRO' ? '💰' : nome === 'RECEPÇÃO' ? '🛎️' : nome === 'GERÊNCIA' ? '🏢' : '🏢'
}

export default function DepartamentoPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [dep, setDep] = useState<Prof | null>(null)
  const [profs, setProfs] = useState<Prof[]>([])
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [loading, setLoading] = useState(true)
  const [ehDono, setEhDono] = useState(false)   // só o salão principal exclui/transfere

  // Resolver com resposta
  const [respondendo, setRespondendo] = useState<string | null>(null)
  const [respostaTxt, setRespostaTxt] = useState('')
  // Transferir
  const [transferindo, setTransferindo] = useState<string | null>(null)
  const [destino, setDestino] = useState('')

  async function carregar() {
    try {
      const [profList, pend, me] = await Promise.all([
        fetch('/api/profissionais').then(r => r.ok ? r.json() : []),
        fetch(`/api/pendencias?profissional_id=${id}`).then(r => r.ok ? r.json() : []),
        fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      const lista: Prof[] = Array.isArray(profList) ? profList : []
      setProfs(lista)
      setDep(lista.find(p => p.id === id) || null)
      setDemandas(Array.isArray(pend) ? pend : [])
      setEhDono(me?.role === 'salon')
    } catch { toast.error('Erro ao carregar') }
    setLoading(false)
  }
  useEffect(() => { carregar() }, [id])

  const departamentos = useMemo(() => profs.filter(p => p.is_departamento && p.id !== id), [profs, id])
  const profissionais = useMemo(() => profs.filter(p => !p.is_departamento && p.ativo !== false), [profs])

  const abertas = demandas.filter(d => !d.resolvido)
  const resolvidas = demandas.filter(d => d.resolvido)

  async function resolver(d: Demanda) {
    const res = await fetch(`/api/pendencias/${d.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvido: true, resposta: respostaTxt.trim() || undefined }),
    })
    if (res.ok) {
      const at = await res.json()
      setDemandas(prev => prev.map(x => x.id === d.id ? { ...x, ...at } : x))
      setRespondendo(null); setRespostaTxt('')
      toast.success(d.solicitante_id ? 'Resolvida! O solicitante foi avisado.' : 'Resolvida!')
    } else toast.error('Erro ao resolver')
  }

  async function reabrir(d: Demanda) {
    const res = await fetch(`/api/pendencias/${d.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolvido: false }) })
    if (res.ok) { const at = await res.json(); setDemandas(prev => prev.map(x => x.id === d.id ? { ...x, ...at } : x)); toast.success('Reaberta') }
    else toast.error('Erro')
  }

  async function excluir(d: Demanda) {
    if (!confirm('Excluir esta demanda?')) return
    const res = await fetch(`/api/pendencias/${d.id}`, { method: 'DELETE' })
    if (res.ok) { setDemandas(prev => prev.filter(x => x.id !== d.id)); toast.success('Excluída') }
    else toast.error('Erro ao excluir')
  }

  async function transferir(d: Demanda) {
    if (!destino) { toast.error('Escolha o destino'); return }
    const res = await fetch(`/api/pendencias/${d.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profissional_id: destino }) })
    if (res.ok) {
      setDemandas(prev => prev.filter(x => x.id !== d.id)) // saiu deste setor
      setTransferindo(null); setDestino('')
      const alvo = profs.find(p => p.id === destino)
      toast.success(`Transferida para ${alvo?.nome_completo || 'destino'}`)
    } else toast.error('Erro ao transferir')
  }

  const cor = dep?.departamento_cor || '#5b4fcf'

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}><Loader2 className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  function DemandaCard({ d }: { d: Demanda }) {
    const urgente = d.prioridade === 'urgente'
    const vencida = !d.resolvido && d.data_limite && new Date(d.data_limite + 'T23:59:59') < new Date()
    return (
      <div style={{ background: '#fff', border: `1px solid ${d.resolvido ? '#d1fae5' : urgente ? '#fecaca' : '#e8e6e0'}`, borderLeft: `4px solid ${d.resolvido ? '#22c55e' : urgente ? '#ef4444' : cor}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {d.origem === 'solicitacao' && d.solicitante_nome && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#5b4fcf', background: '#f0eefb', padding: '2px 8px', borderRadius: 999 }}>👤 {d.solicitante_nome}</span>
          )}
          {urgente && !d.resolvido && <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: 999 }}>URGENTE</span>}
          {d.resolvido && <span style={{ fontSize: 10, fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: 999 }}>RESOLVIDA</span>}
          {vencida && <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: 999 }}>VENCIDA</span>}
          <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 'auto' }}>{new Date(d.criado_em).toLocaleDateString('pt-BR')}</span>
        </div>
        <p style={{ fontSize: 13.5, color: '#1a1a1a', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.mensagem}</p>
        {d.resposta && <p style={{ fontSize: 12, color: '#047857', margin: '8px 0 0', background: '#f0fdf4', padding: '6px 10px', borderRadius: 8 }}>💬 {d.resposta}</p>}

        {/* Resolver com resposta */}
        {respondendo === d.id ? (
          <div style={{ marginTop: 10 }}>
            <textarea value={respostaTxt} onChange={e => setRespostaTxt(e.target.value)} rows={2} autoFocus placeholder="Resposta (opcional) — vai na notificação do solicitante"
              style={{ width: '100%', border: '1px solid #c9c4f0', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => resolver(d)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Concluir</button>
              <button onClick={() => { setRespondendo(null); setRespostaTxt('') }} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        ) : transferindo === d.id ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={destino} onChange={e => setDestino(e.target.value)} style={{ flex: 1, minWidth: 180, border: '1px solid #c9c4f0', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
              <option value="">Transferir para…</option>
              <optgroup label="── Setores ──">
                {departamentos.map(p => <option key={p.id} value={p.id}>{iconeDe(p.nome_completo)} {p.nome_completo}</option>)}
              </optgroup>
              <optgroup label="── Profissionais ──">
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.apelido || p.nome_completo}{p.cargo ? ` — ${p.cargo}` : ''}</option>)}
              </optgroup>
            </select>
            <button onClick={() => transferir(d)} style={{ background: cor, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Transferir</button>
            <button onClick={() => { setTransferindo(null); setDestino('') }} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {!d.resolvido && <button onClick={() => { setRespondendo(d.id); setRespostaTxt(''); setTransferindo(null) }} style={btn('#16a34a')}><Check size={13} /> Feito / Responder</button>}
            {!d.resolvido && ehDono && <button onClick={() => { setTransferindo(d.id); setDestino(''); setRespondendo(null) }} style={btn(cor)}><CornerUpRight size={13} /> Transferir</button>}
            {d.resolvido && ehDono && <button onClick={() => reabrir(d)} style={btnGhost()}>Reabrir</button>}
            {ehDono && <button onClick={() => excluir(d)} style={{ ...btnGhost(), color: '#dc2626', marginLeft: 'auto' }}><Trash2 size={13} /></button>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <nav style={{ background: '#fff', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon/profissionais')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Profissionais</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontSize: 22 }}>{dep ? iconeDe(dep.nome_completo) : '🏢'}</span>
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>{dep?.nome_completo || 'Departamento'}</span>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
        {/* Resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          {[
            { l: 'Abertas', v: abertas.length, c: '#f59e0b' },
            { l: 'Resolvidas', v: resolvidas.length, c: '#22c55e' },
            { l: 'Total', v: demandas.length, c: cor },
          ].map(x => (
            <div key={x.l} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>{x.l}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>

        {abertas.length > 0 && <>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Abertas ({abertas.length})</p>
          {abertas.map(d => <DemandaCard key={d.id} d={d} />)}
        </>}

        {resolvidas.length > 0 && <>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: .5, margin: '18px 0 8px' }}>Resolvidas ({resolvidas.length})</p>
          {resolvidas.map(d => <DemandaCard key={d.id} d={d} />)}
        </>}

        {demandas.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <p style={{ margin: 0 }}>Nenhuma demanda neste departamento.</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>As solicitações enviadas para cá aparecem aqui.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function btn(cor: string): CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, background: cor, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
}
function btnGhost(): CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: '#6b6860', border: '1px solid #e0ddd8', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
}
