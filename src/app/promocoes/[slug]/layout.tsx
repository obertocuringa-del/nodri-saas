import type { Metadata } from 'next'

/**
 * A página do cliente vai para o WhatsApp SEM card de prévia.
 *
 * Por que existia um card errado: o WhatsApp não abre a página, ele lê as
 * etiquetas do endereço. Esta página é montada no navegador do cliente — na
 * hora em que o WhatsApp busca, ela ainda está vazia —, então ele caía nas
 * etiquetas gerais do site, que são as de VENDER o NODRI para dono de salão.
 * Resultado: cliente de salão recebia um convite de promoção com um card
 * falando de "agenda, financeiro, metas e indicadores".
 *
 * Aqui essas etiquetas são apagadas para este endereço e para os endereços
 * abaixo dele. Sem título, sem descrição e sem imagem, não há do que montar
 * card: o link chega limpo e clicável.
 *
 * Vale para TODO salão, o de hoje e o que nascer amanhã, porque a regra é do
 * endereço e não do salão. Não há nada para configurar em salão nenhum, e o
 * salão modelo não carrega nada disso — não existe nome de salão escrito
 * neste arquivo, de propósito.
 *
 * `null` apaga; ausente herdaria. Esta é a diferença que faz o arquivo
 * funcionar, então não troque `null` por omissão.
 */
export const metadata: Metadata = {
  title: null,
  description: null,
  keywords: null,
  openGraph: null,
  twitter: null,
}

// A página em si não é tocada: este arquivo só embrulha o que já existe.
export default function LayoutDaVitrine({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
