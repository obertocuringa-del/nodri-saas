'use client'

// Controle de pagamento das comissões, quinzena a quinzena.
// Cada mês do ano tem duas marcações: 1ª e 2ª quinzena. Marcar a primeira
// enche metade da barra; marcar as duas fecha o mês em verde.

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Mes { q1?: boolean; q2?: boolean; obs?: string }
type Doc = Record<string, Mes>       // chave: "2026-3"

export default function ComissoesQuinzenas() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [doc, setDoc] = useState<Doc>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Comissões')

  useEffect(() => {
    fetch('/api/salon/grid?chave=comissoes_quinzenas', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d === 'object') setDoc(d as Doc) })
      .catch(() => { })
      .finally(() => setCarregando(false))
  }, [])

  const salvar = useCallback(async () => {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'comissoes_quinzenas', doc }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [doc])

  function marcar(mes: number, campo: 'q1' | 'q2', valor: boolean) {
    setDoc(d => ({ ...d, [`${ano}-${mes}`]: { ...(d[`${ano}-${mes}`] || {}), [campo]: valor } }))
    setDirty(true)
  }

  const anos = [ano - 2, ano - 1, ano, ano + 1].filter((v, i, a) => a.indexOf(v) === i)
  const fechados = MESES.filter((_, i) => { const m = doc[`${ano}-${i + 1}`]; return m?.q1 && m?.q2 }).length

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Comissões — {ano}</h2>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>
            Marque cada quinzena paga. {fechados} de 12 {fechados === 1 ? 'mês fechado' : 'meses fechados'}.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={salvar} disabled={salvando || !dirty}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 700, cursor: dirty ? 'pointer' : 'default' }}>
          <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
        {MESES.map((nome, i) => {
          const mes = i + 1
          const m = doc[`${ano}-${mes}`] || {}
          const pago = (m.q1 ? 50 : 0) + (m.q2 ? 50 : 0)
          const completo = pago === 100
          return (
            <div key={mes} style={{ background: completo ? '#f0fdf4' : '#fff', border: `1.5px solid ${completo ? '#16a34a' : '#e8e6e0'}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, color: completo ? '#15803d' : '#1a1a1a' }}>{nome}</span>
                <div style={{ flex: 1 }} />
                {completo
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 9px', borderRadius: 99 }}><Check size={11} /> CONCLUÍDO</span>
                  : <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700 }}>{pago}%</span>}
              </div>

              {/* barra: metade na 1ª quinzena, cheia na 2ª */}
              <div style={{ height: 8, borderRadius: 99, background: '#f0eee8', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: `${pago}%`, height: '100%', background: completo ? '#16a34a' : '#f59e0b', transition: 'width .25s' }} />
              </div>

              {([['q1', '1ª quinzena paga'], ['q2', '2ª quinzena paga']] as const).map(([campo, rotulo]) => (
                <label key={campo} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', cursor: 'pointer', fontSize: 12.5, color: m[campo] ? '#15803d' : '#4b5563', fontWeight: m[campo] ? 800 : 600 }}>
                  <input type="checkbox" checked={!!m[campo]} onChange={e => marcar(mes, campo, e.target.checked)}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#16a34a' }} />
                  {rotulo}
                </label>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
