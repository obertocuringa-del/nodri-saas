import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!

const PLANOS: Record<string, { nome: string; preco: number }> = {
  'Básico':       { nome: 'NODRI Básico',       preco: 100 },
  'Profissional': { nome: 'NODRI Profissional',  preco: 200 },
  'Premium':      { nome: 'NODRI Premium',        preco: 300 },
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    plano, metodo = 'cartao',
    nome_salao, responsavel, cidade, email, telefone, dia_vencimento,
    cupom, desconto_percentual, preco_final,
  } = body

  const planoInfo = PLANOS[plano]
  if (!planoInfo) return NextResponse.json({ erro: 'Plano inválido' }, { status: 400 })

  const refId = randomUUID()
  const precoFinal = typeof preco_final === 'number' ? preco_final : planoInfo.preco

  // Salvar compra pendente
  await supabase.from('compras').insert({
    ref_id: refId,
    nome_salao: nome_salao || '',
    responsavel: responsavel || '',
    cidade: cidade || '',
    email: email || '',
    telefone: telefone || '',
    dia_vencimento: dia_vencimento || 5,
    plano,
    preco_original: planoInfo.preco,
    preco_final: precoFinal,
    cupom: cupom || null,
    desconto_percentual: desconto_percentual || 0,
    status: 'pendente',
  })

  // ── PIX via Payments API ──
  if (metodo === 'pix') {
    const pixBody = {
      transaction_amount: precoFinal,
      payment_method_id: 'pix',
      description: planoInfo.nome,
      external_reference: refId,
      payer: { email: email || 'cliente@nodri.com.br' },
      notification_url: `${process.env.NEXT_PUBLIC_URL}/api/webhook/mercadopago`,
    }

    const pixRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': refId,
      },
      body: JSON.stringify(pixBody),
    })

    const pixData = await pixRes.json()

    if (!pixData.id) {
      console.error('MP PIX error:', JSON.stringify(pixData))
      return NextResponse.json({ erro: 'Erro ao gerar PIX. Tente o cartão.' }, { status: 500 })
    }

    await supabase.from('compras').update({ payment_id: String(pixData.id) }).eq('ref_id', refId)

    return NextResponse.json({
      payment_id: pixData.id,
      qr_code: pixData.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: pixData.point_of_interaction?.transaction_data?.qr_code_base64,
    })
  }

  // ── CARTÃO via Checkout Pro ──
  const prefBody = {
    items: [{
      title: planoInfo.nome,
      quantity: 1,
      unit_price: precoFinal,
      currency_id: 'BRL',
    }],
    payer: { email: email || 'cliente@nodri.com.br' },
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }],
      installments: 1,
    },
    external_reference: refId,
    back_urls: {
      success: `${process.env.NEXT_PUBLIC_URL}/pagamento/sucesso?plano=${encodeURIComponent(plano)}`,
      failure: `${process.env.NEXT_PUBLIC_URL}/pagamento/falhou`,
      pending: `${process.env.NEXT_PUBLIC_URL}/pagamento/pendente`,
    },
    auto_return: 'approved',
    notification_url: `${process.env.NEXT_PUBLIC_URL}/api/webhook/mercadopago`,
  }

  const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(prefBody),
  })

  const prefData = await prefRes.json()
  return NextResponse.json({ init_point: prefData.init_point, id: prefData.id })
}
