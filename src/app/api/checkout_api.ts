// src/app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!

const PLANOS: Record<string, { nome: string; preco: number }> = {
  'Básico':        { nome: 'NODRI Básico',        preco: 100 },
  'Profissional':  { nome: 'NODRI Profissional',   preco: 200 },
  'Premium':       { nome: 'NODRI Premium',         preco: 300 },
}

export async function POST(req: NextRequest) {
  const { plano, email } = await req.json()

  const planoInfo = PLANOS[plano]
  if (!planoInfo) {
    return NextResponse.json({ erro: 'Plano inválido' }, { status: 400 })
  }

  const body = {
    items: [{
      title: planoInfo.nome,
      quantity: 1,
      unit_price: planoInfo.preco,
      currency_id: 'BRL',
    }],
    payer: { email: email || 'cliente@email.com' },
    payment_methods: {
      excluded_payment_types: [],
      installments: 1,
    },
    back_urls: {
      success: `${process.env.NEXT_PUBLIC_URL}/pagamento/sucesso?plano=${plano}`,
      failure: `${process.env.NEXT_PUBLIC_URL}/pagamento/falhou`,
      pending: `${process.env.NEXT_PUBLIC_URL}/pagamento/pendente`,
    },
    auto_return: 'approved',
    notification_url: `${process.env.NEXT_PUBLIC_URL}/api/webhook/mercadopago`,
  }

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json({ init_point: data.init_point, id: data.id })
}
