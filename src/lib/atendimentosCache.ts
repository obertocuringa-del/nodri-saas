import { supabaseAdmin } from '@/lib/supabase'

// ============================================================
// Cache compartilhado de atendimentos_raw (por salão)
// ------------------------------------------------------------
// Vários relatórios releem a tabela INTEIRA de atendimentos a
// cada acesso (paginando de 1000 em 1000 — dezenas de idas ao
// banco). Como os dados brutos só mudam quando o salão importa
// um Excel novo, mantemos o resultado em memória.
//
// Frescor garantido: antes de servir o cache, conferimos uma
// "assinatura" barata (contagem + último registro inserido).
// Se a assinatura mudou (importação nova), recarrega sozinho.
// Ou seja: NUNCA mostra dado velho, só evita releitura inútil.
// ============================================================

// Colunas necessárias por todas as rotas que fazem varredura completa.
const COLS =
  'cliente, celular, telefone, profissional, data_comanda, servico, categoria, ano, mes, total, valor, num_comanda, qtd'

// Descarta entradas paradas há muito tempo (higiene de memória).
const MAX_AGE_MS = 15 * 60 * 1000

type Entry = { sig: string; rows: any[]; ts: number }
const cache = new Map<string, Entry>()

// Assinatura leve: contagem + criado_em do registro mais recente.
// Duas queries rápidas (usam o índice de salao_id) — desprezível
// perto de paginar a tabela inteira.
async function assinatura(salaoId: string): Promise<string> {
  const { count } = await supabaseAdmin
    .from('atendimentos_raw')
    .select('*', { count: 'exact', head: true })
    .eq('salao_id', salaoId)

  const { data: ultimo } = await supabaseAdmin
    .from('atendimentos_raw')
    .select('criado_em')
    .eq('salao_id', salaoId)
    .order('criado_em', { ascending: false })
    .limit(1)

  const last = ultimo?.[0]?.criado_em || ''
  return `${count ?? 0}:${last}`
}

// Leitura paginada (mesma estratégia de antes — não muda o resultado).
async function buscarTodos(salaoId: string): Promise<any[]> {
  let rows: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw')
      .select(COLS)
      .eq('salao_id', salaoId)
      .order('ano').order('mes').order('cliente')
      .range(from, from + 999)
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  return rows
}

/**
 * Retorna todos os atendimentos brutos do salão.
 * Serve do cache quando os dados não mudaram; senão recarrega.
 */
export async function getAtendimentosRaw(salaoId: string): Promise<any[]> {
  const hit = cache.get(salaoId)
  // Limpa entradas antigas
  if (hit && Date.now() - hit.ts > MAX_AGE_MS) {
    cache.delete(salaoId)
  }

  const sig = await assinatura(salaoId)
  const atual = cache.get(salaoId)
  if (atual && atual.sig === sig) {
    atual.ts = Date.now()
    return atual.rows
  }

  const rows = await buscarTodos(salaoId)
  cache.set(salaoId, { sig, rows, ts: Date.now() })
  return rows
}

/** Invalida o cache (ex.: após importar atendimentos). */
export function limparCacheAtendimentos(salaoId?: string) {
  if (salaoId) cache.delete(salaoId)
  else cache.clear()
}
