'use client'
import { useEffect, useRef, useState } from 'react'
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

  // O texto do topo fica ancorado embaixo, entao a etiqueta "Gestao para
  // saloes" nasce a uma distancia que muda com a altura da tela. O video do
  // lado precisa comecar nessa mesma linha — e isso nenhuma regra de CSS
  // resolve sozinha, porque depende do tamanho do texto renderizado.
  const heroRef = useRef<HTMLDivElement>(null)
  const etiquetaRef = useRef<HTMLDivElement>(null)
  const [recuoVideo, setRecuoVideo] = useState(0)

  useEffect(() => {
    const medir = () => {
      const h = heroRef.current, e = etiquetaRef.current
      if (!h || !e) return
      setRecuoVideo(Math.max(0, Math.round(
        e.getBoundingClientRect().top - h.getBoundingClientRect().top)))
    }
    medir()
    const ro = new ResizeObserver(medir)
    if (heroRef.current) ro.observe(heroRef.current)
    window.addEventListener('resize', medir)
    return () => { ro.disconnect(); window.removeEventListener('resize', medir) }
  }, [cfg])

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
        .nodri-hero { display: grid; gap: clamp(30px,4vw,56px); align-items: stretch;
                      grid-template-columns: 1.05fr 1.1fr; }
        @media (max-width: 900px) { .nodri-hero { grid-template-columns: 1fr; } }

        /* ── CELULAR ────────────────────────────────────────────────────
           No computador o topo e duas colunas: texto de um lado, foto do
           outro. No celular isso vira uma pilha, e a ordem de leitura passa
           a valer mais que o alinhamento: promessa, foto, provas, botao.

           O display:contents na coluna do texto solta os filhos dela dentro
           da pilha — sem isso a foto so poderia ficar antes ou depois do
           bloco inteiro de texto, nunca no meio dele. */
        @media (max-width: 900px) {
          .nodri-hero { display: flex !important; flex-direction: column; gap: 20px; }
          /* O !important e necessario: o estilo escrito no proprio elemento
             (display:flex) ganha da folha de estilo sem ele. */
          .nodri-hero-texto { display: contents !important; }
          .hero-etiqueta  { order: 1; }
          .hero-titulo    { order: 2; }
          .hero-sub       { order: 3; }
          .hero-destaques { order: 4; }
          .hero-midia     { order: 5; }
          .hero-botoes    { order: 6; }
          .hero-rodape    { order: 7; }

          /* A abertura para de valer a tela inteira: no celular o conteudo e
             mais alto que a tela de qualquer jeito, e forcar altura so criava
             faixa branca. */
          .nodri-abertura { min-height: 0 !important; padding-top: 16px !important; padding-bottom: 28px !important; }

          /* A foto aparece INTEIRA. Recortar no celular cortava justamente o
             rosto e o texto da arte. */
          .nodri-midia-cheia { height: auto !important; margin: 0 !important; }
          .nodri-midia-cheia img { position: static !important; height: auto !important; object-fit: contain !important; }
          .nodri-midia-cheia > div[style*="aspect-ratio"] { margin-top: 0 !important; }

          .hero-titulo { font-size: clamp(28px, 8.2vw, 40px) !important; letter-spacing: -.5px; }
          .hero-sub { font-size: 15.5px !important; line-height: 1.6 !important; }
          .hero-destaques { grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
          .hero-botoes { display: grid !important; grid-template-columns: 1fr 1fr; gap: 10px !important; }
          .hero-botoes a { text-align: center; padding: 15px 8px !important; font-size: 14px !important; }
          .hero-rodape { text-align: center; }
          .nodri-painel-cards { grid-template-columns: 1fr !important; }

          /* Cards em duas colunas tambem no celular: um embaixo do outro
             deixava a pagina longa demais para rolar. Fonte e respiro
             menores para o texto nao virar uma palavra por linha. */
          .nodri-4col { gap: 12px !important; }
          .nodri-4col > div { padding: 16px !important; }
          .nodri-4col h3 { font-size: 14.5px !important; line-height: 1.3 !important; }
          .nodri-4col p { font-size: 12.5px !important; line-height: 1.55 !important; }

          /* Vantagens do afiliado: duas por linha, todas do mesmo tamanho. */
          .nodri-chips { display: grid !important; grid-template-columns: 1fr 1fr; gap: 10px !important; margin: 18px 0 !important; }
          .nodri-chips > div { font-size: 12px !important; padding: 11px 10px !important; justify-content: center; text-align: center; }

          /* O respiro entre as ultimas secoes era de tela grande e no celular
             virava faixa vazia. */
          .nodri-afiliados { padding: 30px 16px !important; }
          #contato { padding-bottom: 22px !important; }
        }

        /* Celular estreito: dois destaques lado a lado ficam com uma palavra
           por linha. Uma coluna so le melhor. */
        @media (max-width: 430px) {
          .hero-destaques { grid-template-columns: 1fr !important; gap: 14px !important; }
        }

        /* A barra do topo cabia em uma linha so ate os dois botoes se
           empilharem no celular — logo menor e botoes mais curtos resolvem
           sem esconder nada. */
        @media (max-width: 640px) {
          .nodri-topo { flex-wrap: nowrap !important; gap: 8px !important; padding: 4px 12px !important; }
          .nodri-topo img { height: 46px !important; margin: -4px 0 !important; }
          .nodri-btn-topo { padding: 9px 12px !important; font-size: 11px !important; border-radius: 9px !important; white-space: nowrap; }
          /* Tres botoes nao cabem em 390px: o menu de funcionalidades sai
             da barra, e no lugar dele fica o "Ver como funciona" do topo. */
          .nodri-menu-func { display: none !important; }
        }
        @media (max-width: 1000px) { .nodri-4col { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px)  { .nodri-4col { gap: 12px; } }
      `}</style>

      {/* ── BARRA DO TOPO ─────────────────────────────────────────────── */}
      <header className="nodri-topo" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(242,247,251,.96)', backdropFilter: 'blur(10px)',
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
        <a href="#contato" className="nodri-btn-topo" style={{
          padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
          border: `2px solid ${MARINHO}`, color: MARINHO, fontWeight: 800, fontSize: 13,
        }}>FALE CONOSCO</a>
        <a href="/login" className="nodri-btn-topo" style={{
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
      <section className="nodri-abertura" style={{
        background: '#fff', borderBottom: '1px solid #e3e8f0',
        padding: 'clamp(12px,1.6vw,22px) 20px clamp(8px,1vw,16px)',
        // A abertura ocupa a tela inteira menos a barra do topo: quem chega
        // ve so ela, e a secao seguinte so aparece quando a pessoa rola.
        // Antes o titulo de baixo espiava no rodape e roubava a atencao.
        // A altura descontada e a MESMA formula da barra do topo (logo
        // clamp(60,6.4vw,84) com margem -12 em cima e embaixo, mais o
        // padding e a borda). Chutar 88px deixava a secao de baixo
        // espiando no rodape da tela em algumas resolucoes.
        boxSizing: 'border-box',
        minHeight: 'calc(100svh - max(clamp(60px, 6.4vw, 84px) - 24px, 40px) - 5px)',
        display: 'flex',
      }}>
        <div ref={heroRef} className="nodri-hero" style={{ maxWidth: 1340, margin: '0 auto', width: '100%', flex: 1 }}>
          {/* Bloco ancorado embaixo, alinhado com o fim da imagem. Espalhar o
              conteudo (space-between) resolvia a sobra de baixo, mas subia a
              etiqueta e o titulo para o topo - o oposto do que se queria.
              Com flex-end o espaco que sobra fica em CIMA, onde nao incomoda. */}
          <div className="nodri-hero-texto" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(16px,1.8vw,24px)' }}>
            <div ref={etiquetaRef} className="hero-etiqueta" style={{
              display: 'inline-block', padding: '7px 16px', borderRadius: 999,
              background: '#e6f7fb', color: '#046b85',
              fontSize: 11.5, fontWeight: 800, letterSpacing: '.5px',
              textTransform: 'uppercase', alignSelf: 'flex-start',
            }}>{(cfg as any).hero_etiqueta}</div>

            <h1 className="hero-titulo" style={{
              fontSize: 'clamp(30px,3.9vw,50px)', fontWeight: 900, lineHeight: 1.12,
              letterSpacing: '-1px', color: MARINHO,
              // O navegador distribui as palavras em linhas de tamanho parecido
              // em vez de encher uma e deixar a seguinte com duas palavras. Sem
              // isto, titulo longo em coluna estreita quebra torto.
              textWrap: 'balance', overflowWrap: 'break-word',
            }}>{cfg.hero_titulo}</h1>

            <p className="hero-sub" style={{ fontSize: 'clamp(15.5px,1.75vw,19px)', lineHeight: 1.7, color: '#4b5563' }}>
              {cfg.hero_subtitulo}
            </p>

            <div className="hero-destaques" style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
              {((cfg as any).destaques || []).map((d: any, i: number) => (
                <div key={i}>
                  <div style={{ width: 26, height: 3, borderRadius: 3, background: CIANO, marginBottom: 9 }} />
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: MARINHO, marginBottom: 4 }}>{d.titulo}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>{d.desc}</div>
                </div>
              ))}
            </div>

            <div className="hero-botoes" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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

            <p className="hero-rodape" style={{ fontSize: 12.5, color: '#8b95a5' }}>
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
              intervalo={(cfg as any).hero_intervalo || 5}
              preencher recuo={recuoVideo} className="hero-midia" />
          ) : (
          <div className="hero-midia" style={{
            background: '#f7fafc', border: '1px solid #e3e8f0', borderRadius: 18,
            padding: 18, boxShadow: '0 18px 50px rgba(13,42,86,.09)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 9, height: 9, borderRadius: 99, background: '#e2574c' }} />
              <div style={{ width: 9, height: 9, borderRadius: 99, background: '#f5c451' }} />
              <div style={{ width: 9, height: 9, borderRadius: 99, background: '#5cb85c' }} />
              <span style={{ marginLeft: 6, fontSize: 11.5, color: '#8b95a5' }}>Painel do salão</span>
            </div>

            <div className="nodri-painel-cards" style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
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
      <section id="dores" style={{ padding: 'clamp(18px,2.4vw,30px) 20px clamp(40px,5.5vw,62px)', maxWidth: 1240, margin: '0 auto' }}>
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
      <section style={{ padding: 'clamp(34px,4.5vw,54px) 20px clamp(40px,5.5vw,62px)', background: '#fff', borderTop: '1px solid #e3e8f0' }}>
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
      <section style={{ padding: 'clamp(34px,4.5vw,54px) 20px clamp(40px,5.5vw,62px)', maxWidth: 1080, margin: '0 auto', background: '#fff', borderTop: '1px solid #e3e8f0' }}>
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
      <section id="contato" style={{
        padding: 'clamp(20px,2.6vw,32px) 20px',
        // A barra do topo e fixa: sem esta margem de rolagem a ancora
        // parava com o titulo escondido atras dela.
        scrollMarginTop: 'calc(max(clamp(60px, 6.4vw, 84px) - 24px, 40px) + 9px)',
        background: `linear-gradient(160deg, ${MARINHO}, #17457f)`,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <h2 style={{ fontSize: 'clamp(22px,3vw,29px)', fontWeight: 900, color: '#fff', marginBottom: 9, letterSpacing: '-0.5px' }}>
              {(cfg as any).contato_titulo}
            </h2>
            <p style={{ color: 'rgba(255,255,255,.9)', fontSize: 14, lineHeight: 1.55 }}>
              {(cfg as any).contato_subtitulo}
            </p>
          </div>
          <FormularioContato />
        </div>
      </section>

      {/* TRABALHE CONOSCO */}
      <section className="nodri-afiliados" style={{ background: '#f7fafc', padding: '54px 20px', textAlign: 'center', borderTop: '1px solid #e3e8f0' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}></div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: MARINHO, marginBottom: 12 }}>{cfg.afiliados_titulo}</h2>
          <p style={{ color: '#767069', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>{cfg.afiliados_subtitulo}</p>
          <div className="nodri-chips" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', margin: '24px 0' }}>
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
