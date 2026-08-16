import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { asaasAtivo, criarOuAcharCliente, criarAssinatura, linkDePagamento } from '@/lib/asaas'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Criação da assinatura ───────────────────────────────────────────────────
//
// Substitui o /api/checkout do Mercado Pago. Diferença de fundo: lá cada
// compra era um pagamento avulso que somava 30 dias; aqui nasce uma
// assinatura que o Asaas cobra sozinho todo mês.
//
// O PREÇO É DECIDIDO AQUI, como já era antes. O navegador manda o nome do
// plano; o valor sai da tabela `planos`. Nunca aceite preço vindo do cliente.
//
// O cartão não passa por este servidor: a resposta é a URL do checkout do
// Asaas, e é lá que o cliente digita os dados.

export async function POST(req: NextRequest) {
  if (!asaasAtivo()) {
    return NextResponse.json(
      { erro: 'Pagamento indisponível no momento. Fale com o suporte pelo WhatsApp.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => null)
  const { plano, nome_salao, responsavel, cidade, email, telefone, dia_vencimento, cupom } = body || {}

  if (!plano || !email || !nome_salao) {
    return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 })
  }

  // ── Preço: do banco, nunca do navegador ─────────────────────────────────
  const norm = (t: string) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const { data: planos } = await supabase.from('planos').select('id, nome, slug, preco').eq('ativo', true)
  const planoRow = (planos || []).find((p: any) => norm(p.nome) === norm(plano) || norm(p.slug) === norm(plano))
  if (!planoRow || typeof planoRow.preco !== 'number') {
    return NextResponse.json({ erro: 'Plano inválido' }, { status: 400 })
  }

  // ── Cupom: validado no banco, como no fluxo antigo ──────────────────────
  let desconto = 0
  const codigo = String(cupom || '').trim().toUpperCase()
  if (codigo) {
    const { data: c } = await supabase
      .from('cupons').select('percentual, ativo, usos_atual, usos_max').eq('codigo', codigo).maybeSingle()
    const dentroDoLimite = !c?.usos_max || (c?.usos_atual || 0) < c.usos_max
    if (c?.ativo && dentroDoLimite && typeof c.percentual === 'number') desconto = c.percentual
  }
  const valor = Math.round(planoRow.preco * (1 - desconto / 100) * 100) / 100

  try {
    const cliente = await criarOuAcharCliente({
      nome: responsavel || nome_salao,
      email: String(email).toLowerCase(),
      telefone,
    })

    const assinatura = await criarAssinatura({
      clienteId: cliente.id,
      valor,
      descricao: `NODRI ${planoRow.nome}`,
    })

    const url = await linkDePagamento(assinatura.id)

    // Registro da intenção, para o webhook reconhecer quem pagou. O salão em
    // si só é criado/ativado quando o dinheiro entrar — cadastro sem
    // pagamento vira salão fantasma ocupando lugar na lista.
    const refId = randomUUID()
    await supabase.from('compras').insert({
      ref_id: refId,
      plano: planoRow.nome,
      preco_original: planoRow.preco,
      preco_final: valor,
      nome_salao, responsavel, cidade,
      email: String(email).toLowerCase(),
      telefone,
      dia_vencimento,
      cupom: codigo || null,
      status: 'aguardando',
      payment_id: assinatura.id,
    })

    return NextResponse.json({ url, assinatura_id: assinatura.id, valor })
  } catch (e: any) {
    return NextResponse.json(
      { erro: e?.message || 'Não foi possível criar a assinatura' },
      { status: 502 },
    )
  }
}
