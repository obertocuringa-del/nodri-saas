import { supabaseAdmin } from '@/lib/supabase'

// ── Regras do programa de afiliados ─────────────────────────────────────────
//
// Duas porcentagens diferentes convivem aqui, e confundir uma com a outra é o
// erro clássico:
//
// • DESCONTO DO CLIENTE — quanto o indicado paga a menos. É IGUAL para todo
//   cupom de afiliado e fica em `configuracoes.afiliado_desconto_cliente`.
//   Promoção pontual não se faz aqui: para isso existe o cupom avulso, criado
//   na tela "Cupons de Desconto", que não envolve afiliado nenhum.
// • COMISSÃO DO AFILIADO — quanto o indicador recebe, sobre o valor REALMENTE
//   pago. É por afiliado (`afiliados.comissao_percentual`).
//
// A COMISSÃO É SÓ DA PRIMEIRA MENSALIDADE, nunca recorrente. É o que permite a
// campanha agressiva: 60% de desconto para o cliente e 60% de comissão para
// quem indicou — no mês de estreia a NODRI quase não fica com nada, e a partir
// do segundo mês a mensalidade inteira é dela. Comissão recorrente destruiria
// essa conta.

export interface ConfigAfiliado {
  percentual: number
  /** Desconto só na primeira cobrança? Depois disso o cliente paga cheio. */
  apenas_primeira: boolean
}

export const CONFIG_AFILIADO_PADRAO: ConfigAfiliado = { percentual: 10, apenas_primeira: false }

export async function configAfiliado(): Promise<ConfigAfiliado> {
  const { data } = await supabaseAdmin
    .from('configuracoes').select('valor').eq('chave', 'afiliado_desconto_cliente').maybeSingle()
  const v = (data?.valor || {}) as any
  return {
    percentual: Number(v.percentual) >= 0 ? Number(v.percentual) : CONFIG_AFILIADO_PADRAO.percentual,
    apenas_primeira: !!v.apenas_primeira,
  }
}

export interface AfiliadoDoCupom {
  id: string
  nome: string
  email: string
  cupom: string
  comissao_percentual: number
}

/** Cupom AFIL-… ativo. Devolve null para cupom comum, inexistente ou bloqueado. */
export async function afiliadoPeloCupom(codigo: string): Promise<AfiliadoDoCupom | null> {
  const cupom = String(codigo || '').trim().toUpperCase()
  if (!cupom.startsWith('AFIL-')) return null

  const { data } = await supabaseAdmin
    .from('afiliados')
    .select('id, nome, email, cupom, comissao_percentual, ativo')
    .eq('cupom', cupom)
    .maybeSingle()

  if (!data || !data.ativo) return null
  return {
    id: data.id,
    nome: data.nome,
    email: data.email,
    cupom: data.cupom,
    comissao_percentual: Number(data.comissao_percentual) || 40,
  }
}

/** Esta assinatura já pagou comissão alguma vez? Só a estreia gera. */
export async function assinaturaJaPagouComissao(assinaturaId: string | null): Promise<boolean> {
  if (!assinaturaId) return false
  const { data } = await supabaseAdmin
    .from('afiliado_comissoes').select('id').eq('assinatura_id', assinaturaId).limit(1)
  return !!(data && data.length)
}

/**
 * Registra a comissão de uma cobrança paga.
 *
 * Idempotente pelo id da cobrança do Asaas: o webhook reenvia notificação, e
 * sem isso o mesmo pagamento viraria duas comissões a pagar. O `insert` bate
 * na restrição de unicidade (código 23505) e a função sai sem somar nada.
 *
 * Devolve a comissão criada, ou null quando era repetição.
 */
export async function registrarComissao(dados: {
  afiliadoId: string
  cobrancaId: string | null
  assinaturaId?: string | null
  salaoId?: string | null
  salaoNome?: string | null
  plano?: string | null
  valorPago: number
  percentual: number
}) {
  const valorComissao = Math.round(dados.valorPago * (dados.percentual / 100) * 100) / 100

  const { data, error } = await supabaseAdmin
    .from('afiliado_comissoes')
    .insert({
      afiliado_id: dados.afiliadoId,
      salao_id: dados.salaoId || null,
      salao_nome: dados.salaoNome || null,
      cobranca_id: dados.cobrancaId,
      assinatura_id: dados.assinaturaId || null,
      plano: dados.plano || null,
      valor_venda: dados.valorPago,
      percentual: dados.percentual,
      valor_comissao: valorComissao,
      status: 'pendente',
    })
    .select()
    .single()

  if (error) {
    if (String(error.code) === '23505') return null // cobrança já contabilizada
    throw new Error(error.message)
  }

  // Os totais na linha do afiliado continuam existindo porque o painel e o
  // portal do afiliado leem deles. Aqui eles viram consequência das comissões,
  // não a fonte da verdade.
  const { data: af } = await supabaseAdmin
    .from('afiliados')
    .select('total_vendas, valor_acumulado')
    .eq('id', dados.afiliadoId)
    .maybeSingle()

  await supabaseAdmin
    .from('afiliados')
    .update({
      total_vendas: (Number(af?.total_vendas) || 0) + 1,
      valor_acumulado: Math.round(((Number(af?.valor_acumulado) || 0) + valorComissao) * 100) / 100,
    })
    .eq('id', dados.afiliadoId)

  return data
}
