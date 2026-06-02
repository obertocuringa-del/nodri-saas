'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Resposta {
  id: string
  profissional_nome: string
  tipo: 'positivo' | 'negativo'
  ocorrido_descricao: string
  descricao: string | null
  criado_em: string
}

interface Editando {
  id: string
  profissional_nome: string
  tipo: 'positivo' | 'negativo'
  ocorrido_descricao: string
  descricao: string
}

export default function GerenciarFeedbacksPage() {
  const params = useParams()
  const router = useRouter()
  const formulario_id = params?.id as string

  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [busca, setBusca] = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Editando | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [profissionais, setProfissionais] = useState<string[]>([])
  const [ocorridos, setOcorridos] = useState<string[]>([])

  const LIMIT = 50
  const totalPages = Math.ceil(total / LIMIT)

  const fetchRespostas = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ formulario_id, page: String(page), busca })
    const res = await fetch(`/api/feedback-prof/respostas?${qs}`)
    if (res.ok) {
      const d = await res.json()
      setRespostas(d.respostas)
      setTotal(d.total)
    }
    setLoading(false)
  }, [formulario_id, page, busca])

  useEffect(() => { fetchRespostas() }, [fetchRespostas])

  useEffect(() => {
    fetch('/api/feedback-prof/profissionais').then(r => r.json()).then(d => setProfissionais(d.map((p: { nome: string }) => p.nome)))
    fetch('/api/feedback-prof/ocorridos').then(r => r.json()).then(d => setOcorridos(d.map((o: { descricao: string }) => o.descricao)))
  }, [])

  function iniciarEdicao(r: Resposta) {
    setEditando({
      id: r.id,
      profissional_nome: r.profissional_nome,
      tipo: r.tipo,
      ocorrido_descricao: r.ocorrido_descricao,
      descricao: r.descricao || '',
    })
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    const res = await fetch('/api/feedback-prof/respostas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editando),
    })
    if (res.ok) {
      toast.success('Feedback atualizado!')
      setEditando(null)
      fetchRespostas()
    } else {
      toast.error('Erro ao salvar')
    }
    setSalvando(false)
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir feedback de ${nome}?`)) return
    const res = await fetch('/api/feedback-prof/respostas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success('Excluído!')
      fetchRespostas()
    } else {
      toast.error('Erro ao excluir')
    }
  }

  function aplicarBusca() {
    setBusca(buscaInput)
    setPage(1)
  }

  return (
    <div className="nodri-salon-bg min-h-screen">
      <nav className="bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3 sticky top-0 z-50">
        <button onClick={() => router.push('/salon/feedback-profissional')}
          className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 text-sm">
          <ArrowLeft size={15} /> Feedback Profissional
        </button>
        <div className="w-px h-4 bg-nodri-border" />
        <span className="font-syne font-bold text-sm text-nodri-t1">Gerenciar Feedbacks</span>
        <span className="text-[11px] text-nodri-t3 ml-1">— editar e excluir registros</span>
      </nav>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
        {/* Busca */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border"
            style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.1)' }}>
            <Search size={13} className="text-nodri-t3 shrink-0" />
            <input
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aplicarBusca()}
              placeholder="Buscar por nome do profissional..."
              className="flex-1 bg-transparent text-[12px] text-nodri-t1 outline-none placeholder:text-nodri-t3"
            />
          </div>
          <button onClick={aplicarBusca} className="px-4 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: 'rgba(34,211,238,.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,.25)' }}>
            Buscar
          </button>
          {busca && (
            <button onClick={() => { setBusca(''); setBuscaInput(''); setPage(1) }}
              className="px-3 py-2 rounded-xl text-[12px]"
              style={{ background: 'rgba(255,255,255,.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,.1)' }}>
              Limpar
            </button>
          )}
        </div>

        {/* Contagem */}
        <div className="flex items-center justify-between text-[11px] text-nodri-t3">
          <span>{total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
          {totalPages > 1 && (
            <span>Página {page} de {totalPages}</span>
          )}
        </div>

        {/* Tabela */}
        <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-t-nodri-cyan rounded-full animate-spin" /></div>
          ) : respostas.length === 0 ? (
            <div className="text-center py-16 text-nodri-t3 text-sm">Nenhum registro encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,.03)' }}>
                    <th className="text-left px-4 py-3 text-nodri-t3 font-semibold">Data</th>
                    <th className="text-left px-4 py-3 text-nodri-t3 font-semibold">Profissional</th>
                    <th className="text-center px-4 py-3 text-nodri-t3 font-semibold">Tipo</th>
                    <th className="text-left px-4 py-3 text-nodri-t3 font-semibold">Ocorrência</th>
                    <th className="text-left px-4 py-3 text-nodri-t3 font-semibold">Descrição</th>
                    <th className="text-center px-4 py-3 text-nodri-t3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nodri-border/20">
                  {respostas.map(r => (
                    <tr key={r.id} className="hover:bg-nodri-surface/20 transition-colors">
                      {editando?.id === r.id ? (
                        <>
                          <td className="px-4 py-3 text-nodri-t3 text-[10px] whitespace-nowrap">
                            {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <select value={editando.profissional_nome}
                              onChange={e => setEditando({ ...editando, profissional_nome: e.target.value })}
                              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none w-full">
                              {profissionais.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select value={editando.tipo}
                              onChange={e => setEditando({ ...editando, tipo: e.target.value as 'positivo' | 'negativo' })}
                              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none">
                              <option value="positivo">Positivo</option>
                              <option value="negativo">Negativo</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select value={editando.ocorrido_descricao}
                              onChange={e => setEditando({ ...editando, ocorrido_descricao: e.target.value })}
                              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none w-full">
                              {ocorridos.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input value={editando.descricao}
                              onChange={e => setEditando({ ...editando, descricao: e.target.value })}
                              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none w-full"
                              placeholder="Descrição (opcional)" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-center">
                              <button onClick={salvarEdicao} disabled={salvando}
                                className="p-1.5 rounded-lg disabled:opacity-50"
                                style={{ background: 'rgba(34,197,94,.15)', color: '#4ade80' }}>
                                <Check size={13} />
                              </button>
                              <button onClick={() => setEditando(null)}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(239,68,68,.1)', color: '#f87171' }}>
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-nodri-t3 text-[10px] whitespace-nowrap">
                            {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                            <div className="text-[9px]">{new Date(r.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-nodri-t1">{r.profissional_nome}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r.tipo === 'positivo' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                              {r.tipo === 'positivo' ? '+ POS' : '- NEG'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-nodri-t2">{r.ocorrido_descricao}</td>
                          <td className="px-4 py-3 text-nodri-t3 italic max-w-[200px] truncate">
                            {r.descricao || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-center">
                              <button onClick={() => iniciarEdicao(r)}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(250,204,21,.1)', color: '#facc15' }}>
                                <Edit2 size={12} />
                              </button>
                              <button onClick={() => excluir(r.id, r.profissional_nome)}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(239,68,68,.1)', color: '#f87171' }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,.05)', color: '#94a3b8' }}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] text-nodri-t2 px-3">Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,.05)', color: '#94a3b8' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
