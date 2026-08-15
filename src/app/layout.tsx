import type { Metadata } from 'next'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
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
