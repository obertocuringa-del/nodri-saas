'use client'

// Check list do que é enviado à contabilidade, mês a mês.
// Os 12 meses aparecem como cards com uma barrinha de progresso: vermelho
// enquanto falta algo, verde quando tudo foi enviado. A lista de itens é a
// mesma para todos os meses (dá para acrescentar e excluir); o que muda de um
// mês para o outro é o que já foi marcado como enviado.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Save, Plus, Trash2, ArrowLeft, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const ITENS_PADRAO = [
  'Notas fiscais de serviço',
  'Notas fiscais de compra',
  'Extratos bancários',
  'Faturamento dos profissionais',
  'Folha de pagamento',
  'Guias pagas',
  'Pró-labore',
]

interface Item { id: string; texto: string }
interface Doc {
  itens: Item[]
  marcados: Record<string, Record<string, boolean>>   // "2026-8" → { itemId: true }
}

const rid = () => Math.random().toString(36).slice(2, 9)
const vazio = (): Doc => ({ itens: ITENS_PADRAO.map(t => ({ id: rid(), texto: t })), marcados: {} })

export default function ChecklistContabilidade() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mesAberto, setMesAberto] = useState(0)      // 0 = mostrando os cards
  const [doc, setDoc] = useState<Doc>(vazio())
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Check list da contabilidade')

  useEffect(() => {
    fetch('/api/salon/grid?chave=checklist_contabilidade', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && Array.isArray(d.itens)) setDoc({ itens: d.itens, marcados: d.marcados || {} }) })
      .catch(() => { })
      .finally(() => setCarregando(false))
  }, [])

  const salvar = useCallback(async () => {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'checklist_contabilidade', doc }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [doc])

  const chave = (m: number) => `${ano}-${m}`
  const feitosDe = (m: number) => doc.itens.filter(i => doc.marcados[chave(m)]?.[i.id]).length

  function marcar(m: number, itemId: string, v: boolean) {
    setDoc(d => ({ ...d, marcados: { ...d.marcados, [chave(m)]: { ...(d.marcados[chave(m)] || {}), [itemId]: v } } }))
    setDirty(true)
  }
  function addItem() { setDoc(d => ({ ...d, itens: [...d.itens, { id: rid(), texto: '' }] })); setDirty(true) }
  function mudarItem(id: string, texto: string) { setDoc(d => ({ ...d, itens: d.itens.map(i => i.id === id ? { ...i, texto } : i) })); setDirty(true) }
  function delItem(id: string) {
    if (!confirm('Excluir este item do check list?')) return
    setDoc(d => ({ ...d, itens: d.itens.filter(i => i.id !== id) })); setDirty(true)
  }

  const anos = useMemo(() => [ano - 2, ano - 1, ano, ano + 1].filter((v, i, a) => a.indexOf(v) === i), [ano])

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const btnSalvar = (
    <button onClick={salvar} disabled={salvando || !dirty}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 700, cursor: dirty ? 'pointer' : 'default' }}>
      <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
    </button>
  )

  // ── Tela de um mês ────────────────────────────────────────────────────
  if (mesAberto > 0) {
    const total = doc.itens.length
    const feitos = feitosDe(mesAberto)
    const completo = total > 0 && feitos === total
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <button onClick={() => setMesAberto(0)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', color: '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <ArrowLeft size={15} /> Meses
          </button>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{MESES[mesAberto - 1]}/{ano}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: completo ? '#15803d' : '#b91c1c' }}>{feitos}/{total} enviados</span>
          <div style={{ flex: 1 }} />
          {btnSalvar}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14 }}>
          {doc.itens.map(item => {
            const on = !!doc.marcados[chave(mesAberto)]?.[item.id]
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid #f2f0ec' }}>
                <input type="checkbox" checked={on} onChange={e => marcar(mesAberto, item.id, e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#16a34a', cursor: 'pointer', flexShrink: 0 }} />
                <input value={item.texto} onChange={e => mudarItem(item.id, e.target.value)} placeholder="Descreva o item…"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: on ? '#15803d' : '#374151', fontWeight: on ? 700 : 500, textDecoration: on ? 'line-through' : 'none', background: 'transparent' }} />
                <button onClick={() => delItem(item.id)} title="Excluir item"
                  style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 3, flexShrink: 0 }}><Trash2 size={13} /></button>
              </div>
            )
          })}
          <button onClick={addItem}
            style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 12.5, fontWeight: 800, padding: '7px 14px', borderRadius: 9, cursor: 'pointer' }}>
            <Plus size={13} /> Acrescentar item
          </button>
        </div>
      </div>
    )
  }

  // ── Os 12 meses ───────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Check list da contabilidade — {ano}</h2>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>Clique no mês para marcar o que já foi enviado.</p>
        </div>
        <div style={{ flex: 1 }} />
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {btnSalvar}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
        {MESES.map((nome, i) => {
          const m = i + 1
          const total = doc.itens.length
          const feitos = feitosDe(m)
          const pct = total ? Math.round((feitos / total) * 100) : 0
          const completo = total > 0 && feitos === total
          return (
            <button key={m} onClick={() => setMesAberto(m)}
              style={{ textAlign: 'left', background: completo ? '#f0fdf4' : '#fff', border: `1.5px solid ${completo ? '#16a34a' : feitos > 0 ? '#fca5a5' : '#e8e6e0'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, color: completo ? '#15803d' : '#1a1a1a' }}>{nome}</span>
                <div style={{ flex: 1 }} />
                {completo
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 99 }}><Check size={11} /> OK</span>
                  : <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 800 }}>{feitos}/{total}</span>}
              </div>
              <div style={{ height: 8, borderRadius: 99, background: '#f0eee8', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: completo ? '#16a34a' : '#dc2626', transition: 'width .25s' }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
