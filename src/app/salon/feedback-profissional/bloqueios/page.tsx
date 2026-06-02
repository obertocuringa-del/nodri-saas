'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Lock, Unlock, AlertTriangle, Users, ShieldOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfBloqueio {
  nome: string
  ativo: boolean
  atrasos_semana: number
  faltas_mes: number
  datas_atrasos: string[]
  datas_faltas: string[]
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

export default function BloqueiosPage() {
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [desbloqueando, setDesbloqueando] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    const res = await fetch('/api/feedback-prof/bloqueios')
    if (res.ok) setData(await res.json())
    else toast.error('Erro ao carregar')
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function desbloquear(nome: string) {
    if (!confirm(`Desbloquear ${nome} manualmente?`)) return
    setDesbloqueando(nome)
    const res = await fetch('/api/feedback-prof/bloqueios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissional_nome: nome }),
    })
    if (res.ok) {
      toast.success(`${nome} desbloqueado!`)
      await fetchData()
    } else {
      toast.error('Erro ao desbloquear')
    }
    setDesbloqueando(null)
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
        <button onClick={fetchData} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
          style={{ background: 'rgba(34,211,238,.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,.25)' }}>
          <RefreshCw size={11} /> Atualizar
        </button>
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
              <div className="pcard p-4 rounded-xl border text-center" style={{ background: '#0d1117', borderColor: 'rgba(250,204,21,.2)' }}>
                <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Período Atrasos (semana)</div>
                <div className="text-sm font-bold text-yellow-400">{data.periodo_semana}</div>
                <div className="text-[10px] text-nodri-t3 mt-1">≥ 3 atrasos → bloqueio 7 dias</div>
              </div>
              <div className="pcard p-4 rounded-xl border text-center" style={{ background: '#0d1117', borderColor: 'rgba(239,68,68,.2)' }}>
                <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1">Período Faltas (mês)</div>
                <div className="text-sm font-bold text-red-400">{data.periodo_mes}</div>
                <div className="text-[10px] text-nodri-t3 mt-1">≥ 2 faltas → bloqueio 15 dias</div>
              </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', val: data.profissionais.length, cor: '#94a3b8' },
                { label: 'Disponíveis', val: disponiveis.length, cor: '#4ade80' },
                { label: 'Bloqueados', val: bloqueados.length, cor: '#f87171' },
              ].map(({ label, val, cor }) => (
                <div key={label} className="pcard p-4 rounded-xl border text-center" style={{ background: '#0d1117', borderColor: `${cor}30` }}>
                  <div className="text-[10px] text-nodri-t3 uppercase mb-1">{label}</div>
                  <div className="text-2xl font-black" style={{ color: cor }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Bloqueados */}
            {bloqueados.length > 0 && (
              <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(239,68,68,.25)' }}>
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
                            style={{ background: p.dias_bloqueio === 15 ? 'rgba(239,68,68,.2)' : 'rgba(250,204,21,.15)', color: p.dias_bloqueio === 15 ? '#f87171' : '#facc15', border: `1px solid ${p.dias_bloqueio === 15 ? 'rgba(239,68,68,.4)' : 'rgba(250,204,21,.4)'}` }}>
                            {p.dias_bloqueio} DIAS
                          </span>
                          <span className="text-[10px] text-nodri-t3">{p.dias_restantes} dia{p.dias_restantes !== 1 ? 's' : ''} restante{p.dias_restantes !== 1 ? 's' : ''}</span>
                        </div>
                        {p.bloqueado_ate && (
                          <div className="text-[10px] text-nodri-t3 mt-0.5">
                            Libera em: <span className="text-nodri-t2 font-semibold">{new Date(p.bloqueado_ate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-[11px]">
                          {p.atrasos_semana > 0 && (
                            <span>
                              <span className="text-yellow-400 font-bold">⏰ {p.atrasos_semana} atraso{p.atrasos_semana > 1 ? 's' : ''}</span>
                              {p.datas_atrasos.length > 0 && <span className="text-nodri-t3 ml-1">({p.datas_atrasos.join(', ')})</span>}
                            </span>
                          )}
                          {p.faltas_mes > 0 && (
                            <span>
                              <span className="text-red-400 font-bold">❌ {p.faltas_mes} falta{p.faltas_mes > 1 ? 's' : ''}</span>
                              {p.datas_faltas.length > 0 && <span className="text-nodri-t3 ml-1">({p.datas_faltas.join(', ')})</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => desbloquear(p.nome)}
                        disabled={desbloqueando === p.nome}
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
            <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(34,197,94,.2)' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2"
                style={{ borderColor: 'rgba(34,197,94,.12)', background: 'rgba(34,197,94,.05)' }}>
                <Unlock size={14} className="text-green-400" />
                <span className="text-[13px] font-bold text-green-300">Disponíveis para Agendamento</span>
                <span className="ml-auto text-[11px] font-bold text-green-400">{disponiveis.length}</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {disponiveis.map(p => (
                    <div key={p.nome} className="rounded-xl p-3 flex items-center gap-2"
                      style={{ background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                        style={{ background: 'rgba(34,197,94,.2)', color: '#4ade80' }}>
                        {p.nome.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-nodri-t1 truncate">{p.nome}</div>
                        {(p.atrasos_semana > 0 || p.faltas_mes > 0) && (
                          <div className="text-[9px] mt-0.5">
                            {p.atrasos_semana > 0 && <span className="text-yellow-400">⏰{p.atrasos_semana} </span>}
                            {p.faltas_mes > 0 && <span className="text-red-400">❌{p.faltas_mes}</span>}
                          </div>
                        )}
                      </div>
                      <span className="text-green-400 shrink-0 text-sm">✓</span>
                    </div>
                  ))}
                </div>
                {disponiveis.length === 0 && (
                  <div className="text-center py-8">
                    <AlertTriangle size={24} className="text-yellow-400 mx-auto mb-2" />
                    <p className="text-nodri-t2 text-sm">Todos os profissionais estão bloqueados.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tabela completa */}
            <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.07)' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                <Users size={14} className="text-nodri-cyan" />
                <span className="text-[13px] font-semibold text-nodri-t1">Todos os Profissionais</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,.03)' }}>
                      <th className="text-left px-5 py-3 text-nodri-t3 font-semibold uppercase tracking-wider">Profissional</th>
                      <th className="text-center px-4 py-3 text-nodri-t3 font-semibold uppercase tracking-wider">Atrasos<br/><span className="normal-case font-normal text-[9px]">{data.periodo_semana}</span></th>
                      <th className="text-center px-4 py-3 text-nodri-t3 font-semibold uppercase tracking-wider">Faltas<br/><span className="normal-case font-normal text-[9px]">{data.periodo_mes}</span></th>
                      <th className="text-center px-4 py-3 text-nodri-t3 font-semibold uppercase tracking-wider">Status</th>
                      <th className="text-center px-4 py-3 text-nodri-t3 font-semibold uppercase tracking-wider">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nodri-border/20">
                    {data.profissionais.map(p => (
                      <tr key={p.nome} className="hover:bg-nodri-surface/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                              style={{ background: p.bloqueado ? 'rgba(239,68,68,.2)' : 'rgba(34,197,94,.15)', color: p.bloqueado ? '#f87171' : '#4ade80' }}>
                              {p.nome.charAt(0)}
                            </div>
                            <span className="font-semibold text-nodri-t1">{p.nome}</span>
                          </div>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className={`font-bold ${p.atrasos_semana >= 3 ? 'text-yellow-400' : p.atrasos_semana > 0 ? 'text-yellow-400/60' : 'text-nodri-t3'}`}>
                            {p.atrasos_semana}
                          </span>
                          {p.atrasos_semana >= 3 && <span className="ml-1 text-[9px] text-yellow-400">⚠</span>}
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className={`font-bold ${p.faltas_mes >= 2 ? 'text-red-400' : p.faltas_mes > 0 ? 'text-red-400/60' : 'text-nodri-t3'}`}>
                            {p.faltas_mes}
                          </span>
                          {p.faltas_mes >= 2 && <span className="ml-1 text-[9px] text-red-400">⚠</span>}
                        </td>
                        <td className="text-center px-4 py-3">
                          {p.bloqueado ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                                style={{ background: p.dias_bloqueio === 15 ? 'rgba(239,68,68,.15)' : 'rgba(250,204,21,.1)', color: p.dias_bloqueio === 15 ? '#f87171' : '#facc15', border: `1px solid ${p.dias_bloqueio === 15 ? 'rgba(239,68,68,.3)' : 'rgba(250,204,21,.3)'}` }}>
                                <Lock size={9} /> BLOQUEADO
                              </span>
                              <div className="text-[9px] text-nodri-t3 mt-0.5">{p.dias_restantes}d restantes</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                              style={{ background: 'rgba(34,197,94,.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,.25)' }}>
                              <Unlock size={9} /> LIBERADO
                            </span>
                          )}
                        </td>
                        <td className="text-center px-4 py-3">
                          {p.bloqueado && (
                            <button
                              onClick={() => desbloquear(p.nome)}
                              disabled={desbloqueando === p.nome}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold mx-auto disabled:opacity-50"
                              style={{ background: 'rgba(34,197,94,.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,.25)' }}>
                              <ShieldOff size={10} /> Desbloquear
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regras */}
            <div className="pcard rounded-2xl border p-4" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,.05)' }}>
              <div className="text-[11px] font-bold text-nodri-t3 uppercase tracking-wider mb-3">Regras de Bloqueio</div>
              <div className="space-y-2 text-[11px] text-nodri-t2">
                <div className="flex items-start gap-2"><span className="text-yellow-400 shrink-0">⏰</span><span><strong className="text-yellow-400">3+ atrasos</strong> na mesma semana → bloqueio de <strong>7 dias</strong></span></div>
                <div className="flex items-start gap-2"><span className="text-red-400 shrink-0">❌</span><span><strong className="text-red-400">2+ faltas</strong> no mesmo mês → bloqueio de <strong>15 dias</strong></span></div>
                <div className="flex items-start gap-2"><span className="text-nodri-t3 shrink-0">🔓</span><span>O desbloqueio manual remove o bloqueio imediatamente, independente da data de expiração.</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
