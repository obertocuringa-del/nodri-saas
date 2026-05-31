'use client'

const PLANOS = [
  {
    nome: 'Básico',
    preco: 100,
    modulos: [
      'Confirmar Agendamento',
      'Enviar Feedback',
      'Enviar Lista c/ Foto',
      'Enviar Lista s/ Foto',
      'Baixar Música YouTube',
    ],
    cor: '#3498db',
    destaque: false,
  },
  {
    nome: 'Profissional',
    preco: 200,
    modulos: [
      'Todos do Básico',
      'Bloqueio Sem Preferência',
      'Ver Feedback Cliente',
      'Relatório Profissional',
      'Faturamento Diário',
      'Calcular Reserva Financeira',
    ],
    cor: '#9b59b6',
    destaque: true,
  },
  {
    nome: 'Premium',
    preco: 300,
    modulos: [
      'Todos do Profissional',
      'Calculadora Depreciação',
      'Avaliar Profissional',
      'Aluguel de Cadeira',
      'Precificar Serviços',
    ],
    cor: '#f39c12',
    destaque: false,
  },
]

export default function LandingPage() {
  function handleAssinar(plano: typeof PLANOS[0]) {
    window.location.href = `/cadastro?plano=${encodeURIComponent(plano.nome)}`
  }

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#0f0f0f', minHeight: '100vh', color: 'white' }}>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '80px 20px 60px' }}>
        <div style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 48, fontWeight: 900, marginBottom: 16 }}>
          NODRI
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: 'white' }}>
          Sistema de Gestão para Salões de Beleza
        </h1>
        <p style={{ fontSize: 18, color: '#aaa', maxWidth: 600, margin: '0 auto 40px' }}>
          Automatize confirmações, envio de mensagens, relatórios e muito mais.
          Tudo integrado diretamente ao seu WhatsApp.
        </p>
        <a href="#planos" style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', color: 'white', padding: '16px 40px', borderRadius: 12, fontSize: 18, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Ver Planos
        </a>
      </section>

      {/* BENEFÍCIOS */}
      <section style={{ padding: '60px 20px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 40 }}>Por que escolher o NODRI?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { icon: '⚡', titulo: 'Abre com 1 clique', desc: 'Clique em Abrir no site e o programa abre instantaneamente no seu computador.' },
            { icon: '💬', titulo: 'Integrado ao WhatsApp', desc: 'Envie confirmações, feedbacks e listas direto pelo WhatsApp sem copiar e colar.' },
            { icon: '📊', titulo: 'Relatórios completos', desc: 'Acompanhe faturamento, desempenho de profissionais e reservas financeiras.' },
            { icon: '🔄', titulo: 'Atualizações automáticas', desc: 'Receba novas versões dos programas sem precisar reinstalar tudo.' },
          ].map(b => (
            <div key={b.titulo} style={{ background: '#1a1a1a', borderRadius: 16, padding: 28, border: '1px solid #333' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{b.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{b.titulo}</h3>
              <p style={{ color: '#aaa', lineHeight: 1.6 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" style={{ padding: '60px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Escolha seu Plano</h2>
        <p style={{ textAlign: 'center', color: '#aaa', marginBottom: 48 }}>Pagamento único mensal via PIX ou cartão</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {PLANOS.map(plano => (
            <div key={plano.nome} style={{
              background: '#1a1a1a',
              borderRadius: 20,
              padding: 32,
              border: plano.destaque ? `2px solid ${plano.cor}` : '1px solid #333',
              position: 'relative',
              transform: plano.destaque ? 'scale(1.03)' : 'none',
            }}>
              {plano.destaque && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: plano.cor, color: 'white', padding: '4px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                  MAIS POPULAR
                </div>
              )}
              <div style={{ color: plano.cor, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{plano.nome}</div>
              <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 4 }}>
                R${plano.preco}
                <span style={{ fontSize: 16, color: '#aaa', fontWeight: 400 }}>/mês</span>
              </div>
              <div style={{ borderTop: '1px solid #333', marginTop: 24, paddingTop: 24 }}>
                {plano.modulos.map(m => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, color: '#ddd' }}>
                    <span style={{ color: plano.cor }}>✓</span> {m}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleAssinar(plano)}
                style={{
                  width: '100%', marginTop: 28, padding: '14px 0',
                  background: plano.destaque ? plano.cor : 'transparent',
                  border: `2px solid ${plano.cor}`,
                  color: plano.destaque ? 'white' : plano.cor,
                  borderRadius: 12, fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Assinar {plano.nome}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '40px 20px', color: '#555', borderTop: '1px solid #222', marginTop: 60 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f39c12', marginBottom: 8 }}>NODRI</div>
        <p>Sistema de Gestão para Salões de Beleza</p>
        <p style={{ marginTop: 8 }}>contato@nodri.com.br</p>
      </footer>
    </div>
  )
}
