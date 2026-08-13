'use client'

// Planejamento Estratégico Geral da Empresa.
//
// Ano + mês no topo (todo planejamento é mensal). Uma grade de cards, um por
// área; a barra do card enche conforme os itens ganham estratégia escrita.
// Clicar no card abre, na mesma página, os itens daquele card — cada um com a
// estratégia a preencher, os três prazos (início, conferência, finalização) e
// o "feito". Salvo em salao_config, uma chave por mês.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Loader2, Save, ArrowLeft, Check, Copy, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { CARDS_PLANEJAMENTO, TOTAL_ITENS, chavePlano, type CardPlano } from '@/lib/planejamento'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Preench { estrategia?: string; inicio?: string; conferencia?: string; fim?: string; feito?: boolean }
type Doc = Record<string, Preench>   // itemKey ("cardId.itemId") → preenchimento

const fmtBR = (iso?: string) => iso ? iso.split('-').reverse().join('/') : ''

export default function PlanejamentoEstrategico() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [doc, setDoc] = useState<Doc>({})
  const [cardAberto, setCardAberto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [copiando, setCopiando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Planejamento estratégico')

  const chave = chavePlano(ano, mes)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${chave}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      setDoc(d && typeof d === 'object' ? d as Doc : {})
    } catch { setDoc({}) }
    setDirty(false); setCarregando(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  const salvar = useCallback(async () => {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, doc }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [chave, doc])

  /** Puxa o mês anterior para não reescrever o que não muda. */
  async function copiarMesAnterior() {
    const a = mes === 1 ? ano - 1 : ano
    const m = mes === 1 ? 12 : mes - 1
    setCopiando(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${chavePlano(a, m)}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      if (!d || typeof d !== 'object' || !Object.keys(d).length) { toast.error(`${MESES[m - 1]} não tem planejamento para copiar`); setCopiando(false); return }
      // Traz a estratégia; zera as datas e o "feito" (são do mês novo).
      const novo: Doc = {}
      for (const [k, v] of Object.entries(d as Doc)) {
        if (v?.estrategia?.trim()) novo[k] = { estrategia: v.estrategia }
      }
      setDoc(novo); setDirty(true)
      toast.success(`Estratégias de ${MESES[m - 1]} copiadas — ajuste o que mudou`)
    } catch { toast.error('Erro de conexão') }
    setCopiando(false)
  }

  const k = (cardId: string, itemId: string) => `${cardId}.${itemId}`
  const mudar = (cardId: string, itemId: string, campo: keyof Preench, v: any) => {
    setDoc(d => ({ ...d, [k(cardId, itemId)]: { ...(d[k(cardId, itemId)] || {}), [campo]: v } }))
    setDirty(true)
  }

  /** Um item conta como preenchido quando tem estratégia escrita. */
  const preenchidosDoCard = (c: CardPlano) => c.itens.filter(i => (doc[k(c.id, i.id)]?.estrategia || '').trim()).length
  const totalPreenchidos = useMemo(() => CARDS_PLANEJAMENTO.reduce((s, c) => s + preenchidosDoCard(c), 0), [doc])
  const pctGeral = TOTAL_ITENS ? Math.round((totalPreenchidos / TOTAL_ITENS) * 100) : 0

  const anos = [ano - 2, ano - 1, ano, ano + 1].filter((v, i, a) => a.indexOf(v) === i)

  if (carregando) return (
    <div style={{ padding: 46, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={21} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const btnSalvar = (
    <button onClick={salvar} disabled={salvando || !dirty}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 11, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: dirty ? 'pointer' : 'default' }}>
      <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
    </button>
  )

  // ── Um card aberto: os itens dele ──────────────────────────────────────
  const card = CARDS_PLANEJAMENTO.find(c => c.id === cardAberto)
  if (card) {
    const feitos = preenchidosDoCard(card)
    const pct = card.itens.length ? Math.round((feitos / card.itens.length) * 100) : 0
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', marginBottom: 13 }}>
          <button onClick={() => setCardAberto('')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', color: '#6b6860', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            <ArrowLeft size={15} /> Todos os planejamentos
          </button>
          <div style={{ flex: 1 }} />
          {btnSalvar}
        </div>

        <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#fff)', border: '1.5px solid #ddd6f5', borderRadius: 14, padding: '15px 17px', marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{ fontSize: 24 }}>{card.icone}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', margin: 0 }}>{card.titulo}</h2>
              <p style={{ fontSize: 11.5, color: '#5b4fcf', fontWeight: 700, margin: '1px 0 0' }}>👤 {card.responsavel} · {MESES[mes - 1]}/{ano}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: pct === 100 ? '#16a34a' : '#5b4fcf' }}>{pct}%</div>
              <div style={{ fontSize: 10, color: '#8a8680', fontWeight: 700 }}>{feitos}/{card.itens.length}</div>
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: '#6b6860', margin: 0, lineHeight: 1.5 }}>{card.oque}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {card.itens.map(item => {
            const p = doc[k(card.id, item.id)] || {}
            const feito = !!p.estrategia?.trim()
            return (
              <div key={item.id} style={{ background: '#fff', border: `1px solid ${feito ? '#bbf7d0' : '#eceae4'}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: feito ? '#16a34a' : '#f0eee8', color: feito ? '#fff' : '#c9c5be', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {feito ? <Check size={13} /> : ''}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e' }}>{item.nome}</div>
                    <div style={{ fontSize: 11.5, color: '#8a8680' }}>{item.desc}</div>
                  </div>
                </div>

                <label style={rot}>Como será feita a estratégia</label>
                <textarea value={p.estrategia || ''} onChange={e => mudar(card.id, item.id, 'estrategia', e.target.value)}
                  rows={2} placeholder="Descreva o que será feito neste item…"
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 12.5, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', marginBottom: 9 }} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                  <Data rotulo="Início" valor={p.inicio} onChange={v => mudar(card.id, item.id, 'inicio', v)} />
                  <Data rotulo="Conferência" valor={p.conferencia} onChange={v => mudar(card.id, item.id, 'conferencia', v)} />
                  <Data rotulo="Finalização" valor={p.fim} onChange={v => mudar(card.id, item.id, 'fim', v)} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Grade dos cards ────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flexWrap: 'wrap', marginBottom: 13 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-.3px' }}>Planejamento Estratégico Geral</h2>
          <p style={{ fontSize: 12.5, color: '#8a8680', margin: '3px 0 0' }}>16 planejamentos, um por área. Clique em cada card para preencher a estratégia do mês.</p>
        </div>
        <button onClick={copiarMesAnterior} disabled={copiando}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', color: '#5b4fcf', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
          {copiando ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />} Copiar mês anterior
        </button>
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {btnSalvar}
      </div>

      {/* Progresso geral do mês */}
      <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 13, padding: '13px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <CheckCircle2 size={16} color={pctGeral === 100 ? '#16a34a' : '#5b4fcf'} />
          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#1a1a2e' }}>{MESES[mes - 1]} de {ano}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, fontWeight: 900, color: pctGeral === 100 ? '#16a34a' : '#5b4fcf' }}>{pctGeral}%</span>
          <span style={{ fontSize: 11, color: '#8a8680', fontWeight: 700 }}>{totalPreenchidos}/{TOTAL_ITENS} itens</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: '#f0eee8', overflow: 'hidden' }}>
          <div style={{ width: `${pctGeral}%`, height: '100%', background: pctGeral === 100 ? '#16a34a' : '#5b4fcf', transition: 'width .3s' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
        {CARDS_PLANEJAMENTO.map(c => {
          const feitos = preenchidosDoCard(c)
          const pct = c.itens.length ? Math.round((feitos / c.itens.length) * 100) : 0
          const completo = pct === 100
          return (
            <button key={c.id} onClick={() => setCardAberto(c.id)}
              style={{ textAlign: 'left', cursor: 'pointer', background: '#fff', border: `1.5px solid ${completo ? '#16a34a' : feitos > 0 ? '#ddd6f5' : '#eceae4'}`, borderRadius: 14, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{c.icone}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.25 }}>{c.titulo}</div>
                  <div style={{ fontSize: 10.5, color: '#8a8680', fontWeight: 600, marginTop: 2 }}>👤 {c.responsavel}</div>
                </div>
                {completo
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#16a34a', color: '#fff', fontSize: 9.5, fontWeight: 900, padding: '3px 8px', borderRadius: 99, flexShrink: 0 }}><Check size={10} /> OK</span>
                  : <span style={{ fontSize: 12, fontWeight: 900, color: '#5b4fcf', flexShrink: 0 }}>{pct}%</span>}
              </div>
              <div style={{ height: 6, borderRadius: 99, background: '#f0eee8', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: completo ? '#16a34a' : '#5b4fcf', transition: 'width .25s' }} />
              </div>
              <div style={{ fontSize: 10.5, color: '#a8a49d', fontWeight: 700 }}>{feitos} de {c.itens.length} itens preenchidos</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const rot: CSSProperties = { fontSize: 10, fontWeight: 800, color: '#8a8680', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 4 }

function Data({ rotulo, valor, onChange }: { rotulo: string; valor?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 9.5, fontWeight: 800, color: '#a8a49d', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 3 }}>{rotulo}</label>
      <input type="date" value={valor || ''} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1.5px solid #e8e6e0', fontSize: 11.5, background: '#fff' }} />
    </div>
  )
}
