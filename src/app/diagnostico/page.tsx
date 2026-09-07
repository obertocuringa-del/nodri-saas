import type { Metadata } from 'next'
import Quiz from './Quiz'
import { PERGUNTAS } from '@/lib/diagnostico'

// ── Diagnóstico do salão ────────────────────────────────────────────────────
//
// Página pública, e o motivo é o mesmo do FAQ: o que a NODRI sabe sobre gestão
// vive atrás de login, onde nem visitante nem robô alcança.
//
// A diferença é o que ela faz com a atenção. Argumento de venda o leitor
// discute; a própria resposta, não. Quem trava em "quanto de produto sai em um
// atendimento?" descobre sozinho que decide no escuro — e ninguém precisa
// dizer isso a ele.
//
// A parte interativa é client component. O resto — título, texto e as dez
// perguntas por extenso — é renderizado no servidor, então existe no HTML
// mesmo antes de o JavaScript rodar. É essa parte que o buscador lê.

const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

export const metadata: Metadata = {
  title: 'Diagnóstico do salão: 10 perguntas sobre os seus números',
  description:
    'Dez perguntas rápidas para descobrir quais números do seu salão de beleza estão sob controle e onde o dinheiro está vazando. Resultado na hora, sem cadastro.',
  alternates: { canonical: 'https://www.nodri.com.br/diagnostico' },
  openGraph: {
    title: 'Diagnóstico do salão: 10 perguntas sobre os seus números',
    description:
      'Descubra em dois minutos quais números do seu salão estão sob controle. Resultado na hora, sem cadastro.',
    url: 'https://www.nodri.com.br/diagnostico',
    type: 'article',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Quiz',
  name: 'Diagnóstico de gestão para salão de beleza',
  about: 'Gestão financeira, precificação e operação de salão de beleza',
  educationalLevel: 'Gestores de salão de beleza, barbearia e clínica de estética',
  hasPart: PERGUNTAS.map(p => ({
    '@type': 'Question',
    name: p.pergunta,
    acceptedAnswer: { '@type': 'Answer', text: `${p.porque} ${p.oQueFazer}` },
  })),
}

export default function DiagnosticoPage() {
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#f7fafc', minHeight: '100vh', color: '#1a1a1a' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <style>{`
        .dg-caixa {
          background: #fff; border: 1px solid #e3e8f0; border-radius: 18px;
          padding: clamp(22px,3.4vw,38px); box-shadow: 0 10px 34px rgba(13,42,86,.07);
        }
        .dg-opcao {
          display: block; width: 100%; text-align: left; cursor: pointer;
          background: #fbfdfe; border: 2px solid #e3e8f0; border-radius: 13px;
          padding: 15px 18px; transition: border-color .15s, background .15s, transform .1s;
          font-family: inherit;
        }
        .dg-opcao:hover { border-color: ${CIANO}; background: #f2fbfe; }
        .dg-opcao:active { transform: scale(.995); }
        .dg-opcao-rot {
          display: block; font-weight: 800; font-size: 15.5px; color: ${MARINHO};
          margin-bottom: 2px;
        }
        .dg-opcao-desc { display: block; font-size: 13px; color: #7d8fa5; }
        .dg-refazer {
          background: none; border: none; cursor: pointer; font-family: inherit;
          color: #7d8fa5; font-size: 13.5px; font-weight: 600; text-decoration: underline;
          padding: 6px 2px;
        }
        .dg-refazer:hover { color: ${MARINHO}; }
        .dg-lista li { margin-bottom: 9px; color: #4a5568; font-size: 14.5px; line-height: 1.65; }
        .dg-lista li strong { color: ${MARINHO}; font-weight: 700; }
        @media (max-width: 640px) {
          .dg-topo { gap: 8px !important; padding: 4px 12px !important; }
          .dg-topo img { height: 46px !important; margin: -4px 0 !important; }
          .dg-btn { padding: 9px 12px !important; font-size: 11px !important; white-space: nowrap; }
        }
      `}</style>

      <header className="dg-topo" style={{
        background: '#f2f7fb', borderBottom: '1px solid #e3e8f0',
        padding: '2px clamp(16px,4vw,44px)', display: 'flex', alignItems: 'center', gap: 14,
        flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
          <img src="/logo-nodri.png" alt="NODRI" style={{ height: 'clamp(60px, 6.4vw, 84px)', width: 'auto', margin: '-12px 0' }} />
        </a>
        <a href="/#contato" className="dg-btn" style={{
          padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
          border: `2px solid ${MARINHO}`, color: MARINHO, fontWeight: 800, fontSize: 13,
        }}>FALE CONOSCO</a>
        <a href="/login" className="dg-btn" style={{
          padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
          background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 13,
        }}>JÁ SOU CLIENTE</a>
      </header>

      <section style={{ background: '#fff', borderBottom: '1px solid #e3e8f0', padding: 'clamp(30px,4vw,52px) 20px clamp(24px,3vw,36px)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: '7px 16px', borderRadius: 999,
            background: '#e6f7fb', color: '#046b85', fontSize: 11.5, fontWeight: 800,
            letterSpacing: '.5px', marginBottom: 20, textTransform: 'uppercase',
          }}>Leva 2 minutos · sem cadastro</div>

          <h1 style={{
            fontSize: 'clamp(27px,3.6vw,42px)', fontWeight: 900, lineHeight: 1.14,
            letterSpacing: '-1px', marginBottom: 16, color: MARINHO,
          }}>Você sabe os números do seu salão?</h1>

          <p style={{ color: '#4a5568', fontSize: 16.5, lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
            São dez perguntas. Nenhuma delas é sobre o que você acha — todas são
            sobre um número que ou você tem, ou não tem. No fim, você vê onde o
            dinheiro está escapando.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(24px,3.4vw,40px) 20px 20px' }}>
        <Quiz />
      </main>

      {/* As perguntas por extenso. Existe por dois motivos: é o conteúdo que o
          buscador lê (o quiz é montado por JavaScript), e serve a quem prefere
          só olhar a lista antes de responder. */}
      <section style={{ background: '#fff', borderTop: '1px solid #e3e8f0', marginTop: 30, padding: 'clamp(34px,4.4vw,54px) 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(20px,2.6vw,27px)', fontWeight: 900, color: MARINHO,
            marginBottom: 10, letterSpacing: '-0.5px',
          }}>As dez perguntas do diagnóstico</h2>
          <p style={{ color: '#4a5568', fontSize: 15, lineHeight: 1.7, marginBottom: 26 }}>
            Todas saíram de dúvidas reais de donos de salão. Nenhuma foi inventada
            para o teste.
          </p>

          <ol className="dg-lista" style={{ paddingLeft: 20, margin: 0 }}>
            {PERGUNTAS.map(p => (
              <li key={p.id}>
                <strong>{p.pergunta}</strong> {p.porque}
              </li>
            ))}
          </ol>

          <div style={{ marginTop: 30, paddingTop: 22, borderTop: '1px solid #eef2f7' }}>
            <p style={{ color: '#4a5568', fontSize: 15, lineHeight: 1.7 }}>
              Quer as respostas antes de responder? Elas estão nas{' '}
              <a href="/perguntas-frequentes" style={{ color: '#046b85', fontWeight: 700 }}>
                perguntas frequentes sobre gestão de salão
              </a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
