import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import WhatsAppButton from '@/components/WhatsAppButton'
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
    <html lang="pt-BR">
      <head>
        {/* As fontes (Syne e DM Sans) sao pedidas la de dentro do globals.css,
            e o navegador so descobre o endereco delas DEPOIS de baixar e ler o
            CSS inteiro. Estas duas linhas mandam abrir a conversa com o
            servidor de fontes em paralelo, ainda durante a leitura do HTML.
            Quando chegar a hora de pedir a fonte, a conexao ja esta pronta —
            o texto aparece na fonte certa mais cedo, sem aquele pisca de
            trocar a fonte no meio do carregamento. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <WhatsAppButton />
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
