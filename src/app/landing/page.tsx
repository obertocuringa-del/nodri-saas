'use client'
import { useEffect, useState } from 'react'

const DEFAULT_CONFIG = {
  hero_logo: 'NODRI',
  hero_titulo: 'Sistema de Gestão para Salões de Beleza',
  hero_subtitulo: 'Automatize confirmações, envio de mensagens, relatórios e muito mais. Tudo integrado diretamente ao seu WhatsApp.',
  hero_botao: 'Ver Planos',
  hero_cor_botao: '#5b4fcf',
  beneficios_titulo: 'Por que escolher o NODRI?',
  beneficios: [
    { emoji: '', titulo: 'Abre com 1 clique', desc: 'Clique em Abrir no site e o programa abre instantaneamente no seu computador.' },
    { emoji: '', titulo: 'Integrado ao WhatsApp', desc: 'Envie confirmações, feedbacks e listas direto pelo WhatsApp sem copiar e colar.' },
    { emoji: '', titulo: 'Relatórios completos', desc: 'Acompanhe faturamento, desempenho de profissionais e reservas financeiras.' },
    { emoji: '', titulo: 'Atualizações automáticas', desc: 'Receba novas versões dos programas sem precisar reinstalar tudo.' },
  ],
  planos_titulo: 'Escolha seu Plano',
  planos_subtitulo: 'Pagamento único mensal via PIX ou cartão',
  landing_planos: [
    { nome: 'Básico', preco: 100, cor: '#3498db', destaque: false, modulos: ['Confirmar Agendamento', 'Enviar Feedback', 'Enviar Lista c/ Foto', 'Enviar Lista s/ Foto', 'Baixar Música YouTube'] },
    { nome: 'Profissional', preco: 200, cor: '#9b59b6', destaque: true, modulos: ['Todos do Básico', 'Bloqueio Sem Preferência', 'Ver Feedback Cliente', 'Relatório Profissional', 'Faturamento Diário', 'Calcular Reserva Financeira'] },
    { nome: 'Premium', preco: 300, cor: '#f39c12', destaque: false, modulos: ['Todos do Profissional', 'Calculadora Depreciação', 'Avaliar Profissional', 'Aluguel de Cadeira', 'Precificar Serviços'] },
  ],
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
  footer_texto: 'Sistema de Gestão para Salões de Beleza',
  footer_email: 'contato@nodri.com.br',
  footer_whatsapp: '5561982195214',
}

export default function LandingPage() {
  const [cfg, setCfg] = useState<typeof DEFAULT_CONFIG>(DEFAULT_CONFIG)

  useEffect(() => {
    fetch('/api/landing-config').then(r => r.json()).then(d => { if (d) setCfg({ ...DEFAULT_CONFIG, ...d }) })
  }, [])

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#0f0f0f', minHeight: '100vh', color: 'white' }}>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: 'clamp(40px,8vw,80px) 20px clamp(30px,6vw,60px)' }}>
        <div style={{ background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 48, fontWeight: 900, marginBottom: 16 }}>
          {cfg.hero_logo}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: 'white' }}>{cfg.hero_titulo}</h1>
        <p style={{ fontSize: 18, color: '#aaa', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>{cfg.hero_subtitulo}</p>
        <a href="#planos" style={{ background: `linear-gradient(135deg, ${cfg.hero_cor_botao}, #f43f8e)`, color: 'white', padding: '16px 40px', borderRadius: 12, fontSize: 18, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          {cfg.hero_botao}
        </a>
      </section>

      {/* BENEFÍCIOS */}
      <section style={{ padding: '60px 20px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 40 }}>{cfg.beneficios_titulo}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 24 }}>
          {(cfg.beneficios || []).map((b: any, i: number) => (
            <div key={i} style={{ background: '#1a1a1a', borderRadius: 16, padding: 28, border: '1px solid #333' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{b.emoji}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{b.titulo}</h3>
              <p style={{ color: '#aaa', lineHeight: 1.6, fontSize: 14 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" style={{ padding: '60px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>{cfg.planos_titulo}</h2>
        <p style={{ textAlign: 'center', color: '#aaa', marginBottom: 48 }}>{cfg.planos_subtitulo}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 24 }}>
          {(cfg.landing_planos || []).map((plano: any, i: number) => (
            <div key={i} style={{
              background: '#1a1a1a', borderRadius: 20, padding: 32,
              border: plano.destaque ? `2px solid ${plano.cor}` : '1px solid #333',
              position: 'relative', transform: plano.destaque ? 'scale(1.03)' : 'none',
            }}>
              {plano.destaque && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: plano.cor, color: 'white', padding: '4px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                  MAIS POPULAR
                </div>
              )}
              <div style={{ color: plano.cor, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{plano.nome}</div>
              <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 4 }}>
                R${plano.preco}<span style={{ fontSize: 16, color: '#aaa', fontWeight: 400 }}>/mês</span>
              </div>
              <div style={{ borderTop: '1px solid #333', marginTop: 24, paddingTop: 24 }}>
                {(plano.modulos || []).map((m: string, j: number) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, color: '#ddd', fontSize: 14 }}>
                    <span style={{ color: plano.cor }}>✓</span> {m}
                  </div>
                ))}
              </div>
              <button onClick={() => window.location.href = `/cadastro?plano=${encodeURIComponent(plano.nome)}`}
                style={{ width: '100%', marginTop: 28, padding: '14px 0', background: plano.destaque ? plano.cor : 'transparent', border: `2px solid ${plano.cor}`, color: plano.destaque ? 'white' : plano.cor, borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                Assinar {plano.nome}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* TRABALHE CONOSCO */}
      <section style={{ background: 'linear-gradient(135deg,#0d1117,#161820)', padding: '60px 20px', textAlign: 'center', borderTop: '1px solid #e8e6e0' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}></div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#5b4fcf', marginBottom: 12 }}>{cfg.afiliados_titulo}</h2>
          <p style={{ color: '#9e9b94', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>{cfg.afiliados_subtitulo}</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', margin: '24px 0' }}>
            {(cfg.afiliados_chips || []).map((b: any, i: number) => (
              <div key={i} style={{ background: '#0d1117', border: '1px solid #e8e6e0', borderRadius: 10, padding: '12px 20px', color: '#1a1a1a', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{b.emoji}</span> {b.texto}
              </div>
            ))}
          </div>
          <a href="/trabalhe-conosco" style={{ display: 'inline-block', marginTop: 8, background: 'linear-gradient(135deg,#5b4fcf,#5b4fcf)', color: '#000', fontWeight: 900, fontSize: 15, padding: '14px 40px', borderRadius: 12, textDecoration: 'none' }}>
            {cfg.afiliados_botao}
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '40px 20px', color: '#555', borderTop: '1px solid #222' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f39c12', marginBottom: 8 }}>{cfg.footer_logo}</div>
        <p>{cfg.footer_texto}</p>
        <p style={{ marginTop: 8 }}>{cfg.footer_email}</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/trabalhe-conosco" style={{ color: '#5b4fcf', fontSize: 12, textDecoration: 'none' }}>Trabalhe Conosco</a>
          <a href="/afiliado" style={{ color: '#5b4fcf', fontSize: 12, textDecoration: 'none' }}>Painel do Afiliado</a>
          <a href={`https://wa.me/${cfg.footer_whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', fontSize: 12, textDecoration: 'none' }}>WhatsApp</a>
          <a href="/login" style={{ color: '#5b4fcf', fontSize: 12, textDecoration: 'none' }}>Área do Cliente</a>
        </div>
      </footer>
    </div>
  )
}
