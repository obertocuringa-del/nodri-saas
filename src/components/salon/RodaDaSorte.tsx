'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, Sparkles, Trophy, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const moeda = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Geometria da roda (0° = topo, sentido horário)
function polar(cx: number, cy: number, r: number, ang: number) {
  const a = (ang - 90) * Math.PI / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}
function slice(cx: number, cy: number, r: number, ini: number, fim: number) {
  const [x1, y1] = polar(cx, cy, r, ini)
  const [x2, y2] = polar(cx, cy, r, fim)
  const big = fim - ini > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${big} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
}

export default function RodaDaSorte() {
  const [carteira, setCarteira] = useState<Record<string, any>>({})
  const [roda, setRoda] = useState<{ label: string; mult: number; cor: string }[]>([])
  const [limite, setLimite] = useState(3)
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [aposta, setAposta] = useState('10')
  const [girando, setGirando] = useState(false)
  const [rotacao, setRotacao] = useState(0)
  const [resultado, setResultado] = useState<any>(null)
  const timer = useRef<any>(null)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/recepcionistas-carteira').then(r => r.ok ? r.json() : null).catch(() => null)
      if (d) {
        setCarteira(d.carteira || {})
        setRoda(d.roda || [])
        setLimite(d.limite_jogadas_dia || 3)
        setNome(prev => prev || Object.keys(d.carteira || {})[0] || '')
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { carregar(); return () => clearTimeout(timer.current) }, [carregar])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  const nomes = Object.keys(carteira)
  const c = carteira[nome] || { saldo: 0, jogadas_hoje: 0 }
  const saldo = c.saldo || 0
  const restantes = Math.max(0, limite - (c.jogadas_hoje || 0))
  const apostaNum = Math.round((Number(aposta.replace(',', '.')) || 0) * 100) / 100
  const podeJogar = !girando && nome && apostaNum > 0 && apostaNum <= saldo && restantes > 0
  const N = roda.length || 1
  const seg = 360 / N

  async function girar() {
    if (!podeJogar) return
    setGirando(true); setResultado(null)
    try {
      const res = await fetch('/api/salon/recepcionistas-carteira', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'jogar', nome, aposta: apostaNum }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d?.error || 'Erro'); setGirando(false); return }
      // Anima a roda até o segmento sorteado
      const centro = (d.indice + 0.5) * seg
      const base = Math.ceil((rotacao + 1) / 360) * 360
      const alvo = base + 360 * 5 + (360 - centro)
      setRotacao(alvo)
      timer.current = setTimeout(async () => {
        setResultado(d)
        if (d.premio > d.aposta) toast.success(`${d.label}! Ganhou ${moeda(d.premio)}`)
        else if (d.premio > 0) toast(`${d.label} — recebeu ${moeda(d.premio)}`)
        else toast(`${d.label} — não foi dessa vez`)
        await carregar()
        setGirando(false)
      }, 4200)
    } catch { toast.error('Erro de conexão'); setGirando(false) }
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800 }}><Sparkles size={18} color="#fbbf24" /> Sala de Recompensas — Roda da Sorte</div>
        <p style={{ fontSize: 12, opacity: 0.85, margin: '6px 0 0' }}>
          A recepcionista gira com o saldo de bônus. Pode ganhar ou perder — as chances são equilibradas a favor do salão. Limite de {limite} jogadas por dia.
        </p>
      </div>

      {nomes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>
          Nenhuma recepcionista com saldo. Credite o bônus na aba <strong>Carteira & Pagamentos</strong> primeiro.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,340px) 1fr', gap: 20, alignItems: 'start' }}>
          {/* Roda */}
          <div style={{ background: 'radial-gradient(circle at 50% 40%, #312e81, #0f0c29)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 280, height: 290 }}>
              {/* Ponteiro */}
              <div style={{ position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', zIndex: 3, width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '24px solid #fbbf24', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))' }} />
              <svg width="280" height="280" viewBox="0 0 200 200" style={{ transform: `rotate(${rotacao}deg)`, transition: 'transform 4s cubic-bezier(.17,.67,.18,1)', filter: 'drop-shadow(0 0 18px rgba(251,191,36,.35))' }}>
                <circle cx="100" cy="100" r="99" fill="#0f0c29" stroke="#fbbf24" strokeWidth="2" />
                {roda.map((s, i) => {
                  const ini = i * seg, fim = (i + 1) * seg
                  const [lx, ly] = polar(100, 100, 62, ini + seg / 2)
                  return (
                    <g key={i}>
                      <path d={slice(100, 100, 95, ini, fim)} fill={s.cor} stroke="#0f0c29" strokeWidth="1" />
                      <text x={lx} y={ly} fill="#0f172a" fontSize="8" fontWeight="800" textAnchor="middle" dominantBaseline="middle"
                        transform={`rotate(${ini + seg / 2} ${lx} ${ly})`}>{s.label}</text>
                    </g>
                  )
                })}
                <circle cx="100" cy="100" r="15" fill="#fbbf24" stroke="#0f0c29" strokeWidth="2" />
              </svg>
            </div>
            {resultado && (
              <div style={{ marginTop: 8, textAlign: 'center', background: resultado.premio > resultado.aposta ? 'rgba(251,191,36,.18)' : 'rgba(255,255,255,.08)', borderRadius: 12, padding: '8px 14px', width: '100%' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: resultado.premio > resultado.aposta ? '#fbbf24' : '#e5e7eb' }}>
                  {resultado.premio > resultado.aposta ? <><Trophy size={13} style={{ verticalAlign: -2 }} /> {resultado.label}</> : resultado.label}
                </div>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Apostou {moeda(resultado.aposta)} · Recebeu {moeda(resultado.premio)}</div>
              </div>
            )}
          </div>

          {/* Controles */}
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 16, padding: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 5 }}>Recepcionista</label>
            <select value={nome} onChange={e => { setNome(e.target.value); setResultado(null) }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 14, color: '#1a1a1a', marginBottom: 14 }}>
              {nomes.map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, background: '#f0eefb', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#6b6860', textTransform: 'uppercase', fontWeight: 700 }}>Saldo</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#5b4fcf' }}>{moeda(saldo)}</div>
              </div>
              <div style={{ flex: 1, background: '#f5f4f0', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#6b6860', textTransform: 'uppercase', fontWeight: 700 }}>Jogadas hoje</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: restantes > 0 ? '#16a34a' : '#ef4444' }}>{restantes} <span style={{ fontSize: 12, color: '#9ca3af' }}>de {limite}</span></div>
              </div>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 5 }}>Valor da aposta</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {[5, 10, 20, 50].map(v => (
                <button key={v} onClick={() => setAposta(String(v))} disabled={v > saldo}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid ' + (apostaNum === v ? '#5b4fcf' : '#d0cdc7'), background: apostaNum === v ? '#f0eefb' : '#fff', color: v > saldo ? '#cbd5e1' : '#5b4fcf', fontSize: 12, fontWeight: 700, cursor: v > saldo ? 'not-allowed' : 'pointer' }}>
                  {moeda(v)}
                </button>
              ))}
            </div>
            <input value={aposta} onChange={e => setAposta(e.target.value)} placeholder="Outro valor"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, color: '#1a1a1a', marginBottom: 14 }} />

            <button onClick={girar} disabled={!podeJogar}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: podeJogar ? 'linear-gradient(135deg,#7c3aed,#db2777)' : '#d1d5db', color: '#fff', fontSize: 15, fontWeight: 800, cursor: podeJogar ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: podeJogar ? '0 6px 18px rgba(124,58,237,.4)' : 'none' }}>
              {girando ? <><Loader2 size={18} className="animate-spin" /> Girando...</> : <><Sparkles size={18} /> GIRAR</>}
            </button>

            {restantes <= 0 && <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#ef4444', margin: '10px 0 0' }}><AlertTriangle size={12} /> Limite de jogadas de hoje atingido.</p>}
            {apostaNum > saldo && saldo > 0 && <p style={{ fontSize: 11, color: '#ef4444', margin: '10px 0 0' }}>Aposta maior que o saldo.</p>}

            {/* Tabela de prêmios */}
            <div style={{ marginTop: 16, borderTop: '1px solid #f0eee8', paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6860', marginBottom: 6 }}>Prêmios (multiplicador da aposta)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {roda.map((s, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#374151', background: '#faf9f7', borderRadius: 20, padding: '3px 8px' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.cor }} /> {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
