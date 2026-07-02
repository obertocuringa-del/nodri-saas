'use client'
import { useState, useEffect } from 'react'
import { Loader2, Trash2, Plus, ArrowLeft, Calendar, Link2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import WhatsPendencia from '@/components/salon/WhatsPendencia'

interface Profissional {
  id: string
  nome_completo: string
  apelido: string
  cargo: string
  ativo: boolean
  is_departamento?: boolean
  departamento_cor?: string
  pendencias_abertas?: number
}

interface Pendencia {
  id: string
  profissional_id: string
  mensagem: string
  data_limite: string | null
  resolvido: boolean
  resolvido_em: string | null
  criado_em: string
  profissionais?: { nome_completo: string; apelido: string } | null
}

const inputCls = "w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-nodri-cyan/40 transition-colors text-nodri-t1"
const labelCls = "text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block"

function nomeProfissional(p: Pendencia) {
  return p.profissionais?.apelido || p.profissionais?.nome_completo || p.profissional_id
}

function statusPendencia(p: Pendencia): 'vencida' | 'pendente' | 'resolvida' {
  if (p.resolvido) return 'resolvida'
  if (p.data_limite && new Date(p.data_limite + 'T23:59:59') < new Date()) return 'vencida'
  return 'pendente'
}

export default function PendenciasPage() {
  const router = useRouter()
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [salaoId, setSalaoId] = useState('')
  const [departamentos, setDepartamentos] = useState<Profissional[]>([])

  // Form
  const [profId, setProfId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [dataLimite, setDataLimite] = useState(() => new Date().toLocaleDateString('en-CA')) // padrão: hoje
  const [criando, setCriando] = useState(false)

  // Editar data
  const [editandoData, setEditandoData] = useState<string | null>(null)
  const [novaData, setNovaData] = useState('')

  // Editar mensagem
  const [editandoMensagem, setEditandoMensagem] = useState<string | null>(null)
  const [novaMensagemEdit, setNovaMensagemEdit] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/pendencias').then(r => r.json()),
      fetch('/api/profissionais').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()).catch(() => ({})),
    ]).then(([pend, profs, me]) => {
      setPendencias(Array.isArray(pend) ? pend : [])
      setProfissionais(Array.isArray(profs) ? profs.filter((p: Profissional) => p.ativo && !p.is_departamento) : [])
      setDepartamentos(Array.isArray(profs) ? profs.filter((p: Profissional) => p.is_departamento) : [])
      if (me?.salaoId) setSalaoId(me.salaoId)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function criar() {
    if (!profId || !mensagem.trim()) {
      toast.error('Selecione um profissional e preencha a mensagem')
      return
    }
    setCriando(true)
    const res = await fetch('/api/pendencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissional_id: profId, mensagem: mensagem.trim(), data_limite: dataLimite || null }),
    })
    if (res.ok) {
      const nova = await res.json()
      const prof = profissionais.find(p => p.id === profId)
      nova.profissionais = prof ? { nome_completo: prof.nome_completo, apelido: prof.apelido } : null
      setPendencias(prev => [nova, ...prev])
      setMensagem('')
      setDataLimite(new Date().toLocaleDateString('en-CA'))
      toast.success('Pendência criada!')
    } else {
      toast.error('Erro ao criar pendência')
    }
    setCriando(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta pendência?')) return
    const res = await fetch(`/api/pendencias/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPendencias(prev => prev.filter(p => p.id !== id))
      toast.success('Excluída!')
    } else {
      toast.error('Erro ao excluir')
    }
  }

  async function salvarData(id: string) {
    const res = await fetch(`/api/pendencias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_limite: novaData || null }),
    })
    if (res.ok) {
      const atualizada = await res.json()
      setPendencias(prev => prev.map(p => p.id === id ? { ...p, ...atualizada } : p))
      setEditandoData(null)
      toast.success('Data atualizada!')
    } else {
      toast.error('Erro ao atualizar data')
    }
  }

  async function salvarMensagem(id: string) {
    if (!novaMensagemEdit.trim()) return
    const res = await fetch(`/api/pendencias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: novaMensagemEdit.trim() }),
    })
    if (res.ok) {
      const atualizada = await res.json()
      setPendencias(prev => prev.map(p => p.id === id ? { ...p, ...atualizada } : p))
      setEditandoMensagem(null)
      toast.success('Anotação atualizada!')
    } else {
      toast.error('Erro ao atualizar anotação')
    }
  }

  async function marcarResolvida(id: string, resolvido: boolean) {
    const res = await fetch(`/api/pendencias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvido }),
    })
    if (res.ok) {
      const atualizada = await res.json()
      setPendencias(prev => prev.map(p => p.id === id ? { ...p, ...atualizada } : p))
      toast.success(resolvido ? 'Marcada como resolvida!' : 'Reaberta!')
    } else {
      toast.error('Erro ao atualizar')
    }
  }

  const vencidas   = pendencias.filter(p => statusPendencia(p) === 'vencida')
  const pendentes  = pendencias.filter(p => statusPendencia(p) === 'pendente')
  const resolvidas = pendencias.filter(p => statusPendencia(p) === 'resolvida')

  if (loading) return (
    <div className="min-h-screen bg-nodri-dark flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-nodri-cyan"/>
    </div>
  )

  function PendenciaCard({ p }: { p: Pendencia }) {
    const status = statusPendencia(p)
    return (
      <div className={`rounded-xl p-4 border flex items-start gap-3 ${
        status === 'vencida'  ? 'bg-red-500/5 border-red-500/20' :
        status === 'resolvida'? 'bg-green-500/5 border-green-500/20' :
        'bg-nodri-card border-nodri-border'
      }`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[11px] font-bold text-nodri-cyan">{nomeProfissional(p)}</span>
            {status === 'vencida'   && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">VENCIDA</span>}
            {status === 'pendente'  && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">PENDENTE</span>}
            {status === 'resolvida' && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">RESOLVIDA</span>}
            {p.data_limite && (
              <span className="text-[9px] text-nodri-t3">
                Limite: {new Date(p.data_limite + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          {/* Mensagem — modo visualização ou edição */}
          {editandoMensagem === p.id ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={novaMensagemEdit}
                onChange={e => setNovaMensagemEdit(e.target.value)}
                rows={3}
                autoFocus
                className="w-full bg-nodri-card border border-nodri-cyan/40 rounded-lg px-2 py-1.5 text-[12px] text-nodri-t1 outline-none resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => salvarMensagem(p.id)} className="text-[10px] px-2 py-1 rounded-lg bg-nodri-cyan text-nodri-dark font-bold">Salvar</button>
                <button onClick={() => setEditandoMensagem(null)} className="text-[10px] text-nodri-t3 hover:text-nodri-t1">Cancelar</button>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-nodri-t1 leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{p.mensagem}</p>
          )}
          {p.resolvido_em && (
            <p className="text-[9px] text-nodri-t3 mt-1">Resolvida em {new Date(p.resolvido_em).toLocaleDateString('pt-BR')}</p>
          )}
          {/* Editar data inline */}
          {!p.resolvido && editandoData === p.id && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="date"
                value={novaData}
                onChange={e => setNovaData(e.target.value)}
                onClick={e => { try { (e.currentTarget as any).showPicker?.() } catch { /* */ } }}
                className="bg-nodri-card border border-nodri-cyan/40 rounded-lg px-2 py-1 text-[11px] text-nodri-t1 outline-none cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
              <button onClick={() => salvarData(p.id)} className="text-[10px] px-2 py-1 rounded-lg bg-nodri-cyan text-nodri-dark font-bold">Salvar</button>
              <button onClick={() => setEditandoData(null)} className="text-[10px] text-nodri-t3 hover:text-nodri-t1">Cancelar</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!p.resolvido && (
            <>
              <WhatsPendencia mensagem={p.mensagem} />
              <button
                onClick={() => marcarResolvida(p.id, true)}
                className="text-[10px] px-2 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                Feito
              </button>
              <button
                title="Editar anotação"
                onClick={() => { setEditandoMensagem(p.id); setNovaMensagemEdit(p.mensagem); setEditandoData(null) }}
                className="text-[10px] px-2 py-1 rounded-lg bg-nodri-card border border-nodri-border text-nodri-t3 hover:text-nodri-cyan transition-colors">
                ✏️
              </button>
              <button
                title="Editar data limite"
                onClick={() => { setEditandoData(p.id); setNovaData(p.data_limite || ''); setEditandoMensagem(null) }}
                className="text-[10px] px-2 py-1 rounded-lg bg-nodri-card border border-nodri-border text-nodri-t3 hover:text-nodri-t1 transition-colors">
                <Calendar size={11}/>
              </button>
            </>
          )}
          {p.resolvido && (
            <button
              onClick={() => marcarResolvida(p.id, false)}
              className="text-[10px] px-2 py-1 rounded-lg bg-nodri-card border border-nodri-border text-nodri-t3 hover:text-nodri-t1 transition-colors">
              Reabrir
            </button>
          )}
          <button onClick={() => excluir(p.id)} className="text-nodri-t3 hover:text-nodri-red transition-colors">
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-nodri-dark">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/salon')} className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 transition-colors text-sm">
          <ArrowLeft size={15} /> Início
        </button>
        <div className="w-px h-4 bg-nodri-border" />
        <div className="flex-1">
          <h1 className="font-syne font-bold text-[15px] text-nodri-t1">Pendências Profissionais</h1>
          <p className="text-[10px] text-nodri-t3">Gerencie tarefas e compromissos da equipe</p>
        </div>
        {salaoId && (
          <button
            onClick={() => {
              const link = `${window.location.origin}/pendencia-prof/${salaoId}`
              navigator.clipboard.writeText(link)
              toast.success('Link copiado! Envie para os profissionais.')
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nodri-cyan/10 border border-nodri-cyan/30 text-nodri-cyan text-[11px] font-semibold hover:bg-nodri-cyan/20 transition-colors">
            <Link2 size={13}/> Copiar Link do Profissional
          </button>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">

        {/* ── DEPARTAMENTOS ── */}
        {departamentos.length > 0 && (
          <div>
            <p className="text-[10px] text-nodri-t3 uppercase tracking-widest font-bold mb-3">Departamentos</p>
            <div className="grid grid-cols-3 gap-3">
              {departamentos.map(d => {
                const cor = d.departamento_cor || '#5b4fcf'
                const icone = d.nome_completo === 'ADMINISTRATIVO' ? '🗂️' : d.nome_completo === 'FINANCEIRO' ? '💰' : d.nome_completo === 'RECEPÇÃO' ? '🛎️' : '🏢'
                const temPend = (d.pendencias_abertas || 0) > 0
                return (
                  <div key={d.id}
                    onClick={() => router.push(`/salon/profissionais/${d.id}`)}
                    className="cursor-pointer rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all hover:scale-[1.02]"
                    style={{ background: temPend ? '#fff0f0' : cor + '10', border: `1px solid ${temPend ? '#7f1d1d' : cor + '40'}` }}>
                    <div className="text-3xl">{icone}</div>
                    <div>
                      <p className="font-syne font-bold text-[11px] text-nodri-t1">{d.nome_completo}</p>
                      {temPend
                        ? <p className="text-[10px] text-red-400 font-semibold mt-0.5">⚠ {d.pendencias_abertas} pendência{d.pendencias_abertas! > 1 ? 's' : ''}</p>
                        : <p className="text-[10px] mt-0.5" style={{ color: cor }}>✓ Em dia</p>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Formulário */}
        <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
          <h2 className="font-syne font-bold text-[13px] mb-4 flex items-center gap-2">
            <Plus size={14} className="text-nodri-cyan"/> Nova Pendência
          </h2>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Profissional *</label>
              <select value={profId} onChange={e => setProfId(e.target.value)} className={inputCls}>
                <option value="">Selecione...</option>
                {departamentos.length > 0 && (
                  <>
                    <optgroup label="── Departamentos ──">
                      {departamentos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome_completo === 'ADMINISTRATIVO' ? '🗂️' : p.nome_completo === 'FINANCEIRO' ? '💰' : p.nome_completo === 'RECEPÇÃO' ? '🛎️' : '🏢'} {p.nome_completo}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── Profissionais ──">
                      {profissionais.map(p => (
                        <option key={p.id} value={p.id}>{p.apelido || p.nome_completo} — {p.cargo}</option>
                      ))}
                    </optgroup>
                  </>
                )}
                {departamentos.length === 0 && profissionais.map(p => (
                  <option key={p.id} value={p.id}>{p.apelido || p.nome_completo} — {p.cargo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Mensagem / Tarefa *</label>
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                rows={3}
                className={inputCls + ' resize-none'}
                placeholder="Descreva a pendência ou tarefa..."
              />
            </div>
            <div>
              <label className={labelCls}>Data Limite (opcional)</label>
              <input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)} onClick={e => { try { (e.currentTarget as any).showPicker?.() } catch { /* */ } }} className={inputCls} style={{ colorScheme: 'dark', cursor: 'pointer' }}/>
            </div>
            <button
              onClick={criar}
              disabled={criando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nodri-cyan text-nodri-dark text-[12px] font-bold hover:brightness-110 disabled:opacity-50">
              {criando ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>}
              Adicionar Pendência
            </button>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { l: 'Vencidas', v: vencidas.length, cor: '#ef4444' },
            { l: 'Pendentes', v: pendentes.length, cor: '#f59e0b' },
            { l: 'Resolvidas', v: resolvidas.length, cor: '#22c55e' },
          ].map(item => (
            <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3 text-center">
              <div className="text-[9px] text-nodri-t3 mb-1">{item.l}</div>
              <div className="font-syne font-bold text-[24px]" style={{ color: item.cor }}>{item.v}</div>
            </div>
          ))}
        </div>

        {/* Vencidas */}
        {vencidas.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-syne font-bold text-[12px] text-red-400">Vencidas ({vencidas.length})</h3>
            {vencidas.map(p => <PendenciaCard key={p.id} p={p}/>)}
          </div>
        )}

        {/* Pendentes */}
        {pendentes.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-syne font-bold text-[12px] text-amber-400">Pendentes ({pendentes.length})</h3>
            {pendentes.map(p => <PendenciaCard key={p.id} p={p}/>)}
          </div>
        )}

        {/* Resolvidas */}
        {resolvidas.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-syne font-bold text-[12px] text-green-400">Resolvidas ({resolvidas.length})</h3>
            {resolvidas.map(p => <PendenciaCard key={p.id} p={p}/>)}
          </div>
        )}

        {pendencias.length === 0 && (
          <div className="text-center py-16 text-nodri-t3">
            <span className="text-4xl"></span>
            <p className="text-[13px] mt-3">Nenhuma pendência cadastrada.</p>
          </div>
        )}
      </div>
    </div>
  )
}
