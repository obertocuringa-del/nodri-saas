'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, BarChart2, Brain, Calendar, RefreshCw,
  TrendingUp, TrendingDown, Minus, AlertTriangle, Zap,
  CheckCircle, Download, FileText, Users, Clock, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'

type TipoPergunta = 'escala' | 'multipla_escolha' | 'texto' | 'sim_nao' | 'grid'
interface Pergunta { id: string; titulo: string; tipo: TipoPergunta; opcoes: string[] }
interface EscalaStat { media: number; dist: Record<number, number>; total: number; nps: number; detratores: number; neutros: number; promotores: number }
interface MultiplaEscolhaStat { contagem: Record<string, number>; total: number }
interface TextoStat { respostas: string[]; total: number }
interface SimNaoStat { contagem: Record<string, { sim: number; nao: number }>; total: number }
interface GridStat { contagem: Record<string, { soma: number; count: number; media: number }>; total: number }
interface IAAnalise {
  resumo_executivo: string | { situacao_atual: string; resultado_encontrado: string; principal_problema: string; principal_oportunidade: string }
  nota_geral: number
  diagnostico?: { nps: { valor: number; promotores_pct: number; neutros_pct: number; detratores_pct: number; classificacao: string; benchmark: string }; media_geral: number; tendencia: string }
  gargalos?: { emoji: string; titulo: string; descricao: string }[]
  oportunidades_escondidas?: { emoji: string; titulo: string; descricao: string }[]
  pontos_fortes: { titulo: string; descricao: string }[]
  areas_melhoria: { titulo: string; descricao: string; prioridade: 'alta' | 'media' | 'baixa' }[]
  analise_clientes?: { perfil_dominante: string; clientes_em_risco: string; potencial_reativacao: string }
  analise_servicos?: { mais_elogiados: string[]; mais_criticados: string[]; oportunidade_upsell: string }
  analise_agenda?: { horarios_pico: string; horarios_problema: string; recomendacao_operacional: string }
  analise_financeira?: { ticket_medio_estimado: string; receita_em_risco: string; receita_potencial: string }
  plano_acao?: { proximos_7_dias: { acao: string; impacto: string; dificuldade: string }[]; proximos_30_dias: { acao: string; impacto: string; dificuldade: string }[]; proximos_90_dias: { acao: string; impacto: string; dificuldade: string }[] }
  previsao?: { cenario_conservador: { descricao: string; probabilidade_pct: number }; cenario_realista: { descricao: string; probabilidade_pct: number }; cenario_otimista: { descricao: string; probabilidade_pct: number } }
  insight_exclusivo?: string
  acoes_prioritarias: { acao: string; impacto: string; prazo: string; dificuldade: string }[]
  insight_nps: string; insight_retencao: string; insight_ticket: string; insight_horario: string
  oportunidades_receita: string[]
}
interface ResultadosData {
  formulario: { id: string; titulo: string; descricao: string }
  total_respostas: number
  perguntas: Pergunta[]
  stats: Record<string, unknown>
  comentarios: string[]
  tendenciaSemanal: { semana: string; media: number; total: number }[]
  taxaRetorno: { positivo: number; total: number; percentual: number } | null
  segmentacao: { novos: { count: number; media: number }; recorrentes: { count: number; media: number } } | null
  piorServico: { nome: string; media: number } | null
  alertaMedia: { ativo: boolean; media: number }
  respostas_recentes: { id: string; criado_em: string }[]
}

function BarraH({ valor, max, cor }: { valor: number; max: number; cor?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor || '#22d3ee' }} />
      </div>
      <span className="text-[10px] text-nodri-t3 w-8 text-right">{pct}%</span>
    </div>
  )
}

function NpsGauge({ nps }: { nps: number }) {
  const cor = nps >= 50 ? '#4ade80' : nps >= 25 ? '#facc15' : nps >= 0 ? '#f97316' : '#f87171'
  const label = nps >= 50 ? 'Excelente' : nps >= 25 ? 'Bom' : nps >= 0 ? 'Neutro' : 'Crítico'
  const Icon = nps >= 25 ? TrendingUp : nps >= 0 ? Minus : TrendingDown
  return (
    <div className="flex flex-col items-center p-4 rounded-xl border" style={{ borderColor: `${cor}40`, background: `${cor}08` }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: cor }}>NPS Score</div>
      <div className="text-4xl font-black mb-1" style={{ color: cor }}>{nps}</div>
      <div className="flex items-center gap-1 text-[10px]" style={{ color: cor }}><Icon size={11} /> {label}</div>
    </div>
  )
}

export default function ResultadosPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [data, setData] = useState<ResultadosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [inicio, setInicio] = useState(() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-01` })
  const [fim, setFim] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth()+1, 0).toISOString().slice(0,10) })
  const [iaAnalise, setIaAnalise] = useState<IAAnalise | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [iaErro, setIaErro] = useState('')
  const [showIa, setShowIa] = useState(false)

  const [inicioAplicado, setInicioAplicado] = useState(inicio)
  const [fimAplicado, setFimAplicado] = useState(fim)

  const fetchResultados = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (inicioAplicado) qs.set('inicio', inicioAplicado)
    if (fimAplicado) qs.set('fim', fimAplicado)
    const res = await fetch(`/api/feedback/resultados/${id}?${qs}`)
    if (res.ok) setData(await res.json())
    else toast.error('Erro ao carregar resultados')
    setLoading(false)
  }, [id, inicioAplicado, fimAplicado])

  useEffect(() => { fetchResultados() }, [fetchResultados])

  async function acionarIA() {
    setIaLoading(true); setIaErro(''); setShowIa(true)
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

  //  EXPORTAR CSV 
  function exportarCSV() {
    if (!data) return
    const linhas: string[][] = []
    linhas.push(['Relatório de Feedback', data.formulario.titulo, '', ''])
    linhas.push(['Total de respostas', String(data.total_respostas), '', ''])
    linhas.push(['Gerado em', new Date().toLocaleDateString('pt-BR'), '', ''])
    linhas.push([])

    for (const perg of data.perguntas) {
      const s = data.stats[perg.id]
      if (!s) continue
      linhas.push([perg.titulo])
      if (perg.tipo === 'escala') {
        const st = s as EscalaStat
        linhas.push(['Média', String(st.media), 'NPS', String(st.nps)])
        linhas.push(['Promotores', String(st.promotores), 'Neutros', String(st.neutros)])
        linhas.push(['Detratores', String(st.detratores), 'Total', String(st.total)])
      } else if (perg.tipo === 'multipla_escolha') {
        const st = s as MultiplaEscolhaStat
        Object.entries(st.contagem).forEach(([op, n]) => linhas.push([op, String(n), `${st.total > 0 ? Math.round(n / st.total * 100) : 0}%`, '']))
      } else if (perg.tipo === 'sim_nao') {
        const st = s as SimNaoStat
        Object.entries(st.contagem).forEach(([item, c]) => linhas.push([item, `Sim: ${c.sim}`, `Não: ${c.nao}`, '']))
      } else if (perg.tipo === 'grid') {
        const st = s as GridStat
        Object.entries(st.contagem).filter(([, v]) => v.count > 0).forEach(([item, v]) => linhas.push([item, `Média: ${v.media}/5`, `Avaliações: ${v.count}`, '']))
      }
      linhas.push([])
    }

    if (data.comentarios.length) {
      linhas.push(['COMENTÁRIOS'])
      data.comentarios.forEach(c => linhas.push([`"${c.replace(/"/g, '""')}"`]))
    }

    const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `feedback-${data.formulario.titulo.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('CSV exportado!')
  }

  //  EXPORTAR PDF (impressão) 
  function exportarPDF() {
    window.print()
  }

  const PRIORIDADE_COR: Record<string, string> = { alta: '#f87171', media: '#facc15', baixa: '#4ade80' }
  const DIFICULDADE_COR: Record<string, string> = { fácil: '#4ade80', media: '#facc15', difícil: '#f87171' }
  const PRAZO_ICON: Record<string, string> = { imediato: '', 'curto prazo': '', 'médio prazo': '' }

  return (
    <>
      <style>{`
        @media print {
          nav, button, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { break-inside: avoid; border: 1px solid #e5e7eb !important; background: white !important; color: black !important; }
          * { color: black !important; background: white !important; }
        }
      `}</style>

      <div className="nodri-salon-bg min-h-screen">
        {/* NAVBAR */}
        <nav className="no-print bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3 sticky top-0 z-50">
          <button onClick={() => router.push('/salon/feedback')} className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 transition-colors text-sm">
            <ArrowLeft size={15} /> Feedback
          </button>
          <div className="w-px h-4 bg-nodri-border" />
          <div className="flex items-center gap-2">
            <BarChart2 size={15} className="text-nodri-purple" />
            <span className="font-syne font-bold text-sm text-nodri-t1">Resultados</span>
            {data && <span className="text-[10px] text-nodri-t3 hidden sm:inline">— {data.formulario.titulo}</span>}
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* FILTROS DATA */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-nodri-card border border-nodri-border rounded-lg">
              <Calendar size={11} className="text-nodri-t3" />
              <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="bg-nodri-card text-[11px] text-nodri-t1 outline-none cursor-pointer border-0 rounded" style={{ colorScheme: 'dark' }} />
              <span className="text-nodri-t3 text-[10px]">→</span>
              <input type="date" value={fim} onChange={e => setFim(e.target.value)} className="bg-nodri-card text-[11px] text-nodri-t1 outline-none cursor-pointer border-0 rounded" style={{ colorScheme: 'dark' }} />
              <button onClick={() => { setInicioAplicado(inicio); setFimAplicado(fim) }} className="p-0.5 hover:text-nodri-cyan text-nodri-t3 transition-colors"><RefreshCw size={11} /></button>
            </div>
            {/* EXPORTAR */}
            <button onClick={exportarCSV} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
              <Download size={12} /> Excel
            </button>
            <button onClick={exportarPDF} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
              <FileText size={12} /> PDF
            </button>
            {/* IA */}
            <button onClick={acionarIA} disabled={iaLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,rgba(124,92,252,.25),rgba(244,63,142,.25))', color: '#c084fc', border: '1px solid rgba(139,92,246,.4)' }}>
              <Brain size={13} />{iaLoading ? 'Analisando...' : 'Acionar IA Claude'}
            </button>
          </div>
        </nav>

        <div className="p-5 max-w-5xl mx-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-t-nodri-cyan rounded-full animate-spin" />
            </div>
          ) : !data ? null : (
            <>
              {/*  ALERTA MÉDIA BAIXA  */}
              {data.alertaMedia.ativo && (
                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border animate-pulse"
                  style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.4)' }}>
                  <AlertTriangle size={20} className="text-red-400 shrink-0" />
                  <div>
                    <div className="font-bold text-red-400 text-sm"> Atenção — Nota média abaixo de 7</div>
                    <p className="text-[12px] text-nodri-t2 mt-0.5">
                      A média atual é <strong className="text-red-400">{data.alertaMedia.media}</strong>. Isso indica insatisfação generalizada. Acione a IA para diagnóstico e ações corretivas imediatas.
                    </p>
                  </div>
                </div>
              )}

              {/*  CARDS RESUMO  */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="print-card p-4 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(34,197,94,0.2)' }}>
                  <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Respostas</div>
                  <div className="text-3xl font-black text-green-400">{data.total_respostas}</div>
                </div>
                {data.perguntas.filter(p => p.tipo === 'escala').slice(0, 1).map(p => {
                  const s = data.stats[p.id] as EscalaStat
                  if (!s) return null
                  return (
                    <div key={p.id} className="print-card p-4 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(139,92,246,.2)' }}>
                      <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Nota Média</div>
                      <div className="text-3xl font-black text-purple-400">{s.media}<span className="text-sm text-nodri-t3">/10</span></div>
                      <div className="text-[10px] mt-1" style={{ color: s.media >= 8 ? '#4ade80' : s.media >= 7 ? '#facc15' : '#f87171' }}>
                        {s.media >= 8 ? ' Ótimo' : s.media >= 7 ? ' Bom' : ' Atenção'}
                      </div>
                    </div>
                  )
                })}
                {data.taxaRetorno && (
                  <div className="print-card p-4 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(6,182,212,.2)' }}>
                    <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Taxa de Retorno</div>
                    <div className="text-3xl font-black text-cyan-400">{data.taxaRetorno.percentual}%</div>
                    <div className="text-[10px] text-nodri-t3 mt-1">{data.taxaRetorno.positivo}/{data.taxaRetorno.total} clientes</div>
                  </div>
                )}
                {data.piorServico && (
                  <div className="print-card p-4 rounded-xl border" style={{ background: '#0d1117', borderColor: 'rgba(239,68,68,.25)' }}>
                    <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <AlertTriangle size={9} /> Serviço crítico
                    </div>
                    <div className="text-sm font-bold text-red-300 leading-tight">{data.piorServico.nome}</div>
                    <div className="text-[10px] text-red-400 mt-1">Média: {data.piorServico.media}/5</div>
                  </div>
                )}
              </div>

              {/*  NPS cards (escala)  */}
              {data.perguntas.filter(p => p.tipo === 'escala').map(p => {
                const s = data.stats[p.id] as EscalaStat
                if (!s || s.total === 0) return null
                return (
                  <div key={p.id} className="print-card grid grid-cols-3 gap-3">
                    <NpsGauge nps={s.nps} />
                    <div className="p-4 rounded-xl border col-span-2" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="text-[10px] text-nodri-t3 mb-2 truncate">{p.titulo}</div>
                      <div className="flex gap-3 mb-3">
                        {[{ label: 'Promotores (9-10)', val: s.promotores, cor: '#4ade80' }, { label: 'Neutros (7-8)', val: s.neutros, cor: '#facc15' }, { label: 'Detratores (0-6)', val: s.detratores, cor: '#f87171' }].map(({ label, val, cor }) => (
                          <div key={label} className="flex-1 text-center">
                            <div className="text-xl font-black" style={{ color: cor }}>{val}</div>
                            <div className="text-[9px] text-nodri-t3 leading-tight">{label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-end gap-0.5 h-10">
                        {Array.from({ length: 11 }, (_, i) => i).map(n => {
                          const count = s.dist[n] || 0
                          const maxCount = Math.max(...Object.values(s.dist), 1)
                          const pct = (count / maxCount) * 100
                          const cor = n <= 6 ? '#f87171' : n <= 8 ? '#facc15' : '#4ade80'
                          return (
                            <div key={n} className="flex-1 flex flex-col items-center gap-0.5">
                              <div className="w-full rounded-t" style={{ height: `${Math.max(pct, 3)}%`, background: cor, opacity: count > 0 ? 1 : 0.15 }} />
                              <span className="text-[8px] text-nodri-t3">{n}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/*  TENDÊNCIA SEMANAL  */}
              {data.tendenciaSemanal.length >= 2 && (
                <div className="print-card rounded-2xl border p-5" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={14} className="text-nodri-cyan" />
                    <span className="text-[13px] font-semibold text-nodri-t1">Tendência Semanal — Nota Média</span>
                    {(() => {
                      const arr = data.tendenciaSemanal
                      const diff = arr[arr.length - 1].media - arr[0].media
                      const cor = diff > 0 ? '#4ade80' : diff < 0 ? '#f87171' : '#facc15'
                      const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
                      return (
                        <span className="ml-auto text-[11px] flex items-center gap-1 font-bold" style={{ color: cor }}>
                          <Icon size={11} /> {diff > 0 ? '+' : ''}{diff.toFixed(1)} vs início
                        </span>
                      )
                    })()}
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {data.tendenciaSemanal.map((item, i) => {
                      const maxMedia = Math.max(...data.tendenciaSemanal.map(t => t.media), 10)
                      const pct = (item.media / maxMedia) * 100
                      const cor = item.media >= 8 ? '#4ade80' : item.media >= 7 ? '#facc15' : '#f87171'
                      const prev = i > 0 ? data.tendenciaSemanal[i - 1].media : item.media
                      const trend = item.media > prev ? '↑' : item.media < prev ? '↓' : '→'
                      return (
                        <div key={item.semana} className="flex-1 flex flex-col items-center gap-1 group">
                          <div className="text-[9px] text-nodri-t3 opacity-0 group-hover:opacity-100 transition-opacity font-bold" style={{ color: cor }}>
                            {item.media}
                          </div>
                          <div className="w-full rounded-t transition-all duration-500 relative" title={`${item.semana}: ${item.media}`}
                            style={{ height: `${Math.max(pct, 8)}%`, background: cor, opacity: 0.85 }}>
                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px]" style={{ color: cor }}>{trend}</span>
                          </div>
                          <span className="text-[8px] text-nodri-t3 truncate w-full text-center">{item.semana.split('-W')[1] ? `S${item.semana.split('-W')[1]}` : item.semana}</span>
                          <span className="text-[8px] text-nodri-t3">{item.total}x</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-[9px] text-nodri-t3 mt-1">
                    <span>← Mais antigo</span><span>Mais recente →</span>
                  </div>
                </div>
              )}

              {/*  SEGMENTAÇÃO NOVO X RECORRENTE  */}
              {data.segmentacao && (data.segmentacao.novos.count > 0 || data.segmentacao.recorrentes.count > 0) && (
                <div className="print-card rounded-2xl border p-5" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={14} className="text-nodri-purple" />
                    <span className="text-[13px] font-semibold text-nodri-t1">Segmentação — Novos vs Recorrentes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: ' Clientes Novos', data: data.segmentacao.novos, cor: '#a78bfa' },
                      { label: ' Clientes Recorrentes', data: data.segmentacao.recorrentes, cor: '#34d399' },
                    ].map(({ label, data: seg, cor }) => (
                      <div key={label} className="p-4 rounded-xl border text-center" style={{ borderColor: `${cor}30`, background: `${cor}08` }}>
                        <div className="text-[11px] font-semibold mb-2" style={{ color: cor }}>{label}</div>
                        <div className="text-4xl font-black mb-1" style={{ color: cor }}>{seg.media > 0 ? seg.media : '—'}</div>
                        <div className="text-[10px] text-nodri-t3">{seg.count} resposta{seg.count !== 1 ? 's' : ''} · média /10</div>
                        {seg.count > 0 && seg.media > 0 && (
                          <div className="mt-2 text-[10px] font-semibold" style={{ color: seg.media >= 8 ? '#4ade80' : seg.media >= 7 ? '#facc15' : '#f87171' }}>
                            {seg.media >= 8 ? ' Satisfeitos' : seg.media >= 7 ? ' Razoável' : ' Atenção urgente'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {data.segmentacao.novos.count > 0 && data.segmentacao.recorrentes.count > 0 && (
                    <div className="mt-3 p-3 rounded-xl text-[11px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                      {data.segmentacao.novos.media > data.segmentacao.recorrentes.media
                        ? <span className="text-nodri-t2"> Clientes novos avaliam melhor que recorrentes — atenção à experiência de longo prazo e fidelização.</span>
                        : data.segmentacao.recorrentes.media > data.segmentacao.novos.media
                          ? <span className="text-nodri-t2"> Clientes recorrentes avaliam melhor — ótimo sinal de fidelização. Foque em converter novos em fiéis.</span>
                          : <span className="text-nodri-t2"> Avaliações semelhantes entre novos e recorrentes — consistência no atendimento.</span>}
                    </div>
                  )}
                </div>
              )}

              {/*  IA ANÁLISE  */}
              {showIa && (
                <div className="print-card rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(139,92,246,.3)', background: '#0a0714' }}>
                  <div className="px-5 py-3 border-b flex items-center gap-2 no-print" style={{ borderColor: 'rgba(139,92,246,.2)', background: 'rgba(139,92,246,.1)' }}>
                    <Brain size={16} className="text-purple-400" />
                    <span className="font-syne font-bold text-sm text-purple-300">Análise Estratégica — IA Claude</span>
                    <button onClick={() => setShowIa(false)} className="ml-auto text-nodri-t3 hover:text-nodri-t1 no-print"></button>
                  </div>
                  {iaLoading && (
                    <div className="p-8 text-center">
                      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-nodri-t2 text-sm">Analisando {data.total_respostas} respostas...</p>
                    </div>
                  )}
                  {iaErro && <div className="p-5 flex items-center gap-2 text-red-400 text-sm"><AlertTriangle size={16} /> {iaErro}</div>}
                  {iaAnalise && !iaLoading && (
                    <div className="p-5 space-y-5">
                      {/* RESUMO EXECUTIVO */}
                      <div className="flex gap-4">
                        <div className="flex-1 p-4 rounded-xl" style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)' }}>
                          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2"> Resumo Executivo</div>
                          {typeof iaAnalise.resumo_executivo === 'string' ? (
                            <p className="text-nodri-t1 text-sm leading-relaxed">{iaAnalise.resumo_executivo}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,.04)' }}>
                                  <div className="text-[9px] text-nodri-t3 uppercase mb-0.5">Situação Atual</div>
                                  <p className="text-[11px] text-nodri-t1">{iaAnalise.resumo_executivo.situacao_atual}</p>
                                </div>
                                <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,.04)' }}>
                                  <div className="text-[9px] text-nodri-t3 uppercase mb-0.5">Resultado</div>
                                  <p className="text-[11px] text-nodri-t1">{iaAnalise.resumo_executivo.resultado_encontrado}</p>
                                </div>
                                <div className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,.06)' }}>
                                  <div className="text-[9px] text-red-400 uppercase mb-0.5">Principal Gargalo</div>
                                  <p className="text-[11px] text-nodri-t1">{iaAnalise.resumo_executivo.principal_problema}</p>
                                </div>
                                <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,.06)' }}>
                                  <div className="text-[9px] text-green-400 uppercase mb-0.5">Principal Oportunidade</div>
                                  <p className="text-[11px] text-nodri-t1">{iaAnalise.resumo_executivo.principal_oportunidade}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          {iaAnalise.insight_nps && <p className="text-nodri-t2 text-[11px] mt-2 pt-2 border-t border-nodri-border"> {iaAnalise.insight_nps}</p>}
                        </div>
                        <div className="flex flex-col items-center p-4 rounded-xl shrink-0" style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', minWidth: '100px' }}>
                          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Saúde</div>
                          <div className="text-5xl font-black text-purple-300">{iaAnalise.nota_geral}</div>
                          <div className="text-[10px] text-nodri-t3">/10</div>
                          {iaAnalise.diagnostico && (
                            <div className="mt-2 text-[10px] text-center" style={{ color: iaAnalise.diagnostico.tendencia === 'crescendo' ? '#4ade80' : iaAnalise.diagnostico.tendencia === 'caindo' ? '#f87171' : '#facc15' }}>
                              {iaAnalise.diagnostico.tendencia === 'crescendo' ? '↑' : iaAnalise.diagnostico.tendencia === 'caindo' ? '↓' : '→'} {iaAnalise.diagnostico.tendencia}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* INSIGHT EXCLUSIVO */}
                      {iaAnalise.insight_exclusivo && (
                        <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg,rgba(124,92,252,.12),rgba(244,63,142,.12))', border: '1px solid rgba(139,92,246,.35)' }}>
                          <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5"> Insight Exclusivo da IA</div>
                          <p className="text-nodri-t1 text-[12px] leading-relaxed font-medium">{iaAnalise.insight_exclusivo}</p>
                        </div>
                      )}

                      {/* GARGALOS */}
                      {iaAnalise.gargalos && iaAnalise.gargalos.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-red-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={13} />  Gargalos Identificados</div>
                          <div className="space-y-2">
                            {iaAnalise.gargalos.map((g, i) => (
                              <div key={i} className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)' }}>
                                <span className="text-base shrink-0">{g.emoji || ''}</span>
                                <div>
                                  <div className="text-[11px] font-semibold text-red-300 mb-0.5">{g.titulo}</div>
                                  <p className="text-[11px] text-nodri-t2">{g.descricao}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* OPORTUNIDADES ESCONDIDAS */}
                      {iaAnalise.oportunidades_escondidas && iaAnalise.oportunidades_escondidas.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-green-400 mb-2 flex items-center gap-1.5"><TrendingUp size={13} />  Oportunidades Escondidas</div>
                          <div className="space-y-2">
                            {iaAnalise.oportunidades_escondidas.map((o, i) => (
                              <div key={i} className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)' }}>
                                <span className="text-base shrink-0">{o.emoji || ''}</span>
                                <div>
                                  <div className="text-[11px] font-semibold text-green-300 mb-0.5">{o.titulo}</div>
                                  <p className="text-[11px] text-nodri-t2">{o.descricao}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ANÁLISE FINANCEIRA */}
                      {iaAnalise.analise_financeira && (
                        <div>
                          <div className="text-[11px] font-bold text-yellow-400 mb-2 flex items-center gap-1.5"><BarChart2 size={13} />  Análise Financeira</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(250,204,21,.06)', border: '1px solid rgba(250,204,21,.2)' }}>
                              <div className="text-[9px] text-yellow-400 uppercase mb-1">Ticket Médio</div>
                              <div className="text-[13px] font-bold text-nodri-t1">{iaAnalise.analise_financeira.ticket_medio_estimado}</div>
                            </div>
                            <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)' }}>
                              <div className="text-[9px] text-red-400 uppercase mb-1">Receita em Risco</div>
                              <div className="text-[13px] font-bold text-nodri-t1">{iaAnalise.analise_financeira.receita_em_risco}</div>
                            </div>
                            <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)' }}>
                              <div className="text-[9px] text-green-400 uppercase mb-1">Receita Potencial</div>
                              <div className="text-[13px] font-bold text-nodri-t1">{iaAnalise.analise_financeira.receita_potencial}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ANÁLISE DE CLIENTES */}
                      {iaAnalise.analise_clientes && (
                        <div>
                          <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5"><Users size={13} />  Análise de Clientes</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(6,182,212,.05)', border: '1px solid rgba(6,182,212,.15)' }}>
                              <div className="text-[9px] text-cyan-400 uppercase mb-1">Perfil Dominante</div>
                              <p className="text-[11px] text-nodri-t2">{iaAnalise.analise_clientes.perfil_dominante}</p>
                            </div>
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)' }}>
                              <div className="text-[9px] text-red-400 uppercase mb-1">Em Risco</div>
                              <p className="text-[11px] text-nodri-t2">{iaAnalise.analise_clientes.clientes_em_risco}</p>
                            </div>
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)' }}>
                              <div className="text-[9px] text-green-400 uppercase mb-1">Potencial Reativação</div>
                              <p className="text-[11px] text-nodri-t2">{iaAnalise.analise_clientes.potencial_reativacao}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ANÁLISE DE SERVIÇOS */}
                      {iaAnalise.analise_servicos && (
                        <div>
                          <div className="text-[11px] font-bold text-purple-400 mb-2 flex items-center gap-1.5"><Zap size={13} />  Análise dos Serviços</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)' }}>
                              <div className="text-[9px] text-green-400 uppercase mb-1">Mais Elogiados</div>
                              <ul className="space-y-0.5">{iaAnalise.analise_servicos.mais_elogiados.map((s, i) => <li key={i} className="text-[11px] text-nodri-t2"> {s}</li>)}</ul>
                            </div>
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)' }}>
                              <div className="text-[9px] text-red-400 uppercase mb-1">Mais Criticados</div>
                              <ul className="space-y-0.5">{iaAnalise.analise_servicos.mais_criticados.map((s, i) => <li key={i} className="text-[11px] text-nodri-t2"> {s}</li>)}</ul>
                            </div>
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(250,204,21,.05)', border: '1px solid rgba(250,204,21,.15)' }}>
                              <div className="text-[9px] text-yellow-400 uppercase mb-1">Upsell</div>
                              <p className="text-[11px] text-nodri-t2">{iaAnalise.analise_servicos.oportunidade_upsell}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ANÁLISE DE AGENDA */}
                      {iaAnalise.analise_agenda && (
                        <div>
                          <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5"><Clock size={13} />  Análise da Agenda</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)' }}>
                              <div className="text-[9px] text-green-400 uppercase mb-1">Horários de Pico</div>
                              <p className="text-[11px] text-nodri-t2">{iaAnalise.analise_agenda.horarios_pico}</p>
                            </div>
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)' }}>
                              <div className="text-[9px] text-red-400 uppercase mb-1">Horários com Problema</div>
                              <p className="text-[11px] text-nodri-t2">{iaAnalise.analise_agenda.horarios_problema}</p>
                            </div>
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(6,182,212,.05)', border: '1px solid rgba(6,182,212,.15)' }}>
                              <div className="text-[9px] text-cyan-400 uppercase mb-1">Recomendação</div>
                              <p className="text-[11px] text-nodri-t2">{iaAnalise.analise_agenda.recomendacao_operacional}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* INSIGHTS ESTRATÉGICOS */}
                      {(iaAnalise.insight_retencao || iaAnalise.insight_ticket || iaAnalise.insight_horario) && (
                        <div>
                          <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5"><BarChart2 size={13} /> Insights Estratégicos</div>
                          <div className="grid sm:grid-cols-3 gap-2">
                            {iaAnalise.insight_retencao && (
                              <div className="p-3 rounded-xl" style={{ background: 'rgba(6,182,212,.05)', border: '1px solid rgba(6,182,212,.15)' }}>
                                <div className="text-[10px] font-bold text-cyan-400 mb-1"> Retenção</div>
                                <p className="text-[11px] text-nodri-t2 leading-relaxed">{iaAnalise.insight_retencao}</p>
                              </div>
                            )}
                            {iaAnalise.insight_ticket && (
                              <div className="p-3 rounded-xl" style={{ background: 'rgba(250,204,21,.05)', border: '1px solid rgba(250,204,21,.15)' }}>
                                <div className="text-[10px] font-bold text-yellow-400 mb-1"> Ticket Médio</div>
                                <p className="text-[11px] text-nodri-t2 leading-relaxed">{iaAnalise.insight_ticket}</p>
                              </div>
                            )}
                            {iaAnalise.insight_horario && (
                              <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)' }}>
                                <div className="text-[10px] font-bold text-green-400 mb-1"> Horários</div>
                                <p className="text-[11px] text-nodri-t2 leading-relaxed">{iaAnalise.insight_horario}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* PONTOS FORTES */}
                      {iaAnalise.pontos_fortes?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-green-400 mb-2 flex items-center gap-1.5"><CheckCircle size={13} /> Pontos Fortes</div>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {iaAnalise.pontos_fortes.map((p, i) => (
                              <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)' }}>
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
                          <div className="text-[11px] font-bold text-yellow-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={13} /> Áreas de Melhoria</div>
                          <div className="space-y-2">
                            {iaAnalise.areas_melhoria.map((a, i) => (
                              <div key={i} className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(250,204,21,.05)', border: '1px solid rgba(250,204,21,.15)' }}>
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

                      {/* PLANO DE AÇÃO */}
                      {iaAnalise.plano_acao && (
                        <div>
                          <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5"><Zap size={13} />  Plano de Ação</div>
                          <div className="grid sm:grid-cols-3 gap-3">
                            {[
                              { label: ' Próximos 7 dias', items: iaAnalise.plano_acao.proximos_7_dias, cor: '#f97316' },
                              { label: ' Próximos 30 dias', items: iaAnalise.plano_acao.proximos_30_dias, cor: '#facc15' },
                              { label: ' Próximos 90 dias', items: iaAnalise.plano_acao.proximos_90_dias, cor: '#a78bfa' },
                            ].map(({ label, items, cor }) => (
                              <div key={label} className="p-3 rounded-xl" style={{ background: `${cor}08`, border: `1px solid ${cor}25` }}>
                                <div className="text-[10px] font-bold uppercase mb-2" style={{ color: cor }}>{label}</div>
                                <div className="space-y-2">
                                  {items?.map((item, i) => (
                                    <div key={i} className="text-[11px]">
                                      <div className="text-nodri-t1 font-medium">{item.acao}</div>
                                      <div className="text-nodri-t3 text-[10px]">{item.impacto}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AÇÕES PRIORITÁRIAS */}
                      {iaAnalise.acoes_prioritarias?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5"><Zap size={13} /> Ações Prioritárias</div>
                          <div className="space-y-2">
                            {iaAnalise.acoes_prioritarias.map((a, i) => (
                              <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(6,182,212,.05)', border: '1px solid rgba(6,182,212,.15)' }}>
                                <div className="flex items-start gap-2 mb-1">
                                  <span className="text-sm">{PRAZO_ICON[a.prazo] || ''}</span>
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

                      {/* PREVISÃO */}
                      {iaAnalise.previsao && (
                        <div>
                          <div className="text-[11px] font-bold text-purple-400 mb-2 flex items-center gap-1.5"><TrendingUp size={13} />  Previsão Inteligente</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              { label: 'Conservador', data: iaAnalise.previsao.cenario_conservador, cor: '#f87171' },
                              { label: 'Realista', data: iaAnalise.previsao.cenario_realista, cor: '#facc15' },
                              { label: 'Otimista', data: iaAnalise.previsao.cenario_otimista, cor: '#4ade80' },
                            ].map(({ label, data: c, cor }) => (
                              <div key={label} className="p-3 rounded-xl text-center" style={{ background: `${cor}08`, border: `1px solid ${cor}25` }}>
                                <div className="text-[9px] font-bold uppercase mb-1" style={{ color: cor }}>{label}</div>
                                <div className="text-[11px] text-nodri-t1 mb-1">{c.descricao}</div>
                                <div className="text-[10px] font-bold" style={{ color: cor }}>{c.probabilidade_pct}% probabilidade</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* OPORTUNIDADES DE RECEITA */}
                      {iaAnalise.oportunidades_receita?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-orange-400 mb-2 flex items-center gap-1.5"><TrendingUp size={13} /> Oportunidades de Receita</div>
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

              {/*  RESULTADOS POR PERGUNTA  */}
              <div className="space-y-4">
                {data.perguntas.map((pergunta, idx) => {
                  const stat = data.stats[pergunta.id]
                  if (!stat) return null
                  return (
                    <div key={pergunta.id} className="print-card rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                        <span className="text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold text-nodri-t3" style={{ background: 'rgba(255,255,255,.06)' }}>{idx + 1}</span>
                        <span className="text-[13px] font-medium text-nodri-t1 flex-1">{pergunta.titulo}</span>
                        <span className="ml-auto text-[10px] text-nodri-t3">{(stat as { total: number }).total} resp.</span>
                      </div>
                      <div className="p-5">
                        {pergunta.tipo === 'escala' && null /* já mostrado acima */}

                        {pergunta.tipo === 'multipla_escolha' && (() => {
                          const s = stat as MultiplaEscolhaStat
                          const max = Math.max(...Object.values(s.contagem), 1)
                          return (
                            <div className="space-y-2">
                              {Object.entries(s.contagem).sort((a, b) => b[1] - a[1]).map(([opcao, count]) => (
                                <div key={opcao}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[12px] text-nodri-t1">{opcao}</span>
                                    <span className="text-[11px] font-bold text-nodri-cyan">{count} ({s.total > 0 ? Math.round(count / s.total * 100) : 0}%)</span>
                                  </div>
                                  <BarraH valor={count} max={max} cor="#7c5cfc" />
                                </div>
                              ))}
                            </div>
                          )
                        })()}

                        {pergunta.tipo === 'texto' && (() => {
                          const s = stat as TextoStat
                          return (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {s.respostas.length === 0
                                ? <p className="text-nodri-t3 text-sm">Nenhuma resposta</p>
                                : s.respostas.map((r, i) => (
                                  <div key={i} className="p-3 rounded-xl text-[12px] text-nodri-t1 italic" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                                    "{r}"
                                  </div>
                                ))}
                            </div>
                          )
                        })()}

                        {pergunta.tipo === 'sim_nao' && (() => {
                          const s = stat as SimNaoStat
                          return (
                            <div className="space-y-2">
                              {Object.entries(s.contagem).map(([item, c]) => {
                                const total = c.sim + c.nao
                                const pctSim = total > 0 ? Math.round((c.sim / total) * 100) : 0
                                return (
                                  <div key={item} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[12px] text-nodri-t1">{item}</span>
                                      <span className="text-[11px] font-bold" style={{ color: pctSim >= 70 ? '#4ade80' : pctSim >= 50 ? '#facc15' : '#f87171' }}>{pctSim}% Sim</span>
                                    </div>
                                    <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                                      <div style={{ width: `${pctSim}%`, background: '#4ade80' }} />
                                      <div style={{ flex: 1, background: '#f87171' }} />
                                    </div>
                                    <div className="flex justify-between text-[9px] text-nodri-t3 mt-1">
                                      <span>{c.sim} sim</span><span>{c.nao} não</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}

                        {pergunta.tipo === 'grid' && (() => {
                          const s = stat as GridStat
                          const itens = Object.entries(s.contagem).filter(([, c]) => c.count > 0).sort((a, b) => b[1].media - a[1].media)
                          return (
                            <div className="space-y-2">
                              {itens.map(([item, c]) => {
                                const cor = c.media >= 4 ? '#4ade80' : c.media >= 3 ? '#facc15' : '#f87171'
                                const isPior = data.piorServico?.nome === item
                                return (
                                  <div key={item} className={isPior ? 'rounded-lg p-1' : ''} style={isPior ? { background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)' } : {}}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[12px] text-nodri-t1 flex items-center gap-1.5">
                                        {isPior && <AlertTriangle size={11} className="text-red-400 shrink-0" />}
                                        {item}
                                        {isPior && <span className="text-[9px] text-red-400 font-bold">CRÍTICO</span>}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-nodri-t3">{c.count} aval.</span>
                                        <span className="text-[12px] font-bold" style={{ color: cor }}>{c.media}/5</span>
                                      </div>
                                    </div>
                                    <BarraH valor={c.media * 20} max={100} cor={cor} />
                                  </div>
                                )
                              })}
                              {itens.length === 0 && <p className="text-nodri-t3 text-sm">Nenhuma avaliação ainda</p>}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/*  COMENTÁRIOS  */}
              {data.comentarios.length > 0 && (
                <div className="print-card rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                  <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                    <span className="text-lg"></span>
                    <span className="text-[13px] font-medium text-nodri-t1">Comentários dos Clientes</span>
                    <span className="ml-auto text-[10px] text-nodri-t3">{data.comentarios.length} comentário{data.comentarios.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
                    {data.comentarios.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl text-[12px] text-nodri-t1 italic leading-relaxed"
                        style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)', borderLeft: '3px solid rgba(139,92,246,.5)' }}>
                        "{c}"
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GERENCIAR RESPOSTAS */}
              {data.respostas_recentes?.length > 0 && (
                <div className="print-card rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
                  <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                    <Trash2 size={14} className="text-red-400" />
                    <span className="text-[13px] font-medium text-nodri-t1">Gerenciar Respostas</span>
                    <span className="ml-auto text-[10px] text-nodri-t3">{data.respostas_recentes.length} resposta{data.respostas_recentes.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                    {data.respostas_recentes.map((r, i) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-nodri-t3 w-5">#{data.respostas_recentes.length - i}</span>
                          <span className="text-[12px] text-nodri-t2">
                            {new Date(r.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('Excluir esta resposta? Esta ação não pode ser desfeita.')) return
                            const res = await fetch(`/api/feedback/respostas/${r.id}`, { method: 'DELETE' })
                            if (res.ok) {
                              toast.success('Resposta excluída')
                              fetchResultados()
                            } else {
                              toast.error('Erro ao excluir')
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                          <Trash2 size={11} /> Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.total_respostas === 0 && (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4"></div>
                  <h3 className="text-nodri-t1 font-semibold text-lg mb-2">Nenhuma resposta ainda</h3>
                  <p className="text-nodri-t2 text-sm">Compartilhe o link com seus clientes para começar a coletar avaliações.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
