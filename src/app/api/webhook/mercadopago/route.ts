// src/app/api/webhook/mercadopago/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!

// Módulos por plano
const MODULOS_PLANO: Record<string, string[]> = {
  'Básico': [
    'Confirmar Agendamento',
    'Enviar Feedback',
    'Enviar Lista c/ Arquivo',
    'Enviar Lista',
    'Baixar Música YouTube',
  ],
  'Profissional': [
    'Confirmar Agendamento',
    'Enviar Feedback',
    'Enviar Lista c/ Arquivo',
    'Enviar Lista',
    'Baixar Música YouTube',
    'Bloqueio Sem Preferência',
    'Ver Feedback Cliente',
    'Relatório Profissional',
    'Faturamento Diário',
    'Calcular Reserva Financeira',
  ],
  'Premium': [
    'Confirmar Agendamento',
    'Enviar Feedback',
    'Enviar Lista c/ Arquivo',
    'Enviar Lista',
    'Baixar Música YouTube',
    'Bloqueio Sem Preferência',
    'Ver Feedback Cliente',
    'Relatório Profissional',
    'Faturamento Diário',
    'Calcular Reserva Financeira',
    'Calculadora Depreciação',
    'Avaliar Profissional',
    'Aluguel de Cadeira',
    'Precificar Serviços',
  ],
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.type !== 'payment') {
    return NextResponse.json({ ok: true })
  }

  // Busca detalhes do pagamento no MP
  const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
  })
  const payment = await paymentRes.json()

  if (payment.status !== 'approved') {
    return NextResponse.json({ ok: true })
  }

  const email = payment.payer.email
  const plano = payment.additional_info?.items?.[0]?.title?.replace('NODRI ', '') || 'Básico'
  const modulosHabilitados = MODULOS_PLANO[plano] || MODULOS_PLANO['Básico']

  // Atualiza o salão no Supabase
  const { data: salao } = await supabase
    .from('saloes')
    .select('id, modulos_habilitados')
    .eq('email', email)
    .single()

  if (salao) {
    await supabase.from('saloes').update({
      plano: plano,
      modulos_habilitados: modulosHabilitados,
      plano_ativo: true,
      plano_validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', salao.id)
  }

  return NextResponse.json({ ok: true })
}
