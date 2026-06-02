'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, BarChart2, Brain, Calendar, RefreshCw,
  TrendingUp, TrendingDown, AlertTriangle, Zap,
  CheckCircle, Download, FileText, Users, Target,
  Activity, ClipboardList,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Ranking { nome: string; positivo: number; negativo: number; total: number; score: number }
interface Ocorrencia { descricao: string; positivo: number; negativo: number; total: number }
interface Tendencia { semana: string; positivo: number; negativo: number; total: number }
interface Reincidencia { profissional: string; ocorrencia: string; count: number; ultima_vez: string; dias_desde: number }
interface Categoria { nome: string; total: number; positivo: number; negativo: number; percentual_negativo: number; cor: string }
interface MatrizItem { profissional: string; ocorrencias: Record<string, number>; total: number }
interface DiaSemana { dia: string; positivo: number; negativo: number; total: number }
interface EvolucaoItem { profissional: string; semanas: { semana: string; score: number; total: number }[] }
interface PlacardMes { mes: string; profissionais: { nome: string; positivo: number; negativo: number; total: number; score: number; top_problema: string }[] }
interface CorrelacaoItem { semana: string; negProf: number; mediaCliente: number | null }
interface IAAnalise {
  resumo_executivo: string; clima_equipe: number
  destaques_positivos: { nome: string; motivo: string }[]
  alertas_urgentes: { nome: string; problema: string; recomendacao: string }[]
  padroes_ocorrencias: { ocorrencia: string; frequencia: string; impacto: string; acao: string }[]
  acoes_gestao: { acao: string; prazo: string; profissional: string }[]
  riscos_retencao: string
  recomendacoes_treinamento: string[]
}
interface AcaoCorretiva {
  ocorrencia: string; categoria: string; count: number
  stage: number; stage_label: string; stage_cor: string
  acao_corretiva: string; urgente: boolean
}
interface PlanoAcaoItem {
  profissional: string; score: number; total_negativos: number
  max_stage: number; max_stage_cor: string; acoes: AcaoCorretiva[]
}
interface Data {
  formulario: { titulo: string }
  total: number; totalPositivo: number; totalNegativo: number
  ranking: Ranking[]; ocorrencias: Ocorrencia[]; tendencia: Tendencia[]
  alertaDesempenho: boolean; profCritico: Ranking | null; nomeProfissionais: string[]
  planoAcao: PlanoAcaoItem[]
  reincidencia: Reincidencia[]; categorias: Categoria[]; matriz: MatrizItem[]
  topOcorrencias: string[]; diasSemana: DiaSemana[]; evolucaoIndividual: EvolucaoItem[]
  placardMensal: PlacardMes[]; correlacaoCliente: CorrelacaoItem[]
  respostas_recentes: { id: string; profissional_nome: string; tipo: string; ocorrido_descricao: string; descricao: string; criado_em: string }[]
}

type Aba = 'profissionais' | 'ocorrencias' | 'plano' | 'tendencias' | 'ia'

function Barra({ valor, max, cor, height = 2 }: { valor: number; max: number; cor?: string; height?: number }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full" style={{ background: 'rgba(255,255,255,.06)', height }}>
        <div className="rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor || '#22d3ee', height }} />
      </div>
      <span className="text-[10px] text-nodri-t3 w-7 text-right">{pct}%</span>
    </div>
  )
}

const MESES_PT: Record<string, string> = {
  '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril','05':'Maio','06':'Junho',
  '07':'Julho','08':'Agosto','09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro',
}
function formatMes(mes: string) {
  const [ano, m] = mes.split('-')
  return `${MESES_PT[m] || m} ${ano}`
}

const ABAS = [
  { id: 'profissionais', label: 'Profissionais', icon: Users },
  { id: 'ocorrencias',   label: 'Ocorrências',  icon: ClipboardList },
  { id: 'plano',         label: 'Plano de Ação', icon: Target },
  { id: 'tendencias',    label: 'Tendências',    icon: Activity },
  { id: 'ia',            label: 'IA Claude',     icon: Brain },
] as const

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
  const [profEvol, setProfEvol] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState(0)
  const [abaAtiva, setAbaAtiva] = useState<Aba>('profissionais')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (inicio) qs.set('inicio', inicio)
    if (fim) qs.set('fim', fim)
    if (filtroProfissional) qs.set('profissional', filtroProfissional)
    if (filtroTipo) qs.set('tipo', filtroTipo)
    const res = await fetch(`/api/feedback-prof/resultados/${id}?${qs}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
      if (!profEvol && d.nomeProfissionais?.length) setProfEvol(d.nomeProfissionais[0])
    } else toast.error('Erro ao carregar')
    setLoading(false)
  }, [id, inicio, fim, filtroProfissional, filtroTipo])

  useEffect(() => { fetchData() }, [fetchData])

  async function acionarIA() {
    setIaLoading(true); setIaErro(''); setAbaAtiva('ia')
    const res = await fetch(`/api/feedback-prof/ia/${id}`, { method: 'POST' })
    const d = await res.json()
    if (d.error) setIaErro(d.error)
    else setIa(d)
    setIaLoading(false)
  }

  function exportarCSV() {
    if (!data) return
    const linhas: string[][] = [
      ['Relatório Feedback Profissional', data.formulario.titulo],
      ['Total', String(data.total), 'Positivos', String(data.totalPositivo), 'Negativos', String(data.totalNegativo)],
      [],
      ['RANKING'],
      ['Nome', 'Score%', 'Positivos', 'Negativos', 'Total'],
      ...data.ranking.map(r => [r.nome, r.score + '%', String(r.positivo), String(r.negativo), String(r.total)]),
      [],
      ['REINCIDÊNCIAS CRÍTICAS'],
      ['Profissional', 'Ocorrência', 'Vezes', 'Última ocorrência', 'Dias atrás'],
      ...data.reincidencia.map(r => [r.profissional, r.ocorrencia, String(r.count), new Date(r.ultima_vez).toLocaleDateString('pt-BR'), String(r.dias_desde)]),
      [],
      ['OCORRÊNCIAS'],
      ['Ocorrência', 'Total', 'Negativos', 'Positivos'],
      ...data.ocorrencias.map(o => [o.descricao, String(o.total), String(o.negativo), String(o.positivo)]),
    ]
    const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `feedback-prof-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('CSV exportado!')
  }

  const PRAZO_ICON: Record<string, string> = { imediato: '🔥', 'esta semana': '📅', 'este mês': '🗓️' }
  const evolucaoProfissional = data?.evolucaoIndividual.find(e => e.profissional === profEvol)
  const placardMes = data?.placardMensal[mesSelecionado]

  return (
    <>
      <style>{`@media print{nav,button,.no-print{display:none!important;}body{background:white!important;}.pcard{border:1px solid #e5e7eb!important;background:white!important;}}`}</style>
      <div className="nodri-salon-bg min-h-screen">

        {/* NAV */}
        <nav className="no-print bg-nodri-surface border-b border-nodri-border px-5 py-3 flex flex-wrap items-center gap-2 sticky top-0 z-50">
          <button onClick={() => router.push('/salon/feedback-profissional')} className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 text-sm">
            <ArrowLeft size={15} /> Feedback Profissional
          </button>
          <div className="w-px h-4 bg-nodri-border" />
          <BarChart2 size={14} className="text-nodri-purple" />
          <span className="font-syne font-bold text-sm text-nodri-t1 hidden sm:block">Resultados — Desempenho da Equipe</span>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button onClick={exportarCSV} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(34,197,94,.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,.25)' }}>
              <Download size={12} /> Excel
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)' }}>
              <FileText size={12} /> PDF
            </button>
            <button onClick={acionarIA} disabled={iaLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,rgba(124,92,252,.25),rgba(244,63,142,.25))', color: '#c084fc', border: '1px solid rgba(139,92,246,.4)' }}>
              <Brain size={13} />{iaLoading ? 'Analisando...' : 'Acionar IA Claude'}
            </button>
          </div>
        </nav>

        <div className="p-4 max-w-5xl mx-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-t-nodri-cyan rounded-full animate-spin" /></div>
          ) : !data ? null : (
            <>
              {/* ── RESUMO EXECUTIVO ── */}
              <div className="space-y-3">
                {data.alertaDesempenho && data.profCritico && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: 'rgba(239,68,68,.08)', borderColor: 'rgba(239,68,68,.4)' }}>
                    <AlertTriangle size={18} className="text-red-400 shrink-0" />
                    <div>
                      <div className="font-bold text-red-400 text-sm">⚠️ Ação imediata necessária</div>
                      <p className="text-[12px] text-nodri-t2 mt-0.5">
                        <strong className="text-red-400">{data.profCritico.nome}</strong> — score {data.profCritico.score}% · {data.profCritico.negativo} negativos de {data.profCritico.total} registros
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total', val: data.total, cor: '#94a3b8' },
                    { label: 'Positivos', val: data.totalPositivo, cor: '#4ade80' },
                    { label: 'Negativos', val: data.totalNegativo, cor: '#f87171' },
                    { label: '% Positivo', val: data.total > 0 ? Math.round(data.totalPositivo / data.total * 100) + '%' : '—', cor: data.total > 0 && data.totalPositivo / data.total >= 0.6 ? '#4ade80' : '#f87171' },
                  ].map(({ label, val, cor }) => (
                    <div key={label} className="pcard p-4 rounded-xl border text-center" style={{ background: '#0d1117', borderColor: `${cor}30` }}>
                      <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">{label}</div>
                      <div className="text-2xl font-black" style={{ color: cor }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                  <span className="text-[11px] text-nodri-t3 font-semibold">Filtros:</span>
                  <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)} className="bg-nodri-card border border-nodri-border rounded-lg px-2 py-1.5 text-[11px] text-nodri-t1 outline-none">
                    <option value="">Todos profissionais</option>
                    {data.nomeProfissionais.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="bg-nodri-card border border-nodri-border rounded-lg px-2 py-1.5 text-[11px] text-nodri-t1 outline-none">
                    <option value="">Todos os tipos</option>
                    <option value="positivo">Positivos</option>
                    <option value="negativo">Negativos</option>
                  </select>
                  <div className="flex items-center gap-1 px-2 py-1.5 bg-nodri-card border border-nodri-border rounded-lg">
                    <Calendar size={11} className="text-nodri-t3" />
                    <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="bg-transparent text-[11px] text-nodri-t1 outline-none w-24" />
                    <span className="text-[10px] text-nodri-t3">→</span>
                    <input type="date" value={fim} onChange={e => setFim(e.target.value)} className="bg-transparent text-[11px] text-nodri-t1 outline-none w-24" />
                  </div>
                  <button onClick={fetchData} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(34,211,238,.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,.25)' }}>
                    <RefreshCw size={11} /> Aplicar
                  </button>
                </div>
              </div>

              {/* ── ABAS ── */}
              <div className="flex gap-1 border-b border-nodri-border overflow-x-auto no-print">
                {ABAS.map(({ id: aid, label, icon: Icon }) => (
                  <button key={aid} onClick={() => setAbaAtiva(aid as Aba)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold whitespace-nowrap transition-all border-b-2 -mb-px"
                    style={abaAtiva === aid
                      ? { color: '#22d3ee', borderColor: '#22d3ee' }
                      : { color: '#64748b', borderColor: 'transparent' }}>
                    <Icon size={13} />{label}
                    {aid === 'ia' && ia && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ml-0.5" />}
                  </button>
                ))}
              </div>

              {/* ══ ABA: PROFISSIONAIS ══ */}
              {abaAtiva === 'profissionais' && (
                <div className="space-y-4">
                  {/* Ranking */}
                  <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                    <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                      <span className="text-sm">🏆</span>
                      <span className="text-[13px] font-semibold text-nodri-t1">Ranking de Desempenho</span>
                      <span className="text-[10px] text-nodri-t3 ml-1">— do melhor ao pior score</span>
                    </div>
                    <div className="p-5 space-y-3">
                      {data.ranking.map((r, i) => {
                        const cor = r.score >= 70 ? '#4ade80' : r.score >= 40 ? '#facc15' : '#f87171'
                        const isPior = data.profCritico?.nome === r.nome && r.total >= 2
                        return (
                          <div key={r.nome} className={isPior ? 'rounded-xl p-1' : ''} style={isPior ? { border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.05)' } : {}}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-nodri-t3 w-5">#{i + 1}</span>
                                <span className="text-[13px] font-semibold text-nodri-t1">{r.nome}</span>
                                {isPior && <span className="text-[9px] font-black text-red-400 border border-red-400/40 px-1.5 py-0.5 rounded">ATENÇÃO</span>}
                              </div>
                              <div className="flex items-center gap-3 text-[11px]">
                                <span className="text-green-400">+{r.positivo}</span>
                                <span className="text-red-400">-{r.negativo}</span>
                                <span className="font-black text-[14px]" style={{ color: cor }}>{r.score}%</span>
                              </div>
                            </div>
                            <Barra valor={r.score} max={100} cor={cor} height={8} />
                          </div>
                        )
                      })}
                      {data.ranking.length === 0 && <p className="text-nodri-t3 text-sm text-center">Nenhum dado ainda.</p>}
                    </div>
                  </div>

                  {/* Evolução Individual */}
                  {data.evolucaoIndividual.length > 0 && (
                    <div className="pcard rounded-2xl border p-5" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <span className="text-sm">📈</span>
                        <span className="text-[13px] font-semibold text-nodri-t1">Evolução Individual</span>
                        <span className="text-[10px] text-nodri-t3">— melhorando ou piorando?</span>
                        <div className="ml-auto">
                          <select value={profEvol} onChange={e => setProfEvol(e.target.value)}
                            className="bg-nodri-card border border-nodri-border rounded-lg px-2 py-1 text-[11px] text-nodri-t1 outline-none">
                            {data.nomeProfissionais.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                      {evolucaoProfissional && evolucaoProfissional.semanas.length > 0 ? (
                        <>
                          <div className="flex items-end gap-2 h-24 mb-2">
                            {evolucaoProfissional.semanas.map((s, i) => {
                              const cor = s.score >= 70 ? '#4ade80' : s.score >= 40 ? '#facc15' : '#f87171'
                              const prev = i > 0 ? evolucaoProfissional.semanas[i - 1].score : s.score
                              const trend = s.score > prev ? '↑' : s.score < prev ? '↓' : '→'
                              const trendCor = s.score > prev ? '#4ade80' : s.score < prev ? '#f87171' : '#94a3b8'
                              return (
                                <div key={s.semana} className="flex-1 flex flex-col items-center gap-1 group">
                                  <span className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: cor }}>{s.score}%</span>
                                  <div className="w-full rounded-t" style={{ height: `${Math.max(s.score, 5)}%`, background: cor, position: 'relative' }}>
                                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold" style={{ color: trendCor }}>{trend}</span>
                                  </div>
                                  <span className="text-[8px] text-nodri-t3">{s.semana.split('-W')[1] ? `S${s.semana.split('-W')[1]}` : s.semana}</span>
                                  <span className="text-[8px] text-nodri-t3">{s.total}x</span>
                                </div>
                              )
                            })}
                          </div>
                          {(() => {
                            const semanas = evolucaoProfissional.semanas
                            const diff = semanas.length >= 2 ? semanas[semanas.length - 1].score - semanas[0].score : 0
                            const cor = diff > 0 ? '#4ade80' : diff < 0 ? '#f87171' : '#94a3b8'
                            const Icon = diff > 0 ? TrendingUp : TrendingDown
                            return semanas.length >= 2 ? (
                              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: cor }}>
                                <Icon size={12} />
                                {diff > 0 ? `Melhorou ${diff}% desde a primeira semana` : diff < 0 ? `Piorou ${Math.abs(diff)}% desde a primeira semana` : 'Score estável'}
                              </div>
                            ) : null
                          })()}
                        </>
                      ) : (
                        <p className="text-nodri-t3 text-sm">Dados insuficientes para este profissional.</p>
                      )}
                    </div>
                  )}

                  {/* Placar Mensal */}
                  {data.placardMensal.length > 0 && (
                    <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="px-5 py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                        <span className="text-sm">📊</span>
                        <span className="text-[13px] font-semibold text-nodri-t1">Placar Mensal</span>
                        <div className="ml-auto flex gap-1 flex-wrap">
                          {data.placardMensal.map((p, i) => (
                            <button key={p.mes} onClick={() => setMesSelecionado(i)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${mesSelecionado === i ? 'bg-nodri-cyan/15 text-nodri-cyan border border-nodri-cyan/30' : 'text-nodri-t3 hover:text-nodri-t1 border border-nodri-border'}`}>
                              {formatMes(p.mes)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {placardMes && (
                        <div className="p-5 overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="text-nodri-t3 font-medium">
                                <th className="text-left pb-3">Profissional</th>
                                <th className="text-center pb-3">Score</th>
                                <th className="text-center pb-3">✅</th>
                                <th className="text-center pb-3">❌</th>
                                <th className="text-center pb-3">Total</th>
                                <th className="text-left pb-3 pl-3">Principal Problema</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-nodri-border/30">
                              {placardMes.profissionais.map((p, i) => {
                                const cor = p.score >= 70 ? '#4ade80' : p.score >= 40 ? '#facc15' : '#f87171'
                                return (
                                  <tr key={p.nome} className="hover:bg-nodri-surface/30 transition-colors">
                                    <td className="py-2.5 pr-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-nodri-t3">#{i + 1}</span>
                                        <span className="font-semibold text-nodri-t1">{p.nome}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 text-center"><span className="font-black text-[13px]" style={{ color: cor }}>{p.score}%</span></td>
                                    <td className="py-2.5 text-center text-green-400 font-semibold">{p.positivo}</td>
                                    <td className="py-2.5 text-center text-red-400 font-semibold">{p.negativo}</td>
                                    <td className="py-2.5 text-center text-nodri-t2">{p.total}</td>
                                    <td className="py-2.5 pl-3">
                                      {p.top_problema !== '—' ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}>
                                          {p.top_problema.length > 25 ? p.top_problema.slice(0, 25) + '…' : p.top_problema}
                                        </span>
                                      ) : <span className="text-nodri-t3">—</span>}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ══ ABA: OCORRÊNCIAS ══ */}
              {abaAtiva === 'ocorrencias' && (
                <div className="space-y-4">
                  {/* Reincidências */}
                  {data.reincidencia.length > 0 && (
                    <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(239,68,68,.2)' }}>
                      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,.15)', background: 'rgba(239,68,68,.05)' }}>
                        <AlertTriangle size={14} className="text-red-400" />
                        <span className="text-[13px] font-semibold text-red-300">Reincidências Críticas</span>
                        <span className="text-[10px] text-nodri-t3 ml-1">— mesmo problema ≥ 2x</span>
                        <span className="ml-auto text-[10px] text-red-400 font-bold">{data.reincidencia.length} casos</span>
                      </div>
                      <div className="p-5 space-y-2">
                        {data.reincidencia.slice(0, 12).map((r, i) => {
                          const urgencia = r.count >= 5 ? '#ef4444' : r.count >= 3 ? '#f97316' : '#facc15'
                          const diasLabel = r.dias_desde === 0 ? 'hoje' : r.dias_desde === 1 ? 'ontem' : `há ${r.dias_desde} dias`
                          return (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
                              <div className="flex items-center justify-center w-8 h-8 rounded-full font-black text-sm shrink-0"
                                style={{ background: `${urgencia}20`, color: urgencia, border: `1px solid ${urgencia}40` }}>
                                {r.count}x
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[12px] font-bold text-nodri-t1">{r.profissional}</span>
                                  <span className="text-nodri-t3 text-[10px]">·</span>
                                  <span className="text-[11px] text-nodri-t2 truncate">{r.ocorrencia}</span>
                                </div>
                                <span className="text-[10px] text-nodri-t3">Última: {diasLabel}</span>
                              </div>
                              <div className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0" style={{ background: `${urgencia}15`, color: urgencia }}>
                                {r.count >= 5 ? 'URGENTE' : r.count >= 3 ? 'ATENÇÃO' : 'OBSERVAR'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ocorrências mais frequentes */}
                  <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                    <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                      <span className="text-sm">📋</span>
                      <span className="text-[13px] font-semibold text-nodri-t1">Ocorrências Mais Frequentes</span>
                    </div>
                    <div className="p-5 space-y-2">
                      {data.ocorrencias.slice(0, 15).map(o => {
                        const max = data.ocorrencias[0]?.total || 1
                        const cor = o.negativo > o.positivo ? '#f87171' : '#4ade80'
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
                            <Barra valor={o.total} max={max} cor={cor} height={6} />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Matriz */}
                  {data.matriz.length > 0 && data.topOcorrencias.length > 0 && (
                    <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                        <span className="text-sm">🔢</span>
                        <span className="text-[13px] font-semibold text-nodri-t1">Matriz Profissional × Ocorrência</span>
                        <span className="text-[10px] text-nodri-t3 ml-1">— quem tem qual problema</span>
                      </div>
                      <div className="p-5 overflow-x-auto">
                        <table className="w-full text-[11px]" style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
                          <thead>
                            <tr>
                              <th className="text-left text-nodri-t3 font-medium pb-2 pr-3 min-w-[120px]">Profissional</th>
                              {data.topOcorrencias.map(o => (
                                <th key={o} className="text-center text-nodri-t3 font-medium pb-2 px-1 max-w-[80px]">
                                  <div style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', maxHeight: 80, fontSize: 9, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {o.length > 20 ? o.slice(0, 20) + '…' : o}
                                  </div>
                                </th>
                              ))}
                              <th className="text-center text-nodri-t3 font-medium pb-2 px-1">TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.matriz.map(row => {
                              const maxVal = Math.max(...data.matriz.flatMap(r => Object.values(r.ocorrencias)), 1)
                              return (
                                <tr key={row.profissional}>
                                  <td className="text-nodri-t1 font-semibold py-1 pr-3 text-[11px]">{row.profissional}</td>
                                  {data.topOcorrencias.map(o => {
                                    const val = row.ocorrencias[o] || 0
                                    const intensity = val > 0 ? Math.max(0.15, val / maxVal) : 0
                                    const cor = val >= 3 ? '#ef4444' : val >= 2 ? '#f97316' : val === 1 ? '#facc15' : 'transparent'
                                    return (
                                      <td key={o} className="text-center py-1 px-1">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto font-bold text-[11px]"
                                          style={{ background: val > 0 ? `${cor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` : 'rgba(255,255,255,.03)', color: val > 0 ? cor : '#334155', border: val > 0 ? `1px solid ${cor}40` : '1px solid rgba(255,255,255,.04)' }}>
                                          {val > 0 ? val : '·'}
                                        </div>
                                      </td>
                                    )
                                  })}
                                  <td className="text-center py-1 px-1">
                                    <span className="font-black text-[12px]" style={{ color: row.total >= 5 ? '#f87171' : row.total >= 3 ? '#fb923c' : '#94a3b8' }}>{row.total}</span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        <div className="flex items-center gap-4 mt-3 text-[9px] text-nodri-t3">
                          <span>Legenda:</span>
                          {[{ cor: '#facc15', label: '1x' }, { cor: '#f97316', label: '2x' }, { cor: '#ef4444', label: '3x+' }].map(({ cor, label }) => (
                            <span key={label} className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: `${cor}30`, color: cor, border: `1px solid ${cor}40` }}>{label}</div>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Categorias */}
                  {data.categorias.length > 0 && (
                    <div className="pcard rounded-2xl border p-5" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm">🏷️</span>
                        <span className="text-[13px] font-semibold text-nodri-t1">Problemas por Categoria</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {data.categorias.map(cat => (
                          <div key={cat.nome} className="p-3 rounded-xl border" style={{ borderColor: `${cat.cor}30`, background: `${cat.cor}08` }}>
                            <div className="text-[10px] font-bold mb-1" style={{ color: cat.cor }}>{cat.nome}</div>
                            <div className="text-2xl font-black mb-1" style={{ color: cat.cor }}>{cat.negativo}</div>
                            <div className="text-[10px] text-nodri-t3">negativos · {cat.percentual_negativo}%</div>
                            <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.06)' }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${cat.percentual_negativo}%`, background: cat.cor }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex h-4 rounded-full overflow-hidden gap-px">
                        {data.categorias.filter(c => c.negativo > 0).map(cat => {
                          const pct = data.totalNegativo > 0 ? (cat.negativo / data.totalNegativo) * 100 : 0
                          return <div key={cat.nome} title={`${cat.nome}: ${cat.negativo} (${Math.round(pct)}%)`} style={{ width: `${pct}%`, background: cat.cor, minWidth: pct > 0 ? 4 : 0 }} />
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ ABA: PLANO DE AÇÃO ══ */}
              {abaAtiva === 'plano' && (
                <div className="space-y-4">
                  {data.planoAcao && data.planoAcao.length > 0 ? (
                    <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(139,92,246,.25)' }}>
                      <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(139,92,246,.15)', background: 'rgba(139,92,246,.07)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎯</span>
                          <span className="font-syne font-bold text-sm text-purple-300">Plano de Ação Corretiva</span>
                        </div>
                        <p className="text-[10px] text-nodri-t3 mt-1">Ações baseadas na quantidade de ocorrências — quanto maior a reincidência, mais formal a medida.</p>
                      </div>
                      <div className="p-5 space-y-4">
                        {data.planoAcao.map(prof => (
                          <div key={prof.profissional} className="rounded-xl border overflow-hidden"
                            style={{ borderColor: `${prof.max_stage_cor}30`, background: `${prof.max_stage_cor}06` }}>
                            <div className="px-4 py-2.5 flex items-center gap-3 border-b" style={{ borderColor: `${prof.max_stage_cor}20` }}>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                                style={{ background: `${prof.max_stage_cor}20`, color: prof.max_stage_cor, border: `1.5px solid ${prof.max_stage_cor}50` }}>
                                {prof.profissional.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <span className="font-bold text-nodri-t1 text-[13px]">{prof.profissional}</span>
                                <span className="text-[10px] text-nodri-t3 ml-2">{prof.total_negativos} negativo{prof.total_negativos !== 1 ? 's' : ''} · score {prof.score}%</span>
                              </div>
                              <span className="text-[9px] font-black px-2 py-1 rounded-full"
                                style={{ background: `${prof.max_stage_cor}20`, color: prof.max_stage_cor, border: `1px solid ${prof.max_stage_cor}40` }}>
                                ESTÁGIO {prof.max_stage}
                              </span>
                            </div>
                            <div className="divide-y" style={{ borderColor: `${prof.max_stage_cor}10` }}>
                              {prof.acoes.map((acao, i) => (
                                <div key={i} className="px-4 py-3 flex items-start gap-3">
                                  <div className="shrink-0 mt-0.5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                        style={{ background: `${acao.stage_cor}20`, color: acao.stage_cor, border: `1px solid ${acao.stage_cor}40` }}>
                                        {acao.count}x
                                      </span>
                                      {acao.urgente && <span className="text-[8px] font-black text-red-400 uppercase">⚠ Urgente</span>}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[12px] font-semibold text-nodri-t1">{acao.ocorrencia}</span>
                                      <span className="text-[9px] text-nodri-t3">{acao.categoria}</span>
                                    </div>
                                    <div className="text-[10px] font-semibold mb-1" style={{ color: acao.stage_cor }}>{acao.stage_label}</div>
                                    <p className="text-[11px] text-nodri-t2 leading-relaxed">{acao.acao_corretiva}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-5 pb-4">
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                          <div className="text-[10px] font-bold text-nodri-t3 mb-2">Escala de medidas:</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { label: '1-2x', desc: 'Conversa Informal', cor: '#facc15' },
                              { label: '3-4x', desc: 'Advertência Verbal', cor: '#fb923c' },
                              { label: '5-6x', desc: 'Advertência Escrita', cor: '#f87171' },
                              { label: '7x+',  desc: 'Reunião Formal',     cor: '#dc2626' },
                            ].map(s => (
                              <div key={s.label} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0"
                                  style={{ background: `${s.cor}20`, color: s.cor }}>{s.label}</div>
                                <span className="text-[9px] text-nodri-t2">{s.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-3">✅</div>
                      <p className="text-nodri-t2 text-sm">Nenhum plano de ação necessário no momento.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ ABA: TENDÊNCIAS ══ */}
              {abaAtiva === 'tendencias' && (
                <div className="space-y-4">
                  {data.tendencia.length >= 2 && (
                    <div className="pcard rounded-2xl border p-5" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={14} className="text-nodri-cyan" />
                        <span className="text-[13px] font-semibold text-nodri-t1">Tendência Semanal Geral</span>
                      </div>
                      <div className="flex items-end gap-2 h-24">
                        {data.tendencia.map(t => {
                          const maxTotal = Math.max(...data.tendencia.map(x => x.total), 1)
                          const pctPos = t.total > 0 ? (t.positivo / t.total) * 100 : 0
                          return (
                            <div key={t.semana} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full rounded-t flex flex-col overflow-hidden" style={{ height: `${Math.max((t.total / maxTotal) * 100, 8)}%` }}>
                                <div style={{ flex: pctPos, background: '#4ade80', minHeight: 2 }} />
                                <div style={{ flex: 100 - pctPos, background: '#f87171', minHeight: 2 }} />
                              </div>
                              <span className="text-[8px] text-nodri-t3">{t.semana.includes('-W') ? `S${t.semana.split('-W')[1]}` : t.semana}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex gap-4 mt-2 text-[10px]">
                        <span className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-green-400" /> Positivo</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-red-400" /> Negativo</span>
                      </div>
                    </div>
                  )}

                  {data.diasSemana.some(d => d.total > 0) && (
                    <div className="pcard rounded-2xl border p-5" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm">📅</span>
                        <span className="text-[13px] font-semibold text-nodri-t1">Dias da Semana com Mais Ocorrências</span>
                      </div>
                      <div className="flex items-end gap-2 h-28">
                        {data.diasSemana.map(d => {
                          const maxTotal = Math.max(...data.diasSemana.map(x => x.total), 1)
                          const pct = (d.total / maxTotal) * 100
                          const pctNeg = d.total > 0 ? (d.negativo / d.total) * 100 : 0
                          return (
                            <div key={d.dia} className="flex-1 flex flex-col items-center gap-1">
                              <div className="text-[10px] text-nodri-t3 font-medium">{d.total > 0 ? d.total : ''}</div>
                              <div className="w-full rounded-t flex flex-col overflow-hidden" style={{ height: `${Math.max(pct, 5)}%` }}>
                                <div style={{ flex: pctNeg, background: '#f87171', minHeight: d.negativo > 0 ? 2 : 0 }} />
                                <div style={{ flex: 100 - pctNeg, background: '#4ade80', minHeight: d.positivo > 0 ? 2 : 0 }} />
                              </div>
                              <span className="text-[9px] text-nodri-t2 font-medium">{d.dia.slice(0, 3)}</span>
                            </div>
                          )
                        })}
                      </div>
                      {(() => {
                        const piorDia = data.diasSemana.filter(d => d.total > 0).sort((a, b) => b.negativo - a.negativo)[0]
                        return piorDia ? <p className="text-[10px] text-nodri-t3 mt-3">⚠️ Pior dia: <strong className="text-red-400">{piorDia.dia}</strong> ({piorDia.negativo} negativos)</p> : null
                      })()}
                    </div>
                  )}

                  {data.correlacaoCliente.length > 0 && (
                    <div className="pcard rounded-2xl border p-5" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">🔗</span>
                        <span className="text-[13px] font-semibold text-nodri-t1">Correlação: Equipe × Satisfação do Cliente</span>
                      </div>
                      <p className="text-[11px] text-nodri-t3 mb-4">Quando os problemas aumentam, a nota do cliente cai?</p>
                      <div className="flex items-end gap-2 h-24">
                        {data.correlacaoCliente.map(item => {
                          const maxNeg = Math.max(...data.correlacaoCliente.map(c => c.negProf), 1)
                          const pctNeg = (item.negProf / maxNeg) * 100
                          return (
                            <div key={item.semana} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full flex gap-0.5 items-end" style={{ height: 80 }}>
                                <div className="flex-1 rounded-t" style={{ height: `${Math.max(pctNeg, 3)}%`, background: '#f87171' }} />
                                {item.mediaCliente !== null && (
                                  <div className="flex-1 rounded-t" style={{ height: `${Math.max((item.mediaCliente / 10) * 100, 3)}%`, background: '#60a5fa' }} />
                                )}
                              </div>
                              <span className="text-[8px] text-nodri-t3">{item.semana.split('-W')[1] ? `S${item.semana.split('-W')[1]}` : item.semana}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex gap-6 mt-2 text-[10px]">
                        <span className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-red-400" /> Negativos da equipe</span>
                        <span className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-blue-400" /> Nota do cliente (0-10)</span>
                      </div>
                    </div>
                  )}

                  {/* Registros recentes */}
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
                                <span className="text-[11px] text-nodri-t2 truncate">· {r.ocorrido_descricao}</span>
                              </div>
                              {r.descricao && <p className="text-[11px] text-nodri-t3 italic truncate">&quot;{r.descricao}&quot;</p>}
                            </div>
                            <span className="text-[9px] text-nodri-t3 shrink-0">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ ABA: IA CLAUDE ══ */}
              {abaAtiva === 'ia' && (
                <div>
                  {!ia && !iaLoading && !iaErro && (
                    <div className="text-center py-16">
                      <Brain size={40} className="text-purple-400 mx-auto mb-4 opacity-50" />
                      <p className="text-nodri-t2 text-sm mb-4">Clique no botão para gerar a análise da equipe com IA.</p>
                      <button onClick={acionarIA} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm mx-auto"
                        style={{ background: 'linear-gradient(135deg,rgba(124,92,252,.25),rgba(244,63,142,.25))', color: '#c084fc', border: '1px solid rgba(139,92,246,.4)' }}>
                        <Brain size={16} /> Acionar IA Claude
                      </button>
                    </div>
                  )}
                  {iaLoading && (
                    <div className="p-8 text-center">
                      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-nodri-t2 text-sm">Analisando equipe...</p>
                    </div>
                  )}
                  {iaErro && <div className="p-5 text-red-400 text-sm flex gap-2"><AlertTriangle size={16} />{iaErro}</div>}
                  {ia && !iaLoading && (
                    <div className="space-y-4">
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
                          <div className="text-[11px] font-bold text-green-400 mb-2 flex items-center gap-1.5"><CheckCircle size={13} /> Destaques Positivos</div>
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
                          <div className="text-[11px] font-bold text-red-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={13} /> Alertas Urgentes</div>
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
                      {ia.padroes_ocorrencias?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-orange-400 mb-2 flex items-center gap-1.5"><BarChart2 size={13} /> Padrões de Ocorrências</div>
                          <div className="space-y-2">
                            {ia.padroes_ocorrencias.map((p, i) => (
                              <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(251,146,60,.05)', border: '1px solid rgba(251,146,60,.15)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[11px] font-semibold text-orange-300">{p.ocorrencia}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                    style={{ background: p.frequencia === 'alta' ? 'rgba(239,68,68,.2)' : 'rgba(250,204,21,.2)', color: p.frequencia === 'alta' ? '#f87171' : '#facc15' }}>
                                    {p.frequencia}
                                  </span>
                                </div>
                                <p className="text-[11px] text-nodri-t2 mb-0.5">{p.impacto}</p>
                                <p className="text-[11px] text-nodri-cyan">→ {p.acao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ia.acoes_gestao?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5"><Zap size={13} /> Ações de Gestão</div>
                          <div className="space-y-1.5">
                            {ia.acoes_gestao.map((a, i) => (
                              <div key={i} className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(6,182,212,.05)', border: '1px solid rgba(6,182,212,.15)' }}>
                                <span>{PRAZO_ICON[a.prazo] || '📌'}</span>
                                <div>
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
