'use client'
import { useEffect, useState } from 'react'
import FormularioContato from '@/components/FormularioContato'
import MenuFuncionalidades from '@/components/MenuFuncionalidades'
import Carrossel from '@/components/Carrossel'
import { LANDING_PADRAO } from '@/lib/landingDefaults'

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

const DEFAULT_CONFIG = LANDING_PADRAO

interface PlanoVitrine {
  nome: string; slug: string; preco: number; resumo: string
  novidades: string[]; herda: string | null; destaque: boolean
}

// Cores fixas por posição — não vêm do banco. O que muda no admin é preço e
// nome; a identidade visual da vitrine fica sob controle de quem desenha.
const CORES = ['#3498db', '#5b4fcf', '#9b59b6', '#f39c12']

export default function LandingPage({ cfgInicial }: { cfgInicial?: Record<string, any> }) {
  // Quando a raiz já entrega os textos (renderizados no servidor), começamos
  // com eles e não há troca na tela. Sem prop — na rota /landing — vale o
  // caminho antigo: padrão do código e busca depois.
  const [cfg, setCfg] = useState<any>(cfgInicial ? { ...DEFAULT_CONFIG, ...cfgInicial } : DEFAULT_CONFIG)
  const [planos, setPlanos] = useState<PlanoVitrine[]>([])

  useEffect(() => {
    // `r.ok` conferido de propósito: quando esta rota caía no login, o
    // .json() estourava e o erro sumia sem catch. A página seguia com os
    // textos do código e ninguém entendia por que o Editor não fazia efeito.
    // Já veio pronto do servidor: buscar de novo só causaria a troca que
    // este ajuste veio eliminar.
    if (!cfgInicial) {
      fetch('/api/landing-config')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && typeof d === 'object') setCfg({ ...DEFAULT_CONFIG, ...d }) })
        .catch(() => { /* fica com os textos do código */ })
    }
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

      <style>{`
        /* Quatro cards numa linha só no computador. Com auto-fit o quarto card
           caía sozinho numa segunda linha e a seção ficava torta.
           No celular vira uma coluna, senão o texto fica ilegível. */
        .nodri-4col { display: grid; gap: 18px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
        /* A imagem pesa mais que o texto: e ela que prende o olho de quem
           chega. 1.25fr contra 1fr da o destaque sem espremer a leitura. */
        .nodri-hero { display: grid; gap: clamp(30px,4vw,56px); align-items: center;
                      grid-template-columns: 1.05fr 1.1fr; }
        @media (max-width: 900px) { .nodri-hero { grid-template-columns: 1fr; } }
        @media (max-width: 1000px) { .nodri-4col { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px)  { .nodri-4col { grid-template-columns: 1fr; } }
      `}</style>

      {/* ── BARRA DO TOPO ─────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e3e8f0',
        padding: '2px clamp(16px,4vw,44px)',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
          {/* Logo em destaque: era 42px e sumia ao lado dos dois botoes. A
              marca e a primeira coisa que precisa ficar na memoria de quem
              chega pela primeira vez. */}
          <img src="/logo-nodri.png" alt="NODRI — Estilo & Beleza"
            style={{ height: 'clamp(60px, 6.4vw, 84px)', width: 'auto', margin: '-12px 0' }} />
        </a>
        <MenuFuncionalidades />
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
      {/* Respiro de cima bem menor que o de baixo: a faixa branca entre o
          cabecalho e a etiqueta nao dizia nada e empurrava o titulo para
          longe de quem acabou de chegar. Embaixo o espaco continua, porque
          ali ele separa esta secao da proxima. */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e3e8f0', padding: 'clamp(12px,1.6vw,22px) 20px clamp(14px,1.8vw,26px)' }}>
        <div className="nodri-hero" style={{ maxWidth: 1340, margin: '0 auto' }}>
          <div>
            <div style={{
              display: 'inline-block', padding: '7px 16px', borderRadius: 999,
              background: '#e6f7fb', color: '#046b85',
              fontSize: 11.5, fontWeight: 800, letterSpacing: '.5px',
              marginBottom: 16, textTransform: 'uppercase',
            }}>{(cfg as any).hero_etiqueta}</div>

            <h1 style={{
              fontSize: 'clamp(30px,3.9vw,50px)', fontWeight: 900, lineHeight: 1.12,
              letterSpacing: '-1px', marginBottom: 18, color: MARINHO,
              // O navegador distribui as palavras em linhas de tamanho parecido
              // em vez de encher uma e deixar a seguinte com duas palavras. Sem
              // isto, titulo longo em coluna estreita quebra torto.
              textWrap: 'balance', overflowWrap: 'break-word',
            }}>{cfg.hero_titulo}</h1>

            <p style={{ fontSize: 'clamp(15.5px,1.75vw,19px)', lineHeight: 1.7, color: '#4b5563', marginBottom: 'clamp(30px,3.4vw,48px)' }}>
              {cfg.hero_subtitulo}
            </p>

            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', marginBottom: 'clamp(28px,3.4vw,46px)' }}>
              {((cfg as any).destaques || []).map((d: any, i: number) => (
                <div key={i}>
                  <div style={{ width: 26, height: 3, borderRadius: 3, background: CIANO, marginBottom: 9 }} />
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: MARINHO, marginBottom: 4 }}>{d.titulo}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>{d.desc}</div>
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
              }}>{(cfg as any).hero_botao2}</a>
            </div>

            <p style={{ fontSize: 12.5, color: '#8b95a5', marginTop: 'clamp(14px,1.8vw,24px)' }}>
              {(cfg as any).hero_rodape}
            </p>
          </div>

          {/* DIREITA — fotos do salão, ou a ilustração do painel.
              O carrossel só entra quando existe foto cadastrada; sem nada,
              a ilustração continua ali. A página não pode ficar esperando
              foto que o dono ainda não tirou. */}
          {((cfg as any).hero_midias || []).filter((m: any) => m?.url?.trim()).length ? (
            <Carrossel
              midias={(cfg as any).hero_midias.filter((m: any) => m?.url?.trim())}
              intervalo={(cfg as any).hero_intervalo || 5} />
          ) : (
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
          )}
        </div>
      </section>

      {/* ── AS DORES ──────────────────────────────────────────────────────
          Quatro situações concretas em vez de adjetivos. Quem se reconhece em
          uma delas já entendeu para que serve o sistema, sem precisar que
          ninguém explique o que é "gestão integrada". */}
      <section id="dores" style={{ padding: 'clamp(44px,7vw,74px) 20px', maxWidth: 1240, margin: '0 auto' }}>
        <h2 style={{
          textAlign: 'center', fontSize: 'clamp(23px,3.2vw,35px)', fontWeight: 900,
          color: MARINHO, marginBottom: 12, letterSpacing: '-0.5px',
        }}>{(cfg as any).dores_titulo}</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 16.5, marginBottom: 44 }}>
          {(cfg as any).dores_subtitulo}
        </p>

        <div className="nodri-4col">
          {((cfg as any).dores || []).map((d: any, i: number) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 16, padding: 26,
              border: '1px solid #e3e8f0', borderTop: `4px solid ${CIANO}`,
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: MARINHO, marginBottom: 10, lineHeight: 1.35 }}>{d.titulo}</h3>
              <p style={{ color: '#6b7280', fontSize: 14.5, lineHeight: 1.7 }}>{d.desc}</p>
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
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontSize: 'clamp(23px,3.2vw,35px)', fontWeight: 900,
            color: MARINHO, marginBottom: 12, letterSpacing: '-0.5px', lineHeight: 1.25,
          }}>{String((cfg as any).comparacao_titulo || '').split('|').map((l: string, i: number) => (
            <span key={i}>{i > 0 && <br />}{l}</span>
          ))}</h2>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 15, marginBottom: 36, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto' }}>
            {(cfg as any).comparacao_subtitulo}
          </p>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))' }}>
            <div style={{ background: '#f7fafc', border: '1px solid #e3e8f0', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>
                {(cfg as any).comparacao_col1_titulo}
              </div>
              {((cfg as any).comparacao_col1 || []).map((t: string) => (
                <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 11, color: '#6b7280', fontSize: 14 }}>
                  <span style={{ color: '#c3ccd8', fontWeight: 900 }}>•</span> {t}
                </div>
              ))}
            </div>

            <div style={{ background: MARINHO, borderRadius: 16, padding: 24, color: '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: CIANO, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>
                {(cfg as any).comparacao_col2_titulo}
              </div>
              {((cfg as any).comparacao_col2 || []).map((t: string) => (
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
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(23px,3.2vw,35px)', fontWeight: 900, color: MARINHO, marginBottom: 40, letterSpacing: '-0.5px' }}>{cfg.beneficios_titulo}</h2>
        <div className="nodri-4col">
          {(cfg.beneficios || []).map((b: any, i: number) => (
            <div key={i} style={{ background: '#f7fafc', borderRadius: 16, padding: 26, border: '1px solid #e3e8f0' }}>
              <div style={{ width: 34, height: 4, borderRadius: 4, background: CIANO, marginBottom: 16 }} />
              <h3 style={{ fontSize: 17, fontWeight: 800, color: MARINHO, marginBottom: 9, lineHeight: 1.35 }}>{b.titulo}</h3>
              <p style={{ color: '#6b7280', lineHeight: 1.7, fontSize: 14.5 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOCOS EXTRAS -------------------------------------------------------
          Seções criadas por você no admin, sem precisar de código. Entram
          nesta posição, na ordem em que estiverem cadastradas. */}
      {((cfg as any).blocos_extras || []).map((b: any, i: number) => {
        const marinho = b.fundo === 'marinho'
        return (
          <section key={i} style={{
            padding: 'clamp(40px,6vw,68px) 20px',
            background: marinho ? MARINHO : b.fundo === 'branco' ? '#fff' : '#f7fafc',
            borderTop: '1px solid #e3e8f0',
          }}>
            <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
              {b.titulo && (
                <h2 style={{
                  fontSize: 'clamp(23px,3.2vw,35px)', fontWeight: 900,
                  color: marinho ? '#fff' : MARINHO, marginBottom: 12, letterSpacing: '-0.5px',
                }}>{b.titulo}</h2>
              )}
              {b.subtitulo && (
                <p style={{ color: marinho ? 'rgba(255,255,255,.85)' : '#6b7280', fontSize: 15, lineHeight: 1.65, maxWidth: 660, margin: '0 auto 30px' }}>{b.subtitulo}</p>
              )}

              {!!(b.cards || []).length && (
                <div className="nodri-4col" style={{ textAlign: 'left', marginTop: 8 }}>
                  {b.cards.map((card: any, j: number) => (
                    <div key={j} style={{
                      background: marinho ? 'rgba(255,255,255,.07)' : '#fff',
                      border: `1px solid ${marinho ? 'rgba(255,255,255,.16)' : '#e3e8f0'}`,
                      borderRadius: 16, padding: 24,
                    }}>
                      <div style={{ width: 30, height: 4, borderRadius: 4, background: CIANO, marginBottom: 14 }} />
                      <h3 style={{ fontSize: 15.5, fontWeight: 800, color: marinho ? '#fff' : MARINHO, marginBottom: 8, lineHeight: 1.35 }}>{card.titulo}</h3>
                      <p style={{ color: marinho ? 'rgba(255,255,255,.8)' : '#6b7280', fontSize: 13.5, lineHeight: 1.6 }}>{card.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {b.botao_texto && (
                <a href={b.botao_link || '#contato'} style={{
                  display: 'inline-block', marginTop: 28, padding: '15px 34px', borderRadius: 12,
                  textDecoration: 'none', fontWeight: 800, fontSize: 15,
                  background: marinho ? CIANO : MARINHO, color: marinho ? MARINHO : '#fff',
                }}>{b.botao_texto}</a>
              )}
            </div>
          </section>
        )
      })}

      {/* ── CONTATO ──────────────────────────────────────────────────────
          Aqui ficavam os preços. Eles saíram da vitrine pública: o NODRI
          passa a ser apresentado numa conversa, e o link dos planos é
          liberado por você depois do primeiro contato. Concorrente não lê
          sua tabela, e ninguém assina sem você saber quem é. */}
      <section id="contato" style={{ padding: 'clamp(40px,7vw,70px) 20px', background: `linear-gradient(160deg, ${MARINHO}, #17457f)` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,34px)', fontWeight: 900, color: '#fff', marginBottom: 12, letterSpacing: '-0.5px' }}>
              {(cfg as any).contato_titulo}
            </h2>
            <p style={{ color: 'rgba(255,255,255,.9)', fontSize: 15, lineHeight: 1.65 }}>
              {(cfg as any).contato_subtitulo}
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

      {/* O rodape saiu a pedido: logo repetida, o mesmo texto de apresentacao
          que ja esta no topo, e-mail e quatro links que duplicavam o que a
          barra do topo e a secao de afiliados ja oferecem. Bloco branco no fim
          da pagina sem nada novo so alonga a rolagem.

          Nada de essencial se perdeu: "Ja sou cliente" continua no topo e
          "Quero ser afiliado" na secao acima. */}
    </div>
  )
}
