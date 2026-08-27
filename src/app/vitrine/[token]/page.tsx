import { redirect } from 'next/navigation'
import { getSalaoPorToken } from '@/lib/vitrineConfig'

export const dynamic = 'force-dynamic'

// Endereço antigo da página do cliente, de quando ela se chamava "vitrine".
//
// Fica aqui só para não quebrar o que já foi compartilhado: quem abrir o link
// velho cai no endereço novo, com o slug legível. Sem isso, todo link que já
// saiu do salão viraria "página não encontrada".
export default async function VitrineAntiga({ params }: { params: { token: string } }) {
  const salao = await getSalaoPorToken(params.token)
  redirect(salao?.config?.slug ? `/promocoes/${salao.config.slug}` : '/')
}
