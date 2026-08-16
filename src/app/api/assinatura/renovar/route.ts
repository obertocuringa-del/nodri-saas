import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { asaasAtivo, criarOuAcharCliente, criarAssinatura, linkDePagamento } from '@/lib/asaas'

export const dynamic = 'force-dynamic'

// ── Reativação pelo próprio salão ───────────────────────────────────────────
//
// Quem chega aqui é dono de salão com licença vencida: ele tem login, mas o
// middleware o mandou para /renovar-licenca e ele não alcança mais o painel.
//
// A rota é dele mesmo — o salão vem do token, nunca do corpo da requisição.
// Aceitar um salaoId enviado pelo navegador deixaria um cliente reativar (ou
// trocar o plano de) outro salão.
export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload?.salaoId || (payload.role !== 'salon' && payload.role !== 'sub')) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }
  if (!asaasAtivo()) {
    return NextResponse.json(
      { erro: 'Pagamento indisponível no momento. Fale com o suporte pelo WhatsApp.' },
      { status: 503 },
    )
  }

  const { planoSlug } = await req.json().catch(() => ({} as any))

  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('id, nome, email, telefone, responsavel, plano_id')
    .eq('id', payload.salaoId).maybeSingle()
  if (!salao) return NextResponse.json({ erro: 'Salão não encontrado' }, { status: 404 })
  if (!salao.email) return NextResponse.json({ erro: 'Salão sem e-mail cadastrado' }, { status: 400 })

  const { data: planos } = await supabaseAdmin.from('planos').select('id, nome, slug, preco').eq('ativo', true)
  const plano = planoSlug
    ? (planos || []).find((p: any) => p.slug === planoSlug)
    : (planos || []).find((p: any) => p.id === salao.plano_id)
  if (!plano || typeof plano.preco !== 'number') {
    return NextResponse.json({ erro: 'Plano inválido' }, { status: 400 })
  }

  try {
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

    // O plano é gravado agora, mas o salão SÓ é reativado quando o dinheiro
    // entrar — quem faz isso é o webhook. Reativar aqui liberaria o acesso
    // para quem só clicou no botão.
    await supabaseAdmin.from('saloes').update({
      asaas_customer_id: cliente.id,
      asaas_subscription_id: assinatura.id,
      asaas_status: assinatura.status || 'PENDING',
      plano_id: plano.id,
    }).eq('id', salao.id)

    return NextResponse.json({ url, plano: plano.nome, valor: plano.preco })
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || 'Erro ao falar com o Asaas' }, { status: 502 })
  }
}
