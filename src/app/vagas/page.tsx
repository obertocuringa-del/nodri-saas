import type { Metadata } from 'next'
import { getCurriculosDoc } from '@/lib/curriculos'
import { vagasDoDoc } from '@/lib/curriculosShared'
import { qrSvg } from '@/lib/qrSvg'
import CopiarLink from './CopiarLink'

// ── Trabalhe conosco: as vagas dos salões parceiros do NODRI ────────────────
//
// Página PÚBLICA e do NODRI (não de um salão): os currículos são globais, e
// todos os salões da rede enxergam os candidatos pela tela Currículos. Por isso
// o texto aqui diz "salões parceiros", e nunca o nome de um deles.
//
// Server component, de propósito: o Google e o card do WhatsApp só leem o HTML
// que sai do servidor. As vagas vêm da MESMA lista global da tela Currículos,
// lida a cada visita -- vaga que o dono acrescenta ou tira lá aparece ou some
// aqui sozinha, sem publicar nada.
//
// Cada vaga também sai como JSON-LD `JobPosting`, o formato que o Google usa
// para listar no Google Vagas. O Google decide se lista; a página só entrega
// o que ele pede, com texto honesto (vaga em salões parceiros).

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const BASE = 'https://www.nodri.com.br'
const URL_PAGINA = `${BASE}/vagas`
const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

async function carregar() {
  try {
    const doc = await getCurriculosDoc(true)
    return { vagas: vagasDoDoc(doc), token: doc.token }
  } catch {
    return { vagas: [] as string[], token: '' }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { vagas } = await carregar()
  const lista = vagas.slice(0, 6).join(', ')
  const descricao = vagas.length
    ? `Vagas de emprego em salões de beleza parceiros do NODRI: ${lista}. Candidate-se pelo formulário e seja chamado pelo WhatsApp.`
    : 'Vagas de emprego em salões de beleza parceiros do NODRI. Candidate-se pelo formulário e seja chamado pelo WhatsApp.'
  return {
    title: 'Trabalhe conosco | NODRI',
    description: descricao,
    alternates: { canonical: URL_PAGINA },
    openGraph: { title: 'Trabalhe conosco | NODRI', description: descricao, url: URL_PAGINA, type: 'website', locale: 'pt_BR' },
    twitter: { card: 'summary_large_image', title: 'Trabalhe conosco | NODRI', description: descricao },
  }
}

// A data da publicação é a segunda-feira da semana atual e a validade, 45 dias
// depois: a vaga está sempre aberta enquanto estiver na lista, e o Google não
// recebe uma data parada de meses atrás nem uma que muda a cada visita.
function datasDaVaga() {
  const hoje = new Date()
  const segunda = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()))
  segunda.setUTCDate(segunda.getUTCDate() - ((segunda.getUTCDay() + 6) % 7))
  const fim = new Date(segunda.getTime() + 45 * 86400e3)
  return { publicada: segunda.toISOString().slice(0, 10), validaAte: fim.toISOString().slice(0, 10) }
}

const escapar = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

export default async function VagasPage() {
  const { vagas, token } = await carregar()
  const formulario = token ? `${BASE}/curriculo/${token}` : ''
  const { publicada, validaAte } = datasDaVaga()
  const qr = formulario ? qrSvg(formulario, 190) : ''
  const textoCompartilhar = encodeURIComponent(`Vagas de emprego em salões de beleza: ${URL_PAGINA}`)

  const jsonLd = vagas.map(v => ({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: `${v} em salões de beleza parceiros do NODRI`,
    description: `<p>Vaga de <strong>${escapar(v)}</strong> em salões de beleza parceiros do NODRI. A candidatura é feita pelo formulário online: o currículo fica disponível para os salões da rede, que chamam os candidatos pelo WhatsApp.</p>`,
    datePosted: publicada,
    validThrough: validaAte,
    employmentType: 'OTHER',
    directApply: true,
    url: URL_PAGINA,
    identifier: { '@type': 'PropertyValue', name: 'NODRI', value: v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-') },
    hiringOrganization: { '@type': 'Organization', name: 'Salões parceiros NODRI', sameAs: BASE, url: BASE },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'BR' } },
    applicantLocationRequirements: { '@type': 'Country', name: 'BR' },
  }))

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#f7fafc', minHeight: '100vh', color: '#1a1a1a' }}>
      {jsonLd.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      )}

      <style>{`
        .vg-card { background: #fff; border: 1px solid #e3e8f0; border-radius: 14px; padding: 22px; display: flex; flex-direction: column; gap: 10px; }
        .vg-card h3 { margin: 0; color: ${MARINHO}; font-size: 18px; font-weight: 800; }
        .vg-card p { margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6; flex: 1; }
        .vg-btn { display: inline-block; text-align: center; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 14px; background: ${MARINHO}; color: #fff; border: 0; cursor: pointer; font-family: inherit; }
        .vg-btn:hover { background: #123a73; }
        .vg-sec { border: 2px solid ${MARINHO}; background: #fff; color: ${MARINHO}; }
        .vg-sec:hover { background: #eef4fa; }
        @media (max-width: 640px) { .vg-topo img { height: 46px !important; margin: -4px 0 !important; } }
      `}</style>

      <header className="vg-topo" style={{
        background: '#f2f7fb', borderBottom: '1px solid #e3e8f0', padding: '2px clamp(16px,4vw,44px)',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
          <img src="/logo-nodri.png" alt="NODRI" style={{ height: 'clamp(60px, 6.4vw, 84px)', width: 'auto', margin: '-12px 0' }} />
        </a>
      </header>

      <section style={{ background: '#fff', borderBottom: '1px solid #e3e8f0', padding: 'clamp(30px,4vw,54px) 20px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: '7px 16px', borderRadius: 999, background: '#e6f7fb', color: '#046b85',
            fontSize: 11.5, fontWeight: 800, letterSpacing: '.5px', marginBottom: 20, textTransform: 'uppercase',
          }}>Vagas abertas</div>
          <h1 style={{ fontSize: 'clamp(28px,3.6vw,44px)', fontWeight: 900, lineHeight: 1.12, letterSpacing: '-1px', marginBottom: 16, color: MARINHO }}>
            Trabalhe conosco
          </h1>
          <p style={{ color: '#4a5568', fontSize: 16.5, lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Vagas em salões de beleza parceiros do NODRI. Você se candidata uma única vez,
            pelo formulário, e o seu currículo fica disponível para os salões da rede, que chamam
            os candidatos pelo WhatsApp.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: 940, margin: '0 auto', padding: 'clamp(28px,4vw,44px) 20px 60px' }}>
        {vagas.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#4a5568', fontSize: 15.5 }}>
            Não há vagas abertas neste momento. Volte em breve.
          </p>
        ) : (
          <section aria-label="Vagas abertas" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 40 }}>
            {vagas.map(v => (
              <article key={v} className="vg-card">
                <h3>{v}</h3>
                <p>Vaga em salões de beleza parceiros do NODRI. Preencha o formulário com seus dados e a experiência que você tem.</p>
                <a className="vg-btn" href={formulario} rel="noopener">Candidatar-se</a>
              </article>
            ))}
          </section>
        )}

        {formulario && (
          <section style={{
            background: '#fff', border: '1px solid #e3e8f0', borderRadius: 16, padding: 'clamp(20px,3vw,30px)',
            display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
          }}>
            <div dangerouslySetInnerHTML={{ __html: qr }} style={{ lineHeight: 0, border: '1px solid #e3e8f0', borderRadius: 12, overflow: 'hidden' }} />
            <div style={{ flex: '1 1 280px', maxWidth: 430 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: MARINHO }}>Aponte a câmera do celular</h2>
              <p style={{ margin: '0 0 16px', color: '#4a5568', fontSize: 14.5, lineHeight: 1.65 }}>
                O código abre o formulário de candidatura. Se conhece alguém que procura emprego em salão
                de beleza, compartilhe esta página.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="vg-btn" href={`https://wa.me/?text=${textoCompartilhar}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a className="vg-btn vg-sec" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_PAGINA)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
                <CopiarLink url={URL_PAGINA} className="vg-btn vg-sec" />
              </div>
              <p style={{ margin: '12px 0 0', color: '#7a8798', fontSize: 12.5, wordBreak: 'break-all' }}>{URL_PAGINA}</p>
            </div>
          </section>
        )}

        <p style={{ margin: '28px auto 0', maxWidth: 680, textAlign: 'center', color: '#7a8798', fontSize: 12.5, lineHeight: 1.6 }}>
          O NODRI é a plataforma de gestão usada por salões de beleza. As vagas são dos salões parceiros,
          e cada salão faz a sua própria seleção. Os dados do formulário (nome, estado, idade, telefone, vaga e
          experiência) são usados apenas para contato sobre as vagas.
        </p>
      </main>
    </div>
  )
}
