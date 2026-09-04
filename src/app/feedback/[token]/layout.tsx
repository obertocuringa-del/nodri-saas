import type { Metadata } from 'next'

/**
 * Etiqueta do card de previa do WhatsApp para este endereco.
 *
 * O WhatsApp nao abre a pagina: ele le as meta tags. Esta pagina e montada no
 * navegador de quem recebe, entao na hora da busca ela esta vazia, e ele caia
 * nas etiquetas gerais do site — as de VENDER o NODRI para dono de salao.
 * Quem recebia o link levava um card falando de "agenda, financeiro, metas e
 * indicadores", que nao tem nada a ver com o que ele foi convidado a fazer.
 *
 * `null` apaga o herdado; omitir herdaria. E o titulo e o negrito do card:
 * sem ele o WhatsApp escreve o dominio, que nao diz nada a ninguem.
 *
 * ATENCAO: este arquivo nao mexe no endereco nem na pagina. Ele so embrulha o
 * que ja existe. Todo link ja enviado continua valendo, e nenhum dado e
 * tocado.
 *
 * Palavra generica de proposito: serve a todo salao, e nenhum salao aparece
 * com o nome do outro.
 */
export const metadata: Metadata = {
  title: 'Pesquisa de satisfação',
  description: null,
  keywords: null,
  // Sem og e sem imagem: e o que impede o card de crescer e voltar a mostrar
  // o print do sistema.
  openGraph: null,
  twitter: null,
}

export default function LayoutDoFeedback({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
