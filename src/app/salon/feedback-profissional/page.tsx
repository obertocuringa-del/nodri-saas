'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, Copy, Eye, BarChart2, Users, ClipboardList, Upload, Lock, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Formulario { id: string; titulo: string; token: string; ativo: boolean; criado_em: string }
interface Profissional { id: string; nome: string; ativo: boolean }
interface Ocorrido { id: string; descricao: string; ativo: boolean }

export default function FeedbackProfissionalPage() {
  const router = useRouter()
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [selected, setSelected] = useState<Formulario | null>(null)
  const [tab, setTab] = useState<'registrar' | 'profissionais' | 'ocorridos' | 'link'>('registrar')
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [ocorridos, setOcorridos] = useState<Ocorrido[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [salaoUrl, setSalaoUrl] = useState('')
  const [novoProf, setNovoProf] = useState('')
  const [novoOcorr, setNovoOcorr] = useState('')
  const [editingProf, setEditingProf] = useState<{ id: string; nome: string } | null>(null)
  const [editingOcorr, setEditingOcorr] = useState<{ id: string; descricao: string } | null>(null)
  const [formProf, setFormProf] = useState('')
  const [formTipo, setFormTipo] = useState<'positivo' | 'negativo'>('negativo')
  const [formOcorr, setFormOcorr] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    setSalaoUrl(window.location.origin)
    fetch('/api/feedback-prof/formularios')
      .then(r => r.json())
      .then(data => {
        setFormularios(data)
        if (data.length > 0) setSelected(data[0])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selected) return
    Promise.all([
      fetch('/api/feedback-prof/profissionais').then(r => r.json()),
      fetch('/api/feedback-prof/ocorridos').then(r => r.json()),
    ]).then(([p, o]) => {
      setProfissionais(p)
      setOcorridos(o)
    })
  }, [selected])

  async function criarFormulario() {
    setSaving(true)
    const res = await fetch('/api/feedback-prof/formularios', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setFormularios(prev => [data, ...prev])
      setSelected(data)
      toast.success('Formulário criado!')
    }
    setSaving(false)
  }

  async function toggleAtivo() {
    if (!selected) return
    const res = await fetch(`/api/feedback-prof/formularios/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !selected.ativo }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSelected({ ...selected, ativo: updated.ativo })
      setFormularios(prev => prev.map(f => f.id === updated.id ? { ...f, ativo: updated.ativo } : f))
      toast.success(updated.ativo ? 'Ativado!' : 'Desativado!')
    }
  }

  async function excluirFormulario() {
    if (!selected || !confirm('Excluir este formulário e todas as respostas?')) return
    await fetch(`/api/feedback-prof/formularios/${selected.id}`, { method: 'DELETE' })
    setFormularios(prev => prev.filter(f => f.id !== selected.id))
    setSelected(null)
    toast.success('Excluído!')
  }

  async function addProf() {
    if (!novoProf.trim()) return
    setSaving(true)
    const res = await fetch('/api/feedback-prof/profissionais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoProf }),
    })
    if (res.ok) {
      const novo: Profissional = await res.json()
      setProfissionais(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNovoProf('')
      toast.success('Profissional adicionado!')
    }
    setSaving(false)
  }

  async function saveProf() {
    if (!editingProf) return
    const res = await fetch('/api/feedback-prof/profissionais', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingProf),
    })
    if (res.ok) {
      const u: Profissional = await res.json()
      setProfissionais(prev => prev.map(p => p.id === u.id ? u : p))
      setEditingProf(null)
      toast.success('Salvo!')
    }
  }

  async function deleteProf(id: string) {
    if (!confirm('Excluir profissional?')) return
    await fetch('/api/feedback-prof/profissionais', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setProfissionais(prev => prev.filter(p => p.id !== id))
    toast.success('Excluído!')
  }

  async function addOcorr() {
    if (!novoOcorr.trim()) return
    setSaving(true)
    const res = await fetch('/api/feedback-prof/ocorridos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao: novoOcorr }),
    })
    if (res.ok) {
      const novo: Ocorrido = await res.json()
      setOcorridos(prev => [...prev, novo].sort((a, b) => a.descricao.localeCompare(b.descricao)))
      setNovoOcorr('')
      toast.success('Ocorrido adicionado!')
    }
    setSaving(false)
  }

  async function saveOcorr() {
    if (!editingOcorr) return
    const res = await fetch('/api/feedback-prof/ocorridos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingOcorr),
    })
    if (res.ok) {
      const u: Ocorrido = await res.json()
      setOcorridos(prev => prev.map(o => o.id === u.id ? u : o))
      setEditingOcorr(null)
      toast.success('Salvo!')
    }
  }

  async function deleteOcorr(id: string) {
    if (!confirm('Excluir ocorrido?')) return
    await fetch('/api/feedback-prof/ocorridos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setOcorridos(prev => prev.filter(o => o.id !== id))
    toast.success('Excluído!')
  }

  async function registrarFeedback() {
    if (!selected || !formProf || !formOcorr) { toast.error('Preencha profissional e ocorrência'); return }
    setFormLoading(true)
    const ocorridoObj = ocorridos.find(o => o.descricao === formOcorr)
    const profObj = profissionais.find(p => p.nome === formProf)
    const res = await fetch(`/api/feedback-prof/public/${selected.token}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profissional_id: profObj?.id || null,
        profissional_nome: formProf,
        tipo: formTipo,
        ocorrido_id: ocorridoObj?.id || null,
        ocorrido_descricao: formOcorr,
        descricao: formDesc || null,
      }),
    })
    if (res.ok) {
      toast.success('Feedback registrado!')
      setFormProf('')
      setFormOcorr('')
      setFormDesc('')
      setFormTipo('negativo')
    } else {
      toast.error('Erro ao registrar')
    }
    setFormLoading(false)
  }

  const linkForm = selected ? `${salaoUrl}/feedback-profissional/${selected.token}` : ''

  if (loading) {
    return (
      <div className="nodri-salon-bg min-h-screen flex items-center justify-center">
        <div className="text-nodri-t2 text-sm">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="nodri-salon-bg min-h-screen">
      <nav className="bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3 sticky top-0 z-50">
        <button onClick={() => router.push('/salon')} className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 text-sm">
          <ArrowLeft size={15} /> Voltar
        </button>
        <div className="w-px h-4 bg-nodri-border" />
        <div className="flex items-center gap-2">
          <span className="text-xl">👥</span>
          <div>
            <div className="font-syne font-bold text-sm text-nodri-t1">Feedback Profissional</div>
            <div className="text-[10px] text-nodri-t3">Avalie o desempenho da sua equipe</div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-57px)]">
        {/* SIDEBAR */}
        <div className="w-64 border-r border-nodri-border bg-nodri-surface/50 flex flex-col overflow-y-auto shrink-0">
          <div className="p-3 border-b border-nodri-border">
            <div className="text-[10px] font-bold text-nodri-t3 uppercase tracking-wider">Formulários</div>
          </div>
          {formularios.length === 0 ? (
            <div className="p-4 text-center">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-[11px] text-nodri-t3 mb-3">Nenhum formulário.</p>
              <button onClick={criarFormulario} className="text-[11px] px-3 py-1.5 rounded-lg text-nodri-cyan border border-nodri-cyan/30">
                Criar formulário
              </button>
            </div>
          ) : (
            formularios.map(f => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className={`w-full text-left px-3 py-3 border-b border-nodri-border/50 transition-all hover:bg-nodri-surface ${selected?.id === f.id ? 'bg-nodri-surface border-l-2 border-l-nodri-cyan' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.ativo ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-[11.5px] font-medium text-nodri-t1 truncate flex-1">{f.titulo}</span>
                </div>
                <div className="text-[10px] text-nodri-t3 ml-3.5">{new Date(f.criado_em).toLocaleDateString('pt-BR')}</div>
              </button>
            ))
          )}

          {/* Botões de ação na lateral */}
          <div className="p-3 border-t border-nodri-border mt-auto space-y-1.5">
            <button
              onClick={criarFormulario}
              disabled={saving}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(34,197,94,.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,.25)' }}
            >
              <Plus size={12} /> Novo Formulário
            </button>
            {selected && (
              <>
                <button
                  onClick={() => router.push(`/salon/feedback-profissional/resultados/${selected.id}`)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: 'rgba(139,92,246,.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.3)' }}
                >
                  <BarChart2 size={12} /> Ver Resultados
                </button>
                <button
                  onClick={() => router.push(`/salon/feedback-profissional/gerenciar/${selected.id}`)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: 'rgba(250,204,21,.1)', color: '#facc15', border: '1px solid rgba(250,204,21,.25)' }}
                >
                  <Settings2 size={12} /> Gerenciar Feedbacks
                </button>
              </>
            )}
            <button
              onClick={() => router.push('/salon/feedback-profissional/bloqueios')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)' }}
            >
              <Lock size={12} /> Bloqueios
            </button>
            <button
              onClick={() => router.push('/salon/feedback-profissional/importar')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(6,182,212,.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,.25)' }}
            >
              <Upload size={12} /> Importar Histórico
            </button>
          </div>
        </div>

        {/* CONTEÚDO */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-nodri-t1 font-syne font-bold text-lg mb-2">Feedback Profissional</h2>
              <p className="text-nodri-t2 text-sm mb-6 max-w-sm">Registre ocorrências e avalie o desempenho da sua equipe</p>
              <button
                onClick={criarFormulario}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm mx-auto"
                style={{ background: 'linear-gradient(135deg,#7c5cfc,#f43f8e)', color: 'white' }}
              >
                <Plus size={16} /> Criar formulário
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-4 pb-0 border-b border-nodri-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-syne font-bold text-sm text-nodri-t1">{selected.titulo}</h2>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${selected.ativo ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                    {selected.ativo ? 'ATIVO' : 'INATIVO'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={toggleAtivo} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] border" style={{ borderColor: 'rgba(255,255,255,.1)', color: '#94a3b8' }}>
                    <Eye size={10} /> {selected.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={excluirFormulario} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] border border-red-500/30 text-red-400">
                    <Trash2 size={10} /> Excluir
                  </button>
                </div>
              </div>
              <div className="flex gap-0 overflow-x-auto">
                {([
                  { id: 'registrar', label: '✏️ Registrar Feedback' },
                  { id: 'profissionais', label: `👥 Profissionais (${profissionais.length})` },
                  { id: 'ocorridos', label: `📋 Ocorridos (${ocorridos.length})` },
                  { id: 'link', label: '🔗 Link' },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-4 py-2 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-nodri-cyan text-nodri-cyan' : 'border-transparent text-nodri-t3 hover:text-nodri-t1'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">

              {tab === 'registrar' && (
                <div className="max-w-lg mx-auto">
                  <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.08)' }}>
                    {/* Header */}
                    <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,.06)', background: 'linear-gradient(135deg,rgba(124,92,252,.08),rgba(244,63,142,.05))' }}>
                      <div className="text-[13px] font-bold text-nodri-t1 mb-0.5">Registrar Ocorrência</div>
                      <div className="text-[11px] text-nodri-t3">Preencha os dados abaixo para registrar um feedback</div>
                    </div>
                    <div className="p-6 space-y-5">

                      {/* Tipo */}
                      <div>
                        <label className="text-[11px] font-semibold text-nodri-t3 uppercase tracking-wider block mb-2">Tipo de Registro</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setFormTipo('positivo')}
                            className="py-3 rounded-xl text-[12px] font-bold transition-all"
                            style={formTipo === 'positivo'
                              ? { background: 'rgba(34,197,94,.15)', color: '#4ade80', border: '2px solid rgba(34,197,94,.4)' }
                              : { background: 'rgba(255,255,255,.03)', color: '#64748b', border: '1px solid rgba(255,255,255,.08)' }}>
                            ✅ Positivo
                          </button>
                          <button
                            onClick={() => setFormTipo('negativo')}
                            className="py-3 rounded-xl text-[12px] font-bold transition-all"
                            style={formTipo === 'negativo'
                              ? { background: 'rgba(239,68,68,.12)', color: '#f87171', border: '2px solid rgba(239,68,68,.35)' }
                              : { background: 'rgba(255,255,255,.03)', color: '#64748b', border: '1px solid rgba(255,255,255,.08)' }}>
                            ❌ Negativo
                          </button>
                        </div>
                      </div>

                      {/* Profissional */}
                      <div>
                        <label className="text-[11px] font-semibold text-nodri-t3 uppercase tracking-wider block mb-2">Profissional</label>
                        <select
                          value={formProf}
                          onChange={e => setFormProf(e.target.value)}
                          className="w-full bg-nodri-card border border-nodri-border rounded-xl px-4 py-3 text-[13px] text-nodri-t1 outline-none focus:border-nodri-cyan/40 transition-colors"
                          style={{ appearance: 'auto' }}>
                          <option value="">Selecione o profissional...</option>
                          {profissionais.filter(p => p.ativo).map(p => (
                            <option key={p.id} value={p.nome}>{p.nome}</option>
                          ))}
                        </select>
                      </div>

                      {/* Ocorrência */}
                      <div>
                        <label className="text-[11px] font-semibold text-nodri-t3 uppercase tracking-wider block mb-2">Ocorrência</label>
                        <select
                          value={formOcorr}
                          onChange={e => setFormOcorr(e.target.value)}
                          className="w-full bg-nodri-card border border-nodri-border rounded-xl px-4 py-3 text-[13px] text-nodri-t1 outline-none focus:border-nodri-cyan/40 transition-colors"
                          style={{ appearance: 'auto' }}>
                          <option value="">Selecione a ocorrência...</option>
                          {ocorridos.filter(o => o.ativo).map(o => (
                            <option key={o.id} value={o.descricao}>{o.descricao}</option>
                          ))}
                        </select>
                      </div>

                      {/* Descrição */}
                      <div>
                        <label className="text-[11px] font-semibold text-nodri-t3 uppercase tracking-wider block mb-2">Descrição <span className="text-nodri-t3 font-normal normal-case">(opcional)</span></label>
                        <textarea
                          value={formDesc}
                          onChange={e => setFormDesc(e.target.value)}
                          placeholder="Descreva o ocorrido com mais detalhes..."
                          rows={3}
                          className="w-full bg-nodri-card border border-nodri-border rounded-xl px-4 py-3 text-[12px] text-nodri-t1 placeholder-nodri-t3 outline-none focus:border-nodri-cyan/40 transition-colors resize-none"
                        />
                      </div>

                      {/* Botão */}
                      <button
                        onClick={registrarFeedback}
                        disabled={formLoading || !formProf || !formOcorr}
                        className="w-full py-3 rounded-xl text-[13px] font-bold transition-all disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,rgba(124,92,252,.3),rgba(244,63,142,.2))', color: '#c084fc', border: '1px solid rgba(139,92,246,.4)' }}>
                        {formLoading ? '⏳ Registrando...' : '✓ Registrar Feedback'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'profissionais' && (
                <div className="max-w-xl space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={novoProf}
                      onChange={e => setNovoProf(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addProf() }}
                      placeholder="Nome do profissional..."
                      className="flex-1 bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 placeholder-nodri-t3 outline-none focus:border-nodri-cyan/40 uppercase"
                    />
                    <button
                      onClick={addProf}
                      disabled={saving || !novoProf.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold disabled:opacity-50"
                      style={{ background: 'rgba(34,197,94,.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,.3)' }}
                    >
                      <Plus size={13} /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {profissionais.map(p => (
                      <div key={p.id} className="flex items-center gap-2 p-3 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.06)' }}>
                        {editingProf?.id === p.id ? (
                          <>
                            <input
                              value={editingProf.nome}
                              onChange={e => setEditingProf({ ...editingProf, nome: e.target.value })}
                              className="flex-1 bg-nodri-card border border-nodri-cyan/30 rounded-lg px-2 py-1 text-[12px] text-nodri-t1 outline-none uppercase"
                            />
                            <button onClick={saveProf} className="w-7 h-7 rounded-md flex items-center justify-center text-green-400 hover:bg-green-400/10"><Check size={12} /></button>
                            <button onClick={() => setEditingProf(null)} className="w-7 h-7 rounded-md flex items-center justify-center text-nodri-t3"><X size={12} /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-[12px] font-semibold text-nodri-t1">{p.nome}</span>
                            <button onClick={() => setEditingProf({ id: p.id, nome: p.nome })} className="w-7 h-7 rounded-md flex items-center justify-center text-nodri-t3 hover:text-nodri-cyan hover:bg-nodri-cyan/10"><Edit2 size={12} /></button>
                            <button onClick={() => deleteProf(p.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-nodri-t3 hover:text-red-400 hover:bg-red-400/10"><Trash2 size={12} /></button>
                          </>
                        )}
                      </div>
                    ))}
                    {profissionais.length === 0 && <p className="text-nodri-t3 text-sm text-center py-4">Nenhum profissional cadastrado.</p>}
                  </div>
                </div>
              )}

              {tab === 'ocorridos' && (
                <div className="max-w-xl space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={novoOcorr}
                      onChange={e => setNovoOcorr(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addOcorr() }}
                      placeholder="Descrição do ocorrido..."
                      className="flex-1 bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 placeholder-nodri-t3 outline-none focus:border-nodri-cyan/40 uppercase"
                    />
                    <button
                      onClick={addOcorr}
                      disabled={saving || !novoOcorr.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold disabled:opacity-50"
                      style={{ background: 'rgba(34,197,94,.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,.3)' }}
                    >
                      <Plus size={13} /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {ocorridos.map(o => (
                      <div key={o.id} className="flex items-center gap-2 p-3 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.06)' }}>
                        {editingOcorr?.id === o.id ? (
                          <>
                            <input
                              value={editingOcorr.descricao}
                              onChange={e => setEditingOcorr({ ...editingOcorr, descricao: e.target.value })}
                              className="flex-1 bg-nodri-card border border-nodri-cyan/30 rounded-lg px-2 py-1 text-[12px] text-nodri-t1 outline-none uppercase"
                            />
                            <button onClick={saveOcorr} className="w-7 h-7 rounded-md flex items-center justify-center text-green-400 hover:bg-green-400/10"><Check size={12} /></button>
                            <button onClick={() => setEditingOcorr(null)} className="w-7 h-7 rounded-md flex items-center justify-center text-nodri-t3"><X size={12} /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-[11px] text-nodri-t1">{o.descricao}</span>
                            <button onClick={() => setEditingOcorr({ id: o.id, descricao: o.descricao })} className="w-7 h-7 rounded-md flex items-center justify-center text-nodri-t3 hover:text-nodri-cyan hover:bg-nodri-cyan/10"><Edit2 size={12} /></button>
                            <button onClick={() => deleteOcorr(o.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-nodri-t3 hover:text-red-400 hover:bg-red-400/10"><Trash2 size={12} /></button>
                          </>
                        )}
                      </div>
                    ))}
                    {ocorridos.length === 0 && <p className="text-nodri-t3 text-sm text-center py-4">Nenhum ocorrido cadastrado.</p>}
                  </div>
                </div>
              )}

              {tab === 'link' && (
                <div className="max-w-lg space-y-4">
                  <div className="p-5 rounded-2xl border" style={{ background: '#0d1117', borderColor: 'rgba(139,92,246,.25)' }}>
                    <div className="text-[11px] font-bold text-purple-400 mb-3">🔗 Link do Formulário para Registro</div>
                    <p className="text-[11px] text-nodri-t3 mb-4">
                      Compartilhe com coordenadores, gerentes ou líderes para registrar ocorrências dos profissionais.
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-xl border mb-3" style={{ background: '#060a0f', borderColor: 'rgba(255,255,255,.08)' }}>
                      <span className="flex-1 text-[11px] text-nodri-cyan break-all">{linkForm}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(linkForm); toast.success('Link copiado!') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0"
                        style={{ background: 'rgba(139,92,246,.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.35)' }}
                      >
                        <Copy size={11} /> Copiar
                      </button>
                    </div>
                    <a
                      href={linkForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold w-fit"
                      style={{ background: 'rgba(34,197,94,.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,.25)' }}
                    >
                      <Eye size={11} /> Visualizar formulário
                    </a>
                  </div>
                  <div className="p-4 rounded-xl border" style={{ borderColor: 'rgba(255,200,0,.2)', background: 'rgba(255,200,0,.04)' }}>
                    <div className="text-[10px] font-bold text-yellow-400 mb-2">💡 Como usar</div>
                    <ul className="text-[11px] text-nodri-t2 space-y-1.5">
                      <li>• Envie o link para coordenadores registrarem diariamente</li>
                      <li>• Profissionais e ocorridos aparecem em lista suspensa</li>
                      <li>• Cada registro fica salvo com data e hora</li>
                      <li>• Veja o ranking e tendências em &quot;Ver Resultados&quot;</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
