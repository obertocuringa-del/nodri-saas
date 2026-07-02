'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Swords, Trophy, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { buscarComCache, buscarFresco } from '@/lib/fetchCache'

const moeda = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DesafioMatch() {
  const [carteira, setCarteira] = useState<Record<string, any>>({})
  const [desafios, setDesafios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [desafiante, setDesafiante] = useState('')
  const [desafiado, setDesafiado] = useState('')
  const [aposta, setAposta] = useState('10')
  const [duelo, setDuelo] = useState<any>(null) // resultado recém-resolvido (animação)

  const carregar = useCallback(async (fresco = false) => {
    const aplicar = (d: any) => {
      if (!d) return
      setCarteira(d.carteira || {})
      setDesafios(d.desafios || [])
      const ns = Object.keys(d.carteira || {})
      setDesafiante((p: string) => p || ns[0] || '')
      setDesafiado((p: string) => p || ns[1] || '')
      setLoading(false)
    }
    try {
      if (fresco) aplicar(await buscarFresco('/api/salon/recepcionistas-carteira'))
      else await buscarComCache('/api/salon/recepcionistas-carteira', aplicar)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function acao(payload: any, tag: string) {
    setBusy(tag)
    try {
      const res = await fetch('/api/salon/recepcionistas-carteira', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d?.error || 'Erro'); setBusy(''); return }
      if (payload.acao === 'desafio_criar') toast.success('Desafio criado! Aguardando aceite.')
      if (payload.acao === 'desafio_recusar') toast('Desafio recusado — aposta estornada.')
      if (payload.acao === 'desafio_aceitar') { setDuelo(d); toast.success(`🏆 ${d.vencedor} venceu o pote de ${moeda(d.pote)}!`) }
      await carregar(true)
    } catch { toast.error('Erro de conexão') }
    setBusy('')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  const nomes = Object.keys(carteira)
  const apostaNum = Math.round((Number(aposta.replace(',', '.')) || 0) * 100) / 100
  const saldoDesafiante = carteira[desafiante]?.saldo || 0
  const podeCriar = !!desafiante && !!desafiado && desafiante !== desafiado && apostaNum > 0 && apostaNum <= saldoDesafiante
  const pendentes = desafios.filter(d => d.status === 'pendente')
  const historico = desafios.filter(d => d.status !== 'pendente').slice(0, 12)

  if (nomes.length < 2) return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>É preciso ter pelo menos 2 recepcionistas com saldo. Credite o bônus em <strong>Carteira & Pagamentos</strong>.</div>

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800 }}><Swords size={18} color="#fde68a" /> Desafio 1×1</div>
        <p style={{ fontSize: 12, opacity: 0.9, margin: '6px 0 0' }}>Uma recepcionista desafia a outra. Cada uma aposta o mesmo valor; quem tirar a maior soma nos dados leva o pote inteiro.</p>
      </div>

      {/* Resultado do último duelo */}
      {duelo && duelo.resultado && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 14, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            {[0, 1].map(idx => {
              const nome = idx === 0 ? (historico[0]?.desafiante) : (historico[0]?.desafiado)
              const venceu = duelo.vencedor === nome
              return (
                <div key={idx} style={{ opacity: venceu ? 1 : 0.6 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: venceu ? '#b45309' : '#6b7280' }}>{venceu && <Trophy size={13} style={{ verticalAlign: -2 }} />} {nome || '—'}</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                    {(duelo.resultado.dados?.[idx] || []).map((v: number, i: number) => (
                      <span key={i} style={{ width: 34, height: 34, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>{v}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Soma {duelo.resultado.somas?.[idx]}</div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 10, fontWeight: 800, color: '#b45309' }}>🏆 {duelo.vencedor} levou {moeda(duelo.pote)}!</div>
        </div>
      )}

      {/* Criar desafio */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Criar um desafio</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, color: '#6b6860', display: 'block', marginBottom: 4 }}>Desafiante</label>
            <select value={desafiante} onChange={e => setDesafiante(e.target.value)} style={{ padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }}>
              {nomes.map(n => <option key={n} value={n}>{n} ({moeda(carteira[n]?.saldo || 0)})</option>)}
            </select>
          </div>
          <div style={{ color: '#b91c1c', fontWeight: 800, paddingBottom: 8 }}>VS</div>
          <div>
            <label style={{ fontSize: 11, color: '#6b6860', display: 'block', marginBottom: 4 }}>Desafiada</label>
            <select value={desafiado} onChange={e => setDesafiado(e.target.value)} style={{ padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }}>
              {nomes.map(n => <option key={n} value={n}>{n} ({moeda(carteira[n]?.saldo || 0)})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#6b6860', display: 'block', marginBottom: 4 }}>Aposta (cada uma)</label>
            <input value={aposta} onChange={e => setAposta(e.target.value)} style={{ width: 100, padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
          </div>
          <button disabled={!podeCriar || busy === 'criar'} onClick={() => acao({ acao: 'desafio_criar', desafiante, desafiado, aposta: apostaNum }, 'criar')}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: podeCriar ? '#b91c1c' : '#d1d5db', color: '#fff', fontWeight: 700, fontSize: 13, cursor: podeCriar ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {busy === 'criar' ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />} Desafiar
          </button>
        </div>
        {apostaNum > saldoDesafiante && <p style={{ fontSize: 11, color: '#ef4444', margin: '8px 0 0' }}>Saldo do desafiante insuficiente.</p>}
      </div>

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Desafios aguardando ({pendentes.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendentes.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', border: '1px solid #f0eee8', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                  <strong>{d.desafiante}</strong> <span style={{ color: '#b91c1c' }}>⚔ VS ⚔</span> <strong>{d.desafiado}</strong>
                  <span style={{ marginLeft: 8, color: '#d97706', fontWeight: 700 }}>aposta {moeda(d.aposta)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button disabled={busy === d.id} onClick={() => acao({ acao: 'desafio_aceitar', id: d.id }, d.id)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {busy === d.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Aceitar e rolar
                  </button>
                  <button disabled={busy === d.id} onClick={() => acao({ acao: 'desafio_recusar', id: d.id }, d.id)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: '1.5px solid #e0ddd8', background: '#fff', color: '#767069', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <X size={12} /> Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Últimos duelos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {historico.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid #f0eee8', paddingTop: 6 }}>
                <span style={{ color: '#1a1a1a' }}>{d.desafiante} vs {d.desafiado} · {moeda(d.aposta)}</span>
                <span style={{ fontWeight: 700, color: d.status === 'recusado' ? '#9ca3af' : '#16a34a' }}>
                  {d.status === 'recusado' ? 'recusado' : <>🏆 {d.vencedor}</>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
