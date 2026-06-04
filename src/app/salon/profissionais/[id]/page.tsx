'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, TrendingUp, TrendingDown, BarChart2,
  MessageSquare, CheckSquare, Square, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Profissional {
  id: string; nome_completo: string; apelido: string; cargo: string; ativo: boolean
  cpf: string; rg: string; data_aniversario: string; email: string; endereco: string
  cnpj: string; conta_bancaria: string; habilidades: string; foto_url: string
  contato_responsavel: string; cor_favorita: string; comida_favorita: string
  animal_favorito: string; hobbies: string; um_sonho: string; certificados: string
  ficha_entrevista: boolean; processo_contratacao: boolean; materiais_trabalho: boolean
  perfil_ideal: boolean; horarios_folgas: boolean; distrato: boolean
  contrato_trabalho: boolean; tem_certificados: boolean; plano_carreira: boolean
}

interface MetricaBloco {
  faturamento: number; ticket_medio: number; clientes_preferencia: number
  clientes_sem_preferencia: number; dias_trabalhados: number; taxa_ocupacao: number
  total_servicos: number; total_produtos: number
  servicos: Array<{ servico: string; quantidade: number; valor: number }>
}

interface Fidelizacao {
  total_novos: number; fidelizados: number; perdidos: number
  taxa_perda: number; taxa_fidelizacao: number; nivel: string
  novos_p1: number; novos_p2: number; ticket_medio: number; valor_perdido: number
}

interface DadosMetricas {
  p1: MetricaBloco | null; p2: MetricaBloco | null; fidelizacao: Fidelizacao | null
  fat_p1: MetricaBloco | null; fat_p2: MetricaBloco | null; fidelizacao_fat: Fidelizacao | null
  historico_fat: Array<{ ano: number; mes: number; faturamento: number }>
  feedbacks: Array<{ id: string; tipo: string; ocorrido_descricao: string; descricao: string; criado_em: string }>
  feedbacks_p1_total: number; feedbacks_p2_total: number
  ocorrencias: Array<{ tipo: string; total: number }>
  ocorrencias_comparativo: Array<{ tipo: string; p1: number; p2: number; variacao: number | null }>
  historico: Array<{ ano: number; mes: number; faturamento: number; total_servicos: number; ticket_medio: number; taxa_ocupacao: number }>
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmt$  = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
function pct(a: number, b: number) { return b ? ((a - b) / b) * 100 : null }

function DeltaBadge({ atual, anterior, inverso = false }: { atual: number; anterior: number; inverso?: boolean }) {
  const d = pct(atual, anterior)
  if (d === null) return null
  const up = inverso ? d <= 0 : d >= 0
  return (
    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${up ? 'text-nodri-green' : 'text-nodri-red'}`}>
      {d >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
      {(d >= 0 ? '+' : '') + d.toFixed(1) + '%'}
    </span>
  )
}

function MetCard({ label, atual, anterior, fmt='n', inverso=false }:
  { label: string; atual: number; anterior: number; fmt?: 'm'|'n'|'p'; inverso?: boolean }) {
  const f = (v: number) => fmt==='m' ? fmt$(v) : fmt==='p' ? (v||0).toFixed(1)+'%' : (v||0).toLocaleString('pt-BR',{maximumFractionDigits:1})
  return (
    <div className="bg-nodri-card border border-nodri-border rounded-xl p-3">
      <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{label}</div>
      <div className="font-syne font-bold text-[17px] text-nodri-t1">{f(atual)}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[9px] text-nodri-t3">Ant: {f(anterior)}</span>
        <DeltaBadge atual={atual} anterior={anterior} inverso={inverso}/>
      </div>
    </div>
  )
}

function BlocoFidelizacao({ f }: { f: Fidelizacao }) {
  const isCrit = f.nivel === 'critico'
  return (
    <div className="rounded-2xl p-5 border" style={{
      background: isCrit ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)',
      borderColor: isCrit ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'
    }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-syne font-bold text-[13px]">🔍 Análise de Fidelização</h3>
        <span className={`text-[10px] px-3 py-1 rounded-full font-bold border ${
          isCrit ? 'text-red-400 border-red-400/30 bg-red-400/10' :
          f.nivel==='alto' ? 'text-nodri-amber border-nodri-amber/30 bg-nodri-amber/10' :
          'text-nodri-green border-nodri-green/30 bg-nodri-green/10'
        }`}>{isCrit ? '🔴 CRÍTICO' : f.nivel==='alto' ? '🟡 ATENÇÃO' : '🟢 BOM'}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { l:'Total Novos', v: f.total_novos, sub: `${f.novos_p1} (P1) + ${f.novos_p2} (P2)` },
          { l:'Fidelizados', v: f.fidelizados, sub: `${f.taxa_fidelizacao}% de fidelização` },
          { l:'Perdidos',    v: f.perdidos,    sub: `Taxa de perda: ${f.taxa_perda}%` },
          { l:'Valor Perdido', v: -1,          sub: fmt$(f.valor_perdido) },
        ].map(item=>(
          <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3">
            <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{item.l}</div>
            {item.v >= 0
              ? <div className="font-syne font-bold text-[20px] text-nodri-t1">{item.v}</div>
              : <div className="font-syne font-bold text-[15px] text-nodri-red">{item.sub}</div>
            }
            {item.v >= 0 && <div className="text-[9px] text-nodri-t3 mt-1">{item.sub}</div>}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-nodri-t3">
          <span>Fidelização {f.taxa_fidelizacao}%</span><span>Perda {f.taxa_perda}%</span>
        </div>
        <div className="w-full bg-nodri-border rounded-full h-2 overflow-hidden">
          <div className="h-2 bg-nodri-green rounded-full transition-all"
            style={{width:`${Math.min(Math.max(f.taxa_fidelizacao,0),100)}%`}}/>
        </div>
        <p className="text-[10px] text-nodri-t3">
          De cada 100 novos, <strong className="text-nodri-t1">{Math.abs(Math.round(f.taxa_fidelizacao))}</strong> viram fiéis.
          {isCrit && ' ⚠️ Crie estratégia de pós-venda imediato!'}
        </p>
      </div>
    </div>
  )
}

function TabelaServicos({ p1, p2 }: { p1: MetricaBloco | null; p2: MetricaBloco | null }) {
  if (!p1?.servicos?.length && !p2?.servicos?.length) return null
  const todos = new Set([...(p1?.servicos||[]).map(s=>s.servico),...(p2?.servicos||[]).map(s=>s.servico)])
  const m1 = Object.fromEntries((p1?.servicos||[]).map(s=>[s.servico,s]))
  const m2 = Object.fromEntries((p2?.servicos||[]).map(s=>[s.servico,s]))
  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      <h3 className="font-syne font-bold text-[13px] mb-4">✂️ Serviços Realizados — P1 vs P2</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-nodri-border">
              {['Serviço','P1 Qtd','P2 Qtd','Variação','Valor P2'].map((h,i)=>(
                <th key={h} className={`py-2 text-nodri-t3 font-semibold ${i===0?'text-left':i===4?'text-right':'text-center'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(todos).sort((a,b)=>(m2[b]?.quantidade||0)-(m2[a]?.quantidade||0)).map(s=>{
              const q1=m1[s]?.quantidade||0; const q2=m2[s]?.quantidade||0
              const d = q1>0 ? ((q2-q1)/q1)*100 : null
              return (
                <tr key={s} className="border-b border-nodri-border/40 hover:bg-nodri-card/30">
                  <td className="py-2 text-nodri-t1 font-medium">{s}</td>
                  <td className="py-2 text-center text-nodri-t3">{q1||'–'}</td>
                  <td className="py-2 text-center text-nodri-t1 font-semibold">{q2||'–'}</td>
                  <td className="py-2 text-center">
                    {d!==null && <span className={`font-semibold ${d>=0?'text-nodri-green':'text-nodri-red'}`}>{d>=0?'▲':'▼'}{Math.abs(d).toFixed(1)}%</span>}
                    {q1===0&&q2>0&&<span className="text-nodri-green font-semibold">NOVO</span>}
                    {q2===0&&q1>0&&<span className="text-nodri-red font-semibold">▼100%</span>}
                  </td>
                  <td className="py-2 text-right">{m2[s] ? fmt$(m2[s].valor) : '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const CHECKLIST: { key: keyof Profissional; label: string; obrig: boolean }[] = [
  { key: 'ficha_entrevista',     label: 'Ficha para Entrevista',        obrig: false },
  { key: 'processo_contratacao', label: 'Processo de Contratação',      obrig: false },
  { key: 'materiais_trabalho',   label: 'Materiais para Trabalho',      obrig: false },
  { key: 'perfil_ideal',         label: 'Perfil Ideal de Profissional', obrig: false },
  { key: 'horarios_folgas',      label: 'Horários e Folgas',            obrig: false },
  { key: 'distrato',             label: 'Distrato',                     obrig: false },
  { key: 'contrato_trabalho',    label: 'Contrato de Trabalho',         obrig: true  },
  { key: 'tem_certificados',     label: 'Certificados',                 obrig: false },
  { key: 'plano_carreira',       label: 'Plano de Carreira',            obrig: false },
]

const inputCls = "w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-nodri-cyan/40 transition-colors text-nodri-t1"
const labelCls = "text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block"

// ── Filtros compartilhados ──
function FiltroComparacao({ modoFiltro, setModoFiltro, p1i, setP1i, p1f, setP1f, p2i, setP2i, p2f, setP2f, onAplicar, loading }: any) {
  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <BarChart2 size={14} className="text-nodri-cyan"/>
        <h2 className="font-syne font-bold text-[13px]">Filtro de Comparação</h2>
        <div className="ml-auto flex gap-1">
          {(['simples','range'] as const).map(m=>(
            <button key={m} onClick={()=>setModoFiltro(m)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all
                ${modoFiltro===m ? 'bg-nodri-cyan/10 text-nodri-cyan border-nodri-cyan/30' : 'text-nodri-t3 border-nodri-border'}`}>
              {m==='simples' ? 'Mês a Mês' : 'Intervalo'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: modoFiltro==='simples' ? '📅 Período Anterior (P1)' : '📅 Período 1', ini: p1i, fim: p1f, setIni: setP1i, setFim: setP1f },
          { label: modoFiltro==='simples' ? '📅 Período Atual (P2)'    : '📅 Período 2', ini: p2i, fim: p2f, setIni: setP2i, setFim: setP2f },
        ].map((col,ci)=>(
          <div key={ci} className="bg-nodri-card/50 rounded-xl p-3 border border-nodri-border">
            <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-2">{col.label}</div>
            <input type="month" value={col.ini} onChange={e=>{col.setIni(e.target.value); if(modoFiltro==='simples') col.setFim(e.target.value)}}
              className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-nodri-cyan/40 text-nodri-t1"/>
            {modoFiltro==='range' && <>
              <div className="text-[9px] text-nodri-t3 mt-2 mb-1">Até</div>
              <input type="month" value={col.fim} onChange={e=>col.setFim(e.target.value)}
                className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-nodri-cyan/40 text-nodri-t1"/>
            </>}
          </div>
        ))}
      </div>
      <button onClick={onAplicar} disabled={loading}
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-nodri-cyan text-nodri-dark text-[12px] font-bold hover:brightness-110 disabled:opacity-50">
        {loading ? <Loader2 size={13} className="animate-spin"/> : <BarChart2 size={13}/>} Aplicar
      </button>
    </div>
  )
}

export default function PerfilProfissionalPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [prof, setProf] = useState<Profissional | null>(null)
  const [form, setForm] = useState<Partial<Profissional>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [tab, setTab] = useState<'cadastro'|'desempenho'|'faturamento'>('cadastro')

  const hoje = new Date()
  const mesAtual    = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`
  const mesAnterior = (() => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-1, 1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })()

  const [modoFiltro, setModoFiltro] = useState<'simples'|'range'>('simples')
  const [p1i, setP1i] = useState(mesAnterior)
  const [p1f, setP1f] = useState(mesAnterior)
  const [p2i, setP2i] = useState(mesAtual)
  const [p2f, setP2f] = useState(mesAtual)
  const [metricas, setMetricas] = useState<DadosMetricas|null>(null)
  const [loadMet, setLoadMet] = useState(false)

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('nodri_prof_' + id)
      if (cached) {
        const d = JSON.parse(cached)
        setProf(d); setForm(d); setLoading(false); return
      }
    } catch(_) {}
    fetch(`/api/profissionais/${id}`)
      .then(r => r.json())
      .then(d => { if (d?.id) { setProf(d); setForm(d) }; setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const buscarMetricas = useCallback(async () => {
    setLoadMet(true)
    const qs = new URLSearchParams({ p1_inicio: p1i, p1_fim: p1f, p2_inicio: p2i, p2_fim: p2f })
    const res = await fetch(`/api/profissionais/${id}/metricas?${qs}`)
    if (res.ok) setMetricas(await res.json())
    else toast.error('Erro ao buscar métricas')
    setLoadMet(false)
  }, [id, p1i, p1f, p2i, p2f])

  useEffect(() => {
    if (tab === 'desempenho' || tab === 'faturamento') buscarMetricas()
  }, [tab])

  async function salvar() {
    setSalvando(true)
    const cleaned = Object.fromEntries(Object.entries(form).map(([k,v])=>[k, v==='' ? null : v]))
    const res = await fetch(`/api/profissionais/${id}`, {
      method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(cleaned)
    })
    setSalvando(false)
    if (res.ok) { const d = await res.json(); setProf(d); setForm(d); toast.success('✅ Salvo!') }
    else toast.error('Erro ao salvar')
  }

  function set(key: keyof Profissional, value: any) { setForm(p=>({...p,[key]:value})) }

  if (loading) return <div className="min-h-screen bg-nodri-dark flex items-center justify-center"><Loader2 size={28} className="animate-spin text-nodri-cyan"/></div>
  if (!prof) return <div className="min-h-screen bg-nodri-dark flex items-center justify-center text-nodri-t3">Profissional não encontrado</div>

  const faltando = CHECKLIST.filter(c => c.obrig && !form[c.key])
  const checkOk  = CHECKLIST.filter(c => form[c.key]).length

  // Cor das ocorrências
  function corOcorrencia(tipo: string) {
    const t = tipo.toLowerCase()
    if (t.includes('atraso')) return '#ef4444'
    if (t.includes('falta')) return '#f59e0b'
    if (t.includes('positivo') || t.includes('gerente') || t.includes('feedback gerente')) return '#22c55e'
    if (t.includes('negou') || t.includes('reclamação')) return '#f43f8e'
    return '#7c5cfc'
  }

  // Usa dados do relatorio_periodos se disponíveis, senão usa prof_metricas_mensais
  const usarFat = (metricas?.fat_p1 || metricas?.fat_p2)
  const p1 = usarFat ? metricas?.fat_p1 : metricas?.p1
  const p2 = usarFat ? metricas?.fat_p2 : metricas?.p2
  const fidel = usarFat ? metricas?.fidelizacao_fat : metricas?.fidelizacao

  return (
    <div className="min-h-screen bg-nodri-dark">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={()=>router.push('/salon/profissionais')}
          className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm">
          <ArrowLeft size={15}/> Profissionais
        </button>
        <div className="w-px h-5 bg-nodri-border"/>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c5cfc] to-[#f43f8e] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {(prof.apelido||prof.nome_completo).split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
        </div>
        <div>
          <h1 className="font-syne font-bold text-[13px] leading-tight">{prof.nome_completo}</h1>
          <p className="text-[10px] text-nodri-t3">{prof.cargo}</p>
        </div>
        {faltando.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400">
            <AlertTriangle size={10}/> {faltando.length} campo(s) obrigatório(s)
          </div>
        )}
        {tab === 'cadastro' && (
          <button onClick={salvar} disabled={salvando}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nodri-cyan text-nodri-dark text-[11px] font-bold hover:brightness-110 disabled:opacity-50">
            {salvando ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Salvar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-nodri-surface border-b border-nodri-border px-5 flex">
        {([
          ['cadastro','👤 Dados Cadastrais'],
          ['faturamento','💰 Faturamento'],
          ['desempenho','📊 Ocorrências'],
        ] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-3 text-[12px] font-semibold border-b-2 transition-all
              ${tab===t ? 'border-nodri-cyan text-nodri-cyan' : 'border-transparent text-nodri-t3 hover:text-nodri-t2'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6">

        {/* ══ CADASTRO ══ */}
        {tab === 'cadastro' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-4">
                <h2 className="font-syne font-bold text-[12px] text-nodri-cyan">📋 Dados Pessoais</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className={labelCls}>Nome Completo *</label><input value={form.nome_completo||''} onChange={e=>set('nome_completo',e.target.value)} className={inputCls}/></div>
                  <div><label className={labelCls}>Apelido</label><input value={form.apelido||''} onChange={e=>set('apelido',e.target.value)} className={inputCls}/></div>
                  <div><label className={labelCls}>Cargo / Categoria</label>
                    <select value={form.cargo||''} onChange={e=>set('cargo',e.target.value)} className={inputCls}>
                      {['Cabeleireiro','Manicure','Pedicure','Assistente','Massoterapeuta','Colorista','Maquiador(a)','Recepcionista'].map(c=>(
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div><label className={labelCls}>CPF</label><input value={form.cpf||''} onChange={e=>set('cpf',e.target.value)} placeholder="000.000.000-00" className={inputCls}/></div>
                  <div><label className={labelCls}>RG</label><input value={form.rg||''} onChange={e=>set('rg',e.target.value)} className={inputCls}/></div>
                  <div><label className={labelCls}>Data de Aniversário</label><input type="date" value={form.data_aniversario||''} onChange={e=>set('data_aniversario',e.target.value)} className={inputCls}/></div>
                  <div><label className={labelCls}>Email</label><input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} className={inputCls}/></div>
                  <div className="col-span-2"><label className={labelCls}>Endereço</label><input value={form.endereco||''} onChange={e=>set('endereco',e.target.value)} className={inputCls}/></div>
                  <div><label className={labelCls}>Contato do Responsável</label><input value={form.contato_responsavel||''} onChange={e=>set('contato_responsavel',e.target.value)} className={inputCls}/></div>
                  <div><label className={labelCls}>Habilidades</label><input value={form.habilidades||''} onChange={e=>set('habilidades',e.target.value)} className={inputCls}/></div>
                </div>
              </div>
              <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-3">
                <h2 className="font-syne font-bold text-[12px] text-nodri-pink">🌟 Perfil Pessoal</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[['cor_favorita','Cor Favorita'],['comida_favorita','Comida Favorita'],['animal_favorito','Animal Favorito'],['hobbies','Hobbies'],['um_sonho','Um Sonho']].map(([k,l])=>(
                    <div key={k} className={k==='hobbies'||k==='um_sonho'?'col-span-2':''}>
                      <label className={labelCls}>{l}</label>
                      <input value={(form as any)[k]||''} onChange={e=>set(k as any,e.target.value)} className={inputCls}/>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-3">
                <h2 className="font-syne font-bold text-[12px] text-nodri-amber">🏦 Dados Profissionais</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>CNPJ *</label><input value={form.cnpj||''} onChange={e=>set('cnpj',e.target.value)} placeholder="00.000.000/0000-00" className={inputCls}/></div>
                  <div><label className={labelCls}>Dados Bancários</label><input value={form.conta_bancaria||''} onChange={e=>set('conta_bancaria',e.target.value)} placeholder="Banco / Ag / Conta" className={inputCls}/></div>
                </div>
              </div>
              <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                <h2 className="font-syne font-bold text-[12px] text-nodri-purple mb-3">⚙️ Status</h2>
                <label className="flex items-center gap-3 cursor-pointer" onClick={()=>set('ativo',!form.ativo)}>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${form.ativo?'bg-nodri-green':'bg-nodri-border'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.ativo?'left-5':'left-0.5'}`}/>
                  </div>
                  <span className="text-[12px] text-nodri-t1">{form.ativo?'Profissional Ativo':'Profissional Inativo'}</span>
                </label>
              </div>
            </div>
            <div>
              <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 sticky top-20">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-syne font-bold text-[12px] text-nodri-cyan">✅ Checklist</h2>
                  <span className="text-[10px] text-nodri-t3 bg-nodri-card border border-nodri-border px-2 py-0.5 rounded-full">{checkOk}/{CHECKLIST.length}</span>
                </div>
                <div className="w-full bg-nodri-border rounded-full h-1.5 mb-4">
                  <div className="bg-nodri-cyan h-1.5 rounded-full transition-all" style={{width:`${(checkOk/CHECKLIST.length)*100}%`}}/>
                </div>
                <div className="space-y-1.5">
                  {CHECKLIST.map(item=>{
                    const checked = !!form[item.key]
                    return (
                      <button key={item.key} onClick={()=>set(item.key,!checked)}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-nodri-card/50 transition-colors">
                        {checked ? <CheckSquare size={14} className="text-nodri-green shrink-0"/> : <Square size={14} className={`shrink-0 ${item.obrig?'text-red-400':'text-nodri-t3'}`}/>}
                        <span className={`text-[11px] text-left leading-tight ${checked?'text-nodri-t1':item.obrig?'text-red-300':'text-nodri-t3'}`}>
                          {item.label}{item.obrig&&!checked&&<span className="text-red-400 ml-1">*</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ FATURAMENTO ══ */}
        {tab === 'faturamento' && (
          <div className="space-y-6">
            <FiltroComparacao {...{modoFiltro,setModoFiltro,p1i,setP1i,p1f,setP1f,p2i,setP2i,p2f,setP2f,onAplicar:buscarMetricas,loading:loadMet}}/>
            {loadMet && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {metricas && !loadMet && <>
              {(p1 || p2) ? <>
                <div>
                  <p className="text-[11px] text-nodri-t3 uppercase tracking-widest mb-3 font-semibold">Comparativo P1 vs P2</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetCard label="💰 Faturamento"      atual={p2?.faturamento||0}              anterior={p1?.faturamento||0}              fmt="m"/>
                    <MetCard label="🎟️ Ticket Médio"     atual={p2?.ticket_medio||0}             anterior={p1?.ticket_medio||0}             fmt="m"/>
                    <MetCard label="⭐ Preferência"      atual={p2?.clientes_preferencia||0}     anterior={p1?.clientes_preferencia||0}/>
                    <MetCard label="🚫 Sem Pref."        atual={p2?.clientes_sem_preferencia||0} anterior={p1?.clientes_sem_preferencia||0} inverso/>
                    <MetCard label="📆 Dias Trabalhados" atual={p2?.dias_trabalhados||0}         anterior={p1?.dias_trabalhados||0}/>
                    <MetCard label="⏳ Ocupação"         atual={p2?.taxa_ocupacao||0}            anterior={p1?.taxa_ocupacao||0}            fmt="p"/>
                    <MetCard label="✂️ Serviços"         atual={p2?.total_servicos||0}           anterior={p1?.total_servicos||0}/>
                    <MetCard label="🧴 Produtos"         atual={p2?.total_produtos||0}           anterior={p1?.total_produtos||0}/>
                  </div>
                </div>
                {fidel && <BlocoFidelizacao f={fidel}/>}
                {/* Histograma */}
                {metricas.historico_fat.length > 0 && (
                  <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                    <h3 className="font-syne font-bold text-[13px] mb-4">📈 Faturamento Mensal</h3>
                    <div className="space-y-2">
                      {(() => {
                        const max = Math.max(...metricas.historico_fat.map(h=>h.faturamento),1)
                        return metricas.historico_fat.map(h=>(
                          <div key={`${h.ano}-${h.mes}`} className="flex items-center gap-3">
                            <span className="text-[10px] text-nodri-t3 w-12 shrink-0">{MESES[h.mes-1]}/{String(h.ano).slice(2)}</span>
                            <div className="flex-1 bg-nodri-border rounded-full h-5 relative overflow-hidden">
                              <div className="h-5 rounded-full" style={{width:`${(h.faturamento/max)*100}%`,background:'linear-gradient(90deg,#00e5c8,#7c5cfc)'}}/>
                            </div>
                            <span className="text-[10px] font-semibold text-nodri-t1 w-24 text-right shrink-0">{fmt$(h.faturamento)}</span>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )}
                <TabelaServicos p1={p1||null} p2={p2||null}/>
              </> : (
                <div className="text-center py-16 text-nodri-t3">
                  <BarChart2 size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-[13px]">Nenhum dado de faturamento encontrado para este período.</p>
                  <p className="text-[11px] mt-1 opacity-60">Os dados vêm do módulo de Relatórios importado pelo programa complementar.</p>
                </div>
              )}
            </>}
          </div>
        )}

        {/* ══ OCORRÊNCIAS (antigo Desempenho) ══ */}
        {tab === 'desempenho' && (
          <div className="space-y-6">
            <FiltroComparacao {...{modoFiltro,setModoFiltro,p1i,setP1i,p1f,setP1f,p2i,setP2i,p2f,setP2f,onAplicar:buscarMetricas,loading:loadMet}}/>
            {loadMet && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {metricas && !loadMet && <>

              {/* Resumo de feedbacks no período */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: 'Total P1', v: metricas.feedbacks_p1_total, cor: '#7c5cfc' },
                  { l: 'Total P2', v: metricas.feedbacks_p2_total, cor: '#00e5c8' },
                  { l: 'Variação', v: null, cor: metricas.feedbacks_p2_total <= metricas.feedbacks_p1_total ? '#22c55e' : '#ef4444',
                    txt: metricas.feedbacks_p1_total > 0
                      ? (((metricas.feedbacks_p2_total-metricas.feedbacks_p1_total)/metricas.feedbacks_p1_total)*100).toFixed(1)+'%'
                      : '—' },
                ].map(item=>(
                  <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-4">
                    <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{item.l}</div>
                    <div className="font-syne font-bold text-[22px]" style={{color:item.cor}}>
                      {item.v !== null ? item.v : item.txt}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparativo de ocorrências P1 vs P2 */}
              {metricas.ocorrencias_comparativo.length > 0 && (
                <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                  <h3 className="font-syne font-bold text-[13px] mb-4">
                    📌 Comparativo de Ocorrências — P1 vs P2
                    <span className="ml-2 text-[10px] text-nodri-t3 font-normal">por período selecionado</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-nodri-border">
                          <th className="py-2 text-left text-nodri-t3 font-semibold">Ocorrência</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">P1 Qtd</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">P2 Qtd</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">Variação</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">P1 %</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">P2 %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricas.ocorrencias_comparativo.map(o => {
                          const cor = corOcorrencia(o.tipo)
                          const totalP1 = metricas.feedbacks_p1_total || 1
                          const totalP2 = metricas.feedbacks_p2_total || 1
                          const pctP1 = totalP1 > 0 ? ((o.p1/totalP1)*100).toFixed(1) : '0.0'
                          const pctP2 = totalP2 > 0 ? ((o.p2/totalP2)*100).toFixed(1) : '0.0'
                          const melhorou = o.variacao !== null && o.variacao <= 0
                          return (
                            <tr key={o.tipo} className="border-b border-nodri-border/40 hover:bg-nodri-card/30">
                              <td className="py-2 font-medium" style={{color:cor}}>
                                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{background:cor}}/>
                                {o.tipo}
                              </td>
                              <td className="py-2 text-center text-nodri-t2 font-semibold">{o.p1||'–'}</td>
                              <td className="py-2 text-center text-nodri-t1 font-bold">{o.p2||'–'}</td>
                              <td className="py-2 text-center">
                                {o.variacao !== null ? (
                                  <span className={`font-bold flex items-center justify-center gap-0.5 ${melhorou?'text-nodri-green':'text-nodri-red'}`}>
                                    {o.variacao >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                                    {(o.variacao >= 0 ? '+' : '') + o.variacao}%
                                  </span>
                                ) : (o.p1===0&&o.p2>0 ? <span className="text-nodri-red font-bold">NOVO</span> : '—')}
                              </td>
                              <td className="py-2 text-center text-nodri-t3">{pctP1}%</td>
                              <td className="py-2 text-center text-nodri-t3">{pctP2}%</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Feed de feedbacks filtrado */}
              {metricas.feedbacks.length > 0 && (
                <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                  <h3 className="font-syne font-bold text-[13px] mb-4">
                    <MessageSquare size={13} className="inline mr-2 text-nodri-purple"/>
                    Feedbacks no Período
                    <span className="ml-2 text-[10px] text-nodri-t3 font-normal">{metricas.feedbacks.length} registros</span>
                  </h3>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {metricas.feedbacks.map(fb=>{
                      const pos = fb.tipo==='positivo'
                      return (
                        <div key={fb.id} className="rounded-xl p-3 border" style={{
                          background: pos?'rgba(34,197,94,0.06)':'rgba(239,68,68,0.06)',
                          borderColor: pos?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'
                        }}>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pos?'text-nodri-green bg-nodri-green/10':'text-nodri-red bg-nodri-red/10'}`}>
                              {pos?'✅ POSITIVO':'❌ NEGATIVO'}
                            </span>
                            <span className="text-[10px] text-nodri-amber font-semibold">📌 {fb.ocorrido_descricao}</span>
                            <span className="ml-auto text-[9px] text-nodri-t3">
                              {new Date(fb.criado_em).toLocaleDateString('pt-BR')} {new Date(fb.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                            </span>
                          </div>
                          {fb.descricao && <p className="text-[11px] text-nodri-t2 italic leading-relaxed">"{fb.descricao}"</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {metricas.feedbacks.length === 0 && (
                <div className="text-center py-16 text-nodri-t3">
                  <MessageSquare size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-[13px]">Nenhuma ocorrência registrada nos períodos selecionados.</p>
                </div>
              )}
            </>}
          </div>
        )}
      </div>
    </div>
  )
}
