'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

// ── Página de uma funcionalidade ────────────────────────────────────────────
//
// Título grande, descrição, e à direita a mídia: vídeo do YouTube ou imagem.
// O vídeo ganha quando os dois existem — ele mostra o sistema funcionando, que
// é a vantagem contra quem só tem foto de banco de imagens. Sem nenhum dos
// dois, a coluna some e o texto ocupa a página inteira, em vez de deixar um
// buraco cinza no meio.

interface Func {
  slug: string; categoria: string; nome: string; etiqueta?: string
  titulo: string; descricao?: string; destaques?: { titulo: string }[]
  video_url?: string; imagem_url?: string; botao_texto?: string
}

/** Aceita youtu.be, /watch?v= e /embed/ — o dono cola o link que tiver na mão. */
function idDoYoutube(url: string): string | null {
  const u = String(url || '')
  const m = u.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}

export default function FuncionalidadePage() {
  const params = useParams()
  const slug = params?.slug as string
  const [f, setF] = useState<Func | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/funcionalidades')
      .then(r => r.ok ? r.json() : [])
      .then((lista: Func[]) => {
        setF((Array.isArray(lista) ? lista : []).find(x => x.slug === slug) || null)
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
  }, [slug])

  if (carregando) return <Centro texto="Carregando…" />
  if (!f) return <Centro texto="Funcionalidade não encontrada." link />

  const yt = f.video_url ? idDoYoutube(f.video_url) : null
  const temMidia = !!yt || !!f.imagem_url

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#f7fafc', minHeight: '100vh', color: '#1a1a1a' }}>
      <header style={{
        background: '#fff', borderBottom: '1px solid #e3e8f0',
        padding: '10px clamp(16px,4vw,44px)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
          <img src="/logo-nodri.png" alt="NODRI" style={{ height: 'clamp(46px, 5vw, 64px)', width: 'auto' }} />
        </a>
        <a href="/#contato" style={{
          padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
          border: `2px solid ${MARINHO}`, color: MARINHO, fontWeight: 800, fontSize: 13,
        }}>FALE CONOSCO</a>
        <a href="/login" style={{
          padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
          background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 13,
        }}>JÁ SOU CLIENTE</a>
      </header>

      <section style={{ background: '#fff', borderBottom: '1px solid #e3e8f0', padding: 'clamp(34px,5vw,64px) 20px' }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto', display: 'grid',
          gap: 'clamp(28px,4vw,52px)', alignItems: 'center',
          gridTemplateColumns: temMidia ? 'repeat(auto-fit, minmax(min(100%,400px), 1fr))' : '1fr',
        }}>
          <div style={{ maxWidth: temMidia ? undefined : 780, margin: temMidia ? undefined : '0 auto', textAlign: temMidia ? 'left' : 'center' }}>
            {f.etiqueta && (
              <div style={{
                display: 'inline-block', padding: '7px 16px', borderRadius: 999,
                background: '#e6f7fb', color: '#046b85', fontSize: 11.5, fontWeight: 800,
                letterSpacing: '.5px', marginBottom: 20, textTransform: 'uppercase',
              }}>{f.etiqueta}</div>
            )}

            <h1 style={{
              fontSize: 'clamp(26px,3.4vw,42px)', fontWeight: 900, lineHeight: 1.15,
              letterSpacing: '-1px', marginBottom: 18, color: MARINHO,
            }}>{f.titulo}</h1>

            {f.descricao && (
              <p style={{ fontSize: 'clamp(14.5px,1.6vw,16.5px)', lineHeight: 1.75, color: '#4b5563', marginBottom: 26 }}>
                {f.descricao}
              </p>
            )}

            {!!(f.destaques || []).length && (
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', marginBottom: 28 }}>
                {(f.destaques || []).map((d, i) => (
                  <div key={i} style={{ background: '#f7fafc', border: '1px solid #e3e8f0', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ width: 24, height: 3, borderRadius: 3, background: CIANO, marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: MARINHO, lineHeight: 1.4 }}>{d.titulo}</div>
                  </div>
                ))}
              </div>
            )}

            <a href="/#contato" style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '16px 36px', borderRadius: 12, textDecoration: 'none',
              background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 15.5,
              boxShadow: '0 8px 26px rgba(13,42,86,.22)',
            }}>{f.botao_texto || 'Abrir'} →</a>
          </div>

          {temMidia && (
            <div>
              {yt ? (
                <div style={{
                  position: 'relative', paddingTop: '56.25%', borderRadius: 18,
                  overflow: 'hidden', boxShadow: '0 18px 50px rgba(13,42,86,.14)',
                  border: '1px solid #e3e8f0', background: '#000',
                }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${yt}`}
                    title={f.titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                  />
                </div>
              ) : (
                <img src={f.imagem_url} alt={f.titulo}
                  style={{
                    width: '100%', height: 'auto', borderRadius: 18,
                    border: '1px solid #e3e8f0', boxShadow: '0 18px 50px rgba(13,42,86,.12)',
                  }} />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Centro({ texto, link }: { texto: string; link?: boolean }) {
  return (
    <div style={{
      fontFamily: 'Segoe UI, sans-serif', background: '#f7fafc', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: 30, gap: 18,
    }}>
      <img src="/logo-nodri.png" alt="NODRI" style={{ height: 46, width: 'auto' }} />
      <p style={{ color: '#6b7280', fontSize: 15 }}>{texto}</p>
      {link && (
        <a href="/" style={{
          padding: '13px 28px', borderRadius: 12, textDecoration: 'none',
          background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 14.5,
        }}>Voltar para o início</a>
      )}
    </div>
  )
}
