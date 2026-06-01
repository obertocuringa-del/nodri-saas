import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmailBoasVindas, enviarEmailPagamento, sendEmailComissao } from '@/lib/email'

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
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  // FIX: suporte a payment e subscription_preapproval
  if (body.type !== 'payment' && body.type !== 'subscription_preapproval_plan') {
    return NextResponse.json({ ok: true })
  }

  // FIX: null check em body.data.id antes de usar
  if (!body.data?.id) return NextResponse.json({ ok: true })

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
    const { data } = await supabase.from('compras').select('*').eq('ref_id', refId).maybeSingle()
    compra = data
  }

  if (compra) {
    // Atualizar status da compra
    await supabase.from('compras')
      .update({ status: 'aprovado', payment_id: String(payment.id) })
      .eq('ref_id', refId)

    // FIX: incremento atômico do cupom (evita race condition)
    if (compra.cupom) {
      await supabase.rpc('incrementar_uso_cupom', { p_codigo: compra.cupom })
        .catch(async () => {
          // Fallback se RPC não existir
          const { data: cupom } = await supabase.from('cupons').select('usos_atual').eq('codigo', compra!.cupom).maybeSingle()
          if (cupom) {
            await supabase.from('cupons').update({ usos_atual: (cupom.usos_atual || 0) + 1 }).eq('codigo', compra!.cupom)
          }
        })
    }
  }

  const email = compra?.email || payment.payer?.email || ''
  const plano = compra?.plano || 'Básico'

  // FIX: atualizar salão usando plano_id (FK) em vez de string plano
  const { data: salao } = await supabase.from('saloes').select('id').eq('email', email.toLowerCase()).maybeSingle()
  if (salao) {
    // Busca o plano_id pelo nome do plano
    const { data: planoRow } = await supabase
      .from('planos')
      .select('id')
      .ilike('nome', `%${plano}%`)
      .maybeSingle()

    await supabase.from('saloes').update({
      plano_id: planoRow?.id || null,
      status: 'ativo',
      licenca_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }).eq('id', salao.id)

    // Habilita módulos do plano no salão
    const modulosPlano = MODULOS_PLANO[plano] || MODULOS_PLANO['Básico']
    const { data: modulos } = await supabase
      .from('modulos')
      .select('id, nome')
      .in('nome', modulosPlano)

    if (modulos && modulos.length > 0) {
      // Remove módulos antigos e insere novos
      await supabase.from('salao_modulos').delete().eq('salao_id', salao.id)
      await supabase.from('salao_modulos').insert(
        modulos.map(m => ({ salao_id: salao.id, modulo_id: m.id, ativo: true }))
      )
    }
  }

  // Processar comissão do afiliado se cupom usado
  if (compra?.cupom && compra.cupom.startsWith('AFIL-')) {
    const { data: afiliado } = await supabase
      .from('afiliados').select('*').eq('cupom', compra.cupom).maybeSingle()
    if (afiliado) {
      const valorCompra = payment.transaction_amount || 0
      // FIX: fórmula correta de arredondamento para percentuais fracionários
      const comissao = Math.round(valorCompra * (afiliado.comissao_percentual || 40) / 100 * 100) / 100

      // Pix automático REMOVIDO: API /v1/payments é para cobrança, não para envio
      // Sempre usa pagamento manual notificando o admin
      const pixEnviado = false

      // Atualiza acumulado do afiliado
      await supabase.from('afiliados').update({
        total_vendas: (afiliado.total_vendas || 0) + 1,
        valor_acumulado: (afiliado.valor_acumulado || 0) + comissao,
        valor_pago: afiliado.valor_pago || 0,
      }).eq('id', afiliado.id)

      // Notifica Admin para pagamento manual
      await supabase.from('notificacoes').insert({
        titulo: '💰 Comissão de Afiliado — Pagar Manualmente',
        mensagem: `Venda via cupom ${compra.cupom}\nAfiliado: ${afiliado.nome}\nValor da venda: R$${valorCompra.toFixed(2)}\n💰 PAGAR: R$${comissao.toFixed(2)} via Pix → ${afiliado.chave_pix}`,
        tipo: 'success', para_todos: false, salao_id: null,
        metadata: {
          tipo: 'comissao_afiliado',
          afiliado_id: afiliado.id,
          afiliado_nome: afiliado.nome,
          afiliado_email: afiliado.email,
          chave_pix: afiliado.chave_pix,
          cupom: compra.cupom,
          valor_compra: valorCompra,
          valor_comissao: comissao,
          pix_enviado: pixEnviado,
        },
      })

      try {
        await sendEmailComissao({
          nome: afiliado.nome,
          email: afiliado.email,
          cupom: compra.cupom,
          valorCompra,
          valorComissao: comissao,
          plano,
        })
      } catch {}
    }
  }

  // Enviar email de boas-vindas
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

  // Notificação de compra para o admin
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
      plano,
      preco_original: compra?.preco_original || payment.transaction_amount,
      preco_final: compra?.preco_final || payment.transaction_amount,
      cupom: compra?.cupom || null,
      desconto_percentual: compra?.desconto_percentual || 0,
      payment_id: String(payment.id),
    },
  })

  return NextResponse.json({ ok: true })
}
