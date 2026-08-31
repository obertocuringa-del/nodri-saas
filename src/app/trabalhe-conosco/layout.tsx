import type { Metadata } from 'next'

// A página é um componente de cliente ('use client'), e componente de cliente
// não pode exportar metadata. Por isso o título e a descrição moram neste
// layout, que é servidor e envolve só esta rota.
//
// Sem ele a página herdava o título e a descrição da raiz: aparecia na busca
// como se fosse a home do NODRI, com o mesmo texto — e ela ESTÁ no sitemap,
// ou seja, é uma das duas páginas que o Google deve indexar.
export const metadata: Metadata = {
  title: 'Programa de Afiliados | NODRI',
  description:
    'Indique o NODRI para salões de beleza e receba comissão por cada assinatura. Cadastro gratuito, link próprio e acompanhamento das indicações.',
  alternates: { canonical: 'https://www.nodri.com.br/trabalhe-conosco' },
  openGraph: {
    title: 'Programa de Afiliados NODRI',
    description:
      'Indique o NODRI para salões de beleza e receba comissão por cada assinatura.',
    url: 'https://www.nodri.com.br/trabalhe-conosco',
    siteName: 'NODRI',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
