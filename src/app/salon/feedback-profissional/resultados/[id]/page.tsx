'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BarChart2, Brain, Calendar, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Zap, CheckCircle, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface Ranking { nome: string; positivo: number; negativo: number; total: number; score: number }
interface Ocorrencia { descricao: string; positivo: number; negativo: number; total: number }
interface Tendencia { semana: string; positivo: number; negativo: number; total: number }
interface IAAnalise {
  resumo_executivo: string; clima_equipe: number
  destaques_positivos: { nome: string; motivo: string }[]
  alertas_urgentes: { nome: string; problema: string; recomendacao: string }[]
  padroes_ocorrencias: { ocorrencia: string; frequencia: string; impacto: string; acao: string }[]
  acoes_gestao: { acao: string; prazo: string; profissional: string }[]
  riscos_retencao: string
  recomendacoes_treinamento: string[]
}
interface Data {
  formulario: { titulo: string }
  total: number; totalPositivo: number; totalNegativo: number
  ranking: Ranking[]; ocorrencias: Ocorrencia[]; tendencia: Tendencia[]
  alertaDesempenho: boolean; profCritico: Ranking | null
  nomeProfissionais: string[]
  respostas_recentes: { id: string; profissional_nome: string; tipo: string; ocorrido_descricao: string; descricao: string; criado_em: string }[]
}

function BarraH({ valor, max, cor }: { valor: number; max: number; cor?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,.06)' }}>
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: cor || '#22d3ee' }} />
      </div>
      <span className="text-[10px] text-nodri-t3 w-7 text-right">{pct}%</span>
    </div>
  )
}

export default function ResultadosProfPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [filtroProfissional, setFiltroProfissional] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [ia, setIa] = useState<IAAnalise | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [iaErro, setIaErro] = useState('')
  const [showIa, setShowIa] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (inicio) qs.set('inicio', inicio)
    if (fim) qs.set('fim', fim)
    if (filtroProfissional) qs.set('profissional', filtroProfissional)
    if (filtroTipo) qs.set('tipo', filtroTipo)
    const res = await fetch(`/api/feedback-prof/resultados/${id}?${qs}`)
    if (res.ok) setData(await res.json())
    else toast.error('Erro ao carregar')
    setLoading(false)
  }, [id, inicio, fim, filtroProfissional, filtroTipo])

  useEffect(() => { fetchData() }, [fetchData])

  async function acionarIA() {
    setIaLoading(true); setIaErro(''); setShowIa(true)
    const res = await fetch(`/api/feedback-prof/ia/${id}`, { method: 'POST' })
    if (res.ok) { const d = await res.json(); if (d.error) { setIaErro(d.error) } else setIa(d) }
    else { const d = await res.json(); setIaErro(d.error || 'Erro') }
    setIaLoading(false)
  }

  function exportarCSV() {
    if (!data) return
    const linhas: string[][] = [
      ['Relatório Feedback Profissional', data.formulario.titulo],
      ['Total registros', String(data.total), 'Positivos', String(data.totalPositivo), 'Negativos', String(data.totalNegativo)],
      [],
      ['RANKING DE PROFISSIONAIS'],
      ['Nome', 'Score (%)', 'Positivos', 'Negativos', 'Total'],
      ...data.ranking.map(r => [r.nome, String(r.score) + '%', String(r.positivo), String(r.negativo), String(r.total)]),
      [],
      ['OCORRÊNCIAS MAIS FREQUENTES'],
      ['Ocorrido', 'Total', 'Positivos', 'Negativos'],
      ...data.ocorrencias.map(o => [o.descricao, String(o.total), String(o.positivo), String(o.negativo)]),
      [],
      ['REGISTROS RECENTES'],
      ['Profissional', 'Tipo', 'Ocorrido', 'Descrição', 'Data'],
      ...data.respostas_recentes.map(r => [r.profissional_nome, r.tipo.toUpperCase(), r.ocorrido_descricao, r.descricao || '', new Date(r.criado_em).toLocaleDateString('pt-BR')]),
    ]
    const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `feedback-profissional-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('CSV exportado!')
  }

  const PRAZO_ICON: Record<string, string> = { imediato: '🔥', 'esta semana': '📅', 'este mês': '🗓️' }

  return (
    <>
      <style>{`@media print{nav,button,.no-print{display:none!important;}body{background:white!important;}.pcard{border:1px solid #e5e7eb!important;background:white!important;}}`}</style>
      <div className="nodri-salon-bg min-h-screen">
        {/* NAV */}
        <nav className="no-print bg-nodri-surface border-b border-nodri-border px-5 py-3 flex flex-wrap items-center gap-2 sticky top-0 z-50">
          <button onClick={() => router.push('/salon/feedback-profissional')} className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 text-sm">
            <ArrowLeft size={15}/> Feedback Profissional
          </button>
          <div className="w-px h-4 bg-nodri-border"/>
          <BarChart2 size={14} className="text-nodri-purple"/>
          <span className="font-syne font-bold text-sm text-nodri-t1">Resultados — Desempenho da Equipe</span>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Filtros */}
            <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)}
              className="bg-nodri-card border border-nodri-border rounded-lg px-2 py-1.5 text-[11px] text-nodri-t1 outline-none">
              <option value="">Todos profissionais</option>
              {data?.nomeProfissionais.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="bg-nodri-card border border-nodri-border rounded-lg px-2 py-1.5 text-[11px] text-nodri-t1 outline-none">
              <option value="">Todos os tipos</option>
              <option value="positivo">Positivos</option>
              <option value="negativo">Negativos</option>
            </select>
            <div className="flex items-center gap-1 px-2 py-1.5 bg-nodri-card border border-nodri-border rounded-lg">
              <Calendar size={11} className="text-nodri-t3"/>
              <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="bg-transparent text-[11px] text-nodri-t1 outline-none w-24"/>
              <span className="text-[10px] text-nodri-t3">→</span>
              <input type="date" value={fim} onChange={e => setFim(e.target.value)} className="bg-transparent text-[11px] text-nodri-t1 outline-none w-24"/>
              <button onClick={fetchData}><RefreshCw size={11} className="text-nodri-t3 hover:text-nodri-cyan"/></button>
            </div>
            <button onClick={exportarCSV} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(34,197,94,.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,.25)' }}>
              <Download size={12}/> Excel
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)' }}>
              <FileText size={12}/> PDF
            </button>
            <button onClick={acionarIA} disabled={iaLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,rgba(124,92,252,.25),rgba(244,63,142,.25))', color: '#c084fc', border: '1px solid rgba(139,92,246,.4)' }}>
              <Brain size={13}/>{iaLoading ? 'Analisando...' : 'Acionar IA Claude'}
            </button>
          </div>
        </nav>

        <div className="p-5 max-w-5xl mx-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-t-nodri-cyan rounded-full animate-spin"/></div>
          ) : !data ? null : (
            <>
              {/* ALERTA */}
              {data.alertaDesempenho && (
                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border animate-pulse" style={{ background: 'rgba(239,68,68,.08)', borderColor: 'rgba(239,68,68,.4)' }}>
                  <AlertTriangle size={20} className="text-red-400 shrink-0"/>
                  <div>
                    <div className="font-bold text-red-400 text-sm">⚠️ Atenção — Profissional com desempenho crítico</div>
                    {data.profCritico && (
                      <p className="text-[12px] text-nodri-t2 mt-0.5">
                        <strong className="text-red-400">{data.profCritico.nome}</strong> tem {data.profCritico.score}% de score positivo com {data.profCritico.total} registros. Ação imediata recomendada.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* RESUMO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Registros', val: data.total, cor: '#94a3b8' },
                  { label: 'Positivos', val: data.totalPositivo, cor: '#4ade80' },
                  { label: 'Negativos', val: data.totalNegativo, cor: '#f87171' },
                  { label: '% Positivo', val: data.total > 0 ? Math.round(data.totalPositivo / data.total * 100) + '%' : '—', cor: data.total > 0 && data.totalPositivo / data.total >= 0.6 ? '#4ade80' : '#f87171' },
                ].map(({ label, val, cor }) => (
                  <div key={label} className="pcard p-4 rounded-xl border" style={{ background: '#0d1117', borderColor: `${cor}30` }}>
                    <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-3xl font-black" style={{ color: cor }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* IA */}
              {showIa && (
                <div className="pcard rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(139,92,246,.3)', background: '#0a0714' }}>
                  <div className="px-5 py-3 border-b flex items-center gap-2 no-print" style={{ borderColor: 'rgba(139,92,246,.2)', background: 'rgba(139,92,246,.1)' }}>
                    <Brain size={16} className="text-purple-400"/>
                    <span className="font-syne font-bold text-sm text-purple-300">Análise de Equipe — IA Claude</span>
                    <button onClick={() => setShowIa(false)} className="ml-auto text-nodri-t3 no-print">✕</button>
                  </div>
                  {iaLoading && <div className="p-8 text-center"><div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/><p className="text-nodri-t2 text-sm">Analisando equipe...</p></div>}
                  {iaErro && <div className="p-5 text-red-400 text-sm flex gap-2"><AlertTriangle size={16}/>{iaErro}</div>}
                  {ia && !iaLoading && (
                    <div className="p-5 space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1 p-4 rounded-xl" style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)' }}>
                          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Resumo da Equipe</div>
                          <p className="text-nodri-t1 text-sm leading-relaxed">{ia.resumo_executivo}</p>
                          {ia.riscos_retencao && <p className="text-[11px] text-nodri-t2 mt-2 pt-2 border-t border-nodri-border">⚡ {ia.riscos_retencao}</p>}
                        </div>
                        <div className="flex flex-col items-center p-4 rounded-xl shrink-0" style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', minWidth: '100px' }}>
                          <div className="text-[10px] font-bold text-purple-400 mb-1">Clima</div>
                          <div className="text-5xl font-black text-purple-300">{ia.clima_equipe}</div>
                          <div className="text-[10px] text-nodri-t3">/10</div>
                        </div>
                      </div>
                      {ia.destaques_positivos?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-green-400 mb-2 flex items-center gap-1.5"><CheckCircle size={13}/> Destaques Positivos</div>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {ia.destaques_positivos.map((d, i) => (
                              <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)' }}>
                                <div className="text-[11px] font-semibold text-green-400 mb-0.5">⭐ {d.nome}</div>
                                <p className="text-[11px] text-nodri-t2">{d.motivo}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ia.alertas_urgentes?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-red-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={13}/> Alertas Urgentes</div>
                          <div className="space-y-2">
                            {ia.alertas_urgentes.map((a, i) => (
                              <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)' }}>
                                <div className="text-[11px] font-semibold text-red-400 mb-0.5">🚨 {a.nome}</div>
                                <p className="text-[11px] text-nodri-t2 mb-1">{a.problema}</p>
                                <p className="text-[11px] text-nodri-cyan">→ {a.recomendacao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ia.acoes_gestao?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5"><Zap size={13}/> Ações de Gestão</div>
                          <div className="space-y-1.5">
                            {ia.acoes_gestao.map((a, i) => (
                              <div key={i} className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(6,182,212,.05)', border: '1px solid rgba(6,182,212,.15)' }}>
                                <span>{PRAZO_ICON[a.prazo] || '📌'}</span>
                                <div className="flex-1">
                                  <div className="text-[12px] font-semibold text-nodri-t1">{a.acao}</div>
                                  <div className="text-[10px] text-nodri-t3">{a.profissional} · {a.prazo}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ia.recomendacoes_treinamento?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-yellow-400 mb-2">🎓 Recomendações de Treinamento</div>
                          <ul className="space-y-1">
                            {ia.recomendacoes_treinamento.map((r, i) => <li key={i} className="text-[11px] text-nodri-t2 flex gap-2"><span className="text-yellow-400">→</span>{r}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* RANKING */}
              <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                  <span className="text-sm">🏆</span>
                  <span className="text-[13px] font-semibold text-nodri-t1">Ranking de Desempenho</span>
                  <span className="ml-auto text-[10px] text-nodri-t3">{data.ranking.length} profissionais</span>
                </div>
                <div className="p-5 space-y-3">
                  {data.ranking.map((r, i) => {
                    const cor = r.score >= 70 ? '#4ade80' : r.score >= 40 ? '#facc15' : '#f87171'
                    const isPior = data.profCritico?.nome === r.nome && r.total >= 2
                    return (
                      <div key={r.nome} className={`p-3 rounded-xl ${isPior ? 'border' : ''}`}
                        style={isPior ? { border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.05)' } : {}}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-nodri-t3 w-5">#{i + 1}</span>
                            <span className="text-[13px] font-semibold text-nodri-t1">{r.nome}</span>
                            {isPior && <span className="text-[9px] font-black text-red-400 border border-red-400/40 px-1.5 py-0.5 rounded">ATENÇÃO</span>}
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-green-400">+{r.positivo}</span>
                            <span className="text-red-400">-{r.negativo}</span>
                            <span className="font-black text-[13px]" style={{ color: cor }}>{r.score}%</span>
                          </div>
                        </div>
                        <BarraH valor={r.score} max={100} cor={cor} />
                      </div>
                    )
                  })}
                  {data.ranking.length === 0 && <p className="text-nodri-t3 text-sm text-center">Nenhum dado ainda.</p>}
                </div>
              </div>

              {/* TENDÊNCIA SEMANAL */}
              {data.tendencia.length >= 2 && (
                <div className="pcard rounded-2xl border p-5" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={14} className="text-nodri-cyan"/>
                    <span className="text-[13px] font-semibold text-nodri-t1">Tendência Semanal</span>
                  </div>
                  <div className="flex items-end gap-2 h-20">
                    {data.tendencia.map(t => {
                      const maxTotal = Math.max(...data.tendencia.map(x => x.total), 1)
                      const pctPos = t.total > 0 ? (t.positivo / t.total) * 100 : 0
                      return (
                        <div key={t.semana} className="flex-1 flex flex-col items-center gap-1 group">
                          <div className="w-full rounded-t flex flex-col overflow-hidden" style={{ height: `${Math.max((t.total / maxTotal) * 100, 8)}%` }}>
                            <div style={{ flex: pctPos, background: '#4ade80', minHeight: 2 }}/>
                            <div style={{ flex: 100 - pctPos, background: '#f87171', minHeight: 2 }}/>
                          </div>
                          <span className="text-[8px] text-nodri-t3">{t.semana.includes('-W') ? `S${t.semana.split('-W')[1]}` : t.semana}</span>
                          <span className="text-[8px] text-nodri-t3">{t.total}x</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-3 text-[10px]">
                    <span className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-green-400"/> Positivo</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-red-400"/> Negativo</span>
                  </div>
                </div>
              )}

              {/* OCORRÊNCIAS */}
              <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                  <span className="text-sm">📋</span>
                  <span className="text-[13px] font-semibold text-nodri-t1">Ocorrências Mais Frequentes</span>
                </div>
                <div className="p-5 space-y-2">
                  {data.ocorrencias.slice(0, 15).map(o => {
                    const max = data.ocorrencias[0]?.total || 1
                    const pctPos = o.total > 0 ? Math.round(o.positivo / o.total * 100) : 0
                    const cor = pctPos >= 60 ? '#4ade80' : pctPos >= 40 ? '#facc15' : '#f87171'
                    return (
                      <div key={o.descricao}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-nodri-t1 flex-1 pr-2">{o.descricao}</span>
                          <div className="flex items-center gap-2 shrink-0 text-[10px]">
                            <span className="text-green-400">+{o.positivo}</span>
                            <span className="text-red-400">-{o.negativo}</span>
                            <span className="font-bold text-nodri-t1">{o.total}x</span>
                          </div>
                        </div>
                        <BarraH valor={o.total} max={max} cor={cor} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* REGISTROS RECENTES */}
              {data.respostas_recentes.length > 0 && (
                <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                  <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                    <span className="text-sm">📝</span>
                    <span className="text-[13px] font-semibold text-nodri-t1">Registros Recentes</span>
                  </div>
                  <div className="p-5 space-y-2">
                    {data.respostas_recentes.map(r => (
                      <div key={r.id} className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
                        <div className={`text-[9px] font-black px-2 py-1 rounded-full shrink-0 ${r.tipo === 'positivo' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                          {r.tipo === 'positivo' ? '+ POS' : '- NEG'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] font-semibold text-nodri-t1">{r.profissional_nome}</span>
                            <span className="text-[10px] text-nodri-t3">·</span>
                            <span className="text-[11px] text-nodri-t2 truncate">{r.ocorrido_descricao}</span>
                          </div>
                          {r.descricao && <p className="text-[11px] text-nodri-t3 italic truncate">"{r.descricao}"</p>}
                        </div>
                        <span className="text-[9px] text-nodri-t3 shrink-0">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.total === 0 && (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">📭</div>
                  <h3 className="text-nodri-t1 font-semibold text-lg mb-2">Nenhum registro ainda</h3>
                  <p className="text-nodri-t2 text-sm">Compartilhe o link para começar a registrar ocorrências.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
