'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Lock, Unlock, AlertTriangle, ShieldOff, History, Settings, RotateCcw, Save, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfBloqueio {
  nome: string
  ativo: boolean
  atrasos_semana: number
  faltas_mes: number
  datas_atrasos: string[]
  datas_faltas: string[]
  outras_ocorrencias: { descricao: string; quantidade: number; datas: string[] }[]
  bloqueado: boolean
  dias_bloqueio: number
  dias_restantes: number
  bloqueado_ate: string | null
  motivo: string
}

interface Data {
  profissionais: ProfBloqueio[]
  periodo_semana: string
  periodo_mes: string
}

interface Regras {
  atrasos_por_semana: number
  dias_bloqueio_atraso: number
  faltas_por_mes: number
  dias_bloqueio_falta: number
}

interface RegraCustom {
  id: string
  nome: string
  ocorrencia: string
  quantidade: number
  periodo: 'semana' | 'mes'
  dias_bloqueio: number
  ativo: boolean
  profissional_nome: string | null
}

const PADRAO: Regras = { atrasos_por_semana: 3, dias_bloqueio_atraso: 7, faltas_por_mes: 2, dias_bloqueio_falta: 15 }
interface NovaRegraCustom { nome: string; ocorrencia: string; quantidade: number; periodo: 'semana' | 'mes'; dias_bloqueio: number; profissional_nome: string }
const NOVA_REGRA_CUSTOM: NovaRegraCustom = { nome: '', ocorrencia: '', quantidade: 3, periodo: 'semana', dias_bloqueio: 7, profissional_nome: '' }

export default function BloqueiosPage() {
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [desbloqueando, setDesbloqueando] = useState<string | null>(null)
  const [reprocessando, setReprocessando] = useState(false)
  const [regras, setRegras] = useState<Regras>(PADRAO)
  const [editRegras, setEditRegras] = useState<Regras>(PADRAO)
  const [editandoRegras, setEditandoRegras] = useState(false)
  const [salvandoRegras, setSalvandoRegras] = useState(false)
  const [regrasCustom, setRegrasCustom] = useState<RegraCustom[]>([])
  const [ocorridos, setOcorridos] = useState<string[]>([])
  const [novaRegra, setNovaRegra] = useState<NovaRegraCustom>(NOVA_REGRA_CUSTOM)
  const [adicionandoRegra, setAdicionandoRegra] = useState(false)
  const [editandoRegraId, setEditandoRegraId] = useState<string | null>(null)
  const [editandoRegraData, setEditandoRegraData] = useState<Partial<RegraCustom>>({})

  async function fetchData() {
    setLoading(true)
    await fetch('/api/feedback-prof/bloqueios/reprocessar', { method: 'POST' })
    const res = await fetch('/api/feedback-prof/bloqueios')
    if (res.ok) setData(await res.json())
    else toast.error('Erro ao carregar')
    setLoading(false)
  }

  async function fetchRegras() {
    const res = await fetch('/api/feedback-prof/regras')
    if (res.ok) {
      const d = await res.json()
      setRegras(d)
      setEditRegras(d)
    }
  }

  async function fetchRegrasCustom() {
    const res = await fetch('/api/feedback-prof/regras-custom')
    if (res.ok) setRegrasCustom(await res.json())
  }

  async function fetchOcorridos() {
    const res = await fetch('/api/feedback-prof/ocorridos')
    if (res.ok) {
      const d = await res.json()
      setOcorridos(d.map((o: { descricao: string }) => o.descricao))
    }
  }

  useEffect(() => { fetchData(); fetchRegras(); fetchRegrasCustom(); fetchOcorridos() }, [])

  async function reprocessarHistorico() {
    setReprocessando(true)
    try {
      const res = await fetch('/api/feedback-prof/bloqueios/reprocessar', { method: 'POST' })
      const d = await res.json()
      toast.success(`Concluído! ${d.bloqueios_gerados} bloqueio(s) gerado(s).`)
      if (d.bloqueios_gerados > 0) await fetchData()
    } catch {
      toast.error('Erro ao reprocessar')
    }
    setReprocessando(false)
  }

  async function desbloquear(nome: string) {
    setDesbloqueando(nome)
    const res = await fetch('/api/feedback-prof/bloqueios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissional_nome: nome }),
    })
    if (res.ok) {
      toast.success(`${nome} desbloqueado!`)
      await fetchData()
    } else toast.error('Erro ao desbloquear')
    setDesbloqueando(null)
  }

  async function salvarRegras() {
    setSalvandoRegras(true)
    const res = await fetch('/api/feedback-prof/regras', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editRegras),
    })
    if (res.ok) {
      const d = await res.json()
      setRegras(d)
      setEditAndoRegras(false)
      toast.success('Regras salvas!')
      await fetchData()
    } else toast.error('Erro ao salvar regras')
    setSalvandoRegras(false)
  }

  function setEditAndoRegras(v: boolean) {
    setEditandoRegras(v)
    if (!v) setEditRegras(regras)
  }

  async function adicionarRegraCustom() {
    if (!novaRegra.nome.trim() || !novaRegra.ocorrencia.trim()) {
      toast.error('Preencha nome e ocorrência'); return
    }
    const res = await fetch('/api/feedback-prof/regras-custom', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novaRegra),
    })
    if (res.ok) {
      toast.success('Regra adicionada!')
      setNovaRegra(NOVA_REGRA_CUSTOM)
      setAdicionandoRegra(false)
      fetchRegrasCustom()
    } else toast.error('Erro ao adicionar')
  }

  async function salvarEdicaoRegra(id: string) {
    const res = await fetch('/api/feedback-prof/regras-custom', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editandoRegraData }),
    })
    if (res.ok) {
      toast.success('Regra atualizada!')
      setEditandoRegraId(null)
      fetchRegrasCustom()
    } else toast.error('Erro ao salvar')
  }

  async function excluirRegraCustom(id: string) {
    const res = await fetch('/api/feedback-prof/regras-custom', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success('Regra excluída!'); fetchRegrasCustom() }
    else toast.error('Erro ao excluir')
  }

  async function restaurarPadrao() {
    setSalvandoRegras(true)
    const res = await fetch('/api/feedback-prof/regras', { method: 'DELETE' })
    if (res.ok) {
      setRegras(PADRAO)
      setEditRegras(PADRAO)
      setEditandoRegras(false)
      toast.success('Regras restauradas ao padrão!')
      await fetchData()
    } else toast.error('Erro ao restaurar')
    setSalvandoRegras(false)
  }

  const disponiveis = data?.profissionais.filter(p => !p.bloqueado) ?? []
  const bloqueados  = data?.profissionais.filter(p => p.bloqueado)  ?? []

  return (
    <div className="nodri-salon-bg min-h-screen">
      <nav className="bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3 sticky top-0 z-50">
        <button onClick={() => router.push('/salon/feedback-profissional')}
          className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 text-sm">
          <ArrowLeft size={15} /> Feedback Profissional
        </button>
        <div className="w-px h-4 bg-nodri-border" />
        <Lock size={14} className="text-red-400" />
        <span className="font-syne font-bold text-sm text-nodri-t1">Controle de Bloqueios</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={reprocessarHistorico} disabled={reprocessando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
            style={{ background: 'rgba(250,204,21,.1)', color: '#facc15', border: '1px solid rgba(250,204,21,.25)' }}>
            <History size={11} /> {reprocessando ? 'Processando...' : 'Reprocessar Histórico'}
          </button>
          <button onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{ background: 'rgba(34,211,238,.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,.25)' }}>
            <RefreshCw size={11} /> Atualizar
          </button>
        </div>
      </nav>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-nodri-cyan rounded-full animate-spin" />
          </div>
        ) : !data ? null : (
          <>
            {/* Períodos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="pcard p-4 rounded-xl border text-center" style={{ background: '#ffffff', borderColor: 'rgba(250,204,21,.2)' }}>
                <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Período Atrasos (semana)</div>
                <div className="text-sm font-bold text-yellow-400">{data.periodo_semana}</div>
                <div className="text-[10px] text-nodri-t3 mt-1">≥ {regras.atrasos_por_semana} atrasos → bloqueio {regras.dias_bloqueio_atraso} dias</div>
              </div>
              <div className="pcard p-4 rounded-xl border text-center" style={{ background: '#ffffff', borderColor: 'rgba(239,68,68,.2)' }}>
                <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Período Faltas (mês)</div>
                <div className="text-sm font-bold text-red-400">{data.periodo_mes}</div>
                <div className="text-[10px] text-nodri-t3 mt-1">≥ {regras.faltas_por_mes} faltas → bloqueio {regras.dias_bloqueio_falta} dias</div>
              </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total', val: data.profissionais.length, cor: '#9e9b94' },
                { label: 'Disponíveis', val: disponiveis.length, cor: '#4ade80' },
                { label: 'Bloqueados', val: bloqueados.length, cor: '#f87171' },
              ].map(({ label, val, cor }) => (
                <div key={label} className="pcard p-4 rounded-xl border text-center" style={{ background: '#ffffff', borderColor: `${cor}30` }}>
                  <div className="text-[10px] text-nodri-t3 uppercase mb-1">{label}</div>
                  <div className="text-2xl font-black" style={{ color: cor }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Bloqueados */}
            {bloqueados.length > 0 && (
              <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(239,68,68,.25)' }}>
                <div className="px-5 py-3 border-b flex items-center gap-2"
                  style={{ borderColor: 'rgba(239,68,68,.15)', background: 'rgba(239,68,68,.06)' }}>
                  <Lock size={14} className="text-red-400" />
                  <span className="text-[13px] font-bold text-red-300">Bloqueados — Sem Clientes Não Preferência</span>
                  <span className="ml-auto text-[11px] font-bold text-red-400">{bloqueados.length}</span>
                </div>
                <div className="p-4 space-y-2">
                  {bloqueados.map(p => (
                    <div key={p.nome} className="rounded-xl p-4 flex items-start gap-3"
                      style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.2)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                        style={{ background: 'rgba(239,68,68,.2)', color: '#f87171', border: '1.5px solid rgba(239,68,68,.4)' }}>
                        {p.nome.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-nodri-t1 text-[13px]">{p.nome}</span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                            style={{ background: p.dias_bloqueio >= regras.dias_bloqueio_falta ? 'rgba(239,68,68,.2)' : 'rgba(250,204,21,.15)', color: p.dias_bloqueio >= regras.dias_bloqueio_falta ? '#f87171' : '#facc15', border: `1px solid ${p.dias_bloqueio >= regras.dias_bloqueio_falta ? 'rgba(239,68,68,.4)' : 'rgba(250,204,21,.4)'}` }}>
                            {p.dias_bloqueio} DIAS
                          </span>
                          <span className="text-[10px] text-nodri-t3">{p.dias_restantes} dia{p.dias_restantes !== 1 ? 's' : ''} restante{p.dias_restantes !== 1 ? 's' : ''}</span>
                        </div>
                        {p.bloqueado_ate && (
                          <div className="text-[10px] text-nodri-t3 mt-0.5">
                            Libera em: <span className="text-nodri-t2 font-semibold">{new Date(p.bloqueado_ate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-1 mt-2 text-[11px]">
                          {p.datas_atrasos.length > 0 && (
                            <span>
                              <span className="text-yellow-400 font-bold"> {p.datas_atrasos.length} atraso{p.datas_atrasos.length > 1 ? 's' : ''}: </span>
                              <span className="text-nodri-t3">{p.datas_atrasos.join(', ')}</span>
                            </span>
                          )}
                          {p.datas_faltas.length > 0 && (
                            <span>
                              <span className="text-red-400 font-bold"> {p.datas_faltas.length} falta{p.datas_faltas.length > 1 ? 's' : ''}: </span>
                              <span className="text-nodri-t3">{p.datas_faltas.join(', ')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => desbloquear(p.nome)} disabled={desbloqueando === p.nome}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 disabled:opacity-50"
                        style={{ background: 'rgba(34,197,94,.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,.3)' }}>
                        <ShieldOff size={12} />
                        {desbloqueando === p.nome ? 'Aguarde...' : 'Desbloquear'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disponíveis */}
            <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(34,197,94,.2)' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2"
                style={{ borderColor: 'rgba(34,197,94,.12)', background: 'rgba(34,197,94,.05)' }}>
                <Unlock size={14} className="text-green-400" />
                <span className="text-[13px] font-bold text-green-300">Disponíveis para Agendamento</span>
                <span className="ml-auto text-[11px] font-bold text-green-400">{disponiveis.length}</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {disponiveis.map(p => {
                    // só mostra ocorrências custom se tiver regra criada para aquele tipo
                    const ocorRegrasCriadas = (p.outras_ocorrencias || []).filter(o =>
                      regrasCustom.some(rc => rc.ativo && rc.ocorrencia.toUpperCase() === o.descricao.toUpperCase())
                    )
                    const temOcorrencia = p.atrasos_semana > 0 || p.faltas_mes > 0 || ocorRegrasCriadas.length > 0
                    return (
                    <div key={p.nome} className="rounded-xl p-3 flex flex-col gap-1.5"
                      style={{ background: temOcorrencia ? 'rgba(250,204,21,.04)' : 'rgba(34,197,94,.05)', border: `1px solid ${temOcorrencia ? 'rgba(250,204,21,.2)' : 'rgba(34,197,94,.15)'}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                          style={{ background: temOcorrencia ? 'rgba(250,204,21,.2)' : 'rgba(34,197,94,.2)', color: temOcorrencia ? '#facc15' : '#4ade80' }}>
                          {p.nome.charAt(0)}
                        </div>
                        <span className="flex-1 text-[12px] font-semibold text-nodri-t1 truncate">{p.nome}</span>
                        {temOcorrencia
                          ? <span className="text-yellow-400 shrink-0 text-sm"></span>
                          : <span className="text-green-400 shrink-0 text-sm"></span>}
                      </div>
                      {temOcorrencia && (
                        <div className="flex flex-col gap-1 pl-9">
                          {p.atrasos_semana > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit"
                              style={{ background: 'rgba(250,204,21,.12)', color: '#facc15', border: '1px solid rgba(250,204,21,.25)' }}>
                               {p.atrasos_semana} atraso{p.atrasos_semana > 1 ? 's' : ''}: {p.datas_atrasos.join(', ')}
                            </span>
                          )}
                          {p.faltas_mes > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit"
                              style={{ background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)' }}>
                               {p.faltas_mes} falta{p.faltas_mes > 1 ? 's' : ''}: {p.datas_faltas.join(', ')}
                            </span>
                          )}
                          {ocorRegrasCriadas.map(o => (
                            <span key={o.descricao} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit"
                              style={{ background: 'rgba(139,92,246,.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,.25)' }}>
                               {o.quantidade} {o.descricao}{o.quantidade > 1 ? 's' : ''}: {o.datas.join(', ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
                {disponiveis.length === 0 && (
                  <div className="text-center py-8">
                    <AlertTriangle size={24} className="text-yellow-400 mx-auto mb-2" />
                    <p className="text-nodri-t2 text-sm">Todos os profissionais estão bloqueados.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Regras editáveis */}
            <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(139,92,246,.2)' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2"
                style={{ borderColor: 'rgba(139,92,246,.15)', background: 'rgba(139,92,246,.06)' }}>
                <Settings size={14} className="text-purple-400" />
                <span className="text-[13px] font-bold text-purple-300">Regras de Bloqueio</span>
                {!editandoRegras && (
                  <button onClick={() => setEditandoRegras(true)}
                    className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ background: 'rgba(139,92,246,.15)', color: '#7c6fe0', border: '1px solid rgba(139,92,246,.3)' }}>
                    <Settings size={11} /> Editar
                  </button>
                )}
              </div>
              <div className="p-5">
                {!editandoRegras ? (
                  <div className="space-y-2 text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400"></span>
                      <span className="text-nodri-t2"><strong className="text-yellow-400">{regras.atrasos_por_semana}+ atrasos</strong> na mesma semana → bloqueio de <strong className="text-nodri-t1">{regras.dias_bloqueio_atraso} dias</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400"></span>
                      <span className="text-nodri-t2"><strong className="text-red-400">{regras.faltas_por_mes}+ faltas</strong> no mesmo mês → bloqueio de <strong className="text-nodri-t1">{regras.dias_bloqueio_falta} dias</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-nodri-t3"></span>
                      <span className="text-nodri-t3 text-[11px]">Desbloqueio manual remove imediatamente, independente da data de expiração.</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-yellow-400 font-semibold block mb-1">Atrasos por semana para bloquear</label>
                        <input type="number" min={1} max={10} value={editRegras.atrasos_por_semana}
                          onChange={e => setEditRegras(r => ({ ...r, atrasos_por_semana: Number(e.target.value) }))}
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[13px] text-nodri-t1 outline-none" />
                        <p className="text-[10px] text-nodri-t3 mt-1">Padrão: 3</p>
                      </div>
                      <div>
                        <label className="text-[11px] text-yellow-400 font-semibold block mb-1">Dias de bloqueio por atrasos</label>
                        <input type="number" min={1} max={60} value={editRegras.dias_bloqueio_atraso}
                          onChange={e => setEditRegras(r => ({ ...r, dias_bloqueio_atraso: Number(e.target.value) }))}
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[13px] text-nodri-t1 outline-none" />
                        <p className="text-[10px] text-nodri-t3 mt-1">Padrão: 7</p>
                      </div>
                      <div>
                        <label className="text-[11px] text-red-400 font-semibold block mb-1">Faltas por mês para bloquear</label>
                        <input type="number" min={1} max={10} value={editRegras.faltas_por_mes}
                          onChange={e => setEditRegras(r => ({ ...r, faltas_por_mes: Number(e.target.value) }))}
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[13px] text-nodri-t1 outline-none" />
                        <p className="text-[10px] text-nodri-t3 mt-1">Padrão: 2</p>
                      </div>
                      <div>
                        <label className="text-[11px] text-red-400 font-semibold block mb-1">Dias de bloqueio por faltas</label>
                        <input type="number" min={1} max={60} value={editRegras.dias_bloqueio_falta}
                          onChange={e => setEditRegras(r => ({ ...r, dias_bloqueio_falta: Number(e.target.value) }))}
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[13px] text-nodri-t1 outline-none" />
                        <p className="text-[10px] text-nodri-t3 mt-1">Padrão: 15</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={salvarRegras} disabled={salvandoRegras}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50"
                        style={{ background: 'rgba(34,197,94,.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,.3)' }}>
                        <Save size={13} /> {salvandoRegras ? 'Salvando...' : 'Salvar Regras'}
                      </button>
                      <button onClick={restaurarPadrao} disabled={salvandoRegras}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50"
                        style={{ background: 'rgba(250,204,21,.1)', color: '#facc15', border: '1px solid rgba(250,204,21,.3)' }}>
                        <RotateCcw size={13} /> Restaurar Padrão
                      </button>
                      <button onClick={() => setEditAndoRegras(false)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold"
                        style={{ background: 'rgba(255,255,255,.05)', color: '#9e9b94', border: '1px solid rgba(255,255,255,.1)' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Regras Customizadas */}
            <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(34,211,238,.2)' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2"
                style={{ borderColor: 'rgba(34,211,238,.12)', background: 'rgba(34,211,238,.05)' }}>
                <Plus size={14} className="text-nodri-cyan" />
                <span className="text-[13px] font-bold text-nodri-cyan">Regras Adicionais</span>
                <span className="text-[10px] text-nodri-t3 ml-1">— crie regras para qualquer ocorrência</span>
                <button onClick={() => { setAdicionandoRegra(true); setEditandoRegraId(null) }}
                  className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: 'rgba(34,211,238,.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,.25)' }}>
                  <Plus size={11} /> Nova Regra
                </button>
              </div>
              <div className="p-4 space-y-2">

                {/* Formulário nova regra */}
                {adicionandoRegra && (
                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(34,211,238,.05)', border: '1px solid rgba(34,211,238,.2)' }}>
                    <div className="text-[11px] font-bold text-nodri-cyan mb-2">Nova Regra</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] text-nodri-t3 block mb-1">Ocorrência</label>
                        {ocorridos.length > 0 ? (
                          <select value={novaRegra.ocorrencia}
                            onChange={e => setNovaRegra(r => ({ ...r, ocorrencia: e.target.value, nome: e.target.value }))}
                            className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none">
                            <option value="">Selecione uma ocorrência...</option>
                            {ocorridos.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <div className="p-3 rounded-lg text-[11px] text-yellow-400 flex items-center gap-2"
                            style={{ background: 'rgba(250,204,21,.08)', border: '1px solid rgba(250,204,21,.2)' }}>
                             Nenhuma ocorrência cadastrada. Cadastre primeiro em <strong>Feedback Profissional → Ocorrências</strong>.
                          </div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-nodri-t3 block mb-1">Nome da regra</label>
                        <input value={novaRegra.nome} onChange={e => setNovaRegra(r => ({ ...r, nome: e.target.value }))}
                          placeholder="Ex: Saída Mais Cedo"
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-nodri-t3 block mb-1">Quantidade para bloquear</label>
                        <input type="number" min={1} value={novaRegra.quantidade} onChange={e => setNovaRegra(r => ({ ...r, quantidade: Number(e.target.value) }))}
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-nodri-t3 block mb-1">Período</label>
                        <select value={novaRegra.periodo} onChange={e => setNovaRegra(r => ({ ...r, periodo: e.target.value as 'semana' | 'mes' }))}
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none">
                          <option value="semana">Por semana</option>
                          <option value="mes">Por mês</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-nodri-t3 block mb-1">Dias de bloqueio</label>
                        <input type="number" min={1} value={novaRegra.dias_bloqueio} onChange={e => setNovaRegra(r => ({ ...r, dias_bloqueio: Number(e.target.value) }))}
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-nodri-t3 block mb-1">Aplicar para</label>
                        <select value={novaRegra.profissional_nome} onChange={e => setNovaRegra(r => ({ ...r, profissional_nome: e.target.value }))}
                          className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none">
                          <option value="">Todos os profissionais</option>
                          {(data?.profissionais || []).map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={adicionarRegraCustom}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                        style={{ background: 'rgba(34,197,94,.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,.3)' }}>
                        <Check size={12} /> Salvar
                      </button>
                      <button onClick={() => setAdicionandoRegra(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
                        style={{ background: 'rgba(255,255,255,.05)', color: '#9e9b94', border: '1px solid rgba(255,255,255,.1)' }}>
                        <X size={12} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de regras custom */}
                {regrasCustom.length === 0 && !adicionandoRegra && (
                  <p className="text-[11px] text-nodri-t3 text-center py-4">Nenhuma regra adicional. Clique em &quot;Nova Regra&quot; para criar.</p>
                )}

                {regrasCustom.map(rc => (
                  <div key={rc.id} className="rounded-xl p-3 flex items-start gap-3"
                    style={{ background: 'rgba(255,255,255,.02)', border: `1px solid ${rc.ativo ? 'rgba(34,211,238,.15)' : 'rgba(255,255,255,.06)'}` }}>
                    {editandoRegraId === rc.id ? (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input defaultValue={rc.nome} onChange={e => setEditandoRegraData(d => ({ ...d, nome: e.target.value }))}
                          className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none" placeholder="Nome" />
                        <select defaultValue={rc.ocorrencia} onChange={e => setEditandoRegraData(d => ({ ...d, ocorrencia: e.target.value }))}
                          className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none">
                          {ocorridos.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <input type="number" defaultValue={rc.quantidade} onChange={e => setEditandoRegraData(d => ({ ...d, quantidade: Number(e.target.value) }))}
                          className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none" placeholder="Qtd" />
                        <select defaultValue={rc.periodo} onChange={e => setEditandoRegraData(d => ({ ...d, periodo: e.target.value as 'semana' | 'mes' }))}
                          className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none">
                          <option value="semana">Por semana</option>
                          <option value="mes">Por mês</option>
                        </select>
                        <input type="number" defaultValue={rc.dias_bloqueio} onChange={e => setEditandoRegraData(d => ({ ...d, dias_bloqueio: Number(e.target.value) }))}
                          className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none" placeholder="Dias bloqueio" />
                        <select defaultValue={rc.profissional_nome || ''} onChange={e => setEditandoRegraData(d => ({ ...d, profissional_nome: e.target.value || null }))}
                          className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none col-span-2">
                          <option value="">Todos os profissionais</option>
                          {(data?.profissionais || []).map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                        </select>
                        <div className="flex gap-1 items-center">
                          <button onClick={() => salvarEdicaoRegra(rc.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold"
                            style={{ background: 'rgba(34,197,94,.15)', color: '#4ade80' }}>
                            <Check size={10} /> Salvar
                          </button>
                          <button onClick={() => setEditandoRegraId(null)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                            style={{ background: 'rgba(255,255,255,.05)', color: '#9e9b94' }}>
                            <X size={10} /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[12px] text-nodri-t1">{rc.nome}</span>
                            {!rc.ativo && <span className="text-[9px] text-nodri-t3 border border-nodri-border px-1.5 py-0.5 rounded">Inativa</span>}
                          </div>
                          <div className="text-[11px] text-nodri-t3 mt-0.5">
                            {rc.quantidade}x <span className="text-nodri-cyan font-semibold">{rc.ocorrencia}</span> {rc.periodo === 'semana' ? 'na semana' : 'no mês'} → bloqueio de <span className="text-nodri-t2 font-semibold">{rc.dias_bloqueio} dias</span>
                          </div>
                          <div className="text-[10px] mt-0.5">
                            {rc.profissional_nome
                              ? <span className="text-purple-400"> Somente: <strong>{rc.profissional_nome}</strong></span>
                              : <span className="text-nodri-t3"> Todos os profissionais</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditandoRegraId(rc.id); setEditandoRegraData({}); setAdicionandoRegra(false) }}
                            className="p-1.5 rounded-lg" style={{ background: 'rgba(250,204,21,.1)', color: '#facc15' }}>
                            <Edit2 size={11} />
                          </button>
                          <button onClick={() => excluirRegraCustom(rc.id)}
                            className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,.1)', color: '#f87171' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
