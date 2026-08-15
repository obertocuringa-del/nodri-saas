import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nodri.com.br'

// ── O preço da cobrança sai do BANCO ────────────────────────────────────────
//
// Aqui havia uma tabela fixa com os três planos antigos. Depois da troca para
// Inicial/Essencial/Gestão/Completo nenhum nome batia, e toda tentativa de
// compra morria em "Plano inválido" — ninguém conseguia assinar.
//
// O que NÃO mudou, e é o que importa: o valor cobrado continua sendo decidido
// aqui, no servidor. O navegador manda o nome do plano, nunca o preço.
async function buscarPlano(nome: string): Promise<{ nome: string; preco: number } | null> {
  const alvo = (nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  if (!alvo) return null

  const { data } = await supabase.from('planos').select('nome, slug, preco').eq('ativo', true)
  const norm = (t: string) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const row = (data || []).find((p: any) => norm(p.nome) === alvo || norm(p.slug) === alvo)
  if (!row || typeof row.preco !== 'number') return null

  return { nome: `NODRI ${row.nome}`, preco: row.preco }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    plano, metodo = 'cartao',
    nome_salao, responsavel, cidade, email, telefone, dia_vencimento,
    cupom,
  } = body

  const planoInfo = await buscarPlano(plano)
  if (!planoInfo) return NextResponse.json({ erro: 'Plano inválido' }, { status: 400 })

  // FIX: calcula precoFinal SERVER-SIDE validando o cupom no banco (não confia no cliente)
  let descontoPercentual = 0
  let codigoCupom: string | null = null

  if (cupom && typeof cupom === 'string') {
    const { data: cupomData } = await supabase
      .from('cupons')
      .select('percentual, ativo')
      .eq('codigo', cupom.trim().toUpperCase())
      .eq('ativo', true)
      .maybeSingle()

    if (cupomData) {
      descontoPercentual = cupomData.percentual || 0
      codigoCupom = cupom.trim().toUpperCase()
    }
  }

  // Preço final calculado no servidor — não aceita valor do cliente
  const precoFinal = Math.round(planoInfo.preco * (1 - descontoPercentual / 100) * 100) / 100

  const refId = randomUUID()

  // FIX: verifica erro do insert antes de continuar
  const { error: insertError } = await supabase.from('compras').insert({
    ref_id: refId,
    nome_salao: nome_salao || '',
    responsavel: responsavel || '',
    cidade: cidade || '',
    email: email?.trim().toLowerCase() || '',
    telefone: telefone || '',
    dia_vencimento: dia_vencimento || 5,
    plano,
    preco_original: planoInfo.preco,
    preco_final: precoFinal,
    cupom: codigoCupom,
    desconto_percentual: descontoPercentual,
    metodo_pagamento: metodo,
    status: 'pendente',
  })

  if (insertError) {
    console.error('Erro ao salvar compra:', insertError.message)
    return NextResponse.json({ erro: 'Erro interno ao registrar compra. Tente novamente.' }, { status: 500 })
  }

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
        date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
    const pixData = await pixRes.json()
    if (!pixData.id) {
      console.error('MP PIX error:', JSON.stringify(pixData))
      // Remove compra pendente se MP falhou
      await supabase.from('compras').delete().eq('ref_id', refId)
      return NextResponse.json({ erro: 'Erro ao gerar PIX. Tente novamente.' }, { status: 500 })
    }
    await supabase.from('compras').update({ payment_id: String(pixData.id) }).eq('ref_id', refId)
    return NextResponse.json({
      payment_id: pixData.id,
      qr_code: pixData.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: pixData.point_of_interaction?.transaction_data?.qr_code_base64,
      preco_final: precoFinal,
      desconto_percentual: descontoPercentual,
    })
  }

  // ── CARTÃO → ASSINATURA RECORRENTE ─────────
  if (metodo === 'cartao') {
    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() + 1)

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
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preapprovalBody),
    })
    const prefData = await prefRes.json()

    if (!prefData.init_point) {
      console.error('Preapproval error:', JSON.stringify(prefData))
      // Fallback para Checkout Pro (cobrança única)
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
      // FIX: verifica se fallback também falhou
      if (!fallbackData.init_point) {
        await supabase.from('compras').delete().eq('ref_id', refId)
        return NextResponse.json({ erro: 'Erro ao processar pagamento. Tente novamente.' }, { status: 500 })
      }
      return NextResponse.json({ init_point: fallbackData.init_point, preco_final: precoFinal })
    }

    await supabase.from('compras').update({
      payment_id: prefData.id,
      tipo_cobranca: 'recorrente',
    }).eq('ref_id', refId)

    return NextResponse.json({ init_point: prefData.init_point, id: prefData.id, preco_final: precoFinal })
  }

  return NextResponse.json({ erro: 'Método inválido' }, { status: 400 })
}
