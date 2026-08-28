import { supabaseAdmin } from './supabase'
import { getAtendimentosRaw } from './atendimentosCache'

// Confere a planilha importada contra os serviços cadastrados.
//
// O salão cadastra um serviço novo no sistema dele e esquece de cadastrar no
// NODRI. Aí o serviço aparece nos relatórios (que vêm da planilha) e não existe
// na tabela de preços, na vitrine, nem nas comissões. Ninguém percebe até
// alguém procurar — e ninguém procura.
//
// A planilha já está no banco: `atendimentos_raw` guarda serviço, categoria e
// valor de cada atendimento. Aqui só se compara.

export const CHAVE_IGNORADOS = 'servicos_conferencia_ignorados'

export interface ServicoAusente {
  nome: string
  categoria: string
  valorSugerido: number | null
  atendimentos: number
}

export interface ValorDivergente {
  nome: string
  servicoId: string
  cadastrado: number
  tipo: 'fixo' | 'minimo'
  cobrado: number
  atendimentos: number
}

export interface Conferencia {
  ausentes: ServicoAusente[]
  divergentes: ValorDivergente[]
  /** Quantos atendimentos entraram na conta — para dizer que não há planilha. */
  linhasLidas: number
}

/**
 * Nome comparável.
 *
 * A planilha escreve em caixa alta ("HIGIENIZAÇÃO CAPILAR") e o NODRI em caixa
 * de título ("Higienização Capilar"): comparando cru, TODO serviço apareceria
 * como não cadastrado. Fora acento e espaço dobrado, que variam sozinhos.
 */
export function normalizar(nome: string): string {
  return (nome || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
    .trim()
}

/**
 * O valor que mais se repete.
 *
 * A média mentiria: um pacote com valor 0 e um desconto puxam para baixo e o
 * resultado não é preço de nada. O que mais se repete é o preço de balcão.
 */
function valorMaisCobrado(valores: number[]): { valor: number | null; vezes: number } {
  const conta = new Map<number, number>()
  for (const v of valores) conta.set(v, (conta.get(v) || 0) + 1)
  let melhor: number | null = null
  let vezes = 0
  for (const [v, n] of conta) {
    if (n > vezes || (n === vezes && melhor !== null && v > melhor)) { melhor = v; vezes = n }
  }
  return { valor: melhor, vezes }
}

export async function nomesIgnorados(salaoId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_IGNORADOS).maybeSingle()
  const lista = (data as any)?.valor?.nomes
  return new Set(Array.isArray(lista) ? lista.map((n: any) => normalizar(String(n))) : [])
}

export async function ignorarNome(salaoId: string, nome: string): Promise<void> {
  const atuais = await nomesIgnorados(salaoId)
  atuais.add(normalizar(nome))
  await supabaseAdmin.from('salao_config').upsert(
    {
      salao_id: salaoId,
      chave: CHAVE_IGNORADOS,
      valor: { nomes: [...atuais] },
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'salao_id,chave' },
  )
}

export async function conferir(salaoId: string): Promise<Conferencia> {
  const [{ data: cadastrados }, linhas, ignorados] = await Promise.all([
    supabaseAdmin.from('salao_servicos')
      .select('id, nome, categoria, preco_fixo, preco_min')
      .eq('salao_id', salaoId),
    getAtendimentosRaw(salaoId),
    nomesIgnorados(salaoId),
  ])

  const porNome = new Map<string, any>()
  for (const s of cadastrados || []) porNome.set(normalizar(s.nome), s)

  // Agrupa a planilha por serviço, guardando os valores cobrados.
  const grupos = new Map<string, { nome: string; categoria: string; valores: number[] }>()
  for (const l of linhas || []) {
    const nome = String((l as any).servico || '').trim()
    if (!nome) continue
    const chave = normalizar(nome)
    if (!chave) continue
    if (!grupos.has(chave)) {
      grupos.set(chave, { nome, categoria: String((l as any).categoria || '').trim(), valores: [] })
    }
    const v = Number((l as any).valor)
    // Zero é linha de pacote: o serviço foi feito, mas cobrado no pacote e não
    // ali. Entra como atendimento, nunca como preço.
    if (Number.isFinite(v) && v > 0) grupos.get(chave)!.valores.push(Math.round(v * 100) / 100)
  }

  const ausentes: ServicoAusente[] = []
  const divergentes: ValorDivergente[] = []

  for (const [chave, g] of grupos) {
    if (ignorados.has(chave)) continue
    const cad = porNome.get(chave)
    const { valor: cobrado, vezes } = valorMaisCobrado(g.valores)

    if (!cad) {
      ausentes.push({
        nome: g.nome,
        categoria: g.categoria,
        valorSugerido: cobrado,
        atendimentos: g.valores.length,
      })
      continue
    }

    if (cobrado === null) continue

    const fixo = Number(cad.preco_fixo) || 0
    const minimo = Number(cad.preco_min) || 0

    if (fixo > 0) {
      if (Math.abs(cobrado - fixo) >= 0.01) {
        divergentes.push({
          nome: cad.nome, servicoId: cad.id, cadastrado: fixo,
          tipo: 'fixo', cobrado, atendimentos: vezes,
        })
      }
    } else if (minimo > 0) {
      // "A partir de" varia de propósito — Mechas custa conforme a quantidade.
      // Cobrar acima do mínimo é o esperado; abaixo é que é sinal de que o
      // mínimo cadastrado está errado.
      if (cobrado < minimo - 0.01) {
        divergentes.push({
          nome: cad.nome, servicoId: cad.id, cadastrado: minimo,
          tipo: 'minimo', cobrado, atendimentos: vezes,
        })
      }
    }
  }

  ausentes.sort((a, b) => b.atendimentos - a.atendimentos)
  divergentes.sort((a, b) => b.atendimentos - a.atendimentos)

  return { ausentes, divergentes, linhasLidas: (linhas || []).length }
}
