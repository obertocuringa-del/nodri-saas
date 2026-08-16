import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { asaasAtivo, criarOuAcharCliente, criarAssinatura, atualizarAssinatura, linkDePagamento, cancelarAssinatura } from '@/lib/asaas'

export const dynamic = 'force-dynamic'

// ── Assinatura de um salão que JÁ existe ────────────────────────────────────
//
// Serve para três coisas, todas do painel master:
//
//   link     gera o convite de assinatura para um salão que ainda paga pelo
//            modelo antigo — é assim que a migração acontece
//   trocar   muda de plano
//   cancelar encerra a cobrança
//
// SOBRE A MIGRAÇÃO, e é importante: não existe migração automática. O cartão
// é digitado pelo dono do salão no ambiente do Asaas, e nem o NODRI nem você
// podem fazer isso por ele. O que dá para automatizar é gerar o link e
// mandar; o resto depende de um clique dele.
//
// Enquanto ninguém assina, o salão continua ativo pelo `licenca_vencimento`.
// Ninguém perde acesso por causa da troca de gateway.

async function ehMaster() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload?.role === 'master' ? payload : null
}

export async function POST(req: NextRequest) {
  if (!await ehMaster()) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!asaasAtivo()) return NextResponse.json({ erro: 'ASAAS_API_KEY não configurada' }, { status: 503 })

  const { salaoId, acao, planoSlug } = await req.json().catch(() => ({} as any))
  if (!salaoId || !acao) return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 })

  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('id, nome, email, telefone, responsavel, plano_id, asaas_customer_id, asaas_subscription_id')
    .eq('id', salaoId).maybeSingle()
  if (!salao) return NextResponse.json({ erro: 'Salão não encontrado' }, { status: 404 })

  try {
    // ── Cancelar ──────────────────────────────────────────────────────────
    if (acao === 'cancelar') {
      if (!salao.asaas_subscription_id) return NextResponse.json({ erro: 'Este salão não tem assinatura' }, { status: 400 })
      await cancelarAssinatura(salao.asaas_subscription_id)
      await supabaseAdmin.from('saloes').update({
        asaas_subscription_id: null,
        asaas_status: 'CANCELED',
        // O status do salão NÃO muda aqui. Ele pagou o mês corrente; derrubar
        // o acesso no ato do cancelamento seria cobrar por um período que não
        // foi entregue. Quem encerra é o cron, quando a data vence.
      }).eq('id', salaoId)
      return NextResponse.json({ ok: true, mensagem: 'Assinatura cancelada. O acesso segue até o fim do período pago.' })
    }

    // ── Gerar link (migração) ou trocar de plano ──────────────────────────
    if (acao !== 'link' && acao !== 'trocar') {
      return NextResponse.json({ erro: 'Ação desconhecida' }, { status: 400 })
    }

    // Plano: o informado, ou o que o salão já tem.
    const { data: planos } = await supabaseAdmin.from('planos').select('id, nome, slug, preco').eq('ativo', true)
    const plano = planoSlug
      ? (planos || []).find((p: any) => p.slug === planoSlug)
      : (planos || []).find((p: any) => p.id === salao.plano_id)
    if (!plano || typeof plano.preco !== 'number') {
      return NextResponse.json({ erro: 'Plano não encontrado' }, { status: 400 })
    }

    if (!salao.email) return NextResponse.json({ erro: 'Salão sem e-mail cadastrado' }, { status: 400 })

    // ── Trocar de plano em assinatura viva: ATUALIZA, não recria ─────────
    // Cancelar e criar outra faria a assinatura nova nascer sem cartão, e o
    // cliente teria de digitar tudo de novo só para mudar de plano. O Asaas
    // guarda o cartão na assinatura; atualizar o valor preserva a cobrança
    // automática e não interrompe nada.
    if (acao === 'trocar' && salao.asaas_subscription_id) {
      const atualizada = await atualizarAssinatura(salao.asaas_subscription_id, {
        valor: plano.preco,
        descricao: `NODRI ${plano.nome}`,
      })
      await supabaseAdmin.from('saloes').update({
        plano_id: plano.id,
        asaas_status: atualizada.status || 'ACTIVE',
      }).eq('id', salaoId)
      return NextResponse.json({
        ok: true,
        plano: plano.nome,
        valor: plano.preco,
        mensagem: `Plano alterado para ${plano.nome} (R$ ${plano.preco}/mês). O cartão do cliente continua o mesmo — nada precisa ser refeito.`,
      })
    }

    const cliente = await criarOuAcharCliente({
      nome: salao.responsavel || salao.nome,
      email: String(salao.email).toLowerCase(),
      telefone: salao.telefone || undefined,
    })

    const assinatura = await criarAssinatura({
      clienteId: cliente.id,
      valor: plano.preco,
      descricao: `NODRI ${plano.nome}`,
    })

    const url = await linkDePagamento(assinatura.id)

    await supabaseAdmin.from('saloes').update({
      asaas_customer_id: cliente.id,
      asaas_subscription_id: assinatura.id,
      asaas_status: assinatura.status || 'PENDING',
      plano_id: plano.id,
    }).eq('id', salaoId)

    return NextResponse.json({
      ok: true,
      url,
      plano: plano.nome,
      valor: plano.preco,
      mensagem: 'Assinatura criada. Envie o link para o salão concluir o cadastro do cartão.',
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || 'Erro ao falar com o Asaas' }, { status: 502 })
  }
}
