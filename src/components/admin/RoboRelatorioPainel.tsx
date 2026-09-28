'use client'

import { useEffect, useMemo, useState } from 'react'
import { Play, Download, Check, X, Save, Loader2, Clock } from 'lucide-react'

type Coleta = {
  id: string; inicio: string; fim: string | null; situacao: string; motivo: string | null
  linhas: number | null; faturamento: number | null; dias_com_dados: number | null
  anterior: { linhas: number; faturamento: number } | null; origem: string
}
type Salao = {
  id: string; nome: string; na_nuvem: boolean
  agenda: { ligado: boolean; horarios: string[]; rodar_agora_em?: string | null }
  coletas: Coleta[]
}

const COR: Record<string, { fundo: string; cor: string; nome: string }> = {
  aplicado: { fundo: '#e7f1e9', cor: '#2f6b4f', nome: 'Aplicado' },
  aguardando: { fundo: '#fbf2e0', cor: '#9a6b12', nome: 'Aguardando aprovação' },
  rodando: { fundo: '#eceaf9', cor: '#5b4fcf', nome: 'Rodando' },
  erro: { fundo: '#fbe9e7', cor: '#b4322a', nome: 'Erro' },
  descartado: { fundo: '#f0ece7', cor: '#6b6860', nome: 'Descartado' },
}

const dataHora = (iso: string | null) => iso
  ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '—'
const reais = (n: number | null | undefined) => n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Blocos de 15 min do dia inteiro; o dono vê o que está livre e o que está ocupado. */
function blocos(minutos: number) {
  const out: string[] = []
  for (let m = 0; m < 24 * 60; m += minutos) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  return out
}

export default function RoboRelatorioPainel() {
  const [dados, setDados] = useState<{ saloes: Salao[]; minutos_por_coleta: number; simultaneas: number } | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [editando, setEditando] = useState<Record<string, { ligado: boolean; horarios: string[] }>>({})
  const [aviso, setAviso] = useState('')
  const [escolhendo, setEscolhendo] = useState<string | null>(null)
  const [pedido, setPedido] = useState<Record<string, number>>({})
  // Histórico por período: sem isto a lista cresceria uma linha por coleta, todo dia.
  const hoje = new Date().toISOString().slice(0, 10)
  const [hist, setHist] = useState<{ salao: string; de: string; ate: string; coletas: Coleta[] | null } | null>(null)
  async function buscarHistorico(salao: string, de: string, ate: string) {
    setHist({ salao, de, ate, coletas: null })
    const r = await fetch(`/api/admin/robo?historico=${salao}&de=${de}&ate=${ate}`, { cache: 'no-store' })
    const j = r.ok ? await r.json() : { coletas: [] }
    setHist({ salao, de, ate, coletas: j.coletas || [] })
  }

  async function carregar() {
    const r = await fetch('/api/admin/robo', { cache: 'no-store' })
    if (r.ok) setDados(await r.json())
  }
  const ocupado = !!dados?.saloes.some(s => s.agenda.rodar_agora_em || s.coletas[0]?.situacao === 'rodando') || Object.keys(pedido).length > 0
  useEffect(() => { carregar() }, [])
  // Atualiza sozinho: a cada 5 s enquanto tem coleta na fila ou rodando, senão a cada 20 s.
  useEffect(() => { const t = setInterval(carregar, ocupado ? 5000 : 20000); return () => clearInterval(t) }, [ocupado])
  // Some o "Na fila" do clique quando o servidor já mostra a coleta rodando.
  useEffect(() => {
    if (!dados) return
    setPedido(p => {
      const n = { ...p }
      for (const s of dados.saloes) if (s.coletas[0]?.situacao === 'rodando' || (n[s.id] && Date.now() - n[s.id] > 120000)) delete n[s.id]
      return n
    })
  }, [dados])

  async function acao(corpo: any, msg?: string) {
    setAviso('')
    const r = await fetch('/api/admin/robo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    const j = await r.json().catch(() => ({}))
    setAviso(r.ok ? (msg || 'Feito.') : (j.error || 'Não consegui.'))
    carregar()
    return r.ok
  }

  const min = dados?.minutos_por_coleta || 15
  const ocupacao = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const s of dados?.saloes || []) {
      if (!s.agenda.ligado) continue
      for (const h of s.agenda.horarios) m.set(h, [...(m.get(h) || []), s.nome])
    }
    return m
  }, [dados])

  if (!dados) return <p style={{ fontSize: 13, color: '#6b6860' }}>Carregando…</p>
  const grade = blocos(min)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {aviso && <div style={{ fontSize: 13, color: '#2f6b4f', fontWeight: 700 }}>{aviso}</div>}

      {/* ── Tela 1: horários ── */}
      <section style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>Horários do servidor</h2>
        <p style={{ fontSize: 12, color: '#8f877f', margin: '0 0 12px' }}>
          Cada bloco é uma coleta de {min} min. Até {dados.simultaneas} coleta(s) ao mesmo tempo; se passar, a próxima espera
          na fila. Escolha para o salão novo um horário livre (de preferência depois que o salão fecha).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 6 }}>
          {grade.map(h => {
            const quem = ocupacao.get(h) || []
            const cheio = quem.length >= dados.simultaneas
            return (
              <div key={h} title={quem.join(', ') || 'Livre'}
                style={{ borderRadius: 8, padding: '6px 8px', fontSize: 11.5, border: '1px solid',
                  borderColor: cheio ? '#e8c9a6' : quem.length ? '#d7d2f3' : '#e8e6e0',
                  background: cheio ? '#fbf2e0' : quem.length ? '#f3f1fd' : '#fdfcfa' }}>
                <div style={{ fontWeight: 800 }}>{h}</div>
                <div style={{ color: quem.length ? '#6b6860' : '#b8b2aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {quem.length ? quem.join(', ') : 'livre'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Tela 2: cada salão ── */}
      <section style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 12px' }}>Salões</h2>
        {dados.saloes.map(s => {
          const ed = editando[s.id] || { ligado: s.agenda.ligado, horarios: s.agenda.horarios }
          const ult = s.coletas[0]
          const cor = ult ? COR[ult.situacao] || COR.erro : null
          const mudou = JSON.stringify(ed) !== JSON.stringify({ ligado: s.agenda.ligado, horarios: s.agenda.horarios })
          return (
            <div key={s.id} style={{ borderTop: '1px solid #f0ece7', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer' }}
                onClick={() => setAberto(aberto === s.id ? null : s.id)}>
                <strong style={{ fontSize: 13.5, flex: 1, minWidth: 200 }}>{s.nome}</strong>
                <span style={{ fontSize: 11.5, color: s.agenda.ligado ? '#2f6b4f' : '#8f877f', fontWeight: 700 }}>
                  {s.agenda.ligado ? `Ligado · ${s.agenda.horarios.join(', ') || 'sem horário'}` : 'Desligado'}
                </span>
                {cor && <span className={ult.situacao === 'rodando' ? 'animate-pulse' : ''} style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: cor.fundo, color: cor.cor }}>
                  {cor.nome} · {dataHora(ult.inicio)}</span>}
                {!s.na_nuvem && <span style={{ fontSize: 11, color: '#b4322a' }}>sem acesso ao sistema de agenda na nuvem (CRM &gt; Configurar)</span>}
              </div>

              {aberto === s.id && (
                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={ed.ligado}
                        onChange={e => setEditando(x => ({ ...x, [s.id]: { ...ed, ligado: e.target.checked } }))} />
                      Coleta automática ligada
                    </label>
                    <span style={{ fontSize: 12, color: '#6b6860' }}>Vezes por dia: {ed.horarios.length}</span>
                    {ed.horarios.map(h => (
                      <span key={h} style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#eceaf9', color: '#5b4fcf' }}>{h}</span>
                    ))}
                    <button onClick={() => setEscolhendo(escolhendo === s.id ? null : s.id)}
                      style={{ fontSize: 12, fontWeight: 800, color: '#5b4fcf', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {escolhendo === s.id ? 'Fechar horários' : 'Escolher horários'}
                    </button>
                    <button disabled={!mudou} onClick={async () => {
                      if (await acao({ acao: 'agenda', salao_id: s.id, ...ed }, 'Agenda salva.')) setEditando(x => { const y = { ...x }; delete y[s.id]; return y })
                    }} style={{ fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: mudou ? '#1a1a1a' : '#d9d5cf', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Save size={13} /> Salvar
                    </button>
                    {(() => {
                      const rodando = s.coletas[0]?.situacao === 'rodando'
                      const naFila = !rodando && (!!s.agenda.rodar_agora_em || !!pedido[s.id])
                      if (rodando) return (
                        <span className="animate-pulse" style={{ fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: '#e7f1e9', color: '#2f6b4f', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Loader2 size={13} className="animate-spin" /> Rodando desde {dataHora(s.coletas[0].inicio).slice(-5)}
                        </span>
                      )
                      if (naFila) return (
                        <span style={{ fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: '#eceaf9', color: '#5b4fcf', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Loader2 size={13} className="animate-spin" /> Na fila... começa em até 1 minuto
                        </span>
                      )
                      return (
                        <button onClick={async () => { setPedido(p => ({ ...p, [s.id]: Date.now() })); await acao({ acao: 'rodar_agora', salao_id: s.id }, 'Pedido feito.') }}
                          disabled={!s.na_nuvem}
                          style={{ fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: '#5b4fcf', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: s.na_nuvem ? 1 : .4 }}>
                          <Play size={13} /> Rodar agora
                        </button>
                      )
                    })()}
                  </div>

                  {escolhendo === s.id && (
                    <div style={{ border: '1px solid #e8e6e0', borderRadius: 10, padding: 10, background: '#fdfcfa' }}>
                      <div style={{ fontSize: 11.5, color: '#8f877f', marginBottom: 8 }}>
                        Clique para marcar ou desmarcar. Laranja = já usado por outro salão (cheio). Depois, Salvar.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: 5 }}>
                        {grade.map(h => {
                          const meu = ed.horarios.includes(h)
                          const outros = (ocupacao.get(h) || []).filter(n => n !== s.nome)
                          const cheio = !meu && outros.length >= dados.simultaneas
                          return (
                            <button key={h} disabled={cheio} title={outros.join(', ') || 'livre'}
                              onClick={() => setEditando(x => ({ ...x, [s.id]: { ...ed, horarios: meu ? ed.horarios.filter(y => y !== h) : [...ed.horarios, h].sort() } }))}
                              style={{ fontSize: 11.5, fontWeight: meu ? 800 : 600, padding: '5px 0', borderRadius: 7, border: '1px solid',
                                borderColor: meu ? '#5b4fcf' : cheio ? '#e8c9a6' : '#e0ddd8',
                                background: meu ? '#5b4fcf' : cheio ? '#fbf2e0' : '#fff',
                                color: meu ? '#fff' : cheio ? '#b8a07a' : '#1a1a1a', cursor: cheio ? 'not-allowed' : 'pointer' }}>
                              {h}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                    {hist?.salao === s.id ? (<>
                      <strong>Histórico de</strong>
                      <input type="date" value={hist.de} onChange={e => buscarHistorico(s.id, e.target.value, hist.ate)}
                        style={{ padding: '3px 6px', border: '1px solid #e0ddd8', borderRadius: 6 }} />
                      <span>até</span>
                      <input type="date" value={hist.ate} onChange={e => buscarHistorico(s.id, hist.de, e.target.value)}
                        style={{ padding: '3px 6px', border: '1px solid #e0ddd8', borderRadius: 6 }} />
                      <span style={{ color: '#8f877f' }}>{hist.coletas ? `${hist.coletas.length} coleta(s)` : 'buscando...'}</span>
                      <button onClick={() => setHist(null)} style={{ fontWeight: 800, color: '#5b4fcf' }}>Voltar às 3 últimas</button>
                    </>) : (<>
                      <span style={{ color: '#8f877f' }}>Últimas 3 coletas</span>
                      <button onClick={() => buscarHistorico(s.id, new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), hoje)}
                        style={{ fontWeight: 800, color: '#5b4fcf' }}>Histórico por período</button>
                    </>)}
                  </div>

                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead><tr style={{ color: '#8f877f', textAlign: 'left' }}>
                      <th>Início</th><th>Situação</th><th>Atendimentos</th><th>Faturamento</th><th>Antes</th><th>Motivo</th><th></th>
                    </tr></thead>
                    <tbody>
                      {(hist?.salao === s.id && hist.coletas ? hist.coletas : s.coletas.slice(0, 3)).map(c => {
                        const k = COR[c.situacao] || COR.erro
                        return (
                          <tr key={c.id} style={{ borderTop: '1px solid #f0ece7', verticalAlign: 'top' }}>
                            <td style={{ padding: '6px 4px' }}>{dataHora(c.inicio)}</td>
                            <td><span style={{ fontWeight: 800, color: k.cor }}>{k.nome}</span></td>
                            <td>{c.linhas ?? '—'} · {c.dias_com_dados ?? '—'} dias</td>
                            <td>{reais(c.faturamento)}</td>
                            <td style={{ color: '#8f877f' }}>{c.anterior ? `${c.anterior.linhas} · ${reais(c.anterior.faturamento)}` : '—'}</td>
                            <td style={{ maxWidth: 320 }}>{c.motivo || ''}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {c.fim && c.situacao !== 'erro' && (
                                <a href={`/api/admin/robo?baixar=${c.id}`} title="Baixar o Excel desta coleta" style={{ color: '#5b4fcf', marginRight: 8 }}><Download size={14} /></a>
                              )}
                              {c.situacao === 'aguardando' && (<>
                                <button title="Aprovar e aplicar" onClick={() => confirm('Aplicar esta coleta no sistema?') && acao({ acao: 'aprovar', id: c.id }, 'Aplicada.')}
                                  style={{ color: '#2f6b4f', marginRight: 6 }}><Check size={15} /></button>
                                <button title="Descartar" onClick={() => acao({ acao: 'descartar', id: c.id }, 'Descartada.')} style={{ color: '#b4322a' }}><X size={15} /></button>
                              </>)}
                            </td>
                          </tr>
                        )
                      })}
                      {!(hist?.salao === s.id && hist.coletas ? hist.coletas : s.coletas).length && <tr><td colSpan={7} style={{ color: '#8f877f', padding: 6 }}>Nenhuma coleta neste período.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
