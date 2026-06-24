'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Wallet, HandCoins, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const moeda = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function RecepcionistasCarteira() {
  const [bonusPorNome, setBonusPorNome] = useState<Record<string, number>>({})
  const [carteira, setCarteira] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')              // nome em processamento
  const [adiantando, setAdiantando] = useState<string | null>(null)
  const [valorAdiant, setValorAdiant] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [rec, cart] = await Promise.all([
        fetch('/api/relatorios/recuperacao?tipo=recuperados').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/salon/recepcionistas-carteira').then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      const bonus: Record<string, number> = {}
      for (const r of (rec?.ranking || [])) bonus[r.nome] = Number(r.bonus) || 0
      setBonusPorNome(bonus)
      setCarteira(cart?.carteira || {})
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function acao(nome: string, acao: 'creditar' | 'pagar' | 'adiantar', valor?: number) {
    setBusy(nome)
    try {
      const res = await fetch('/api/salon/recepcionistas-carteira', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, nome, valor }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d?.error || 'Erro'); setBusy(''); return }
      if (acao === 'creditar') toast.success('Bônus creditado na carteira!')
      if (acao === 'pagar') toast.success(`Pagamento realizado em ${d.data}: ${moeda(d.pago)}`)
      if (acao === 'adiantar') toast.success(`Adiantamento de ${moeda(d.pago)} em ${d.data}`)
      setAdiantando(null); setValorAdiant('')
      await carregar()
    } catch { toast.error('Erro de conexão') }
    setBusy('')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  // União de nomes (quem tem bônus ou quem já tem movimento na carteira)
  const nomes = Array.from(new Set([...Object.keys(bonusPorNome), ...Object.keys(carteira)])).sort()

  if (nomes.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Nenhuma recepcionista com bônus ainda. Assim que houver recuperações com bônus, elas aparecem aqui.</div>

  return (
    <div>
      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#9a3412' }}><Wallet size={16} /> Carteira & Pagamentos das Recepcionistas</div>
        <p style={{ color: '#9a3412', fontSize: 12, margin: '4px 0 0' }}>
          Credite o bônus conquistado na carteira, faça o pagamento total ou um adiantamento. O saldo é a fonte usada também na Sala de Recompensas.
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#faf9f7' }}>
              {['Recepcionista', 'Bônus ganho', 'A creditar', 'Saldo na carteira', 'Total pago', 'Ações'].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Recepcionista' ? 'left' : (h === 'Ações' ? 'center' : 'right'), fontSize: 11, color: '#6b6860', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {nomes.map(nome => {
                const c = carteira[nome] || { saldo: 0, bonus_creditado: 0, pago: 0 }
                const ganho = bonusPorNome[nome] || 0
                const aCreditar = Math.round(Math.max(0, ganho - (c.bonus_creditado || 0)) * 100) / 100
                const saldo = c.saldo || 0
                const carregando = busy === nome
                return (
                  <tr key={nome} style={{ borderTop: '1px solid #f0eee8' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1a1a1a' }}>{nome}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#d97706', fontWeight: 700 }}>{moeda(ganho)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: aCreditar > 0 ? '#16a34a' : '#9ca3af', fontWeight: 700 }}>{moeda(aCreditar)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#5b4fcf', fontWeight: 800 }}>{moeda(saldo)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#767069' }}>{moeda(c.pago || 0)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {aCreditar > 0 && (
                          <button disabled={carregando} onClick={() => acao(nome, 'creditar', aCreditar)}
                            style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: carregando ? 0.6 : 1 }}>
                            + Creditar {moeda(aCreditar)}
                          </button>
                        )}
                        {saldo > 0 && (
                          <>
                            <button disabled={carregando} onClick={() => { if (confirm(`Pagar todo o saldo de ${nome} (${moeda(saldo)})?`)) acao(nome, 'pagar') }}
                              style={{ background: '#5b4fcf', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: carregando ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {carregando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Pagar tudo
                            </button>
                            <button disabled={carregando} onClick={() => { setAdiantando(nome); setValorAdiant('') }}
                              style={{ background: '#fff', color: '#5b4fcf', border: '1.5px solid #5b4fcf', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <HandCoins size={12} /> Adiantar
                            </button>
                          </>
                        )}
                        {aCreditar <= 0 && saldo <= 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de adiantamento */}
      {adiantando && (() => {
        const nomeAd = adiantando as string
        const saldo = carteira[nomeAd]?.saldo || 0
        const v = Math.round((Number(valorAdiant.replace(',', '.')) || 0) * 100) / 100
        return (
          <div onClick={() => setAdiantando(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>Adiantamento — {nomeAd}</h3>
              <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 14px' }}>Saldo disponível: <strong style={{ color: '#5b4fcf' }}>{moeda(saldo)}</strong>. O restante continua na carteira.</p>
              <input autoFocus value={valorAdiant} onChange={e => setValorAdiant(e.target.value)} placeholder="Valor a adiantar (ex: 50,00)"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 14, color: '#1a1a1a', marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAdiantando(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #e0ddd8', background: '#fff', color: '#767069', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button disabled={v <= 0 || v > saldo + 0.001 || busy === nomeAd}
                  onClick={() => acao(nomeAd, 'adiantar', v)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#5b4fcf', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (v <= 0 || v > saldo + 0.001) ? 0.5 : 1 }}>
                  {busy === nomeAd ? <Loader2 size={14} className="animate-spin" /> : `Adiantar ${v > 0 ? moeda(v) : ''}`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
