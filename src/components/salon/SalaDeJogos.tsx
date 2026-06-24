'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, Sparkles, Trophy, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const moeda = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const JOGOS = [
  { id: 'roda', nome: 'Roda da Sorte', emoji: '🎡' },
  { id: 'dados', nome: 'Batalha de Dados', emoji: '🎲' },
  { id: 'cartas', nome: 'Batalha de Cartas', emoji: '🃏' },
  { id: 'mines', nome: 'Mina de Diamantes', emoji: '💎' },
  { id: 'caixas', nome: 'Caixas Misteriosas', emoji: '🎁' },
]

// geometria da roda
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

export default function SalaDeJogos() {
  const [carteira, setCarteira] = useState<Record<string, any>>({})
  const [roda, setRoda] = useState<{ label: string; mult: number; cor: string }[]>([])
  const [limite, setLimite] = useState(3)
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [aposta, setAposta] = useState('10')
  const [jogo, setJogo] = useState('roda')
  const [girando, setGirando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [rotacao, setRotacao] = useState(0)
  const [minasQtd, setMinasQtd] = useState(3)
  const timer = useRef<any>(null)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/recepcionistas-carteira').then(r => r.ok ? r.json() : null).catch(() => null)
      if (d) {
        setCarteira(d.carteira || {})
        setRoda(d.roda || [])
        setLimite(d.limite_jogadas_dia || 3)
        setNome((prev: string) => prev || Object.keys(d.carteira || {})[0] || '')
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
  const podeJogar = !girando && !!nome && apostaNum > 0 && apostaNum <= saldo && restantes > 0
  const N = roda.length || 1
  const seg = 360 / N

  async function jogar(extra: any = {}) {
    if (!podeJogar) return
    setGirando(true); setResultado(null)
    try {
      const res = await fetch('/api/salon/recepcionistas-carteira', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'jogar', nome, aposta: apostaNum, jogo, ...extra }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d?.error || 'Erro'); setGirando(false); return }
      const finalizar = async () => {
        setResultado(d)
        if (d.premio > d.aposta) toast.success(`🎉 ${d.label}! Ganhou ${moeda(d.premio)}`)
        else if (d.premio > 0) toast(`${d.label} — recebeu ${moeda(d.premio)}`)
        else toast(`${d.label} — não foi dessa vez`)
        await carregar()
        setGirando(false)
      }
      if (jogo === 'roda') {
        const centro = (d.indice + 0.5) * seg
        const base = Math.ceil((rotacao + 1) / 360) * 360
        setRotacao(base + 360 * 5 + (360 - centro))
        timer.current = setTimeout(finalizar, 4200)
      } else {
        // pequena espera para a animação dos outros jogos
        timer.current = setTimeout(finalizar, jogo === 'mines' || jogo === 'caixas' ? 900 : 700)
      }
    } catch { toast.error('Erro de conexão'); setGirando(false) }
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800 }}><Sparkles size={18} color="#fbbf24" /> Sala de Recompensas</div>
        <p style={{ fontSize: 12, opacity: 0.85, margin: '6px 0 0' }}>
          A recepcionista joga com o saldo de bônus. Chances equilibradas a favor do salão. Limite de {limite} jogadas por dia.
        </p>
      </div>

      {nomes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>
          Nenhuma recepcionista com saldo. Credite o bônus na aba <strong>Carteira & Pagamentos</strong> primeiro.
        </div>
      ) : (
        <>
          {/* Seletor de jogos */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {JOGOS.map(j => (
              <button key={j.id} onClick={() => { setJogo(j.id); setResultado(null) }}
                style={{ padding: '8px 14px', borderRadius: 10, border: jogo === j.id ? '2px solid #7c3aed' : '1.5px solid #e0ddd8', background: jogo === j.id ? '#f0eefb' : '#fff', color: jogo === j.id ? '#5b4fcf' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {j.emoji} {j.nome}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,360px) 1fr', gap: 20, alignItems: 'start' }}>
            {/* Área do jogo */}
            <div style={{ background: 'radial-gradient(circle at 50% 35%, #312e81, #0f0c29)', borderRadius: 16, padding: 20, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

              {/* RODA */}
              {jogo === 'roda' && (
                <div style={{ position: 'relative', width: 280, height: 290 }}>
                  <div style={{ position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', zIndex: 3, width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '24px solid #fbbf24', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))' }} />
                  <svg width="280" height="280" viewBox="0 0 200 200" style={{ transform: `rotate(${rotacao}deg)`, transition: 'transform 4s cubic-bezier(.17,.67,.18,1)', filter: 'drop-shadow(0 0 18px rgba(251,191,36,.35))' }}>
                    <circle cx="100" cy="100" r="99" fill="#0f0c29" stroke="#fbbf24" strokeWidth="2" />
                    {roda.map((s, i) => {
                      const ini = i * seg, fim = (i + 1) * seg
                      const [lx, ly] = polar(100, 100, 62, ini + seg / 2)
                      return (
                        <g key={i}>
                          <path d={slice(100, 100, 95, ini, fim)} fill={s.cor} stroke="#0f0c29" strokeWidth="1" />
                          <text x={lx} y={ly} fill="#0f172a" fontSize="8" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${ini + seg / 2} ${lx} ${ly})`}>{s.label}</text>
                        </g>
                      )
                    })}
                    <circle cx="100" cy="100" r="15" fill="#fbbf24" stroke="#0f0c29" strokeWidth="2" />
                  </svg>
                </div>
              )}

              {/* DADOS */}
              {jogo === 'dados' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {(resultado?.dados || [1, 1, 1]).map((v: number, i: number) => (
                      <div key={i} style={{ width: 60, height: 60, borderRadius: 12, background: '#fff', color: '#1e1b4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, boxShadow: '0 4px 10px rgba(0,0,0,.4)', transform: girando ? 'rotate(12deg)' : 'none', transition: 'transform .2s' }}>
                        {girando ? '🎲' : v}
                      </div>
                    ))}
                  </div>
                  {resultado && <div style={{ color: '#fbbf24', fontWeight: 800, marginTop: 14, fontSize: 16 }}>Soma {resultado.soma}</div>}
                </div>
              )}

              {/* CARTAS */}
              {jogo === 'cartas' && (
                <div style={{ width: 130, height: 185, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: '0 6px 20px rgba(0,0,0,.5)', color: resultado?.vermelho ? '#dc2626' : '#1a1a1a' }}>
                  {girando ? <span style={{ fontSize: 50 }}>🂠</span> : resultado ? (
                    <>
                      <span style={{ fontSize: 44, fontWeight: 900 }}>{resultado.rank}</span>
                      <span style={{ fontSize: 40 }}>{resultado.naipe}</span>
                    </>
                  ) : <span style={{ fontSize: 50, color: '#cbd5e1' }}>🂠</span>}
                </div>
              )}

              {/* MINES */}
              {jogo === 'mines' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                    {[...Array(25)].map((_, i) => {
                      const aberta = resultado?.abertas?.includes(i)
                      const bomba = resultado?.bombas?.includes(i)
                      const bg = aberta ? (bomba ? '#fee2e2' : '#dcfce7') : (resultado && bomba ? '#fff1f2' : '#1e293b')
                      return (
                        <div key={i} style={{ width: 44, height: 44, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid #334155' }}>
                          {aberta ? (bomba ? '💣' : '💎') : (resultado && bomba ? '💣' : '')}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* CAIXAS */}
              {jogo === 'caixas' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[...Array(12)].map((_, i) => {
                    const revelada = resultado?.caixas
                    const escolhida = resultado?.escolha === i
                    const val = revelada ? resultado.caixas[i] : null
                    return (
                      <button key={i} disabled={girando || !!resultado} onClick={() => jogar({ escolha: i })}
                        style={{ width: 56, height: 56, borderRadius: 10, border: escolhida ? '2px solid #fbbf24' : '1px solid #334155', background: revelada ? '#0f172a' : '#1e293b', color: '#fff', fontSize: revelada ? 13 : 24, fontWeight: 800, cursor: (girando || resultado) ? 'default' : 'pointer' }}>
                        {revelada ? (val > 0 ? `${val}×` : '—') : '🎁'}
                      </button>
                    )
                  })}
                </div>
              )}

              {resultado && (
                <div style={{ marginTop: 14, textAlign: 'center', background: resultado.premio > resultado.aposta ? 'rgba(251,191,36,.18)' : 'rgba(255,255,255,.08)', borderRadius: 12, padding: '8px 14px', width: '100%' }}>
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

              {/* Mines: quantos diamantes abrir */}
              {jogo === 'mines' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 5 }}>Quantos diamantes abrir (mais = mais prêmio, mais risco)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 3, 5, 7].map(q => (
                      <button key={q} onClick={() => setMinasQtd(q)} disabled={!!resultado}
                        style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1.5px solid ' + (minasQtd === q ? '#5b4fcf' : '#d0cdc7'), background: minasQtd === q ? '#f0eefb' : '#fff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {jogo === 'caixas' ? (
                <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 6px' }}>👉 Escolha uma das 12 caixas ao lado para jogar.</p>
              ) : (
                <button onClick={() => jogar(jogo === 'mines' ? { qtd: minasQtd } : {})} disabled={!podeJogar}
                  style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: podeJogar ? 'linear-gradient(135deg,#7c3aed,#db2777)' : '#d1d5db', color: '#fff', fontSize: 15, fontWeight: 800, cursor: podeJogar ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: podeJogar ? '0 6px 18px rgba(124,58,237,.4)' : 'none' }}>
                  {girando ? <><Loader2 size={18} className="animate-spin" /> Jogando...</> : <><Sparkles size={18} /> JOGAR</>}
                </button>
              )}

              {restantes <= 0 && <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#ef4444', margin: '10px 0 0' }}><AlertTriangle size={12} /> Limite de jogadas de hoje atingido.</p>}
              {apostaNum > saldo && saldo > 0 && <p style={{ fontSize: 11, color: '#ef4444', margin: '10px 0 0' }}>Aposta maior que o saldo.</p>}

              {jogo === 'roda' && roda.length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid #f0eee8', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6860', marginBottom: 6 }}>Prêmios (× da aposta)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {roda.map((s, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#374151', background: '#faf9f7', borderRadius: 20, padding: '3px 8px' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.cor }} /> {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
