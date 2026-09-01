import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import WhatsAppButton from '@/components/WhatsAppButton'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

// ── Como o NODRI aparece no Google ──────────────────────────────────────────
//
// O texto anterior — "Plataforma SaaS para gerenciamento de salões de beleza"
// — descrevia o produto pelo que ele É por dentro. Está tecnicamente correto e
// não vende nada: dono de salão não procura "plataforma SaaS". Ele procura
// controlar o salão, saber quanto faturou, acompanhar a equipe, organizar
// clientes. São essas palavras que precisam estar aqui, porque são as que ele
// digita na busca.
//
// Limites que o Google impõe, e que este texto respeita: título até ~60
// caracteres e descrição até ~155 — o que passa disso é cortado com "…" no
// meio da frase.
//
// O que NÃO dá para controlar daqui é a "Visão geral criada por IA" que
// aparece na busca: ela é escrita pelo Google a partir do conteúdo do site.
// Melhorar estes campos ajuda, mas quem manda nela é o texto das páginas.
// ── As fontes do NODRI, servidas do PROPRIO dominio ─────────────────────────
//
// Elas nunca apareceram. O globals.css pedia Syne e DM Sans com um @import
// para fonts.googleapis.com, e o CSP deste site diz `style-src 'self'` — ou
// seja, o navegador bloqueava a folha de estilo das fontes. Todo o sistema
// vinha sendo desenhado na fonte de reserva do sistema operacional, e a
// tipografia escolhida nunca chegou a ser vista por ninguem.
//
// A saida NAO foi abrir o CSP. O next/font baixa os arquivos no momento do
// build e os serve do proprio dominio: passa no CSP como esta, nao faz
// requisicao a terceiro (melhor privacidade), carrega antes e nao pisca
// trocando de fonte no meio do carregamento.
const syne = Syne({
  subsets: ['latin'], weight: ['400', '500', '600', '700', '800'],
  variable: '--fonte-titulo', display: 'swap',
})
const dmSans = DM_Sans({
  subsets: ['latin'], weight: ['300', '400', '500', '700'],
  variable: '--fonte-texto', display: 'swap',
})

export const metadata: Metadata = {
  title: 'NODRI | Gestão Inteligente para Salões de Beleza',
  description:
    'Controle seu salão em um só lugar: agenda, clientes, profissionais, financeiro, metas e indicadores. Transforme os dados do seu salão em decisões melhores.',
  keywords: [
    'sistema para salão de beleza', 'gestão de salão de beleza',
    'controle financeiro para salão', 'software para salão de beleza',
    'gestão de profissionais', 'metas e indicadores para salão',
  ],
  // Título e descrição usados quando o link é compartilhado no WhatsApp, no
  // Instagram ou no Facebook — hoje o link chegava sem nada disso.
  openGraph: {
    title: 'NODRI | Gestão Inteligente para Salões de Beleza',
    description:
      'Seu salão no controle, suas decisões baseadas em dados. Agenda, clientes, profissionais, financeiro, metas e indicadores em uma única plataforma.',
    url: 'https://www.nodri.com.br',
    siteName: 'NODRI',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NODRI | Gestão Inteligente para Salões de Beleza',
    description:
      'Seu salão no controle, suas decisões baseadas em dados. Agenda, clientes, profissionais, financeiro, metas e indicadores em uma única plataforma.',
  },
  metadataBase: new URL('https://www.nodri.com.br'),
  // Para verificar o site no Google Search Console: crie a variavel
  // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION na Vercel com o codigo que o Google
  // der, e a meta tag aparece sozinha. Sem a variavel, nada e escrito.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
}

// ── Como o celular deve desenhar a página ────────────────────────────────────
//
// Antes isto não existia e o Next usava o padrao dele. Duas coisas faltavam:
//
// 1. themeColor: a barra do navegador (topo do Chrome no Android, borda da
//    aba no iPhone) ficava branca ou cinza, sem relação com o sistema. Agora
//    ela pega o mesmo creme do fundo — a tela vira uma coisa só.
// 2. colorScheme: declara que o NODRI é claro. Sem isso, aparelho no modo
//    escuro pintava de preto o que o proprio navegador desenha (setinha do
//    select, calendario do campo de data, texto sugerido) — preto no preto.
//
// O zoom continua LIBERADO de propósito: travar o zoom é o atalho fácil para
// "arrumar" o celular, e tira de quem enxerga pouco a única saída que resta.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#faf9f7',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${syne.variable} ${dmSans.variable}`}>
      <body>
        {children}
        <WhatsAppButton />

        {/* ── Medicao de visitas e de velocidade ────────────────────────────
            Por que NAO e o Google Analytics:
            o CSP deste site diz `script-src 'self'`, ou seja, script de fora
            nao roda. Para o GA funcionar seria preciso abrir o CSP para os
            dominios do Google — e, como o GA grava cookie de rastreamento,
            entraria junto a obrigacao do banner de consentimento (LGPD).
            Pagar com um pedaco da blindagem e com um banner na cara de quem
            chega, para saber quantas visitas o site teve, e caro demais.

            Estes dois sao servidos do PROPRIO dominio (/_vercel/insights/),
            entao passam no CSP que ja existe sem mudar uma linha dele, e nao
            gravam cookie nem identificam ninguem — por isso dispensam banner.

            Analytics: quantas visitas, de onde vieram, quais paginas.
            SpeedInsights: quanto o site demora para abrir NO APARELHO DE QUEM
            USA — nao no teste de laboratorio. E o unico numero de velocidade
            que corresponde ao celular do dono do salao no 4G.

            Os dois so comecam a receber dados depois de ligados no painel da
            Vercel (Projeto > Analytics > Enable). Sem isso o script nem carrega,
            entao nao ha custo em ja deixar montado. */}
        <Analytics />
        <SpeedInsights />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#1a1a1a',
              border: '1px solid #e8e6e0',
              borderRadius: '10px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#ffffff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
          }}
        />
      </body>
    </html>
  )
}
