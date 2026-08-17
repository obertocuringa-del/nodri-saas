'use client'

// A pagina de Profissionais agora e so a casca: o conteudo vive no painel, que
// e o mesmo usado DENTRO dos setores (cada um com a sua secao).

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import ProfissionaisPainel from '@/components/salon/ProfissionaisPainel'

// `?secao=materiais` abre direto na seção. Sem isto, a busca do Ctrl+K trazia
// a pessoa para a lista de profissionais e o que ela procurou (Materiais para
// Trabalho, Ficha de entrevista…) ficava escondido atrás de mais um clique —
// dava a impressão de que a página "não abria".
function Conteudo() {
  const secao = useSearchParams().get('secao') || ''
  return <ProfissionaisPainel secaoFixa={secao} />
}

export default function ProfissionaisPage() {
  return <Suspense fallback={null}><Conteudo /></Suspense>
}
