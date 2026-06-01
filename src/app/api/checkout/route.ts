import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nodri-saas-jsx4.vercel.app'

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
    cupom, desconto_percentual, preco_final, renovacao,
  } = body

  const planoInfo = PLANOS[plano]
  if (!planoInfo) return NextResponse.json({ erro: 'Plano inválido' }, { status: 400 })

  const refId = randomUUID()
  const precoFinal = typeof preco_final === 'number' ? preco_final : planoInfo.preco

  // Salva compra pendente no banco
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
    metodo_pagamento: metodo,
    status: 'pendente',
  })

  // ── PIX ──────────────────────────────────────────────────
  if (metodo === 'pix') {
    const pixRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': refId,
      },
      body: JSON.stringify({
        transaction_amount: precoFinal,
        payment_method_id: 'pix',
        description: planoInfo.nome,
        external_reference: refId,
        payer: { email: email || 'cliente@nodri.com.br' },
        notification_url: `${SITE_URL}/api/webhook/mercadopago`,
        date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      }),
    })
    const pixData = await pixRes.json()
    if (!pixData.id) {
      console.error('MP PIX error:', JSON.stringify(pixData))
      return NextResponse.json({ erro: 'Erro ao gerar PIX. Tente novamente.' }, { status: 500 })
    }
    await supabase.from('compras').update({ payment_id: String(pixData.id) }).eq('ref_id', refId)
    return NextResponse.json({
      payment_id: pixData.id,
      qr_code: pixData.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: pixData.point_of_interaction?.transaction_data?.qr_code_base64,
    })
  }

  // ── CARTÃO → ASSINATURA RECORRENTE (Preapproval) ─────────
  if (metodo === 'cartao') {
    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() + 1) // começa amanhã

    const preapprovalBody = {
      reason: planoInfo.nome,
      external_reference: refId,
      payer_email: email || 'cliente@nodri.com.br',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: precoFinal,
        currency_id: 'BRL',
        start_date: dataInicio.toISOString(),
      },
      back_url: `${SITE_URL}/pagamento/sucesso?plano=${encodeURIComponent(plano)}&ref=${refId}`,
      notification_url: `${SITE_URL}/api/webhook/mercadopago`,
    }

    const prefRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preapprovalBody),
    })
    const prefData = await prefRes.json()

    if (!prefData.init_point) {
      // Fallback para Checkout Pro (cobrança única se assinatura falhar)
      console.error('Preapproval error:', JSON.stringify(prefData))
      const prefFallback = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ title: planoInfo.nome, quantity: 1, unit_price: precoFinal, currency_id: 'BRL' }],
          payer: { email: email || 'cliente@nodri.com.br' },
          external_reference: refId,
          back_urls: {
            success: `${SITE_URL}/pagamento/sucesso?plano=${encodeURIComponent(plano)}`,
            failure: `${SITE_URL}/pagamento/falhou`,
            pending: `${SITE_URL}/pagamento/pendente`,
          },
          auto_return: 'approved',
          notification_url: `${SITE_URL}/api/webhook/mercadopago`,
        }),
      })
      const fallbackData = await prefFallback.json()
      return NextResponse.json({ init_point: fallbackData.init_point })
    }

    // Salva ID da assinatura
    await supabase.from('compras').update({
      payment_id: prefData.id,
      tipo_cobranca: 'recorrente',
    }).eq('ref_id', refId)

    return NextResponse.json({ init_point: prefData.init_point, id: prefData.id })
  }

  return NextResponse.json({ erro: 'Método inválido' }, { status: 400 })
}
