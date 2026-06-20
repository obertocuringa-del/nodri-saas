'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Edit2, Link2, BarChart2, Check, X, ChevronDown, ChevronUp, ArrowLeft, Eye, EyeOff, GripVertical, Copy, Menu, Star, ClipboardList, FileText, Settings, Link, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

type TipoPergunta = 'escala' | 'multipla_escolha' | 'texto' | 'sim_nao' | 'grid'

interface Pergunta {
  id: string
  titulo: string
  tipo: TipoPergunta
  opcoes: string[]
  obrigatoria: boolean
  ordem: number
}

interface Formulario {
  id: string
  titulo: string
  descricao: string
  token: string
  slug?: string
  ativo: boolean
  criado_em: string
  perguntas?: Pergunta[]
}

const TIPO_LABELS: Record<TipoPergunta, string> = {
  escala: 'Escala 0-10 (NPS)',
  multipla_escolha: 'Múltipla Escolha',
  texto: 'Texto Livre',
  sim_nao: 'Sim / Não',
  grid: 'Grade de Avaliação (1-5)',
}

const TIPO_ICONS: Record<TipoPergunta, string> = {
  escala: '',
  multipla_escolha: '',
  texto: '',
  sim_nao: '',
  grid: '',
}

export default function FeedbackPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [selected, setSelected] = useState<Formulario | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'perguntas' | 'link' | 'config'>('link')
  const [editando, setEditando] = useState<Pergunta | null>(null)
  const [showNova, setShowNova] = useState(false)
  const [novaPerg, setNovaPerg] = useState<{ titulo: string; tipo: TipoPergunta; opcoes: string; obrigatoria: boolean }>({
    titulo: '', tipo: 'multipla_escolha', opcoes: '', obrigatoria: true,
  })
  const [salaoUrl, setSalaoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => {
    setSalaoUrl(window.location.origin)
    fetchFormularios()
  }, [])

  const fetchFormularios = async () => {
    setLoading(true)
    const res = await fetch('/api/feedback/formularios')
    if (res.ok) {
      const data = await res.json()
      setFormularios(data)
      if (data.length > 0 && !selected) {
        selectForm(data[0])
      }
    }
    setLoading(false)
  }

  const selectForm = async (form: Formulario) => {
    setSelected(form)
    setEditTitle(form.titulo)
    setEditDesc(form.descricao || '')
    const res = await fetch(`/api/feedback/formularios/${form.id}`)
    if (res.ok) {
      const data = await res.json()
      setPerguntas(data.perguntas || [])
    }
  }

  const criarFormulario = async () => {
    setSaving(true)
    const res = await fetch('/api/feedback/formularios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    if (res.ok) {
      toast.success('Formulário criado!')
      await fetchFormularios()
      const data = await res.json()
      selectForm(data)
    } else {
      toast.error('Erro ao criar formulário')
    }
    setSaving(false)
  }

  const salvarConfig = async () => {
    if (!selected) return
    setSaving(true)
    const res = await fetch(`/api/feedback/formularios/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: editTitle, descricao: editDesc }),
    })
    if (res.ok) {
      toast.success('Configurações salvas!')
      const updated = await res.json()
      setSelected({ ...selected, titulo: updated.titulo, descricao: updated.descricao })
      setFormularios(prev => prev.map(f => f.id === updated.id ? { ...f, titulo: updated.titulo } : f))
    }
    setSaving(false)
  }

  const toggleAtivo = async () => {
    if (!selected) return
    const res = await fetch(`/api/feedback/formularios/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !selected.ativo }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSelected({ ...selected, ativo: updated.ativo })
      setFormularios(prev => prev.map(f => f.id === updated.id ? { ...f, ativo: updated.ativo } : f))
      toast.success(updated.ativo ? 'Formulário ativado!' : 'Formulário desativado!')
    }
  }

  const excluirFormulario = async () => {
    if (!selected) return
    if (!confirm('Excluir este formulário e TODAS as respostas? Esta ação não pode ser desfeita.')) return
    const res = await fetch(`/api/feedback/formularios/${selected.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Formulário excluído')
      setSelected(null)
      setPerguntas([])
      await fetchFormularios()
    }
  }

  const adicionarPergunta = async () => {
    if (!selected || !novaPerg.titulo.trim()) return
    setSaving(true)
    const opcoes = novaPerg.tipo === 'escala' || novaPerg.tipo === 'texto' ? [] :
      novaPerg.opcoes.split('\n').map(o => o.trim()).filter(Boolean)

    const res = await fetch(`/api/feedback/formularios/${selected.id}/perguntas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: novaPerg.titulo, tipo: novaPerg.tipo, opcoes, obrigatoria: novaPerg.obrigatoria }),
    })
    if (res.ok) {
      const data = await res.json()
      setPerguntas(prev => [...prev, data])
      setNovaPerg({ titulo: '', tipo: 'multipla_escolha', opcoes: '', obrigatoria: true })
      setShowNova(false)
      toast.success('Pergunta adicionada!')
    }
    setSaving(false)
  }

  const salvarPergunta = async () => {
    if (!editando) return
    setSaving(true)
    const opcoes = editando.tipo === 'escala' || editando.tipo === 'texto' ? [] : editando.opcoes
    const res = await fetch(`/api/feedback/perguntas/${editando.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: editando.titulo, tipo: editando.tipo, opcoes, obrigatoria: editando.obrigatoria }),
    })
    if (res.ok) {
      const data = await res.json()
      setPerguntas(prev => prev.map(p => p.id === data.id ? data : p))
      setEditando(null)
      toast.success('Pergunta atualizada!')
    }
    setSaving(false)
  }

  const excluirPergunta = async (id: string) => {
    if (!confirm('Excluir esta pergunta?')) return
    const res = await fetch(`/api/feedback/perguntas/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPerguntas(prev => prev.filter(p => p.id !== id))
      toast.success('Pergunta excluída!')
    }
  }

  const copiarLink = useCallback(() => {
    if (!selected) return
    const link = selected.slug ? `${salaoUrl}/avaliacao/${selected.slug}` : `${salaoUrl}/feedback/${selected.token}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }, [selected, salaoUrl])

  const linkFeedback = selected ? selected.slug ? `${salaoUrl}/avaliacao/${selected.slug}` : `${salaoUrl}/feedback/${selected.token}` : ''

  if (loading) {
    return (
      <div className="nodri-salon-bg min-h-screen flex items-center justify-center">
        <div className="text-nodri-t2 text-sm">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="nodri-salon-bg min-h-screen">
      {/* NAVBAR */}
      <nav className="bg-nodri-surface border-b border-nodri-border px-3 lg:px-5 py-3 flex items-center gap-3 sticky top-0 z-50">
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-nodri-t2 hover:text-nodri-cyan transition-colors">
          <Menu size={18} />
        </button>
        <button onClick={() => router.push('/salon')} className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 transition-colors text-sm">
          <ArrowLeft size={15} /> Voltar
        </button>
        <div className="w-px h-4 bg-nodri-border" />
        <div className="flex items-center gap-2">
          <Star size={18} className="text-nodri-amber" />
          <div>
            <div className="font-syne font-bold text-sm text-nodri-t1">Feedback de Cliente</div>
            <div className="hidden sm:block text-[10px] text-nodri-t3">Colete e analise avaliações dos seus clientes</div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Overlay mobile */}
        {isMobile && sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSidebarOpen(false)} />}

        {/* SIDEBAR - Lista de formulários */}
        <div style={{
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 57 : undefined,
          bottom: isMobile ? 0 : undefined,
          left: 0,
          zIndex: isMobile ? 50 : undefined,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease',
          width: 256,
          flexShrink: 0,
          borderRight: '1px solid var(--nodri-border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          background: 'var(--nodri-surface)',
        }}>
          <div className="p-3 border-b border-nodri-border">
            <div className="text-[10px] font-bold text-nodri-t3 uppercase tracking-wider">Formulários</div>
          </div>
          {formularios.length === 0 ? (
            <div className="p-4 text-center">
              <div className="flex justify-center mb-2"><ClipboardList size={30} className="text-nodri-t3" /></div>
              <p className="text-[11px] text-nodri-t3 mb-3">Nenhum formulário ainda.</p>
              <button onClick={criarFormulario} disabled={saving}
                className="text-[11px] px-3 py-1.5 rounded-lg text-nodri-cyan border border-nodri-cyan/30 hover:bg-nodri-cyan/10 transition-colors">
                Criar formulário padrão
              </button>
            </div>
          ) : (
            formularios.map(f => (
              <button key={f.id} onClick={() => { selectForm(f); setSidebarOpen(false) }}
                className={`w-full text-left px-3 py-3 border-b border-nodri-border/50 transition-all hover:bg-nodri-surface ${selected?.id === f.id ? 'bg-nodri-surface border-l-2 border-l-nodri-cyan' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.ativo ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-[11.5px] font-medium text-nodri-t1 truncate flex-1">{f.titulo}</span>
                </div>
                <div className="text-[10px] text-nodri-t3 ml-3.5">
                  {new Date(f.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                </div>
              </button>
            ))
          )}

          {/* Botões na lateral */}
          <div className="p-3 border-t border-nodri-border mt-auto space-y-1.5">
            <button onClick={criarFormulario} disabled={saving}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
              <Plus size={12} /> Novo Formulário
            </button>
            {selected && (
              <button onClick={() => router.push(`/salon/feedback/resultados/${selected.id}`)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#7c6fe0', border: '1px solid rgba(139,92,246,0.3)' }}>
                <BarChart2 size={12} /> Ver Resultados
              </button>
            )}
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="flex justify-center mb-4"><Star size={56} className="text-nodri-amber" /></div>
              <h2 className="text-nodri-t1 font-syne font-bold text-lg mb-2">Sistema de Feedback</h2>
              <p className="text-nodri-t2 text-sm mb-6 max-w-sm">Crie formulários personalizados e envie o link para seus clientes responderem</p>
              <button onClick={criarFormulario} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm mx-auto transition-all"
                style={{ background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', color: 'white' }}>
                <Plus size={16} /> Criar primeiro formulário
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header do form selecionado */}
            <div className="px-5 pt-4 pb-0 border-b border-nodri-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-syne font-bold text-sm text-nodri-t1">{selected.titulo}</h2>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${selected.ativo ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                    {selected.ativo ? 'ATIVO' : 'INATIVO'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={toggleAtivo}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] border transition-all"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#9e9b94' }}>
                    {selected.ativo ? <><EyeOff size={10} /> Desativar</> : <><Eye size={10} /> Ativar</>}
                  </button>
                  <button onClick={excluirFormulario}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 size={10} /> Excluir
                  </button>
                </div>
              </div>
              <div className="flex gap-0 border-b-0">
                {(['perguntas', 'link', 'config'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-2 text-[11px] font-medium capitalize border-b-2 transition-all ${tab === t ? 'border-nodri-cyan text-nodri-cyan' : 'border-transparent text-nodri-t3 hover:text-nodri-t1'}`}>
                    {t === 'perguntas' ? <><Pencil size={11} className="inline mr-1" />Perguntas</> : t === 'link' ? <><Link size={11} className="inline mr-1" />Link para Clientes</> : <><Settings size={11} className="inline mr-1" />Configurações</>}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* TAB: PERGUNTAS */}
              {tab === 'perguntas' && (
                <div className="max-w-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[11px] text-nodri-t2">{perguntas.length} pergunta{perguntas.length !== 1 ? 's' : ''}</div>
                    <button onClick={() => setShowNova(!showNova)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                      <Plus size={12} /> Adicionar Pergunta
                    </button>
                  </div>

                  {/* NOVA PERGUNTA FORM */}
                  {showNova && (
                    <div className="mb-4 p-4 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(34,197,94,0.2)' }}>
                      <div className="text-[11px] font-bold text-green-400 mb-3">Nova Pergunta</div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-nodri-t3 mb-1 block">Texto da pergunta</label>
                          <input value={novaPerg.titulo} onChange={e => setNovaPerg(p => ({ ...p, titulo: e.target.value }))}
                            placeholder="Ex: Como você avalia o atendimento?"
                            className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 placeholder-nodri-t3 outline-none focus:border-nodri-cyan/40" />
                        </div>
                        <div>
                          <label className="text-[10px] text-nodri-t3 mb-1 block">Tipo de resposta</label>
                          <select value={novaPerg.tipo} onChange={e => setNovaPerg(p => ({ ...p, tipo: e.target.value as TipoPergunta }))}
                            className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none">
                            {Object.entries(TIPO_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{TIPO_ICONS[v as TipoPergunta]} {l}</option>
                            ))}
                          </select>
                        </div>
                        {novaPerg.tipo !== 'escala' && novaPerg.tipo !== 'texto' && (
                          <div>
                            <label className="text-[10px] text-nodri-t3 mb-1 block">Opções (uma por linha)</label>
                            <textarea value={novaPerg.opcoes} onChange={e => setNovaPerg(p => ({ ...p, opcoes: e.target.value }))}
                              placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                              rows={4}
                              className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 placeholder-nodri-t3 outline-none focus:border-nodri-cyan/40 resize-none" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="obrig" checked={novaPerg.obrigatoria} onChange={e => setNovaPerg(p => ({ ...p, obrigatoria: e.target.checked }))}
                            className="accent-nodri-cyan" />
                          <label htmlFor="obrig" className="text-[11px] text-nodri-t2">Obrigatória</label>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={adicionarPergunta} disabled={saving || !novaPerg.titulo.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold disabled:opacity-50 transition-all"
                            style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                            <Check size={12} /> Adicionar
                          </button>
                          <button onClick={() => setShowNova(false)}
                            className="px-4 py-2 rounded-lg text-[11px] border border-nodri-border text-nodri-t2 hover:text-nodri-t1 transition-all">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LISTA DE PERGUNTAS */}
                  <div className="space-y-2">
                    {perguntas.map((p, i) => (
                      <div key={p.id} className="rounded-xl border transition-all"
                        style={{ background: '#0d1117', borderColor: editando?.id === p.id ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.06)' }}>
                        {editando?.id === p.id ? (
                          <div className="p-4 space-y-3">
                            <div>
                              <label className="text-[10px] text-nodri-t3 mb-1 block">Texto da pergunta</label>
                              <input value={editando.titulo} onChange={e => setEditando(prev => prev ? { ...prev, titulo: e.target.value } : prev)}
                                className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan/40" />
                            </div>
                            <div>
                              <label className="text-[10px] text-nodri-t3 mb-1 block">Tipo</label>
                              <select value={editando.tipo} onChange={e => setEditando(prev => prev ? { ...prev, tipo: e.target.value as TipoPergunta } : prev)}
                                className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none">
                                {Object.entries(TIPO_LABELS).map(([v, l]) => (
                                  <option key={v} value={v}>{TIPO_ICONS[v as TipoPergunta]} {l}</option>
                                ))}
                              </select>
                            </div>
                            {editando.tipo !== 'escala' && editando.tipo !== 'texto' && (
                              <div>
                                <label className="text-[10px] text-nodri-t3 mb-1 block">Opções (uma por linha)</label>
                                <textarea value={editando.opcoes.join('\n')} onChange={e => setEditando(prev => prev ? { ...prev, opcoes: e.target.value.split('\n') } : prev)}
                                  rows={4} className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan/40 resize-none" />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={editando.obrigatoria} onChange={e => setEditando(prev => prev ? { ...prev, obrigatoria: e.target.checked } : prev)} className="accent-nodri-cyan" />
                              <span className="text-[11px] text-nodri-t2">Obrigatória</span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={salvarPergunta} disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                                style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' }}>
                                <Check size={11} /> Salvar
                              </button>
                              <button onClick={() => setEditando(null)}
                                className="px-4 py-1.5 rounded-lg text-[11px] border border-nodri-border text-nodri-t2">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 flex items-center gap-3">
                            <div className="flex items-center gap-1 shrink-0 text-nodri-t3">
                              <GripVertical size={13} />
                              <span className="text-[10px] w-4 text-center">{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[13px]">{TIPO_ICONS[p.tipo]}</span>
                                <span className="text-[12px] text-nodri-t1 font-medium leading-snug">{p.titulo}</span>
                                {p.obrigatoria && <span className="text-red-400 text-[10px]">*</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#9e9b94' }}>
                                  {TIPO_LABELS[p.tipo]}
                                </span>
                                {p.opcoes.length > 0 && (
                                  <span className="text-[9px] text-nodri-t3">{p.opcoes.length} opções</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => setEditando(p)}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-nodri-t3 hover:text-nodri-cyan hover:bg-nodri-cyan/10 transition-all">
                                <Edit2 size={12} />
                              </button>
                              <button onClick={() => excluirPergunta(p.id)}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-nodri-t3 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {perguntas.length === 0 && !showNova && (
                      <div className="text-center py-8 text-nodri-t3 text-sm">
                        <div className="flex justify-center mb-2"><FileText size={30} className="text-nodri-t3" /></div>
                        <p>Nenhuma pergunta ainda.</p>
                        <p className="text-[11px] mt-1">Clique em "Adicionar Pergunta" para começar.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: LINK */}
              {tab === 'link' && (
                <div className="max-w-lg">
                  <div className="p-5 rounded-2xl border mb-4" style={{ background: '#0d1117', borderColor: 'rgba(139,92,246,0.25)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 size={16} className="text-purple-400" />
                      <span className="font-semibold text-nodri-t1 text-sm">Link do Formulário</span>
                    </div>
                    <p className="text-[11px] text-nodri-t3 mb-4">
                      Envie este link para seus clientes via WhatsApp, Instagram ou qualquer outro canal. Ao abrir, eles verão um formulário elegante para responder.
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ background: '#060a0f', borderColor: 'rgba(255,255,255,0.08)' }}>
                      <span className="flex-1 text-[11px] text-nodri-cyan break-all">{linkFeedback}</span>
                      <button onClick={copiarLink}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0 transition-all"
                        style={{ background: 'rgba(139,92,246,0.2)', color: '#7c6fe0', border: '1px solid rgba(139,92,246,0.35)' }}>
                        <Copy size={11} /> Copiar
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a href={linkFeedback} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                        style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                        <Eye size={11} /> Visualizar formulário
                      </a>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border" style={{ borderColor: 'rgba(255,200,0,0.2)', background: 'rgba(255,200,0,0.04)' }}>
                    <div className="text-[10px] font-bold text-yellow-400 mb-2">Dica de uso</div>
                    <ul className="text-[11px] text-nodri-t2 space-y-1.5">
                      <li>• Envie o link logo após o atendimento via WhatsApp</li>
                      <li>• Adicione o link na bio do seu Instagram</li>
                      <li>• Cole o link em mensagens automáticas pós-serviço</li>
                      <li>• Use o QR Code gerado para imprimir e colocar no salão</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB: CONFIGURAÇÕES */}
              {tab === 'config' && (
                <div className="max-w-lg space-y-4">
                  <div className="p-4 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="text-[11px] font-bold text-nodri-t1 mb-3">Informações do Formulário</div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-nodri-t3 mb-1 block">Título do formulário</label>
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-nodri-t3 mb-1 block">Mensagem de abertura</label>
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                          rows={3} className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan/40 resize-none" />
                      </div>
                      <button onClick={salvarConfig} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all"
                        style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' }}>
                        <Check size={12} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
                      </button>
                    </div>
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

