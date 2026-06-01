import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmailBoasVindas, enviarEmailPagamento } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!

const MODULOS_PLANO: Record<string, string[]> = {
  'Básico': [
    'Confirmar Agendamento', 'Enviar Feedback', 'Enviar Lista c/ Arquivo',
    'Enviar Lista', 'Baixar Música YouTube',
  ],
  'Profissional': [
    'Confirmar Agendamento', 'Enviar Feedback', 'Enviar Lista c/ Arquivo',
    'Enviar Lista', 'Baixar Música YouTube', 'Bloqueio Sem Preferência',
    'Ver Feedback Cliente', 'Relatório Profissional', 'Faturamento Diário',
    'Calcular Reserva Financeira',
  ],
  'Premium': [
    'Confirmar Agendamento', 'Enviar Feedback', 'Enviar Lista c/ Arquivo',
    'Enviar Lista', 'Baixar Música YouTube', 'Bloqueio Sem Preferência',
    'Ver Feedback Cliente', 'Relatório Profissional', 'Faturamento Diário',
    'Calcular Reserva Financeira', 'Calculadora Depreciação',
    'Avaliar Profissional', 'Aluguel de Cadeira', 'Precificar Serviços',
  ],
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.type !== 'payment') return NextResponse.json({ ok: true })

  // Buscar detalhes do pagamento no MP
  const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
  })
  const payment = await paymentRes.json()

  if (payment.status !== 'approved') return NextResponse.json({ ok: true })

  const refId = payment.external_reference

  // Buscar dados da compra pelo ref_id
  let compra: Record<string, any> | null = null
  if (refId) {
    const { data } = await supabase.from('compras').select('*').eq('ref_id', refId).single()
    compra = data
  }

  if (compra) {
    // Atualizar status da compra
    await supabase.from('compras')
      .update({ status: 'aprovado', payment_id: String(payment.id) })
      .eq('ref_id', refId)

    // Incrementar uso do cupom
    if (compra.cupom) {
      const { data: cupom } = await supabase.from('cupons').select('usos_atual').eq('codigo', compra.cupom).single()
      if (cupom) {
        await supabase.from('cupons').update({ usos_atual: cupom.usos_atual + 1 }).eq('codigo', compra.cupom)
      }
    }
  }

  const email = compra?.email || payment.payer?.email || ''
  const plano = compra?.plano || 'Básico'
  const modulosHabilitados = MODULOS_PLANO[plano] || MODULOS_PLANO['Básico']

  // Atualizar salão no Supabase (se já existir)
  const { data: salao } = await supabase.from('saloes').select('id').eq('email', email).single()
  if (salao) {
    await supabase.from('saloes').update({
      plano: plano,
      modulos_habilitados: modulosHabilitados,
      plano_ativo: true,
      plano_validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', salao.id)
  }

  // Enviar email de boas-vindas com links
  if (email) {
    try {
      const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nodri-saas-jsx4.vercel.app'
      const LINK_DOWNLOAD = process.env.LINK_DOWNLOAD_PROGRAMA || ''
      await enviarEmailBoasVindas({
        email,
        nome: compra?.responsavel || compra?.nome_salao || 'Cliente',
        plano,
        linkAcesso: `${SITE_URL}/login`,
        linkDownload: LINK_DOWNLOAD || undefined,
      })
      await enviarEmailPagamento({
        email,
        nome: compra?.responsavel || compra?.nome_salao || 'Cliente',
        status: 'aprovado',
        valor: payment.transaction_amount,
        plano,
      })
    } catch (e) {
      console.error('Erro ao enviar email pós-compra:', e)
    }
  }

  // Criar notificação de compra para o admin com todos os dados
  const nomeSalao = compra?.nome_salao || email
  await supabase.from('notificacoes').insert({
    mensagem: `🛍️ ${nomeSalao} acabou de comprar o Plano ${plano}`,
    para_todos: false,
    tipo: 'success',
    metadata: {
      tipo: 'compra',
      nome_salao: compra?.nome_salao || '',
      responsavel: compra?.responsavel || '',
      cidade: compra?.cidade || '',
      email: compra?.email || email,
      telefone: compra?.telefone || '',
      dia_vencimento: compra?.dia_vencimento || null,
      plano: plano,
      preco_original: compra?.preco_original || payment.transaction_amount,
      preco_final: compra?.preco_final || payment.transaction_amount,
      cupom: compra?.cupom || null,
      desconto_percentual: compra?.desconto_percentual || 0,
      payment_id: String(payment.id),
    },
  })

  return NextResponse.json({ ok: true })
}
