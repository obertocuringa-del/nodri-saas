'use client'

// Planejamento Estratégico Geral da Empresa.
//
// Duas camadas, guardadas separadas:
//  • ESTRUTURA (os cards e os itens: nome, descrição, responsável, texto fixo)
//    é editável — dá para editar, acrescentar e excluir card ou item — e vale
//    para todos os meses. Fica em salao_config, chave planejamento_estrutura.
//  • PREENCHIMENTO (a estratégia do mês e os prazos de cada item) é por mês,
//    uma chave por mês. Editar a estrutura não apaga o que já foi preenchido.
//
// Ano + mês no topo (todo planejamento é mensal). A barra do card enche
// conforme os itens ganham estratégia escrita no mês.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Loader2, Save, ArrowLeft, Check, Copy, CheckCircle2, Plus, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { CARDS_PLANEJAMENTO, chavePlano, type CardPlano, type ItemPlano } from '@/lib/planejamento'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const CHAVE_ESTRUTURA = 'planejamento_estrutura'
const rid = () => Math.random().toString(36).slice(2, 9)
const clone = (c: CardPlano[]): CardPlano[] => JSON.parse(JSON.stringify(c))

interface Preench { estrategia?: string; inicio?: string; conferencia?: string; fim?: string; feito?: boolean }
type Doc = Record<string, Preench>   // itemKey ("cardId.itemId") → preenchimento

export default function PlanejamentoEstrategico() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [cards, setCards] = useState<CardPlano[]>(CARDS_PLANEJAMENTO)
  const [doc, setDoc] = useState<Doc>({})
  const [cardAberto, setCardAberto] = useState('')
  const [editando, setEditando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [copiando, setCopiando] = useState(false)
  const [dirty, setDirty] = useState(false)            // preenchimento do mês
  const [dirtyEstrut, setDirtyEstrut] = useState(false) // estrutura (cards/itens)
  useGuardaSalvar(dirty || dirtyEstrut, 'Planejamento estratégico')

  const chave = chavePlano(ano, mes)

  // Estrutura carrega uma vez; o preenchimento recarrega a cada mês.
  useEffect(() => {
    fetch(`/api/salon/grid?chave=${CHAVE_ESTRUTURA}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && Array.isArray(d.cards) && d.cards.length) setCards(d.cards) })
      .catch(() => { })
  }, [])

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
      const reqs: Promise<any>[] = []
      if (dirty) reqs.push(fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc }) }))
      if (dirtyEstrut) reqs.push(fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: CHAVE_ESTRUTURA, doc: { cards } }) }))
      const res = await Promise.all(reqs)
      if (res.every(r => r.ok)) { setDirty(false); setDirtyEstrut(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [chave, doc, cards, dirty, dirtyEstrut])

  /** Puxa o mês anterior para não reescrever o que não muda. */
  async function copiarMesAnterior() {
    const a = mes === 1 ? ano - 1 : ano
    const m = mes === 1 ? 12 : mes - 1
    setCopiando(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${chavePlano(a, m)}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      if (!d || typeof d !== 'object' || !Object.keys(d).length) { toast.error(`${MESES[m - 1]} não tem planejamento para copiar`); setCopiando(false); return }
      const novo: Doc = {}
      for (const [k, v] of Object.entries(d as Doc)) {
        if (v?.estrategia?.trim()) novo[k] = { estrategia: v.estrategia }
      }
      setDoc(novo); setDirty(true)
      toast.success(`Estratégias de ${MESES[m - 1]} copiadas — ajuste o que mudou`)
    } catch { toast.error('Erro de conexão') }
    setCopiando(false)
  }

  // ── Preenchimento do mês ──
  const k = (cardId: string, itemId: string) => `${cardId}.${itemId}`
  const mudarPreench = (cardId: string, itemId: string, campo: keyof Preench, v: any) => {
    setDoc(d => ({ ...d, [k(cardId, itemId)]: { ...(d[k(cardId, itemId)] || {}), [campo]: v } }))
    setDirty(true)
  }

  // ── Edição da estrutura ──
  const mudarCards = (fn: (c: CardPlano[]) => CardPlano[]) => { setCards(c => fn(clone(c))); setDirtyEstrut(true) }
  const editCard = (cardId: string, campo: keyof CardPlano, v: any) => mudarCards(cs => cs.map(c => c.id === cardId ? { ...c, [campo]: v } : c))
  const addCard = () => { const novo: CardPlano = { id: rid(), icone: '', titulo: 'Novo planejamento', responsavel: '', oque: '', itens: [] }; mudarCards(cs => [...cs, novo]); setCardAberto(novo.id) }
  const delCard = (cardId: string) => { if (!confirm('Excluir este card inteiro, com os itens dele?')) return; mudarCards(cs => cs.filter(c => c.id !== cardId)); setCardAberto('') }
  const editItem = (cardId: string, itemId: string, campo: keyof ItemPlano, v: any) => mudarCards(cs => cs.map(c => c.id === cardId ? { ...c, itens: c.itens.map(i => i.id === itemId ? { ...i, [campo]: v } : i) } : c))
  const addItem = (cardId: string) => mudarCards(cs => cs.map(c => c.id === cardId ? { ...c, itens: [...c.itens, { id: rid(), nome: '', desc: '' }] } : c))
  const delItem = (cardId: string, itemId: string) => mudarCards(cs => cs.map(c => c.id === cardId ? { ...c, itens: c.itens.filter(i => i.id !== itemId) } : c))

  const totalItens = useMemo(() => cards.reduce((s, c) => s + c.itens.length, 0), [cards])
  const preenchidosDoCard = (c: CardPlano) => c.itens.filter(i => (doc[k(c.id, i.id)]?.estrategia || '').trim()).length
  const totalPreenchidos = useMemo(() => cards.reduce((s, c) => s + preenchidosDoCard(c), 0), [cards, doc])
  const pctGeral = totalItens ? Math.round((totalPreenchidos / totalItens) * 100) : 0

  const anos = [ano - 2, ano - 1, ano, ano + 1].filter((v, i, a) => a.indexOf(v) === i)

  if (carregando) return (
    <div style={{ padding: 46, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={21} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const btnSalvar = (
    <button onClick={salvar} disabled={salvando || (!dirty && !dirtyEstrut)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 11, border: 'none', background: (dirty || dirtyEstrut) ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: (dirty || dirtyEstrut) ? 'pointer' : 'default' }}>
      <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
    </button>
  )
  const btnEditar = (
    <button onClick={() => setEditando(e => !e)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 11, border: `1.5px solid ${editando ? '#5b4fcf' : '#e0ddd8'}`, background: editando ? '#f0eefb' : '#fff', color: '#5b4fcf', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
      <Pencil size={13} /> {editando ? 'Concluir edição' : 'Editar estrutura'}
    </button>
  )
  const inp: CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e0ddd8', fontSize: 12.5, background: '#fff' }

  // ── Um card aberto: os itens dele ──────────────────────────────────────
  const card = cards.find(c => c.id === cardAberto)
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
          {btnEditar}
          {btnSalvar}
        </div>

        <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#fff)', border: '1.5px solid #ddd6f5', borderRadius: 14, padding: '15px 17px', marginBottom: 13 }}>
          {editando ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <input value={card.icone} onChange={e => editCard(card.id, 'icone', e.target.value)} style={{ ...inp, width: 56, textAlign: 'center', fontSize: 18 }} />
                <input value={card.titulo} onChange={e => editCard(card.id, 'titulo', e.target.value)} placeholder="Título do card" style={{ ...inp, flex: 1, fontWeight: 800 }} />
                <button onClick={() => delCard(card.id)} title="Excluir card" style={{ border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', borderRadius: 9, padding: '0 12px', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
              <input value={card.responsavel} onChange={e => editCard(card.id, 'responsavel', e.target.value)} placeholder="Responsável" style={{ ...inp, marginBottom: 6 }} />
              <textarea value={card.oque} onChange={e => editCard(card.id, 'oque', e.target.value)} rows={2} placeholder="O que é este planejamento" style={{ ...inp, resize: 'vertical' }} />
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <span style={{ fontSize: 24 }}>{card.icone}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', margin: 0 }}>{card.titulo}</h2>
                <p style={{ fontSize: 11.5, color: '#5b4fcf', fontWeight: 700, margin: '1px 0 0' }}>{card.responsavel} · {MESES[mes - 1]}/{ano}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: pct === 100 ? '#16a34a' : '#5b4fcf' }}>{pct}%</div>
                <div style={{ fontSize: 10, color: '#8a8680', fontWeight: 700 }}>{feitos}/{card.itens.length}</div>
              </div>
            </div>
          )}
          {!editando && <p style={{ fontSize: 12.5, color: '#6b6860', margin: 0, lineHeight: 1.5 }}>{card.oque}</p>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {card.itens.map(item => {
            const p = doc[k(card.id, item.id)] || {}
            const feito = !!p.estrategia?.trim()
            return (
              <div key={item.id} style={{ background: '#fff', border: `1px solid ${feito && !editando ? '#bbf7d0' : '#eceae4'}`, borderRadius: 12, padding: 14 }}>
                {editando ? (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
                      <input value={item.nome} onChange={e => editItem(card.id, item.id, 'nome', e.target.value)} placeholder="Nome do item" style={{ ...inp, fontWeight: 800 }} />
                      <button onClick={() => delItem(card.id, item.id)} title="Excluir item" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 3, flexShrink: 0 }}><Trash2 size={14} /></button>
                    </div>
                    <input value={item.desc} onChange={e => editItem(card.id, item.id, 'desc', e.target.value)} placeholder="Descrição curta" style={{ ...inp, marginBottom: 6 }} />
                    <label style={rot}>Texto fixo (opcional — aparece pronto como referência)</label>
                    <textarea value={item.conteudo || ''} onChange={e => editItem(card.id, item.id, 'conteudo', e.target.value)} rows={2} placeholder="Ex.: a missão do salão…" style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: feito ? '#16a34a' : '#f0eee8', color: feito ? '#fff' : '#c9c5be', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {feito ? <Check size={13} /> : ''}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e' }}>{item.nome || '—'}</div>
                        {item.desc && <div style={{ fontSize: 11.5, color: '#8a8680' }}>{item.desc}</div>}
                      </div>
                    </div>

                    {item.conteudo && (
                      <div style={{ background: '#f8f8fc', border: '1px solid #ddd6f5', borderRadius: 9, padding: '10px 12px', marginBottom: 9, fontSize: 12.5, color: '#3a3550', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {item.conteudo}
                      </div>
                    )}

                    <label style={rot}>{item.conteudo ? 'Como aplicar isto no mês' : 'Como será feita a estratégia'}</label>
                    <textarea value={p.estrategia || ''} onChange={e => mudarPreench(card.id, item.id, 'estrategia', e.target.value)}
                      rows={2} placeholder={item.conteudo ? 'Ações do mês para viver isto no dia a dia…' : 'Descreva o que será feito neste item…'}
                      style={{ width: '100%', padding: '9px 11px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 12.5, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', marginBottom: 9 }} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                      <Data rotulo="Início" valor={p.inicio} onChange={v => mudarPreench(card.id, item.id, 'inicio', v)} />
                      <Data rotulo="Conferência" valor={p.conferencia} onChange={v => mudarPreench(card.id, item.id, 'conferencia', v)} />
                      <Data rotulo="Finalização" valor={p.fim} onChange={v => mudarPreench(card.id, item.id, 'fim', v)} />
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {editando && (
            <button onClick={() => addItem(card.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 12.5, fontWeight: 800, padding: '9px 15px', borderRadius: 10, cursor: 'pointer' }}>
              <Plus size={14} /> Acrescentar item
            </button>
          )}
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
          <p style={{ fontSize: 12.5, color: '#8a8680', margin: '3px 0 0' }}>Um card por área. Clique para preencher a estratégia do mês, ou use “Editar estrutura” para mudar cards e itens.</p>
        </div>
        {btnEditar}
        {!editando && (
          <button onClick={copiarMesAnterior} disabled={copiando}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', color: '#5b4fcf', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
            {copiando ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />} Copiar mês anterior
          </button>
        )}
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

      {!editando && (
        <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 13, padding: '13px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle2 size={16} color={pctGeral === 100 ? '#16a34a' : '#5b4fcf'} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#1a1a2e' }}>{MESES[mes - 1]} de {ano}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: pctGeral === 100 ? '#16a34a' : '#5b4fcf' }}>{pctGeral}%</span>
            <span style={{ fontSize: 11, color: '#8a8680', fontWeight: 700 }}>{totalPreenchidos}/{totalItens} itens</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: '#f0eee8', overflow: 'hidden' }}>
            <div style={{ width: `${pctGeral}%`, height: '100%', background: pctGeral === 100 ? '#16a34a' : '#5b4fcf', transition: 'width .3s' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
        {cards.map(c => {
          const feitos = preenchidosDoCard(c)
          const pct = c.itens.length ? Math.round((feitos / c.itens.length) * 100) : 0
          const completo = pct === 100 && c.itens.length > 0
          return (
            <button key={c.id} onClick={() => setCardAberto(c.id)}
              style={{ textAlign: 'left', cursor: 'pointer', background: '#fff', border: `1.5px solid ${completo ? '#16a34a' : feitos > 0 ? '#ddd6f5' : '#eceae4'}`, borderRadius: 14, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{c.icone}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.25 }}>{c.titulo}</div>
                  <div style={{ fontSize: 10.5, color: '#8a8680', fontWeight: 600, marginTop: 2 }}>{c.responsavel || '—'}</div>
                </div>
                {editando
                  ? <Pencil size={13} color="#5b4fcf" style={{ flexShrink: 0 }} />
                  : completo
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#16a34a', color: '#fff', fontSize: 9.5, fontWeight: 900, padding: '3px 8px', borderRadius: 99, flexShrink: 0 }}><Check size={10} /> OK</span>
                    : <span style={{ fontSize: 12, fontWeight: 900, color: '#5b4fcf', flexShrink: 0 }}>{pct}%</span>}
              </div>
              <div style={{ height: 6, borderRadius: 99, background: '#f0eee8', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: completo ? '#16a34a' : '#5b4fcf', transition: 'width .25s' }} />
              </div>
              <div style={{ fontSize: 10.5, color: '#a8a49d', fontWeight: 700 }}>{editando ? `${c.itens.length} itens · clique para editar` : `${feitos} de ${c.itens.length} itens preenchidos`}</div>
            </button>
          )
        })}
      </div>

      {editando && (
        <button onClick={addCard}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, border: '1px dashed #9ca3af', background: '#fff', color: '#4b5563', fontSize: 12.5, fontWeight: 800, padding: '10px 16px', borderRadius: 11, cursor: 'pointer' }}>
          <Plus size={14} /> Acrescentar card
        </button>
      )}
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
