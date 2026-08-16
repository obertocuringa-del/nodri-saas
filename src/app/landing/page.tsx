'use client'
import { useEffect, useState } from 'react'
import FormularioContato from '@/components/FormularioContato'

// ── O que a vitrine promete ─────────────────────────────────────────────────
// O texto anterior vendia automação de WhatsApp: "automatize confirmações,
// envio de mensagens". Isso é UM módulo do plano mais caro, não o produto. E
// era o que o Google lia para montar a visão geral, por isso o NODRI aparecia
// na busca como agenda online.
//
// Dono de salão não procura "plataforma SaaS" nem "automação". Ele procura
// saber quanto faturou, acompanhar a equipe, organizar cliente e decidir o
// que fazer. São essas palavras que precisam estar aqui.
// ── Cores da marca ──────────────────────────────────────────────────────────
// Tiradas da logo: marinho e ciano. O site estava em roxo e rosa, que não são
// a identidade do NODRI — a primeira coisa que um cliente compara é se o site
// parece a mesma empresa da logo.
const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

const DEFAULT_CONFIG = {
  hero_logo: 'NODRI',
  // Fala da DOR antes de falar do produto. "Plataforma de gestão" não desperta
  // nada em quem não sabe que precisa; "você sabe quanto sobrou?" desperta.
  hero_titulo: 'Seu salão funciona quando você não está lá?',
  hero_subtitulo: 'A NODRI transforma sua base de clientes em dinheiro. Mais organização, mais relacionamento e mais faturamento — de forma orgânica, aproveitando quem já conhece e confia na sua empresa.',
  hero_botao: 'Quero conhecer o NODRI',
  hero_cor_botao: CIANO,

  dores_titulo: 'Se você se reconhece aqui, a NODRI foi feita para o seu salão',
  dores: [
    { titulo: 'O mês fecha e você não sabe se sobrou', desc: 'O dinheiro entra e sai, mas ninguém consegue dizer quanto o salão deu de lucro de verdade — nem quanto custa manter a porta aberta.' },
    { titulo: 'Você não sabe qual profissional dá lucro', desc: 'Todo mundo parece ocupado. Mas quem realmente traz resultado, quem só ocupa cadeira e quem está caindo mês a mês? Sem número, é achismo.' },
    { titulo: 'Cliente some e ninguém percebe', desc: 'Aquela cliente que vinha todo mês parou de aparecer. Você só percebe quando ela já está em outro salão há meio ano.' },
    { titulo: 'Tudo depende de você estar presente', desc: 'Se você viaja ou adoece, a rotina desmonta. Nada está escrito, tudo está na sua cabeça e no caderno da recepção.' },
  ],

  beneficios_titulo: 'O primeiro sistema que cuida da sua equipe como uma empresa de verdade',
  beneficios: [
    { emoji: '', titulo: 'Você passa a saber seus números', desc: 'Custo operacional, ponto de equilíbrio, contas a pagar e preço certo por serviço — calculados com os dados do seu salão, não com estimativa.' },
    { emoji: '', titulo: 'Cada profissional tem uma ficha viva', desc: 'Metas, comissões, avaliações, faturamento e histórico. Você vê quem cresce, quem precisa de ajuda e quem está saindo antes de perder.' },
    { emoji: '', titulo: 'O sistema aponta o problema', desc: 'Clientes em risco de sumir, serviços que ninguém oferece, queda de faturamento. O relatório mostra onde está o dinheiro que você não viu.' },
    { emoji: '', titulo: 'A rotina anda sem você', desc: 'Check lists por período, escalas, processos escritos, feedback de cliente e pendências. O salão funciona mesmo quando você não está lá.' },
  ],

  afiliados_titulo: 'Indique o NODRI e ganhe',
  afiliados_subtitulo: 'Indique o NODRI para outros salões e ganhe 40% de comissão em cada venda realizada com seu cupom exclusivo.',
  afiliados_comissao: 40,
  afiliados_botao: 'Quero indicar →',
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
    // `r.ok` conferido de propósito: quando esta rota caía no login, o
    // .json() estourava e o erro sumia sem catch. A página seguia com os
    // textos do código e ninguém entendia por que o Editor não fazia efeito.
    fetch('/api/landing-config')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d === 'object') setCfg({ ...DEFAULT_CONFIG, ...d }) })
      .catch(() => { /* fica com os textos do código */ })
    // Preço e nome saem da tabela `planos`; os módulos, da mesma fonte que o
    // gate usa para liberar tela. A vitrine não tem como prometer o que o
    // plano não entrega.
    fetch('/api/planos-publicos')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setPlanos(d) })
      .catch(() => { /* a seção some em vez de mostrar preço errado */ })
  }, [])

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#f7fafc', minHeight: '100vh', color: '#1a1a1a' }}>

      {/* ── BARRA DO TOPO ─────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e3e8f0',
        padding: '10px clamp(16px,4vw,44px)',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
          <img src="/logo-nodri.png" alt="NODRI — Estilo & Beleza" style={{ height: 42, width: 'auto' }} />
        </a>
        <a href="#contato" style={{
          padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
          border: `2px solid ${MARINHO}`, color: MARINHO, fontWeight: 800, fontSize: 13,
        }}>FALE CONOSCO</a>
        <a href="/login" style={{
          padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
          background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 13,
        }}>JÁ SOU CLIENTE</a>
      </header>

      {/* ABERTURA ----------------------------------------------------------
          Fundo CLARO e texto escuro. O escuro fica bonito em site de software
          para desenvolvedor; para dona de salao passa longe do que ela
          reconhece como confiavel, e ainda esconde texto no celular sob sol.

          Duas colunas: a esquerda a dor e a promessa, a direita uma previa do
          painel. A previa mostra o que o NODRI REALMENTE entrega - numeros,
          equipe e alertas. Nada de agenda nem estoque: prometer tela que nao
          existe traz cliente que cancela na primeira semana. */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e3e8f0', padding: 'clamp(34px,5vw,64px) 20px' }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto',
          display: 'grid', gap: 'clamp(30px,4vw,54px)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,420px), 1fr))',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              display: 'inline-block', padding: '7px 16px', borderRadius: 999,
              background: '#e6f7fb', color: '#046b85',
              fontSize: 11.5, fontWeight: 800, letterSpacing: '.5px',
              marginBottom: 20, textTransform: 'uppercase',
            }}>Gestão para salões de beleza</div>

            <h1 style={{
              fontSize: 'clamp(27px,3.6vw,44px)', fontWeight: 900, lineHeight: 1.14,
              letterSpacing: '-1px', marginBottom: 18, color: MARINHO,
            }}>{cfg.hero_titulo}</h1>

            <p style={{ fontSize: 'clamp(14.5px,1.6vw,17px)', lineHeight: 1.7, color: '#4b5563', marginBottom: 26 }}>
              {cfg.hero_subtitulo}
            </p>

            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', marginBottom: 28 }}>
              {[
                ['Financeiro real', 'Custo, lucro e preço certo por serviço'],
                ['Equipe medida', 'Metas, comissões e desempenho de cada um'],
                ['Alertas que importam', 'Cliente sumindo e queda de faturamento'],
              ].map(([t, d]) => (
                <div key={t}>
                  <div style={{ width: 26, height: 3, borderRadius: 3, background: CIANO, marginBottom: 9 }} />
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: MARINHO, marginBottom: 3 }}>{t}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{d}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#contato" style={{
                padding: '16px 34px', borderRadius: 12, textDecoration: 'none',
                background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 15.5,
                boxShadow: '0 8px 26px rgba(13,42,86,.22)',
              }}>{cfg.hero_botao}</a>
              <a href="#dores" style={{
                padding: '16px 30px', borderRadius: 12, textDecoration: 'none',
                border: `2px solid ${MARINHO}`, color: MARINHO, fontWeight: 800, fontSize: 15.5,
              }}>Ver como funciona</a>
            </div>

            <p style={{ fontSize: 12.5, color: '#8b95a5', marginTop: 14 }}>
              Feito dentro de um salão em operação, não numa mesa de escritório.
            </p>
          </div>

          <div style={{
            background: '#f7fafc', border: '1px solid #e3e8f0', borderRadius: 18,
            padding: 18, boxShadow: '0 18px 50px rgba(13,42,86,.09)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 9, height: 9, borderRadius: 99, background: '#e2574c' }} />
              <div style={{ width: 9, height: 9, borderRadius: 99, background: '#f5c451' }} />
              <div style={{ width: 9, height: 9, borderRadius: 99, background: '#5cb85c' }} />
              <span style={{ marginLeft: 6, fontSize: 11.5, color: '#8b95a5' }}>Painel do salão</span>
            </div>

            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
              {[
                ['Faturamento do mês', 'R$ 128.750', '+18% vs. mês anterior', '#16a34a'],
                ['Ticket médio', 'R$ 246,56', '+8% no período', '#16a34a'],
                ['Clientes em risco', '14', 'sem voltar há 60 dias', '#dc2626'],
                ['Meta da equipe', '85%', 'faltam 6 dias', MARINHO],
              ].map(([t, v, d, c]) => (
                <div key={t} style={{ background: '#fff', border: '1px solid #e3e8f0', borderRadius: 12, padding: 13 }}>
                  <div style={{ fontSize: 10.5, color: '#8b95a5', marginBottom: 5 }}>{t}</div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: MARINHO, lineHeight: 1.1 }}>{v}</div>
                  <div style={{ fontSize: 10, color: c as string, marginTop: 4, fontWeight: 700 }}>{d}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e3e8f0', borderRadius: 12, padding: 14, marginTop: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: MARINHO, marginBottom: 10 }}>Desempenho da equipe</div>
              {[
                ['Juliana', 92, '#16a34a'],
                ['Fernanda', 74, CIANO],
                ['Camila', 48, '#f59e0b'],
              ].map(([n, pct, cor]) => (
                <div key={n as string} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4b5563', marginBottom: 4 }}>
                    <span>{n as string}</span><span style={{ fontWeight: 800 }}>{pct as number}% da meta</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: '#eef2f7' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: cor as string }} />
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 10.5, color: '#a0aab8', textAlign: 'center', marginTop: 10 }}>
              Ilustração do painel. Os números do seu salão aparecem aqui.
            </p>
          </div>
        </div>
      </section>

      {/* ── AS DORES ──────────────────────────────────────────────────────
          Quatro situações concretas em vez de adjetivos. Quem se reconhece em
          uma delas já entendeu para que serve o sistema, sem precisar que
          ninguém explique o que é "gestão integrada". */}
      <section id="dores" style={{ padding: 'clamp(44px,7vw,74px) 20px', maxWidth: 1080, margin: '0 auto' }}>
        <h2 style={{
          textAlign: 'center', fontSize: 'clamp(21px,3vw,31px)', fontWeight: 900,
          color: MARINHO, marginBottom: 12, letterSpacing: '-0.5px',
        }}>{(cfg as any).dores_titulo}</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 15, marginBottom: 40 }}>
          Nenhuma dessas coisas aparece de repente. Elas custam dinheiro em silêncio, todo mês.
        </p>

        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,255px), 1fr))' }}>
          {((cfg as any).dores || []).map((d: any, i: number) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 16, padding: 26,
              border: '1px solid #e3e8f0', borderTop: `4px solid ${CIANO}`,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: MARINHO, marginBottom: 10, lineHeight: 1.35 }}>{d.titulo}</h3>
              <p style={{ color: '#6b7280', fontSize: 13.5, lineHeight: 1.65 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARAÇÃO ----------------------------------------------------------
          A pergunta que todo dono faz é "mas isso o outro sistema não faz?".
          Responder de frente é mais honesto e mais forte do que fingir que
          concorrente não existe — e só a NODRI consegue preencher a coluna da
          direita. */}
      <section style={{ padding: 'clamp(44px,7vw,74px) 20px', background: '#fff', borderTop: '1px solid #e3e8f0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontSize: 'clamp(21px,3vw,31px)', fontWeight: 900,
            color: MARINHO, marginBottom: 12, letterSpacing: '-0.5px', lineHeight: 1.25,
          }}>Os outros sistemas organizam a sua agenda.<br />A NODRI organiza a sua equipe.</h2>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 15, marginBottom: 36, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto' }}>
            Agenda e comanda quase todo sistema tem. O que quase nenhum tem é o que faz o salão
            andar quando o dono não está.
          </p>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))' }}>
            <div style={{ background: '#f7fafc', border: '1px solid #e3e8f0', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>
                O que todo sistema faz
              </div>
              {['Agenda e horários', 'Cadastro de clientes', 'Comanda e caixa', 'Relatório de faturamento'].map(t => (
                <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 11, color: '#6b7280', fontSize: 14 }}>
                  <span style={{ color: '#c3ccd8', fontWeight: 900 }}>•</span> {t}
                </div>
              ))}
            </div>

            <div style={{ background: MARINHO, borderRadius: 16, padding: 24, color: '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: CIANO, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>
                O que só a NODRI faz
              </div>
              {[
                'Ficha completa: contratação, CLT, PJ, contrato e distrato',
                'Plano de carreira e avaliação de cada profissional',
                'Meta individual, comissão e acompanhamento mensal',
                'Portal onde a profissional vê o próprio desempenho',
                'Check lists e processos por período, com cobrança',
                'Setores internos com solicitações e demandas',
                'Corrida interna com ranking automático',
                'Consultoria por IA sobre os números do seu salão',
              ].map(t => (
                <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 11, fontSize: 13.5, lineHeight: 1.5 }}>
                  <span style={{ color: CIANO, fontWeight: 900 }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section style={{ padding: 'clamp(44px,7vw,74px) 20px', maxWidth: 1080, margin: '0 auto', background: '#fff', borderTop: '1px solid #e3e8f0' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(21px,3vw,31px)', fontWeight: 900, color: MARINHO, marginBottom: 40, letterSpacing: '-0.5px' }}>{cfg.beneficios_titulo}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 24 }}>
          {(cfg.beneficios || []).map((b: any, i: number) => (
            <div key={i} style={{ background: '#f7fafc', borderRadius: 16, padding: 26, border: '1px solid #e3e8f0' }}>
              <div style={{ width: 34, height: 4, borderRadius: 4, background: CIANO, marginBottom: 16 }} />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: MARINHO, marginBottom: 9, lineHeight: 1.35 }}>{b.titulo}</h3>
              <p style={{ color: '#6b7280', lineHeight: 1.65, fontSize: 13.5 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTATO ──────────────────────────────────────────────────────
          Aqui ficavam os preços. Eles saíram da vitrine pública: o NODRI
          passa a ser apresentado numa conversa, e o link dos planos é
          liberado por você depois do primeiro contato. Concorrente não lê
          sua tabela, e ninguém assina sem você saber quem é. */}
      <section id="contato" style={{ padding: 'clamp(40px,7vw,70px) 20px', background: `linear-gradient(160deg, ${MARINHO}, #17457f)` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,34px)', fontWeight: 900, color: '#fff', marginBottom: 12, letterSpacing: '-0.5px' }}>
              Vamos conhecer o seu salão
            </h2>
            <p style={{ color: 'rgba(255,255,255,.9)', fontSize: 15, lineHeight: 1.65 }}>
              Conte como o seu salão funciona hoje e a gente mostra o que o NODRI muda na sua rotina.
              Preencha o formulário e retornamos com o plano certo para o seu tamanho.
            </p>
          </div>
          <FormularioContato />
        </div>
      </section>

      {/* TRABALHE CONOSCO */}
      <section style={{ background: '#f7fafc', padding: '54px 20px', textAlign: 'center', borderTop: '1px solid #e3e8f0' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}></div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: MARINHO, marginBottom: 12 }}>{cfg.afiliados_titulo}</h2>
          <p style={{ color: '#767069', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>{cfg.afiliados_subtitulo}</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', margin: '24px 0' }}>
            {(cfg.afiliados_chips || []).map((b: any, i: number) => (
              <div key={i} style={{ background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '12px 20px', color: '#1a1a1a', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{b.emoji}</span> {b.texto}
              </div>
            ))}
          </div>
          <a href="/trabalhe-conosco" style={{ display: 'inline-block', marginTop: 8, background: MARINHO, color: '#ffffff', fontWeight: 900, fontSize: 15, padding: '14px 40px', borderRadius: 12, textDecoration: 'none' }}>
            {cfg.afiliados_botao}
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '40px 20px', color: '#6b6860', borderTop: '1px solid #e0ddd8', background: '#ffffff' }}>
        <img src="/logo-nodri.png" alt="NODRI" style={{ height: 40, width: 'auto', marginBottom: 12 }} />
        <p>{cfg.footer_texto}</p>
        <p style={{ marginTop: 8 }}>{cfg.footer_email}</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/trabalhe-conosco" style={{ color: MARINHO, fontSize: 12, textDecoration: 'none' }}>Trabalhe Conosco</a>
          <a href="/afiliado" style={{ color: MARINHO, fontSize: 12, textDecoration: 'none' }}>Painel do Afiliado</a>
          <a href={`https://wa.me/${cfg.footer_whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', fontSize: 12, textDecoration: 'none' }}>WhatsApp</a>
          <a href="/login" style={{ color: MARINHO, fontSize: 12, textDecoration: 'none' }}>Área do Cliente</a>
        </div>
      </footer>
    </div>
  )
}
