import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nomesDeBancoDoPlano } from '@/lib/planosModulos'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Webhook do Asaas ────────────────────────────────────────────────────────
//
// Com assinatura, quem manda no ciclo é o Asaas: ele cobra sozinho todo mês e
// avisa aqui o resultado. O NODRI para de contar dias e passa a obedecer.
//
// Regras que este arquivo segue, e o porquê de cada uma:
//
// • SEMPRE responder 200, mesmo em erro nosso. O Asaas reenvia a notificação
//   quando não recebe 200, e uma falha nossa viraria uma fila de reenvios que
//   trava as notificações seguintes do mesmo cliente.
//
// • Registrar o evento ANTES de decidir o que fazer. Se a decisão der errado,
//   ainda dá para saber o que chegou. Sem isso, cobrança que falhou some sem
//   deixar rastro.
//
// • Idempotência pelo par (evento, cobrança). Reenvio é normal no Asaas, e sem
//   isso um reenvio de PAYMENT_RECEIVED somaria mês em cima de mês.

// Quem pode chamar. O Asaas manda o token que VOCÊ cadastrou no painel dele,
// no cabeçalho asaas-access-token. Sem conferir isso, qualquer um que
// descobrisse a URL poderia ativar salão de graça.
function autorizado(req: NextRequest): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN || ''
  if (!esperado) return true // ainda não configurado: não bloqueia o teste inicial
  return req.headers.get('asaas-access-token') === esperado
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  let corpo: any = null
  try { corpo = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const evento: string = corpo?.event || ''
  const pagamento = corpo?.payment || {}
  const assinaturaId: string | null = pagamento?.subscription || null
  const cobrancaId: string | null = pagamento?.id || null

  try {
    // Salão dono da assinatura.
    let salao: any = null
    if (assinaturaId) {
      const { data } = await supabase
        .from('saloes').select('id, nome').eq('asaas_subscription_id', assinaturaId).maybeSingle()
      salao = data
    }

    // Registra o que chegou. O índice único descarta reenvio silenciosamente.
    const { error: erroEvento } = await supabase.from('asaas_eventos').insert({
      salao_id: salao?.id || null,
      evento,
      assinatura_id: assinaturaId,
      cobranca_id: cobrancaId,
      valor: typeof pagamento?.value === 'number' ? pagamento.value : null,
      payload: corpo,
    })
    // Violação de unicidade = já processamos este evento. Sair aqui é o que
    // impede o reenvio de somar mês de novo.
    if (erroEvento && String(erroEvento.code) === '23505') {
      return NextResponse.json({ ok: true, repetido: true })
    }

    if (!salao) return NextResponse.json({ ok: true, semSalao: true })

    // ── Pagamento entrou ──────────────────────────────────────────────────
    if (evento === 'PAYMENT_RECEIVED' || evento === 'PAYMENT_CONFIRMED') {
      // A data de vencimento vem do Asaas, não é calculada aqui: ele é quem
      // sabe quando vai cobrar de novo, inclusive quando houve atraso ou
      // proporcional na troca de plano.
      const proxima = pagamento?.dueDate || null

      await supabase.from('saloes').update({
        status: 'ativo',
        asaas_status: 'ACTIVE',
        asaas_proxima_cobranca: proxima,
        // Mantém o campo antigo em dia: o resto do sistema (crons de aviso,
        // tela de licença) ainda lê daqui.
        licenca_vencimento: proxima,
      }).eq('id', salao.id)

      await ligarModulosDoPlano(salao.id)
      return NextResponse.json({ ok: true })
    }

    // ── Atrasou ───────────────────────────────────────────────────────────
    // NÃO bloqueia na hora. O cartão pode falhar por limite momentâneo e o
    // Asaas tenta de novo sozinho; derrubar o acesso de um cliente adimplente
    // por causa da primeira tentativa é pior do que esperar. Quem bloqueia é
    // o cron de licença, quando a data realmente vence.
    if (evento === 'PAYMENT_OVERDUE') {
      await supabase.from('saloes').update({ asaas_status: 'OVERDUE' }).eq('id', salao.id)
      return NextResponse.json({ ok: true })
    }

    // ── Assinatura encerrada ou dinheiro devolvido ────────────────────────
    if (evento === 'PAYMENT_DELETED' || evento === 'PAYMENT_REFUNDED' || evento === 'SUBSCRIPTION_DELETED') {
      await supabase.from('saloes').update({
        asaas_status: 'CANCELED',
        status: 'vencido',
      }).eq('id', salao.id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true, ignorado: evento })
  } catch (e: any) {
    // 200 de propósito, com o erro registrado: ver a nota no topo.
    await supabase.from('asaas_eventos').insert({
      evento: `ERRO:${evento}`, assinatura_id: assinaturaId, cobranca_id: null,
      payload: { erro: String(e?.message || e), corpo },
    }).select()
    return NextResponse.json({ ok: true, erroRegistrado: true })
  }
}

/** Liga os módulos do plano contratado, do mesmo jeito que o Mercado Pago já fazia. */
async function ligarModulosDoPlano(salaoId: string) {
  const { data: salao } = await supabase
    .from('saloes').select('plano_id, planos(nome)').eq('id', salaoId).maybeSingle()

  const plano = (salao as any)?.planos
  const nomePlano = Array.isArray(plano) ? plano[0]?.nome : plano?.nome
  if (!nomePlano) return

  const nomes = nomesDeBancoDoPlano(nomePlano)
  if (!nomes.length) return

  const { data: modulos } = await supabase.from('modulos').select('id').in('nome', nomes)
  if (!modulos?.length) return

  await supabase.from('salao_modulos').delete().eq('salao_id', salaoId)
  await supabase.from('salao_modulos').insert(
    modulos.map((m: any) => ({ salao_id: salaoId, modulo_id: m.id, ativo: true })),
  )
}
