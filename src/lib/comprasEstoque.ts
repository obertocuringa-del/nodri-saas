// Compras e Estoque — tipos e áreas compartilhados entre a tela do setor
// (ListaCompras) e a tela de decisão do Financeiro (PedidosCompraFinanceiro).

export const rid = () => Math.random().toString(36).slice(2, 9)
export const num = (v: any) => parseFloat(String(v ?? '0').replace(',', '.')) || 0
export const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export interface ItemLista { id: string; nome: string; minimo: string; atual: string; comprar: string }

export type StatusPedido = 'rascunho' | 'enviado' | 'aprovado' | 'negado' | 'financeiro_compra' | 'comprado'

export interface Pedido {
  id: string
  descricao: string
  valor: string
  status: StatusPedido
  criadoEm: number
  enviadoEm?: number
  decididoEm?: number
  compradoEm?: number
  motivo?: string
  pendenciaId?: string
  /** de qual setor veio — preenchido no envio */
  area?: string
  areaTitulo?: string
  /** 'pedido' = valor avulso; 'lista' = a lista de reposição enviada inteira */
  tipo?: 'pedido' | 'lista'
  /** cópia dos itens no momento do envio (só quando tipo = 'lista') */
  itens?: ItemLista[]
}

export const STATUS_PEDIDO: Record<StatusPedido, { rotulo: string; cor: string; fundo: string; borda: string }> = {
  rascunho:          { rotulo: 'RASCUNHO',            cor: '#6b7280', fundo: '#fff',    borda: '#eceae4' },
  enviado:           { rotulo: 'AGUARDANDO FINANCEIRO', cor: '#b45309', fundo: '#fffbeb', borda: '#fde68a' },
  aprovado:          { rotulo: 'APROVADO',            cor: '#16a34a', fundo: '#f0fdf4', borda: '#bbf7d0' },
  negado:            { rotulo: 'NÃO APROVADO',        cor: '#dc2626', fundo: '#fef2f2', borda: '#fecaca' },
  financeiro_compra: { rotulo: 'FINANCEIRO VAI COMPRAR', cor: '#5b4fcf', fundo: '#f5f3ff', borda: '#ddd6f5' },
  comprado:          { rotulo: 'COMPRA FEITA',        cor: '#15803d', fundo: '#f0fdf4', borda: '#bbf7d0' },
}

/**
 * Uma página de compra por SETOR — assim cada setor pede o que é dele e as
 * listas não se misturam. São os mesmos setores do organograma; para incluir um
 * setor novo, basta acrescentar uma linha aqui.
 */
export const AREAS_COMPRAS: { id: string; titulo: string }[] = [
  { id: 'recepcao',       titulo: 'Recepção' },
  { id: 'profissionais',  titulo: 'Profissionais' },
  { id: 'dosagem',        titulo: 'Dosagem' },
  { id: 'cafe',           titulo: 'Café' },
  { id: 'servicos_gerais', titulo: 'Serviços Gerais' },
  { id: 'manutencao',     titulo: 'Manutenção' },
  { id: 'marketing',      titulo: 'Marketing' },
  { id: 'comercial',      titulo: 'Comercial / Vendas' },
  { id: 'administrativo', titulo: 'Administrativo' },
  { id: 'financeiro',     titulo: 'Financeiro' },
  { id: 'rh',             titulo: 'RH / Gestão de Pessoas' },
  { id: 'qualidade',      titulo: 'Processo / Qualidade' },
  { id: 'tecnica',        titulo: 'Responsável Técnica' },
  { id: 'gerencia',       titulo: 'Gerência' },
]

/** Chave no salao_config onde a lista e os pedidos daquele setor ficam. */
export const chavePedidos = (area: string) => `compras_${area}`

// ── Compartilhar no WhatsApp ────────────────────────────────────────────────
//
// Quem compra quase nunca é quem abriu o pedido: a lista vai para o dono, para
// o marido, para o motoboy. Sem um texto pronto, essa passagem virava print de
// tela — ilegível no celular e sem as quantidades.
//
// O WhatsApp formata com *negrito* e _itálico_. Nada de markdown de outro tipo:
// o que ele não entende aparece como caractere solto na mensagem.

/** Texto pronto do pedido, já formatado para colar no WhatsApp. */
export function textoWhatsPedido(p: Pedido, salao?: string): string {
  const linhas: string[] = []
  const titulo = p.tipo === 'lista' ? 'LISTA DE COMPRA' : 'PEDIDO DE COMPRA'
  linhas.push(`*${titulo}${p.areaTitulo ? ` — ${p.areaTitulo.toUpperCase()}` : ''}*`)

  const data = new Date(p.enviadoEm || p.criadoEm || Date.now()).toLocaleDateString('pt-BR')
  linhas.push(`_${salao ? `${salao} · ` : ''}${data}_`)
  linhas.push('')

  const itens = (p.itens || []).filter(i => i.nome?.trim())
  if (itens.length) {
    linhas.push(`*ITENS A COMPRAR (${itens.length})*`)
    itens.forEach((i, n) => {
      const qtd = num(i.comprar) || Math.max(0, num(i.minimo) - num(i.atual))
      linhas.push(`${n + 1}. ${i.nome} — *${qtd}*`)
    })
    linhas.push('')
  } else if (p.descricao) {
    linhas.push(`*O QUE FOI PEDIDO*`)
    linhas.push(p.descricao)
  }

  if (num(p.valor) > 0) {
    linhas.push('')
    linhas.push(`*Orçamento previsto:* ${moeda(num(p.valor))}`)
  }
  return linhas.join('\n')
}

/**
 * Junta TODOS os pedidos numa mensagem só, separados por setor.
 *
 * É a compra da semana inteira indo de uma vez para quem vai ao mercado: um
 * bloco por setor, e dentro dele um item por linha. Sem isso, o Financeiro
 * tinha de mandar um pedido de cada vez e quem recebia perdia a conta.
 */
export function textoWhatsTodos(pedidos: Pedido[], salao?: string): string {
  const linhas: string[] = ['*COMPRAS A FAZER*']
  linhas.push(`_${salao ? `${salao} · ` : ''}${new Date().toLocaleDateString('pt-BR')}_`)

  const porSetor = new Map<string, Pedido[]>()
  for (const p of pedidos) {
    const setor = p.areaTitulo || 'Sem setor'
    porSetor.set(setor, [...(porSetor.get(setor) || []), p])
  }

  let totalItens = 0
  for (const [setor, lista] of porSetor) {
    linhas.push('')
    linhas.push('━━━━━━━━━━━━━━')
    linhas.push(`*${setor.toUpperCase()}*`)
    for (const p of lista) {
      const itens = (p.itens || []).filter(i => i.nome?.trim())
      if (itens.length) {
        itens.forEach(i => {
          const qtd = num(i.comprar) || Math.max(0, num(i.minimo) - num(i.atual))
          linhas.push(`• ${i.nome} — *${qtd}*`)
          totalItens++
        })
      } else if (p.descricao) {
        linhas.push(`• ${p.descricao}`)
        totalItens++
      }
    }
  }

  linhas.push('')
  linhas.push('━━━━━━━━━━━━━━')
  linhas.push(`*TOTAL:* ${totalItens} ${totalItens === 1 ? 'item' : 'itens'} · ${porSetor.size} ${porSetor.size === 1 ? 'setor' : 'setores'}`)
  return linhas.join('\n')
}

/**
 * Abre o WhatsApp com a mensagem pronta — sem número, quem envia escolhe.
 *
 * `api.whatsapp.com/send` em vez de `wa.me`: no computador o wa.me às vezes
 * entrega o texto sem as quebras de linha, e a lista chega com um item colado
 * no outro. Este endereço preserva os %0A.
 */
export function abrirWhats(texto: string) {
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
}
