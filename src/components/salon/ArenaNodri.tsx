'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Crown, MessageCircle, DollarSign, Swords } from 'lucide-react'

const moeda = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// cor do avatar a partir do nome
function corNome(nome: string) {
  let h = 0
  for (let i = 0; i < nome.length; i++) h = nome.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360} 65% 55%)`
}
function Avatar({ nome, size = 40 }: { nome: string; size?: number }) {
  const ini = (nome || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: corNome(nome), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.38, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,.2)' }}>{ini}</span>
  )
}

export default function ArenaNodri() {
  const [rec, setRec] = useState<any>(null)
  const [cart, setCart] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch('/api/relatorios/recuperacao?tipo=recuperados').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/salon/recepcionistas-carteira').then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      setRec(a); setCart(b)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  // monta estatísticas por recepcionista
  const stats: Record<string, { nome: string; recuperados: number; contatos: number; bonus: number; vitorias: number; pontos: number }> = {}
  const ensure = (n: string) => { if (!stats[n]) stats[n] = { nome: n, recuperados: 0, contatos: 0, bonus: 0, vitorias: 0, pontos: 0 } }
  for (const r of (rec?.ranking || [])) { ensure(r.nome); stats[r.nome].recuperados = r.recuperados || 0; stats[r.nome].contatos = r.contatos || 0; stats[r.nome].bonus = r.bonus || 0 }
  for (const d of (cart?.desafios || [])) { if (d.status === 'concluido' && d.vencedor) { ensure(d.vencedor); stats[d.vencedor].vitorias++ } }
  const lista = Object.values(stats)
  for (const s of lista) s.pontos = Math.round(s.recuperados * 100 + s.contatos * 10 + s.bonus + s.vitorias * 50)
  lista.sort((a, b) => b.pontos - a.pontos)

  if (lista.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Sem dados ainda. A Arena se preenche conforme as recepcionistas recuperam clientes e jogam.</div>

  const lider = (campo: 'recuperados' | 'contatos' | 'bonus' | 'vitorias') => {
    let melhor: any = null
    for (const s of lista) if ((s as any)[campo] > 0 && (!melhor || (s as any)[campo] > (melhor as any)[campo])) melhor = s
    return melhor
  }
  const titulos = [
    { titulo: '👑 Rainha da Recuperação', dono: lider('recuperados'), icon: <Crown size={14} />, cor: '#d97706' },
    { titulo: '💬 Mestre do WhatsApp', dono: lider('contatos'), icon: <MessageCircle size={14} />, cor: '#16a34a' },
    { titulo: '💰 Imperatriz das Vendas', dono: lider('bonus'), icon: <DollarSign size={14} />, cor: '#5b4fcf' },
    { titulo: '⚔️ Gladiadora da Arena', dono: lider('vitorias'), icon: <Swords size={14} />, cor: '#b91c1c' },
  ]
  const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#4338ca)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800 }}>🏟️ Arena NODRI</div>
        <p style={{ fontSize: 12, opacity: 0.85, margin: '6px 0 0' }}>Ranking gamificado da equipe. Pontos = recuperações ×100 + contatos ×10 + bônus + vitórias em desafios ×50.</p>
      </div>

      {/* Títulos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 18 }}>
        {titulos.map((t, i) => (
          <div key={i} style={{ border: '1px solid #e8e6e0', borderRadius: 12, padding: 12, background: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            {t.dono ? <Avatar nome={t.dono.nome} size={38} /> : <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#e5e7eb' }} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: t.cor }}>{t.titulo}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.dono ? t.dono.nome : '— sem dono ainda —'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pódio (top 3) */}
      {lista.length >= 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          {[1, 0, 2].map(pos => {
            const s = lista[pos]; if (!s) return null
            const alturas = [86, 64, 48]
            return (
              <div key={pos} style={{ textAlign: 'center' }}>
                <Avatar nome={s.nome} size={pos === 0 ? 56 : 46} />
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: '#1a1a1a' }}>{s.nome}</div>
                <div style={{ fontSize: 11, color: '#5b4fcf', fontWeight: 800 }}>{s.pontos} pts</div>
                <div style={{ width: 80, height: alturas[pos], background: pos === 0 ? 'linear-gradient(#fbbf24,#d97706)' : pos === 1 ? 'linear-gradient(#cbd5e1,#94a3b8)' : 'linear-gradient(#fdba74,#c2853f)', borderRadius: '8px 8px 0 0', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 900 }}>{medalha(pos)}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ranking completo */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#faf9f7' }}>
              {['#', 'Recepcionista', 'Pontos', 'Recuperadas', 'Contatos', 'Bônus', 'Vitórias'].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Recepcionista' ? 'left' : (h === '#' ? 'center' : 'right'), fontSize: 11, color: '#6b6860', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {lista.map((s, i) => (
                <tr key={s.nome} style={{ borderTop: '1px solid #f0eee8', background: i < 3 ? '#fffbeb' : 'transparent' }}>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 15 }}>{medalha(i)}</td>
                  <td style={{ padding: '8px 12px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar nome={s.nome} size={28} /><strong style={{ color: '#1a1a1a' }}>{s.nome}</strong></span></td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#5b4fcf' }}>{s.pontos}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{s.recuperados}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#767069' }}>{s.contatos}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#d97706' }}>{moeda(s.bonus)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#b91c1c', fontWeight: 700 }}>{s.vitorias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
