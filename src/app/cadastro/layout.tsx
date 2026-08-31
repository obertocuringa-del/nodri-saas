import type { Metadata } from 'next'

// Componente de cliente não exporta metadata — por isso fica aqui.
// noindex de propósito: esta página não é vitrine, é passagem. Sem isto ela
// herdava o título da raiz e podia ser indexada com o texto da home.
export const metadata: Metadata = {
  title: 'Criar conta | NODRI',
  description: 'Finalize o cadastro do seu salão no NODRI.',
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
