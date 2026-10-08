// ── Descrição de Cargo: a forma do documento ────────────────────────────────
//
// Um cargo é uma lista de BLOCOS, e cada bloco é um título com um texto
// corrido ou uma lista de itens. É essa separação que deixa a página
// editável de verdade: dá para acrescentar um dever sem reescrever o
// parágrafo inteiro, e para apagar um sem levar o vizinho junto.
//
// Nada de modelo pronto com conteúdo de salão aqui dentro. O texto do
// COORDENADOR OPERACIONAL foi escrito pelo dono do Rouge e vai para o BANCO
// dele, pela tela -- um exemplo cravado no código nasceria em todo salão
// novo, como já aconteceu em julho de 2026.

export type TipoBloco = 'texto' | 'lista' | 'checklist' | 'destaque' | 'divisor'

export interface BlocoCargo {
  id: string
  tipo: TipoBloco
  /** Vazio é válido: um bloco de texto solto, sem título. */
  titulo: string
  /** Para 'texto' e 'destaque'. */
  corpo?: string
  /** Para 'lista' e 'checklist'. */
  itens?: string[]
}

export interface DocCargo {
  /** O nome do cargo, que pode diferir do nome do setor. */
  cargo: string
  blocos: BlocoCargo[]
  atualizado_em?: string
}

export const TIPOS_BLOCO: Array<{ tipo: TipoBloco; rotulo: string; ajuda: string }> = [
  { tipo: 'texto',     rotulo: 'Parágrafo',  ajuda: 'Um texto corrido, como a missão ou o propósito.' },
  { tipo: 'lista',     rotulo: 'Lista',      ajuda: 'Itens com marcador — deveres, atribuições.' },
  { tipo: 'checklist', rotulo: 'Permissões', ajuda: 'Itens com visto — o que a pessoa PODE fazer.' },
  { tipo: 'destaque',  rotulo: 'Destaque',   ajuda: 'Um aviso ou princípio, em caixa realçada.' },
  { tipo: 'divisor',   rotulo: 'Separador',  ajuda: 'Uma linha para separar assuntos.' },
]

export function novoId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function blocoVazio(tipo: TipoBloco): BlocoCargo {
  return {
    id: novoId(),
    tipo,
    titulo: '',
    ...(tipo === 'lista' || tipo === 'checklist' ? { itens: [''] } : { corpo: '' }),
  }
}

export function docVazio(cargo: string): DocCargo {
  return { cargo, blocos: [] }
}

/** Um documento guardado pode vir de versão antiga ou torto. Normaliza sem
 *  perder nada: bloco sem tipo vira texto, item que não é string sai. */
export function lerDoc(bruto: any, cargoPadrao: string): DocCargo {
  const cargo = String(bruto?.cargo || cargoPadrao || '').slice(0, 120)
  const brutos = Array.isArray(bruto?.blocos) ? bruto.blocos : []
  const blocos: BlocoCargo[] = brutos.map((b: any) => {
    const tipo: TipoBloco = TIPOS_BLOCO.some(t => t.tipo === b?.tipo) ? b.tipo : 'texto'
    return {
      id: String(b?.id || novoId()),
      tipo,
      titulo: String(b?.titulo || ''),
      ...(tipo === 'lista' || tipo === 'checklist'
        ? { itens: (Array.isArray(b?.itens) ? b.itens : []).map((i: any) => String(i ?? '')) }
        : { corpo: String(b?.corpo || '') }),
    }
  })
  return { cargo, blocos, atualizado_em: bruto?.atualizado_em }
}
