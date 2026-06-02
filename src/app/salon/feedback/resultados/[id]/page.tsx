'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BarChart2, Brain, Calendar, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

type TipoPergunta = 'escala' | 'multipla_escolha' | 'texto' | 'sim_nao' | 'grid'

interface Pergunta {
  id: string
  titulo: string
  tipo: TipoPergunta
  opcoes: string[]
}

interface EscalaStat {
  media: number
  dist: Record<number, number>
  total: number
  nps: number
  detratores: number
  neutros: number
  promotores: number
}

interface MultiplaEscolhaStat {
  contagem: Record<string, number>
  total: number
}

interface TextoStat {
  respostas: string[]
  total: number
}

interface SimNaoStat {
  contagem: Record<string, { sim: number; nao: number }>
  total: number
}

interface GridStat {
  contagem: Record<string, { soma: number; count: number; media: number }>
  total: number
}

interface IAAnalise {
  resumo_executivo: string
  nota_geral: number
  pontos_fortes: { titulo: string; descricao: string }[]
  areas_melhoria: { titulo: string; descricao: string; prioridade: 'alta' | 'media' | 'baixa' }[]
  acoes_prioritarias: { acao: string; impacto: string; prazo: string; dificuldade: string }[]
  insight_nps: string
  oportunidades_receita: string[]
}

function BarraPercentual({ valor, max, cor }: { valor: number; max: number; cor?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: cor || '#22d3ee' }} />
      </div>
      <span className="text-[10px] text-nodri-t3 w-8 text-right">{pct}%</span>
    </div>
  )
}

function NpsGauge({ nps }: { nps: number }) {
  const cor = nps >= 50 ? '#4ade80' : nps >= 0 ? '#facc15' : '#f87171'
  const label = nps >= 50 ? 'Excelente' : nps >= 25 ? 'Bom' : nps >= 0 ? 'Neutro' : 'Crítico'
  const Icon = nps >= 25 ? TrendingUp : nps >= 0 ? Minus : TrendingDown
  return (
    <div className="flex flex-col items-center p-4 rounded-xl border" style={{ borderColor: `${cor}40`, background: `${cor}08` }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: cor }}>NPS Score</div>
      <div className="text-5xl font-black mb-1" style={{ color: cor }}>{nps}</div>
      <div className="flex items-center gap-1 text-[11px]" style={{ color: cor }}>
        <Icon size={12} /> {label}
      </div>
    </div>
  )
}

export default function ResultadosPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [data, setData] = useState<{
    formulario: { titulo: string }
    total_respostas: number
    perguntas: Pergunta[]
    stats: Record<string, unknown>
    comentarios: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [iaAnalise, setIaAnalise] = useState<IAAnalise | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [iaErro, setIaErro] = useState('')
  const [showIa, setShowIa] = useState(false)

  const fetchResultados = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (inicio) qs.set('inicio', inicio)
    if (fim) qs.set('fim', fim)
    const res = await fetch(`/api/feedback/resultados/${id}?${qs}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
    } else {
      toast.error('Erro ao carregar resultados')
    }
    setLoading(false)
  }, [id, inicio, fim])

  useEffect(() => { fetchResultados() }, [fetchResultados])

  async function acionarIA() {
    setIaLoading(true)
    setIaErro('')
    setShowIa(true)
    const res = await fetch(`/api/feedback/ia/${id}`, { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      if (d.error) { setIaErro(d.error); setIaLoading(false); return }
      setIaAnalise(d)
    } else {
      const d = await res.json()
      setIaErro(d.error || 'Erro ao acionar IA')
    }
    setIaLoading(false)
  }

  const PRIORIDADE_COR: Record<string, string> = { alta: '#f87171', media: '#facc15', baixa: '#4ade80' }
  const DIFICULDADE_COR: Record<string, string> = { fácil: '#4ade80', media: '#facc15', difícil: '#f87171' }
  const PRAZO_ICON: Record<string, string> = { imediato: '🔥', 'curto prazo': '📅', 'médio prazo': '🗓️' }

  return (
    <div className="nodri-salon-bg min-h-screen">
      {/* NAVBAR */}
      <nav className="bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3 sticky top-0 z-50">
        <button onClick={() => router.push('/salon/feedback')} className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 transition-colors text-sm">
          <ArrowLeft size={15} /> Feedback
        </button>
        <div className="w-px h-4 bg-nodri-border" />
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-nodri-purple" />
          <span className="font-syne font-bold text-sm text-nodri-t1">Resultados da Avaliação</span>
          {data && <span className="text-[10px] text-nodri-t3">— {data.formulario.titulo}</span>}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* FILTROS DE DATA */}
          <div className="flex items-center gap-2 p-1.5 bg-nodri-card border border-nodri-border rounded-lg">
            <Calendar size={11} className="text-nodri-t3 ml-1" />
            <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
              className="bg-transparent text-[11px] text-nodri-t1 outline-none w-28" />
            <span className="text-nodri-t3 text-[11px]">até</span>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)}
              className="bg-transparent text-[11px] text-nodri-t1 outline-none w-28" />
            <button onClick={fetchResultados} className="p-1 hover:text-nodri-cyan text-nodri-t3 transition-colors">
              <RefreshCw size={11} />
            </button>
          </div>
          <button onClick={acionarIA} disabled={iaLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.25), rgba(244,63,142,0.25))', color: '#c084fc', border: '1px solid rgba(139,92,246,0.4)' }}>
            <Brain size={13} />
            {iaLoading ? 'Analisando...' : 'Acionar IA Claude'}
          </button>
        </div>
      </nav>

      <div className="p-5 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-nodri-cyan rounded-full animate-spin" />
          </div>
        ) : !data ? null : (
          <>
            {/* CARDS RESUMO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(34,197,94,0.2)' }}>
                <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Total de Respostas</div>
                <div className="text-3xl font-black text-green-400">{data.total_respostas}</div>
              </div>
              {/* NPS se existir */}
              {data.perguntas.filter(p => p.tipo === 'escala').map(p => {
                const s = data.stats[p.id] as EscalaStat
                if (!s) return null
                return (
                  <div key={p.id} className="p-4 rounded-xl border col-span-1" style={{ background: '#0d1117', borderColor: 'rgba(139,92,246,0.2)' }}>
                    <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Nota Média</div>
                    <div className="text-3xl font-black text-purple-400">{s.media}<span className="text-sm text-nodri-t3">/10</span></div>
                  </div>
                )
              })}
              {data.perguntas.filter(p => p.tipo === 'escala').map(p => {
                const s = data.stats[p.id] as EscalaStat
                if (!s || s.total === 0) return null
                const pct = Math.round((s.promotores / s.total) * 100)
                return (
                  <div key={`promo-${p.id}`} className="p-4 rounded-xl border col-span-1" style={{ background: '#0d1117', borderColor: 'rgba(6,182,212,0.2)' }}>
                    <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Promotores (9-10)</div>
                    <div className="text-3xl font-black text-cyan-400">{pct}%</div>
                  </div>
                )
              })}
            </div>

            {/* IA ANALISE PANEL */}
            {showIa && (
              <div className="mb-6 rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(139,92,246,0.3)', background: '#0a0714' }}>
                <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.1)' }}>
                  <Brain size={16} className="text-purple-400" />
                  <span className="font-syne font-bold text-sm text-purple-300">Análise Estratégica com IA Claude</span>
                  <button onClick={() => setShowIa(false)} className="ml-auto text-nodri-t3 hover:text-nodri-t1 text-sm">✕</button>
                </div>
                {iaLoading && (
                  <div className="p-8 text-center">
                    <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-nodri-t2 text-sm">Analisando {data.total_respostas} respostas...</p>
                    <p className="text-nodri-t3 text-[11px] mt-1">A IA está identificando padrões e oportunidades</p>
                  </div>
                )}
                {iaErro && (
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertTriangle size={16} /> {iaErro}
                    </div>
                  </div>
                )}
                {iaAnalise && !iaLoading && (
                  <div className="p-5 space-y-5">
                    {/* RESUMO + NOTA */}
                    <div className="flex gap-4">
                      <div className="flex-1 p-4 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Resumo Executivo</div>
                        <p className="text-nodri-t1 text-sm leading-relaxed">{iaAnalise.resumo_executivo}</p>
                        {iaAnalise.insight_nps && (
                          <p className="text-nodri-t2 text-[11px] mt-2 pt-2 border-t border-nodri-border">{iaAnalise.insight_nps}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-center p-4 rounded-xl shrink-0" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', minWidth: '110px' }}>
                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Saúde Geral</div>
                        <div className="text-5xl font-black text-purple-300">{iaAnalise.nota_geral}</div>
                        <div className="text-[10px] text-nodri-t3 mt-1">/10</div>
                      </div>
                    </div>

                    {/* PONTOS FORTES */}
                    {iaAnalise.pontos_fortes?.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-green-400 mb-2 flex items-center gap-1.5">
                          <CheckCircle size={13} /> Pontos Fortes
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {iaAnalise.pontos_fortes.map((p, i) => (
                            <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                              <div className="text-[11px] font-semibold text-green-400 mb-1">{p.titulo}</div>
                              <p className="text-[11px] text-nodri-t2">{p.descricao}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ÁREAS DE MELHORIA */}
                    {iaAnalise.areas_melhoria?.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-yellow-400 mb-2 flex items-center gap-1.5">
                          <AlertTriangle size={13} /> Áreas de Melhoria
                        </div>
                        <div className="space-y-2">
                          {iaAnalise.areas_melhoria.map((a, i) => (
                            <div key={i} className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(250,204,21,0.05)', border: '1px solid rgba(250,204,21,0.15)' }}>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5 shrink-0 uppercase"
                                style={{ background: `${PRIORIDADE_COR[a.prioridade]}20`, color: PRIORIDADE_COR[a.prioridade], border: `1px solid ${PRIORIDADE_COR[a.prioridade]}40` }}>
                                {a.prioridade}
                              </span>
                              <div>
                                <div className="text-[11px] font-semibold text-nodri-t1 mb-0.5">{a.titulo}</div>
                                <p className="text-[11px] text-nodri-t2">{a.descricao}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AÇÕES PRIORITÁRIAS */}
                    {iaAnalise.acoes_prioritarias?.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
                          <Zap size={13} /> Ações Prioritárias
                        </div>
                        <div className="space-y-2">
                          {iaAnalise.acoes_prioritarias.map((a, i) => (
                            <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
                              <div className="flex items-start gap-2 mb-1.5">
                                <span className="text-sm">{PRAZO_ICON[a.prazo] || '📌'}</span>
                                <div className="font-semibold text-nodri-t1 text-[12px]">{a.acao}</div>
                              </div>
                              <div className="flex items-center gap-3 ml-6">
                                <span className="text-[10px] text-nodri-t2">{a.impacto}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                  style={{ background: `${DIFICULDADE_COR[a.dificuldade]}15`, color: DIFICULDADE_COR[a.dificuldade] }}>
                                  {a.dificuldade}
                                </span>
                                <span className="text-[9px] text-nodri-t3">{a.prazo}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* OPORTUNIDADES */}
                    {iaAnalise.oportunidades_receita?.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-orange-400 mb-2 flex items-center gap-1.5">
                          <TrendingUp size={13} /> Oportunidades de Receita
                        </div>
                        <ul className="space-y-1.5">
                          {iaAnalise.oportunidades_receita.map((o, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-nodri-t2">
                              <span className="text-orange-400 mt-0.5 shrink-0">→</span> {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* RESULTADOS POR PERGUNTA */}
            <div className="space-y-4">
              {data.perguntas.map((pergunta, idx) => {
                const stat = data.stats[pergunta.id]
                if (!stat) return null

                return (
                  <div key={pergunta.id} className="rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <span className="text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold text-nodri-t3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        {idx + 1}
                      </span>
                      <span className="text-[13px] font-medium text-nodri-t1">{pergunta.titulo}</span>
                      <span className="ml-auto text-[10px] text-nodri-t3">
                        {(stat as { total: number }).total} resposta{(stat as { total: number }).total !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="p-5">

                      {/* ESCALA */}
                      {pergunta.tipo === 'escala' && (() => {
                        const s = stat as EscalaStat
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                              <NpsGauge nps={s.nps} />
                              <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                                <div className="text-[10px] text-nodri-t3 mb-1">Nota Média</div>
                                <div className="text-3xl font-black text-nodri-cyan">{s.media}</div>
                                <div className="text-[10px] text-nodri-t3">/10</div>
                              </div>
                              <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-green-400">Promotores</span>
                                  <span className="font-bold text-green-400">{s.promotores}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-yellow-400">Neutros</span>
                                  <span className="font-bold text-yellow-400">{s.neutros}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-red-400">Detratores</span>
                                  <span className="font-bold text-red-400">{s.detratores}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-nodri-t3 mb-2">Distribuição das notas</div>
                              <div className="flex items-end gap-1 h-16">
                                {Array.from({ length: 11 }, (_, i) => i).map(n => {
                                  const count = s.dist[n] || 0
                                  const maxCount = Math.max(...Object.values(s.dist))
                                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                                  const cor = n <= 6 ? '#f87171' : n <= 8 ? '#facc15' : '#4ade80'
                                  return (
                                    <div key={n} className="flex-1 flex flex-col items-center gap-0.5">
                                      <span className="text-[8px] text-nodri-t3">{count > 0 ? count : ''}</span>
                                      <div className="w-full rounded-t transition-all" style={{ height: `${Math.max(pct, 2)}%`, background: cor, opacity: pct > 0 ? 1 : 0.2 }} />
                                      <span className="text-[9px] text-nodri-t3">{n}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* MÚLTIPLA ESCOLHA */}
                      {pergunta.tipo === 'multipla_escolha' && (() => {
                        const s = stat as MultiplaEscolhaStat
                        const max = Math.max(...Object.values(s.contagem))
                        return (
                          <div className="space-y-2">
                            {Object.entries(s.contagem).sort((a, b) => b[1] - a[1]).map(([opcao, count]) => (
                              <div key={opcao}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[12px] text-nodri-t1">{opcao}</span>
                                  <span className="text-[11px] font-bold text-nodri-cyan">{count}</span>
                                </div>
                                <BarraPercentual valor={count} max={max} cor="#7c5cfc" />
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                      {/* TEXTO */}
                      {pergunta.tipo === 'texto' && (() => {
                        const s = stat as TextoStat
                        return (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {s.respostas.length === 0 ? (
                              <p className="text-nodri-t3 text-sm">Nenhuma resposta ainda</p>
                            ) : s.respostas.map((r, i) => (
                              <div key={i} className="p-3 rounded-xl text-[12px] text-nodri-t1 italic" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                "{r}"
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                      {/* SIM/NÃO */}
                      {pergunta.tipo === 'sim_nao' && (() => {
                        const s = stat as SimNaoStat
                        return (
                          <div className="space-y-2">
                            {Object.entries(s.contagem).map(([item, c]) => {
                              const total = c.sim + c.nao
                              const pctSim = total > 0 ? Math.round((c.sim / total) * 100) : 0
                              return (
                                <div key={item} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[12px] text-nodri-t1">{item}</span>
                                    <span className="text-[11px] font-bold" style={{ color: pctSim >= 70 ? '#4ade80' : pctSim >= 50 ? '#facc15' : '#f87171' }}>
                                      {pctSim}% Sim
                                    </span>
                                  </div>
                                  <div className="flex gap-1 h-2">
                                    <div className="rounded-l h-full transition-all" style={{ width: `${pctSim}%`, background: '#4ade80' }} />
                                    <div className="rounded-r h-full transition-all flex-1" style={{ background: '#f87171' }} />
                                  </div>
                                  <div className="flex justify-between text-[9px] text-nodri-t3 mt-1">
                                    <span>{c.sim} sim</span>
                                    <span>{c.nao} não</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}

                      {/* GRID */}
                      {pergunta.tipo === 'grid' && (() => {
                        const s = stat as GridStat
                        const itens = Object.entries(s.contagem)
                          .filter(([, c]) => c.count > 0)
                          .sort((a, b) => b[1].media - a[1].media)
                        return (
                          <div className="space-y-2">
                            {itens.map(([item, c]) => {
                              const cor = c.media >= 4 ? '#4ade80' : c.media >= 3 ? '#facc15' : '#f87171'
                              return (
                                <div key={item}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[12px] text-nodri-t1">{item}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] text-nodri-t3">{c.count} avaliações</span>
                                      <span className="text-[12px] font-bold" style={{ color: cor }}>{c.media}/5</span>
                                    </div>
                                  </div>
                                  <BarraPercentual valor={c.media * 20} max={100} cor={cor} />
                                </div>
                              )
                            })}
                            {itens.length === 0 && <p className="text-nodri-t3 text-sm">Nenhuma resposta ainda</p>}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* COMENTÁRIOS */}
            {data.comentarios && data.comentarios.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-lg">💬</span>
                  <span className="text-[13px] font-medium text-nodri-t1">Comentários dos Clientes</span>
                  <span className="ml-auto text-[10px] text-nodri-t3">{data.comentarios.length} comentário{data.comentarios.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
                  {data.comentarios.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl text-[12px] text-nodri-t1 italic leading-relaxed"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(139,92,246,0.5)' }}>
                      "{c}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.total_respostas === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-nodri-t1 font-semibold text-lg mb-2">Nenhuma resposta ainda</h3>
                <p className="text-nodri-t2 text-sm">Compartilhe o link do formulário com seus clientes para começar a coletar avaliações.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
