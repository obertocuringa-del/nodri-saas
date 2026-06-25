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
interface PlacardMes { mes: string; profissionais: { nome: string; positivo: number; negativo: number; total: number; score: number; top_problema: string; ocorrencias: { desc: string; qtd: number }[] }[] }
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
  { id: 'tendencias',    label: 'Tendências',    icon: Activity },
  { id: 'ia',            label: 'IA Claude',     icon: Brain },
] as const

export default function ResultadosProfPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [inicio, setInicio] = useState(() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-01` })
  const [fim, setFim] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth()+1, 0).toISOString().slice(0,10) })
  const [filtroProfissional, setFiltroProfissional] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [ia, setIa] = useState<IAAnalise | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [iaErro, setIaErro] = useState('')
  const [profEvol, setProfEvol] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState(0)
  const [abaAtiva, setAbaAtiva] = useState<Aba>('profissionais')
  const [historicoBloqueios, setHistoricoBloqueios] = useState<{
    ano: number
    profissionais: {
      nome: string; total: number; ultimo: string | null
      meses: Record<string, number>
      registros: { bloqueado_em: string; bloqueado_ate: string; motivo: string; dias_bloqueio: number; desbloqueado_em: string | null; tipo_desbloqueio: string | null }[]
    }[]
  } | null>(null)
  const [expandidoHistorico, setExpandidoHistorico] = useState<string | null>(null)

  // Datas exclusivas do Placar Mensal (mês atual + mês anterior por padrão)
  const [placardInicio, setPlacardInicio] = useState(() => {
    const h = new Date()
    h.setMonth(h.getMonth() - 1)
    return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-01`
  })
  const [placardFim, setPlacardFim] = useState(() => {
    const h = new Date()
    return new Date(h.getFullYear(), h.getMonth()+1, 0).toISOString().slice(0,10)
  })
  const [placardData, setPlacardData] = useState<Data | null>(null)

  const fetchPlacard = useCallback(async () => {
    const qs = new URLSearchParams()
    qs.set('inicio', placardInicio)
    qs.set('fim', placardFim)
    const res = await fetch(`/api/feedback-prof/resultados/${id}?${qs}`)
    if (res.ok) setPlacardData(await res.json())
  }, [id, placardInicio, placardFim])

  // Valores "aplicados" — só mudam ao clicar Aplicar
  const [inicioAplicado, setInicioAplicado] = useState(inicio)
  const [fimAplicado, setFimAplicado] = useState(fim)
  const [filtroProfAplicado, setFiltroProfAplicado] = useState(filtroProfissional)
  const [filtroTipoAplicado, setFiltroTipoAplicado] = useState(filtroTipo)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (inicioAplicado) qs.set('inicio', inicioAplicado)
    if (fimAplicado) qs.set('fim', fimAplicado)
    if (filtroProfAplicado) qs.set('profissional', filtroProfAplicado)
    if (filtroTipoAplicado) qs.set('tipo', filtroTipoAplicado)
    const res = await fetch(`/api/feedback-prof/resultados/${id}?${qs}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
      if (!profEvol && d.nomeProfissionais?.length) setProfEvol(d.nomeProfissionais[0])
    } else toast.error('Erro ao carregar')
    setLoading(false)
  }, [id, inicioAplicado, fimAplicado, filtroProfAplicado, filtroTipoAplicado])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchPlacard() }, [fetchPlacard])

  useEffect(() => {
    fetch('/api/feedback-prof/bloqueios/historico')
      .then(r => r.json())
      .then(d => { if (d?.profissionais) setHistoricoBloqueios(d) })
      .catch(() => {})
  }, [])

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
      ...data.reincidencia.map(r => [r.profissional, r.ocorrencia, String(r.count), new Date(r.ultima_vez).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), String(r.dias_desde)]),
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

  const PRAZO_ICON: Record<string, string> = { imediato: '', 'esta semana': '', 'este mês': '' }
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
            <button onClick={exportarCSV} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(34,197,94,.1)', color: '#15803d', border: '1px solid rgba(34,197,94,.25)' }}>
              <Download size={12} /> Excel
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(239,68,68,.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,.25)' }}>
              <FileText size={12} /> PDF
            </button>
            <button onClick={acionarIA} disabled={iaLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,rgba(124,92,252,.25),rgba(244,63,142,.25))', color: '#5b4fcf', border: '1px solid rgba(139,92,246,.4)' }}>
              <Brain size={13} />{iaLoading ? 'Analisando...' : 'Acionar IA Claude'}
            </button>
          </div>
        </nav>

        <div className="p-4 max-w-5xl mx-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-t-nodri-cyan rounded-full animate-spin" /></div>
          ) : !data ? null : (
            <>
              {/*  RESUMO EXECUTIVO  */}
              <div className="space-y-3">
                {data.alertaDesempenho && data.profCritico && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: 'rgba(239,68,68,.08)', borderColor: 'rgba(239,68,68,.4)' }}>
                    <AlertTriangle size={18} className="text-red-400 shrink-0" />
                    <div>
                      <div className="font-bold text-red-400 text-sm"> Ação imediata necessária</div>
                      <p className="text-[12px] text-nodri-t2 mt-0.5">
                        <strong className="text-red-400">{data.profCritico.nome}</strong> — score {data.profCritico.score}% · {data.profCritico.negativo} negativos de {data.profCritico.total} registros
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total', val: data.total, cor: '#767069' },
                    { label: 'Positivos', val: data.totalPositivo, cor: '#4ade80' },
                    { label: 'Negativos', val: data.totalNegativo, cor: '#f87171' },
                    { label: '% Positivo', val: data.total > 0 ? Math.round(data.totalPositivo / data.total * 100) + '%' : '—', cor: data.total > 0 && data.totalPositivo / data.total >= 0.6 ? '#4ade80' : '#f87171' },
                  ].map(({ label, val, cor }) => (
                    <div key={label} className="pcard p-4 rounded-xl border text-center" style={{ background: '#ffffff', borderColor: `${cor}30` }}>
                      <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">{label}</div>
                      <div className="text-2xl font-black" style={{ color: cor }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border" style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,.07)' }}>
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
                    <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="bg-nodri-card text-[11px] text-nodri-t1 outline-none cursor-pointer border-0 rounded" style={{ colorScheme: 'dark' }} />
                    <span className="text-[10px] text-nodri-t3">→</span>
                    <input type="date" value={fim} onChange={e => setFim(e.target.value)} className="bg-nodri-card text-[11px] text-nodri-t1 outline-none cursor-pointer border-0 rounded" style={{ colorScheme: 'dark' }} />
                  </div>
                  <button onClick={() => { setInicioAplicado(inicio); setFimAplicado(fim); setFiltroProfAplicado(filtroProfissional); setFiltroTipoAplicado(filtroTipo) }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(34,211,238,.1)', color: '#0891b2', border: '1px solid rgba(34,211,238,.25)' }}>
                    <RefreshCw size={11} /> Aplicar
                  </button>
                </div>
              </div>

              {/*  ABAS  */}
              <div className="flex gap-1 border-b border-nodri-border overflow-x-auto no-print">
                {ABAS.map(({ id: aid, label, icon: Icon }) => (
                  <button key={aid} onClick={() => setAbaAtiva(aid as Aba)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold whitespace-nowrap transition-all border-b-2 -mb-px"
                    style={abaAtiva === aid
                      ? { color: '#0891b2', borderColor: '#22d3ee' }
                      : { color: '#767069', borderColor: 'transparent' }}>
                    <Icon size={13} />{label}
                    {aid === 'ia' && ia && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ml-0.5" />}
                  </button>
                ))}
              </div>

              {/*  ABA: PROFISSIONAIS  */}
              {abaAtiva === 'profissionais' && (
                <div className="space-y-4">
                  {/* Placar Mensal — Ocorrências por Profissional */}
                  {(() => {
                    const placardSource = placardData ?? data
                    if (!placardSource.placardMensal.length) return null
                    // Gera lista ordenada de meses com dados (Jan→Dez)
                    const mesesComDados = new Set(placardSource.placardMensal.map(p => p.mes))
                    const todosOsMeses: string[] = []
                    const anosPresentes = Array.from(new Set(placardSource.placardMensal.map(p => p.mes.split('-')[0]))).sort()
                    for (const ano of anosPresentes) {
                      for (let m = 1; m <= 12; m++) {
                        const key = `${ano}-${String(m).padStart(2, '0')}`
                        if (mesesComDados.has(key)) todosOsMeses.push(key)
                      }
                    }

                    // Mês selecionado e anterior (se Janeiro → Dezembro do ano anterior)
                    const mesAtualKey = todosOsMeses[mesSelecionado] ?? todosOsMeses[todosOsMeses.length - 1]
                    const idxAtual = todosOsMeses.indexOf(mesAtualKey)
                    let mesAnteriorKey: string | null = null
                    if (idxAtual > 0) {
                      mesAnteriorKey = todosOsMeses[idxAtual - 1]
                    } else {
                      // Janeiro → busca Dezembro do ano anterior
                      const [anoAtual, mesN] = mesAtualKey.split('-').map(Number)
                      if (mesN === 1) {
                        const dezAnterior = `${anoAtual - 1}-12`
                        if (mesesComDados.has(dezAnterior)) mesAnteriorKey = dezAnterior
                      }
                    }

                    const mesAtualData = placardSource.placardMensal.find(p => p.mes === mesAtualKey)
                    const mesAnteriorData = mesAnteriorKey ? placardSource.placardMensal.find(p => p.mes === mesAnteriorKey) : null

                    // Monta mapa de ocorrências por profissional do mes anterior (para comparativo)
                    // Precisamos de detalhes de ocorrências — usamos data.respostas_recentes não é suficiente
                    // Usamos o top_problema e negativos do placard como proxy

                    return (
                    <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="px-5 py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                        <span className="text-sm"></span>
                        <span className="text-[13px] font-semibold text-nodri-t1">Placar Mensal</span>
                        {mesAnteriorKey && <span className="text-[10px] text-nodri-t3 ml-1">— vs {formatMes(mesAnteriorKey)}</span>}
                        <div className="ml-auto flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 px-2 py-1 bg-nodri-card border border-nodri-border rounded-lg">
                            <Calendar size={10} className="text-nodri-t3" />
                            <input type="date" value={placardInicio} onChange={e => setPlacardInicio(e.target.value)}
                              className="bg-nodri-card text-[10px] text-nodri-t1 outline-none cursor-pointer border-0 rounded" style={{ colorScheme: 'dark' }} />
                            <span className="text-nodri-t3 text-[9px]">→</span>
                            <input type="date" value={placardFim} onChange={e => setPlacardFim(e.target.value)}
                              className="bg-nodri-card text-[10px] text-nodri-t1 outline-none cursor-pointer border-0 rounded" style={{ colorScheme: 'dark' }} />
                            <button onClick={fetchPlacard} className="text-nodri-t3 hover:text-nodri-cyan transition-colors ml-1"><RefreshCw size={10} /></button>
                          </div>
                        </div>
                        <div className="w-full flex gap-1 flex-wrap mt-1">
                          {todosOsMeses.map((mes, i) => (
                            <button key={mes} onClick={() => setMesSelecionado(i)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${mesAtualKey === mes ? 'bg-nodri-cyan/15 text-nodri-cyan border border-nodri-cyan/30' : 'text-nodri-t3 hover:text-nodri-t1 border border-nodri-border'}`}>
                              {formatMes(mes)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {mesAtualData && (() => {
                        // Junta todos os profissionais dos dois meses
                        const todosNomes = Array.from(new Set([
                          ...mesAtualData.profissionais.map(p => p.nome),
                          ...(mesAnteriorData?.profissionais.map(p => p.nome) || [])
                        ])).sort()

                        return (
                        <div className="p-4 space-y-3">
                          {/* Cabeçalho das colunas */}
                          <div className="grid grid-cols-[88px_1fr_1fr] sm:grid-cols-[160px_1fr_1fr] gap-3 px-2">
                            <div />
                            <div className="text-center text-[10px] font-bold text-nodri-t3 uppercase tracking-wider pb-1 border-b border-nodri-border">
                              {mesAnteriorKey ? formatMes(mesAnteriorKey) : '—'}
                            </div>
                            <div className="text-center text-[10px] font-bold text-nodri-cyan uppercase tracking-wider pb-1 border-b border-nodri-cyan/30">
                              {formatMes(mesAtualKey)} ← atual
                            </div>
                          </div>

                          {todosNomes.map(nome => {
                            const atual = mesAtualData.profissionais.find(p => p.nome === nome)
                            const ant = mesAnteriorData?.profissionais.find(p => p.nome === nome)

                            // Une todas as ocorrências dos dois meses
                            const todasOcorrs = Array.from(new Set([
                              ...(atual?.ocorrencias?.map(o => o.desc) || []),
                              ...(ant?.ocorrencias?.map(o => o.desc) || [])
                            ])).sort()

                            const deltaNeg = atual && ant ? atual.negativo - ant.negativo : null
                            const corDelta = deltaNeg == null ? '#767069' : deltaNeg > 0 ? '#f87171' : deltaNeg < 0 ? '#4ade80' : '#767069'
                            const aberto = expandidoHistorico === `placar-${nome}`

                            return (
                              <div key={nome} className="rounded-xl overflow-hidden"
                                style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
                                {/* Cabeçalho do profissional */}
                                <button className="w-full grid grid-cols-[88px_1fr_1fr] sm:grid-cols-[160px_1fr_1fr] gap-3 px-3 py-2.5 text-left items-center"
                                  onClick={() => setExpandidoHistorico(aberto ? null : `placar-${nome}`)}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0"
                                      style={{ background: 'rgba(255,255,255,.08)', color: '#767069' }}>
                                      {nome.charAt(0)}
                                    </div>
                                    <span className="font-bold text-[12px] text-nodri-t1 truncate">{nome}</span>
                                  </div>
                                  {/* Mês anterior resumo */}
                                  <div className="text-center">
                                    {ant ? (
                                      <span className="text-[11px] text-nodri-t3"> {ant.negativo} |  {ant.positivo}</span>
                                    ) : <span className="text-[10px] text-nodri-t3/40">—</span>}
                                  </div>
                                  {/* Mês atual resumo + mensagem */}
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className="flex items-center gap-2">
                                      {atual ? (
                                        <span className="text-[11px] text-nodri-t1"> {atual.negativo} |  {atual.positivo}</span>
                                      ) : <span className="text-[10px] text-nodri-t3/40">—</span>}
                                      <span className="text-nodri-t3 text-[9px]">{aberto ? '' : ''}</span>
                                    </div>
                                    {deltaNeg != null && deltaNeg !== 0 && mesAnteriorKey && (
                                      <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: corDelta }}>
                                        {deltaNeg < 0
                                          ? ` ${Math.abs(deltaNeg)}x menos que ${formatMes(mesAnteriorKey)}`
                                          : ` ${deltaNeg}x mais que ${formatMes(mesAnteriorKey)}`}
                                      </span>
                                    )}
                                  </div>
                                </button>

                                {/* Ocorrências lado a lado */}
                                {aberto && todasOcorrs.length > 0 && (
                                  <div className="border-t border-nodri-border/30 px-3 pb-3">
                                    <div className="grid grid-cols-[88px_1fr_1fr] sm:grid-cols-[160px_1fr_1fr] gap-3 mt-2 mb-1 px-1">
                                      <div className="text-[9px] text-nodri-t3 uppercase tracking-wider">Ocorrência</div>
                                      <div className="text-[9px] text-nodri-t3 uppercase tracking-wider text-center">{mesAnteriorKey ? formatMes(mesAnteriorKey) : '—'}</div>
                                      <div className="text-[9px] text-nodri-cyan uppercase tracking-wider text-center">{formatMes(mesAtualKey)}</div>
                                    </div>
                                    {todasOcorrs.map(desc => {
                                      const qtdAnt = ant?.ocorrencias?.find(o => o.desc === desc)?.qtd || 0
                                      const qtdAtual = atual?.ocorrencias?.find(o => o.desc === desc)?.qtd || 0
                                      const diff = qtdAtual - qtdAnt
                                      const corDiff = diff > 0 ? '#f87171' : diff < 0 ? '#4ade80' : '#767069'
                                      const corAtual = qtdAtual >= 5 ? '#ef4444' : qtdAtual >= 3 ? '#f97316' : qtdAtual >= 2 ? '#facc15' : '#767069'
                                      const msgDiff = diff < 0
                                        ? `Parabéns! ${Math.abs(diff)}x menos que o mês anterior`
                                        : diff > 0
                                        ? `Atenção! ${diff}x mais que o mês anterior`
                                        : ''
                                      return (
                                        <div key={desc} className="py-1.5 px-1 rounded-lg hover:bg-white/[0.02]">
                                          <div className="grid grid-cols-[88px_1fr_1fr] sm:grid-cols-[160px_1fr_1fr] gap-3 items-center">
                                            <span className="text-[11px] text-nodri-t2 truncate" title={desc}>{desc}</span>
                                            <div className="text-center">
                                              {qtdAnt > 0
                                                ? <span className="text-[12px] font-bold text-nodri-t3">{qtdAnt}</span>
                                                : <span className="text-nodri-t3/30 text-[11px]">—</span>}
                                            </div>
                                            <div className="text-center">
                                              {qtdAtual > 0
                                                ? <span className="text-[12px] font-bold" style={{ color: corAtual }}>{qtdAtual}</span>
                                                : <span className="text-nodri-t3/30 text-[11px]">—</span>}
                                            </div>
                                          </div>
                                          {diff !== 0 && msgDiff && (
                                            <div className="mt-0.5 pl-0 text-[9.5px] font-semibold" style={{ color: corDiff }}>
                                              {msgDiff}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        )
                      })()}
                    </div>
                    )
                  })()}

                  {/* Histórico de Bloqueios */}
                  {historicoBloqueios && historicoBloqueios.profissionais.length > 0 && (
                    <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(239,68,68,.2)' }}>
                      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,.12)', background: 'rgba(239,68,68,.05)' }}>
                        <span className="text-sm"></span>
                        <span className="text-[13px] font-semibold text-red-300">Histórico de Bloqueios {historicoBloqueios.ano}</span>
                        <span className="text-[10px] text-nodri-t3 ml-1">— reincidentes em bloqueio</span>
                        <span className="ml-auto text-[11px] font-bold text-red-400">{historicoBloqueios.profissionais.length} prof.</span>
                      </div>
                      <div className="p-4 space-y-2">
                        {historicoBloqueios.profissionais.map(p => {
                          const cor = p.total >= 5 ? '#ef4444' : p.total >= 3 ? '#f97316' : '#facc15'
                          const aberto = expandidoHistorico === p.nome
                          return (
                            <div key={p.nome} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cor}25`, background: `${cor}06` }}>
                              <button onClick={() => setExpandidoHistorico(aberto ? null : p.nome)}
                                className="w-full flex items-center gap-3 p-3 text-left">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                                  style={{ background: `${cor}20`, color: cor, border: `1.5px solid ${cor}40` }}>
                                  {p.nome.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[13px] text-nodri-t1">{p.nome}</span>
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                      style={{ background: `${cor}20`, color: cor, border: `1px solid ${cor}40` }}>
                                      {p.total}x bloqueado{p.total > 1 ? 's' : ''}
                                    </span>
                                    {p.total >= 3 && <span className="text-[9px] font-black text-red-400"> REINCIDENTE</span>}
                                  </div>
                                  {p.ultimo && (
                                    <span className="text-[10px] text-nodri-t3">
                                      Último: {new Date(p.ultimo + 'T12:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                    </span>
                                  )}
                                </div>
                                <span className="text-nodri-t3 text-[11px] shrink-0">{aberto ? '' : ''}</span>
                              </button>
                              {aberto && (
                                <div className="px-4 pb-3 space-y-1.5">
                                  <div className="text-[10px] text-nodri-t3 font-semibold uppercase tracking-wider mb-2">Registros do ano:</div>
                                  {p.registros.map((r, i) => (
                                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg"
                                      style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                                      <div className="shrink-0 text-center">
                                        <div className="text-[10px] font-bold text-red-400">
                                          {new Date(r.bloqueado_em + 'T12:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                        </div>
                                        <div className="text-[9px] text-nodri-t3">{r.dias_bloqueio}d</div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[10px] text-nodri-t2 truncate">{r.motivo || '—'}</div>
                                        {r.desbloqueado_em && (
                                          <div className="text-[9px] text-nodri-t3 mt-0.5">
                                            Liberado: {new Date(r.desbloqueado_em + 'T12:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                            {r.tipo_desbloqueio === 'manual' ? ' (manual)' : ' (automático)'}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/*  ABA: OCORRÊNCIAS  */}
              {abaAtiva === 'ocorrencias' && (
                <div className="space-y-4">
                  {/* Ocorrências mais frequentes */}
                  <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,.07)' }}>
                    <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                      <span className="text-sm"></span>
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
                    <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                        <span className="text-sm"></span>
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
                                          style={{ background: val > 0 ? `${cor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` : 'rgba(255,255,255,.03)', color: val > 0 ? cor : '#dedad4', border: val > 0 ? `1px solid ${cor}40` : '1px solid rgba(255,255,255,.04)' }}>
                                          {val > 0 ? val : '·'}
                                        </div>
                                      </td>
                                    )
                                  })}
                                  <td className="text-center py-1 px-1">
                                    <span className="font-black text-[12px]" style={{ color: row.total >= 5 ? '#f87171' : row.total >= 3 ? '#fb923c' : '#767069' }}>{row.total}</span>
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

                </div>
              )}

              {/*  ABA: PLANO DE AÇÃO  */}
              {abaAtiva === 'plano' && (
                <div className="space-y-4">
                  {data.planoAcao && data.planoAcao.length > 0 ? (
                    <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(139,92,246,.25)' }}>
                      <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(139,92,246,.15)', background: 'rgba(139,92,246,.07)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-base"></span>
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
                                      {acao.urgente && <span className="text-[8px] font-black text-red-400 uppercase"> Urgente</span>}
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
                      <div className="text-4xl mb-3"></div>
                      <p className="text-nodri-t2 text-sm">Nenhum plano de ação necessário no momento.</p>
                    </div>
                  )}
                </div>
              )}

              {/*  ABA: TENDÊNCIAS  */}
              {abaAtiva === 'tendencias' && (
                <div className="space-y-4">

                  {/* Dias da Semana com Mais Ocorrências */}
                  {data.diasSemana.some(d => d.total > 0) && (
                    <div className="pcard rounded-2xl border p-5" style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm"></span>
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
                        return piorDia ? <p className="text-[10px] text-nodri-t3 mt-3"> Pior dia: <strong className="text-red-400">{piorDia.dia}</strong> ({piorDia.negativo} negativos)</p> : null
                      })()}
                    </div>
                  )}

                  {/* Registros recentes */}
                  {data.respostas_recentes.length > 0 && (
                    <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(255,255,255,.07)' }}>
                      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                        <span className="text-sm"></span>
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
                            <span className="text-[9px] text-nodri-t3 shrink-0">{new Date(r.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/*  ABA: IA CLAUDE  */}
              {abaAtiva === 'ia' && (
                <div>
                  {!ia && !iaLoading && !iaErro && (
                    <div className="text-center py-16">
                      <Brain size={40} className="text-purple-400 mx-auto mb-4 opacity-50" />
                      <p className="text-nodri-t2 text-sm mb-4">Clique no botão para gerar a análise da equipe com IA.</p>
                      <button onClick={acionarIA} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm mx-auto"
                        style={{ background: 'linear-gradient(135deg,rgba(124,92,252,.25),rgba(244,63,142,.25))', color: '#5b4fcf', border: '1px solid rgba(139,92,246,.4)' }}>
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
                          {ia.riscos_retencao && <p className="text-[11px] text-nodri-t2 mt-2 pt-2 border-t border-nodri-border"> {ia.riscos_retencao}</p>}
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
                                <div className="text-[11px] font-semibold text-green-400 mb-0.5"> {d.nome}</div>
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
                                <div className="text-[11px] font-semibold text-red-400 mb-0.5"> {a.nome}</div>
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
                                <span>{PRAZO_ICON[a.prazo] || ''}</span>
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
                          <div className="text-[11px] font-bold text-yellow-400 mb-2"> Recomendações de Treinamento</div>
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
                  <div className="text-5xl mb-4"></div>
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
