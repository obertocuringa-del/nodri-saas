'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// ── Página de planos — só com convite ───────────────────────────────────────
//
// Os preços saíram da vitrine pública de propósito. Quem chega em
// nodri.com.br vê a apresentação e deixa contato; você conversa e, quando fizer
// sentido, libera o link que abre esta página.
//
// A checagem acontece no servidor (/api/leads/validar): sem `?c=` de um
// contato liberado, esta página não mostra preço nenhum.
//
// Isto não é segredo militar — quem receber o link pode repassá-lo. O objetivo
// é comercial: preço não fica exposto para concorrente nem para quem ainda não
// conversou com você. Se um link vazar, dá para revogar no admin sem apagar o
// contato.

interface PlanoVitrine {
  nome: string; slug: string; preco: number; resumo: string
  novidades: string[]; herda: string | null; destaque: boolean
}
const CORES = ['#3498db', '#5b4fcf', '#9b59b6', '#f39c12']

function PlanosInner() {
  const params = useSearchParams()
  const codigo = params?.get('c') || ''

  const [estado, setEstado] = useState<'checando' | 'ok' | 'negado'>('checando')
  const [nome, setNome] = useState('')
  const [planos, setPlanos] = useState<PlanoVitrine[]>([])

  useEffect(() => {
    if (!codigo) { setEstado('negado'); return }
    fetch(`/api/leads/validar?c=${encodeURIComponent(codigo)}`)
      .then(r => r.json())
      .then(d => {
        if (!d?.valido) { setEstado('negado'); return }
        setNome(d.nome || '')
        setEstado('ok')
        return fetch('/api/planos-publicos').then(r => r.json()).then(p => {
          if (Array.isArray(p)) setPlanos(p)
        })
      })
      .catch(() => setEstado('negado'))
  }, [codigo])

  if (estado === 'checando') {
    return <Centro><p style={{ color: '#6b6860' }}>Verificando seu acesso…</p></Centro>
  }

  if (estado === 'negado') {
    return (
      <Centro>
        <img src="/logo.png" alt="NODRI" style={{ width: 54, height: 54, borderRadius: 14, marginBottom: 18 }} />
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', marginBottom: 10 }}>
          Esta página é por convite
        </h1>
        <p style={{ color: '#6b6860', fontSize: 14.5, lineHeight: 1.65, maxWidth: 420, marginBottom: 22 }}>
          Os planos do NODRI são apresentados depois de uma conversa, para você contratar
          o que realmente faz sentido para o seu salão. Deixe seu contato que retornamos.
        </p>
        <a href="/#contato" style={{
          padding: '14px 30px', borderRadius: 12, textDecoration: 'none',
          background: 'linear-gradient(135deg,#5b4fcf,#f43f8e)', color: '#fff',
          fontWeight: 800, fontSize: 15,
        }}>Falar com o NODRI</a>
      </Centro>
    )
  }

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#f5f4f0', minHeight: '100vh', color: '#1a1a1a' }}>
      <header style={{
        background: '#fff', borderBottom: '1px solid #e8e6e0',
        padding: '12px clamp(16px,4vw,40px)', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 'auto' }}>
          <img src="/logo.png" alt="NODRI" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <span style={{
            fontSize: 21, fontWeight: 900,
            background: 'linear-gradient(135deg,#5b4fcf,#f43f8e)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>NODRI</span>
        </a>
        <a href="/login" style={{
          padding: '9px 20px', borderRadius: 999, textDecoration: 'none',
          border: '2px solid #5b4fcf', color: '#5b4fcf', fontWeight: 800, fontSize: 13,
        }}>JÁ SOU CLIENTE</a>
      </header>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(32px,6vw,60px) 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {nome && (
            <div style={{
              display: 'inline-block', padding: '7px 18px', borderRadius: 999,
              background: '#efecff', color: '#5b4fcf', fontSize: 12.5, fontWeight: 800, marginBottom: 16,
            }}>Olá, {nome} — seu acesso está liberado</div>
          )}
          <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, letterSpacing: '-0.8px', marginBottom: 12 }}>
            Escolha o plano do seu salão
          </h1>
          <p style={{ color: '#6b6860', fontSize: 15.5, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            Mensal, sem fidelidade. Cada plano acrescenta ao anterior — você sobe quando precisar.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,250px), 1fr))' }}>
          {planos.map((plano, i) => {
            const cor = CORES[i % CORES.length]
            return (
              <div key={plano.slug} style={{
                background: '#fff', borderRadius: 20, padding: 28,
                border: plano.destaque ? `2px solid ${cor}` : '1px solid #e8e6e0',
                position: 'relative', transform: plano.destaque ? 'scale(1.03)' : 'none',
              }}>
                {plano.destaque && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: cor, color: '#fff', padding: '4px 20px', borderRadius: 20,
                    fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                  }}>MAIS ESCOLHIDO</div>
                )}
                <div style={{ color: cor, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{plano.nome}</div>
                <div style={{ fontSize: 42, fontWeight: 900, marginBottom: 6 }}>
                  R${plano.preco}<span style={{ fontSize: 15, color: '#6b6860', fontWeight: 400 }}>/mês</span>
                </div>
                <p style={{ color: '#6b6860', fontSize: 13, lineHeight: 1.55, minHeight: 38 }}>{plano.resumo}</p>

                <div style={{ borderTop: '1px solid #e8e6e0', marginTop: 20, paddingTop: 20 }}>
                  {plano.herda && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10, color: '#6b6860', fontSize: 13.5, fontWeight: 600 }}>
                      <span style={{ color: cor }}>✓</span> Tudo do {plano.herda}
                    </div>
                  )}
                  {plano.novidades.map(m => (
                    <div key={m} style={{ display: 'flex', gap: 10, marginBottom: 10, color: '#3a3835', fontSize: 13.5 }}>
                      <span style={{ color: cor }}>✓</span> {m}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, color: '#8b8798', fontSize: 12, lineHeight: 1.5 }}>
                    <span style={{ color: cor }}>+</span>
                    <span>Check list, calendários, setores, feedback de cliente, lojistas, currículos e ações comerciais — em todos os planos.</span>
                  </div>
                </div>

                <button onClick={() => { window.location.href = `/cadastro?plano=${encodeURIComponent(plano.nome)}&c=${encodeURIComponent(codigo)}` }}
                  style={{
                    width: '100%', marginTop: 24, padding: '13px 0', cursor: 'pointer',
                    background: plano.destaque ? cor : 'transparent',
                    border: `2px solid ${cor}`, color: plano.destaque ? '#fff' : cor,
                    borderRadius: 12, fontSize: 15, fontWeight: 700,
                  }}>
                  Assinar {plano.nome}
                </button>
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', color: '#8b8798', fontSize: 12.5, marginTop: 28 }}>
          A cobrança é mensal no cartão, automática. Você cancela quando quiser.
        </p>
      </section>
    </div>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'Segoe UI, sans-serif', background: '#f5f4f0', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: 30, color: '#1a1a1a',
    }}>{children}</div>
  )
}

export default function PlanosPage() {
  return (
    <Suspense fallback={<Centro><p style={{ color: '#6b6860' }}>Carregando…</p></Centro>}>
      <PlanosInner />
    </Suspense>
  )
}
