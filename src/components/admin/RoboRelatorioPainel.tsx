'use client'

import { useEffect, useMemo, useState } from 'react'
import { Play, Download, Check, X, Plus, Trash2, Save } from 'lucide-react'

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

  async function carregar() {
    const r = await fetch('/api/admin/robo', { cache: 'no-store' })
    if (r.ok) setDados(await r.json())
  }
  useEffect(() => { carregar(); const t = setInterval(carregar, 20000); return () => clearInterval(t) }, [])

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
                {cor && <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: cor.fundo, color: cor.cor }}>
                  {cor.nome} · {dataHora(ult.inicio)}</span>}
                {!s.na_nuvem && <span style={{ fontSize: 11, color: '#b4322a' }}>sem acesso ao Avec na nuvem (CRM &gt; Configurar)</span>}
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
                    {ed.horarios.map((h, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <input type="time" value={h} step={900}
                          onChange={e => setEditando(x => ({ ...x, [s.id]: { ...ed, horarios: ed.horarios.map((y, k) => k === i ? e.target.value : y) } }))}
                          style={{ fontSize: 12.5, padding: '3px 6px', border: '1px solid #e0ddd8', borderRadius: 6 }} />
                        <button title="Tirar este horário" onClick={() => setEditando(x => ({ ...x, [s.id]: { ...ed, horarios: ed.horarios.filter((_, k) => k !== i) } }))}
                          style={{ color: '#b4322a' }}><Trash2 size={13} /></button>
                      </span>
                    ))}
                    <button onClick={() => {
                      const livre = grade.find(h => (ocupacao.get(h) || []).length < dados.simultaneas && h >= '22:00') || '22:00'
                      setEditando(x => ({ ...x, [s.id]: { ...ed, horarios: [...ed.horarios, livre] } }))
                    }} style={{ fontSize: 12, fontWeight: 700, color: '#5b4fcf', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={13} /> horário
                    </button>
                    <button disabled={!mudou} onClick={async () => {
                      if (await acao({ acao: 'agenda', salao_id: s.id, ...ed }, 'Agenda salva.')) setEditando(x => { const y = { ...x }; delete y[s.id]; return y })
                    }} style={{ fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: mudou ? '#1a1a1a' : '#d9d5cf', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Save size={13} /> Salvar
                    </button>
                    <button onClick={() => acao({ acao: 'rodar_agora', salao_id: s.id }, 'Pedido feito: começa em até 1 minuto (ou quando a fila liberar).')}
                      disabled={!s.na_nuvem}
                      style={{ fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 8, background: '#5b4fcf', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: s.na_nuvem ? 1 : .4 }}>
                      <Play size={13} /> Rodar agora
                    </button>
                  </div>

                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead><tr style={{ color: '#8f877f', textAlign: 'left' }}>
                      <th>Início</th><th>Situação</th><th>Atendimentos</th><th>Faturamento</th><th>Antes</th><th>Motivo</th><th></th>
                    </tr></thead>
                    <tbody>
                      {s.coletas.map(c => {
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
                      {!s.coletas.length && <tr><td colSpan={7} style={{ color: '#8f877f', padding: 6 }}>Nenhuma coleta ainda.</td></tr>}
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
