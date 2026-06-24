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
  // Filtros: meses (YYYY-MM) e ocorrência; e resumo por categoria
  const [mesesSel, setMesesSel] = useState<string[]>([])
  const [ocorridoSel, setOcorridoSel] = useState('')
  const [showResumo, setShowResumo] = useState(false)
  const [resumo, setResumo] = useState<any | null>(null)
  const [loadResumo, setLoadResumo] = useState(false)

  const LIMIT = 50
  const totalPages = Math.ceil(total / LIMIT)

  const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const ultimosMeses = (() => {
    const arr: string[] = []
    const hoje = new Date()
    for (let i = 0; i < 24; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return arr
  })()
  const labelMes = (ym: string) => { const [y, m] = ym.split('-'); return `${MES_ABREV[Number(m) - 1]}/${y.slice(2)}` }
  function toggleMes(ym: string) {
    setMesesSel(prev => prev.includes(ym) ? prev.filter(x => x !== ym) : [...prev, ym])
    setPage(1)
  }

  const fetchRespostas = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ formulario_id, page: String(page), busca })
    if (ocorridoSel) qs.set('ocorrido', ocorridoSel)
    if (mesesSel.length) qs.set('meses', mesesSel.join(','))
    const res = await fetch(`/api/feedback-prof/respostas?${qs}`)
    if (res.ok) {
      const d = await res.json()
      setRespostas(d.respostas)
      setTotal(d.total)
    }
    setLoading(false)
  }, [formulario_id, page, busca, ocorridoSel, mesesSel])

  const fetchResumo = useCallback(async () => {
    setLoadResumo(true)
    const qs = new URLSearchParams({ formulario_id })
    if (ocorridoSel) qs.set('ocorrido', ocorridoSel)
    if (mesesSel.length) qs.set('meses', mesesSel.join(','))
    const res = await fetch(`/api/feedback-prof/resumo?${qs}`)
    if (res.ok) setResumo(await res.json()); else setResumo(null)
    setLoadResumo(false)
  }, [formulario_id, ocorridoSel, mesesSel])

  useEffect(() => { fetchRespostas() }, [fetchRespostas])
  useEffect(() => { if (showResumo) fetchResumo() }, [showResumo, fetchResumo])

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
            style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,.1)' }}>
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
            style={{ background: 'rgba(34,211,238,.1)', color: '#0891b2', border: '1px solid rgba(34,211,238,.25)' }}>
            Buscar
          </button>
          {busca && (
            <button onClick={() => { setBusca(''); setBuscaInput(''); setPage(1) }}
              className="px-3 py-2 rounded-xl text-[12px]"
              style={{ background: 'rgba(255,255,255,.05)', color: '#767069', border: '1px solid rgba(255,255,255,.1)' }}>
              Limpar
            </button>
          )}
        </div>

        {/* Filtros: ocorrência + meses + resumo */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={ocorridoSel} onChange={e => { setOcorridoSel(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-xl border text-[12px] text-nodri-t1 outline-none"
              style={{ background: '#fff', borderColor: 'rgba(0,0,0,.12)' }}>
              <option value="">Todas as ocorrências</option>
              {ocorridos.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <button onClick={() => setShowResumo(v => !v)} className="px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: 'rgba(91,79,207,.1)', color: '#5b4fcf', border: '1px solid rgba(91,79,207,.25)' }}>
              {showResumo ? 'Ocultar resumo' : 'Resumo por categoria'}
            </button>
            {(mesesSel.length > 0 || ocorridoSel) && (
              <button onClick={() => { setMesesSel([]); setOcorridoSel(''); setPage(1) }}
                className="px-3 py-2 rounded-xl text-[12px]" style={{ background: 'rgba(0,0,0,.04)', color: '#767069' }}>
                Limpar filtros
              </button>
            )}
          </div>
          <div>
            <div className="text-[10px] text-nodri-t3 mb-1">Filtrar por mês/ano (pode escolher vários):</div>
            <div className="flex flex-wrap gap-1.5">
              {ultimosMeses.map(ym => {
                const on = mesesSel.includes(ym)
                return (
                  <button key={ym} onClick={() => toggleMes(ym)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ background: on ? '#5b4fcf' : '#fff', color: on ? '#fff' : '#767069', border: on ? '1px solid #5b4fcf' : '1px solid rgba(0,0,0,.12)' }}>
                    {labelMes(ym)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Resumo por categoria (individual + categoria) */}
        {showResumo && (
          <div className="pcard rounded-2xl border p-4" style={{ background: '#fff', borderColor: 'rgba(0,0,0,.07)' }}>
            <h3 className="font-syne font-bold text-[13px] text-nodri-t1 mb-3">Resumo por categoria</h3>
            {loadResumo ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-t-nodri-cyan rounded-full animate-spin" /></div>
            ) : !resumo || resumo.categorias.length === 0 ? (
              <div className="text-center py-6 text-nodri-t3 text-[12px]">Nenhuma ocorrência para o filtro selecionado.</div>
            ) : (
              <div className="space-y-4">
                {resumo.categorias.map((cat: any) => (
                  <div key={cat.categoria} className="border rounded-xl overflow-hidden" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
                    <div className="px-3 py-2 flex items-center justify-between flex-wrap gap-1" style={{ background: '#f0eefb' }}>
                      <span className="font-bold text-[12px]" style={{ color: '#5b4fcf' }}>{cat.categoria}</span>
                      <span className="text-[11px] text-nodri-t2">{cat.total} ocorrências · {cat.positivos} pos · {cat.negativos} neg</span>
                    </div>
                    <div className="p-3 space-y-3">
                      {cat.profissionais.map((pf: any) => (
                        <div key={pf.nome}>
                          <div className="flex items-center justify-between text-[12px] font-semibold text-nodri-t1">
                            <span>{pf.nome}</span>
                            <span className="text-[11px] text-nodri-t3">{pf.total} · {pf.positivos}+ / {pf.negativos}-</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {pf.ocorrencias.map((o: any) => (
                              <span key={o.ocorrencia} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#f5f4f0', color: '#6b6860' }}>
                                {o.ocorrencia}: <strong>{o.qtd}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
                        <div className="text-[11px] font-bold text-nodri-t2 mb-1">Resumo da categoria — {cat.categoria}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.resumo_ocorrencias.map((o: any) => (
                            <span key={o.ocorrencia} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#5b21b6' }}>
                              {o.ocorrencia}: <strong>{o.qtd}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contagem */}
        <div className="flex items-center justify-between text-[11px] text-nodri-t3">
          <span>{total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
          {totalPages > 1 && (
            <span>Página {page} de {totalPages}</span>
          )}
        </div>

        {/* Tabela */}
        <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,.07)' }}>
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
                            {new Date(r.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
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
                                style={{ background: 'rgba(34,197,94,.15)', color: '#15803d' }}>
                                <Check size={13} />
                              </button>
                              <button onClick={() => setEditando(null)}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(239,68,68,.1)', color: '#dc2626' }}>
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-nodri-t3 text-[10px] whitespace-nowrap">
                            {new Date(r.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            <div className="text-[9px]">{new Date(r.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</div>
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
                                style={{ background: 'rgba(250,204,21,.1)', color: '#b45309' }}>
                                <Edit2 size={12} />
                              </button>
                              <button onClick={() => excluir(r.id, r.profissional_nome)}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(239,68,68,.1)', color: '#dc2626' }}>
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
              style={{ background: 'rgba(255,255,255,.05)', color: '#767069' }}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] text-nodri-t2 px-3">Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,.05)', color: '#767069' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
