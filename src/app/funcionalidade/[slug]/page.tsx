'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Carrossel, { type Midia } from '@/components/Carrossel'

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
  titulo: string; descricao?: string; destaques?: { titulo: string; desc?: string }[]
  video_url?: string; imagem_url?: string; botao_texto?: string
  midias?: { tipo?: 'imagem' | 'video'; url: string }[]; intervalo?: number
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

  // `midias` é a lista nova. Sem ela, os campos antigos viram um item só —
  // quem já cadastrou funcionalidade não perde a imagem que tinha posto.
  const midias: Midia[] = (f.midias || []).filter(m => m?.url?.trim()).length
    ? (f.midias as Midia[]).filter(m => m?.url?.trim())
    : [
        ...(f.video_url ? [{ tipo: 'video' as const, url: f.video_url }] : []),
        ...(f.imagem_url ? [{ tipo: 'imagem' as const, url: f.imagem_url }] : []),
      ]
  const temMidia = midias.length > 0

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#f7fafc', minHeight: '100vh', color: '#1a1a1a' }}>
      <header style={{
        background: '#fff', borderBottom: '1px solid #e3e8f0',
        padding: '2px clamp(16px,4vw,44px)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
          <img src="/logo-nodri.png" alt="NODRI" style={{ height: 'clamp(60px, 6.4vw, 84px)', width: 'auto', margin: '-12px 0' }} />
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

      <section style={{ background: '#fff', borderBottom: '1px solid #e3e8f0', padding: 'clamp(24px,3vw,40px) 20px' }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto', display: 'grid',
          // Alinhado pelo TOPO, não pelo centro. Centralizado, o vídeo flutua
          // no meio de um texto mais alto e nada encosta em nada — o olho lê
          // isso como desalinhamento. Pelo topo, título e vídeo começam na
          // mesma linha.
          gap: 'clamp(28px,4vw,52px)', alignItems: 'start',
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
                  <div key={i} style={{ background: '#f7fafc', border: '1px solid #e3e8f0', borderRadius: 12, padding: '15px 17px' }}>
                    <div style={{ width: 24, height: 3, borderRadius: 3, background: CIANO, marginBottom: 9 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: MARINHO, lineHeight: 1.4 }}>{d.titulo}</div>
                    {/* Só ocupa espaço quando existe: card com título solto e um
                        vazio embaixo fica pior do que card só com título. */}
                    {d.desc && (
                      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginTop: 6 }}>{d.desc}</div>
                    )}
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
            // Comeca na linha do TITULO, nao no topo absoluto. Alinhado com a
            // etiqueta, a midia subia demais e o bloco ficava alto; descer ate
            // o titulo faz os dois lados comecarem no mesmo ponto de leitura.
            <div style={{ marginTop: f.etiqueta ? 'clamp(42px, 4.4vw, 56px)' : 0 }}>
              <Carrossel midias={midias} intervalo={f.intervalo || 5} alturaMax="56vh" />
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
