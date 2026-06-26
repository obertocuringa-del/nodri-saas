'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Cake, Loader2, Gift } from 'lucide-react'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Aniv { nome: string; cargo?: string; dia: number; mes: number; idade: number | null; data: string }

function corAvatar(nome: string) {
  let h = 0; for (let i = 0; i < nome.length; i++) h = nome.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360} 65% 55%)`
}

export default function AniversariantesPage() {
  const router = useRouter()
  const [lista, setLista] = useState<Aniv[]>([])
  const [loading, setLoading] = useState(true)
  const mesAtual = new Date().getMonth() + 1

  const carregar = useCallback(async () => {
    try {
      const profs = await fetch('/api/profissionais').then(r => r.ok ? r.json() : []).catch(() => [])
      const hoje = new Date()
      const arr: Aniv[] = (Array.isArray(profs) ? profs : [])
        .filter((p: any) => p.data_aniversario)
        .map((p: any) => {
          const s = String(p.data_aniversario).slice(0, 10)
          const [y, m, d] = s.split('-').map(Number)
          // idade que completa no aniversário deste ano
          const idade: number | null = (y && y > 1900) ? hoje.getFullYear() - y : null
          return { nome: p.apelido || p.nome_completo || '—', cargo: p.cargo || '', dia: d || 0, mes: m || 0, idade, data: s }
        })
        .filter(a => a.mes >= 1 && a.mes <= 12)
      setLista(arr)
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  // Ordem dos meses: começa no mês atual e segue
  const ordemMeses = Array.from({ length: 12 }, (_, i) => ((mesAtual - 1 + i) % 12) + 1)
  const doMesAtual = lista.filter(a => a.mes === mesAtual).sort((a, b) => a.dia - b.dia)

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>🎂 Aniversariantes do Mês</span>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: 16 }}>
        {/* Destaque do mês atual */}
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)', borderRadius: 16, padding: '18px 22px', marginBottom: 18, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800 }}><Gift size={18} /> {MESES[mesAtual - 1]} — {doMesAtual.length} aniversariante{doMesAtual.length !== 1 ? 's' : ''}</div>
          <p style={{ fontSize: 12, opacity: 0.9, margin: '6px 0 0' }}>Quem faz aniversário este mês. Que tal mandar uma mensagem? 💛</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={26} className="animate-spin" style={{ color: '#7c3aed' }} /></div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#9ca3af', fontSize: 14 }}>
            Nenhum profissional com data de aniversário cadastrada. Preencha na ficha do profissional → Cadastro.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ordemMeses.map(mes => {
              const doMes = lista.filter(a => a.mes === mes).sort((a, b) => a.dia - b.dia)
              if (doMes.length === 0) return null
              const ehAtual = mes === mesAtual
              return (
                <div key={mes} style={{ background: '#fff', border: ehAtual ? '2px solid #7c3aed' : '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: ehAtual ? '#f0eefb' : '#faf9f7', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: ehAtual ? '#5b4fcf' : '#1a1a1a', fontSize: 14 }}>
                    <Cake size={15} /> {MESES[mes - 1]} <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>· {doMes.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {doMes.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: i > 0 ? '1px solid #f0eee8' : 'none' }}>
                        <span style={{ width: 38, height: 38, borderRadius: '50%', background: corAvatar(a.nome), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                          {a.nome.trim().charAt(0).toUpperCase()}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 14 }}>{a.nome}</div>
                          {a.cargo && <div style={{ fontSize: 11, color: '#9ca3af' }}>{a.cargo}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: '#db2777', fontSize: 14 }}>{String(a.dia).padStart(2, '0')}/{String(a.mes).padStart(2, '0')}</div>
                          {a.idade != null && <div style={{ fontSize: 11, color: '#6b6860' }}>faz {a.idade} anos</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
