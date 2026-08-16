'use client'
import { useEffect, useState } from 'react'

// ── O que a vitrine promete ─────────────────────────────────────────────────
// O texto anterior vendia automação de WhatsApp: "automatize confirmações,
// envio de mensagens". Isso é UM módulo do plano mais caro, não o produto. E
// era o que o Google lia para montar a visão geral, por isso o NODRI aparecia
// na busca como agenda online.
//
// Dono de salão não procura "plataforma SaaS" nem "automação". Ele procura
// saber quanto faturou, acompanhar a equipe, organizar cliente e decidir o
// que fazer. São essas palavras que precisam estar aqui.
const DEFAULT_CONFIG = {
  hero_logo: 'NODRI',
  hero_titulo: 'Seu salão no controle. Suas decisões baseadas em dados.',
  hero_subtitulo: 'O NODRI reúne gestão, operação, clientes, profissionais e resultados em uma única plataforma — e transforma os dados do seu salão em decisões melhores.',
  hero_botao: 'Ver Planos',
  hero_cor_botao: '#5b4fcf',
  beneficios_titulo: 'Gestão completa, num lugar só',
  beneficios: [
    { emoji: '', titulo: 'Financeiro sem planilha', desc: 'Custo operacional, ponto de equilíbrio, contas a pagar e precificação de serviços — com os números do seu salão, não com estimativa.' },
    { emoji: '', titulo: 'Equipe acompanhada de perto', desc: 'Ficha completa, metas, avaliações, comissões e histórico de cada profissional. Você vê quem cresce e quem precisa de ajuda.' },
    { emoji: '', titulo: 'Indicadores que apontam o problema', desc: 'Faturamento, ticket médio, clientes em risco e serviços que ninguém oferece. O relatório mostra onde está o dinheiro que você não viu.' },
    { emoji: '', titulo: 'Rotina organizada sozinha', desc: 'Check lists por período, escalas, calendários, feedback de cliente e controle de pendências. O salão roda mesmo quando você não está.' },
  ],
  planos_titulo: 'Escolha seu Plano',
  planos_subtitulo: 'Mensal, sem fidelidade. Cada plano acrescenta ao anterior.',
  afiliados_titulo: 'Trabalhe Conosco',
  afiliados_subtitulo: 'Indique o NODRI para outros salões e ganhe 40% de comissão em cada venda realizada com seu cupom exclusivo.',
  afiliados_comissao: 40,
  afiliados_botao: 'Quero ser Afiliado →',
  afiliados_chips: [
    { emoji: '', texto: 'Cupom exclusivo' },
    { emoji: '', texto: 'Link personalizado' },
    { emoji: '', texto: '40% por venda' },
    { emoji: '', texto: 'Pix direto' },
  ],
  footer_logo: 'NODRI',
  footer_texto: 'Gestão Inteligente para Salões de Beleza',
  footer_email: 'contato@nodri.com.br',
  footer_whatsapp: '5561982195214',
}

interface PlanoVitrine {
  nome: string; slug: string; preco: number; resumo: string
  novidades: string[]; herda: string | null; destaque: boolean
}

// Cores fixas por posição — não vêm do banco. O que muda no admin é preço e
// nome; a identidade visual da vitrine fica sob controle de quem desenha.
const CORES = ['#3498db', '#5b4fcf', '#9b59b6', '#f39c12']

export default function LandingPage() {
  const [cfg, setCfg] = useState<typeof DEFAULT_CONFIG>(DEFAULT_CONFIG)
  const [planos, setPlanos] = useState<PlanoVitrine[]>([])

  useEffect(() => {
    fetch('/api/landing-config').then(r => r.json()).then(d => { if (d) setCfg({ ...DEFAULT_CONFIG, ...d }) })
    // Preço e nome saem da tabela `planos`; os módulos, da mesma fonte que o
    // gate usa para liberar tela. A vitrine não tem como prometer o que o
    // plano não entrega.
    fetch('/api/planos-publicos')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setPlanos(d) })
      .catch(() => { /* a seção some em vez de mostrar preço errado */ })
  }, [])

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#f5f4f0', minHeight: '100vh', color: '#1a1a1a' }}>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: 'clamp(40px,8vw,80px) 20px clamp(30px,6vw,60px)' }}>
        <div style={{ background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 48, fontWeight: 900, marginBottom: 16 }}>
          {cfg.hero_logo}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>{cfg.hero_titulo}</h1>
        <p style={{ fontSize: 18, color: '#6b6860', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>{cfg.hero_subtitulo}</p>
        <a href="#planos" style={{ background: `linear-gradient(135deg, ${cfg.hero_cor_botao}, #f43f8e)`, color: 'white', padding: '16px 40px', borderRadius: 12, fontSize: 18, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          {cfg.hero_botao}
        </a>
      </section>

      {/* BENEFÍCIOS */}
      <section style={{ padding: '60px 20px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 40 }}>{cfg.beneficios_titulo}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 24 }}>
          {(cfg.beneficios || []).map((b: any, i: number) => (
            <div key={i} style={{ background: '#ffffff', borderRadius: 16, padding: 28, border: '1px solid #e8e6e0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{b.emoji}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{b.titulo}</h3>
              <p style={{ color: '#6b6860', lineHeight: 1.6, fontSize: 14 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" style={{ padding: '60px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>{cfg.planos_titulo}</h2>
        <p style={{ textAlign: 'center', color: '#6b6860', marginBottom: 48 }}>{cfg.planos_subtitulo}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 20 }}>
          {planos.map((plano, i) => {
            const cor = CORES[i % CORES.length]
            return (
            <div key={plano.slug} style={{
              background: '#ffffff', borderRadius: 20, padding: 28,
              border: plano.destaque ? `2px solid ${cor}` : '1px solid #e8e6e0',
              position: 'relative', transform: plano.destaque ? 'scale(1.03)' : 'none',
            }}>
              {plano.destaque && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: cor, color: 'white', padding: '4px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  MAIS ESCOLHIDO
                </div>
              )}
              <div style={{ color: cor, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{plano.nome}</div>
              <div style={{ fontSize: 42, fontWeight: 900, marginBottom: 6, color: '#1a1a1a' }}>
                R${plano.preco}<span style={{ fontSize: 15, color: '#6b6860', fontWeight: 400 }}>/mês</span>
              </div>
              <p style={{ color: '#6b6860', fontSize: 13, lineHeight: 1.55, minHeight: 38 }}>{plano.resumo}</p>

              <div style={{ borderTop: '1px solid #e8e6e0', marginTop: 20, paddingTop: 20 }}>
                {/* "Tudo do plano anterior" em vez de repetir a lista inteira:
                    com os quatro cards lado a lado, repetir faz todos
                    parecerem iguais e some com a diferença de preço. */}
                {plano.herda && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, color: '#6b6860', fontSize: 13.5, fontWeight: 600 }}>
                    <span style={{ color: cor }}>✓</span> Tudo do {plano.herda}
                  </div>
                )}
                {plano.novidades.map((m, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, color: '#3a3835', fontSize: 13.5 }}>
                    <span style={{ color: cor }}>✓</span> {m}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, color: '#8b8798', fontSize: 12, lineHeight: 1.5 }}>
                  <span style={{ color: cor }}>+</span>
                  <span>Check list, calendários, setores, feedback de cliente, lojistas, currículos e ações comerciais — em todos os planos.</span>
                </div>
              </div>

              <button onClick={() => window.location.href = `/cadastro?plano=${encodeURIComponent(plano.nome)}`}
                style={{ width: '100%', marginTop: 24, padding: '13px 0', background: plano.destaque ? cor : 'transparent', border: `2px solid ${cor}`, color: plano.destaque ? 'white' : cor, borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Assinar {plano.nome}
              </button>
            </div>
            )
          })}
        </div>
      </section>

      {/* TRABALHE CONOSCO */}
      <section style={{ background: 'linear-gradient(135deg,#f0eefb,#fce7f3)', padding: '60px 20px', textAlign: 'center', borderTop: '1px solid #e0ddd8' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}></div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#5b4fcf', marginBottom: 12 }}>{cfg.afiliados_titulo}</h2>
          <p style={{ color: '#767069', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>{cfg.afiliados_subtitulo}</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', margin: '24px 0' }}>
            {(cfg.afiliados_chips || []).map((b: any, i: number) => (
              <div key={i} style={{ background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '12px 20px', color: '#1a1a1a', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{b.emoji}</span> {b.texto}
              </div>
            ))}
          </div>
          <a href="/trabalhe-conosco" style={{ display: 'inline-block', marginTop: 8, background: 'linear-gradient(135deg,#5b4fcf,#f43f8e)', color: '#ffffff', fontWeight: 900, fontSize: 15, padding: '14px 40px', borderRadius: 12, textDecoration: 'none' }}>
            {cfg.afiliados_botao}
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '40px 20px', color: '#6b6860', borderTop: '1px solid #e0ddd8', background: '#ffffff' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#b45309', marginBottom: 8 }}>{cfg.footer_logo}</div>
        <p>{cfg.footer_texto}</p>
        <p style={{ marginTop: 8 }}>{cfg.footer_email}</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/trabalhe-conosco" style={{ color: '#5b4fcf', fontSize: 12, textDecoration: 'none' }}>Trabalhe Conosco</a>
          <a href="/afiliado" style={{ color: '#5b4fcf', fontSize: 12, textDecoration: 'none' }}>Painel do Afiliado</a>
          <a href={`https://wa.me/${cfg.footer_whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', fontSize: 12, textDecoration: 'none' }}>WhatsApp</a>
          <a href="/login" style={{ color: '#5b4fcf', fontSize: 12, textDecoration: 'none' }}>Área do Cliente</a>
        </div>
      </footer>
    </div>
  )
}
