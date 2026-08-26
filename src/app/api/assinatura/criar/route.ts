import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { asaasAtivo, criarOuAcharCliente, criarAssinatura, linkDePagamento } from '@/lib/asaas'
import { afiliadoPeloCupom, configAfiliado } from '@/lib/afiliados'

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
  const { plano, nome_salao, responsavel, cidade, email, telefone, cpf_cnpj, dia_vencimento, cupom } = body || {}

  if (!plano || !email || !nome_salao) {
    return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 })
  }

  // O Asaas recusa criar cobranca de cartao sem CPF/CNPJ do titular. Barrar
  // aqui devolve uma mensagem que a pessoa entende; sem isso ela recebia o
  // texto tecnico do proprio Asaas no meio do checkout.
  const doc = String(cpf_cnpj || '').replace(/\D/g, '')
  if (doc.length !== 11 && doc.length !== 14) {
    return NextResponse.json({ erro: 'Informe um CPF ou CNPJ válido do responsável.' }, { status: 400 })
  }

  // ── Preço: do banco, nunca do navegador ─────────────────────────────────
  const norm = (t: string) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const { data: planos } = await supabase.from('planos').select('id, nome, slug, preco').eq('ativo', true)
  const planoRow = (planos || []).find((p: any) => norm(p.nome) === norm(plano) || norm(p.slug) === norm(plano))
  if (!planoRow || typeof planoRow.preco !== 'number') {
    return NextResponse.json({ erro: 'Plano inválido' }, { status: 400 })
  }

  // ── Cupom ───────────────────────────────────────────────────────────────
  //
  // São dois tipos, e antes só um era reconhecido AQUI: o cupom de afiliado
  // (AFIL-…) passava na validação da tela, mostrava "você ganhou 10%" e a
  // assinatura era criada pelo valor CHEIO — o cliente pagava o que não
  // combinou e o afiliado não recebia nada, porque ninguém guardava a
  // indicação.
  let desconto = 0
  let apenasPrimeira = false
  let afiliadoId: string | null = null
  const codigo = String(cupom || '').trim().toUpperCase()

  if (codigo.startsWith('AFIL-')) {
    const afiliado = await afiliadoPeloCupom(codigo)
    if (afiliado) {
      const cfg = await configAfiliado()
      desconto = cfg.percentual
      apenasPrimeira = cfg.apenas_primeira
      afiliadoId = afiliado.id
    }
  } else if (codigo) {
    const { data: c } = await supabase
      .from('cupons').select('percentual, ativo, usos_atual, usos_max').eq('codigo', codigo).maybeSingle()
    const dentroDoLimite = !c?.usos_max || (c?.usos_atual || 0) < c.usos_max
    if (c?.ativo && dentroDoLimite && typeof c.percentual === 'number') desconto = c.percentual
  }

  const valorComDesconto = Math.round(planoRow.preco * (1 - desconto / 100) * 100) / 100
  const valor = valorComDesconto

  try {
    const cliente = await criarOuAcharCliente({
      nome: responsavel || nome_salao,
      email: String(email).toLowerCase(),
      telefone,
      cpfCnpj: doc,
    })

    // A assinatura nasce com o valor COM desconto. Quando o desconto vale só
    // na primeira cobrança, o webhook devolve o valor cheio assim que a
    // primeira for paga — é o jeito de fazer "só a primeira" no Asaas sem
    // pedir o cartão de novo, já que o desconto da assinatura vale para todas.
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
      afiliado_id: afiliadoId,
      desconto_percentual: desconto,
      desconto_apenas_primeira: apenasPrimeira,
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
