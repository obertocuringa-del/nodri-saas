import type { Metadata } from 'next'

/**
 * Etiqueta do card de previa do WhatsApp para este endereco.
 *
 * Mesmo motivo da pagina de feedback: o WhatsApp nao abre a pagina, le as
 * meta tags, e esta e montada no navegador de quem recebe. Sem isto o link
 * chega com o anuncio do NODRI para dono de salao — propaganda de sistema
 * onde deveria estar o nome do que se pede.
 *
 * `null` apaga o herdado; omitir herdaria. O titulo e o negrito do card: sem
 * ele o WhatsApp escreve o dominio, que nao diz nada a ninguem.
 *
 * Generico de proposito: serve a todo salao, e nenhum salao aparece com o
 * nome do outro. O nome de quem avalia e de quem e avaliado fica DENTRO da
 * pagina, atras do token — nao no card, que circula em grupo.
 */
export const metadata: Metadata = {
  title: 'Avaliação de desempenho',
  description: null,
  keywords: null,
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
}

export default function LayoutDaAvaliacao({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
