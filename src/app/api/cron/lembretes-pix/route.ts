import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Roda todo dia — verifica salões PIX que vencem em 5 dias
export async function GET() {
  try {
    const hoje = new Date()
    const em5dias = new Date()
    em5dias.setDate(hoje.getDate() + 5)
    const em5diasStr = em5dias.toISOString().split('T')[0]

    // Busca salões ativos que pagam via PIX e vencem em 5 dias
    const { data: saloes } = await supabaseAdmin
      .from('saloes')
      .select('id, nome, email, telefone, licenca_vencimento, asaas_subscription_id, plano:planos(nome, preco)')
      .eq('status', 'ativo')
      .eq('licenca_vencimento', em5diasStr)
      // Quem tem assinatura no Asaas NÃO recebe lembrete: o cartão dele é
      // cobrado sozinho. Mandar "pague para não perder o acesso" para quem já
      // paga automático assusta cliente adimplente e gera suporte à toa.
      .is('asaas_subscription_id', null)

    if (!saloes || saloes.length === 0) {
      return NextResponse.json({ message: 'Nenhum vencimento em 5 dias', lembretes: 0 })
    }

    for (const salao of saloes) {
      const plano = (salao as any).plano
      // Notificação no Admin
      await supabaseAdmin.from('notificacoes').insert({
        titulo: '⚠️ PIX Vencendo em 5 dias',
        mensagem: `💳 LEMBRETE DE COBRANÇA PIX\n\nSalão: ${salao.nome}\nEmail: ${salao.email}\nTelefone: ${salao.telefone || 'Não informado'}\nPlano: ${plano?.nome || 'Não definido'}\nValor: R$${plano?.preco?.toFixed(2) || '—'}\nVencimento: ${new Date(salao.licenca_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}\n\nAção: Cobrar via PIX e liberar manualmente após confirmação.`,
        tipo: 'warning',
        para_todos: false,
        salao_id: null,
        metadata: {
          tipo: 'lembrete_pix',
          salao_id: salao.id,
          salao_nome: salao.nome,
          salao_email: salao.email,
          salao_telefone: salao.telefone,
          plano_nome: plano?.nome,
          valor: plano?.preco,
          vencimento: salao.licenca_vencimento,
        },
      })
    }

    // Também busca os que vencem HOJE (urgente)
    const hojeStr = hoje.toISOString().split('T')[0]
    const { data: vencendoHoje } = await supabaseAdmin
      .from('saloes')
      .select('id, nome, email, telefone, licenca_vencimento, plano:planos(nome, preco)')
      .eq('status', 'ativo')
      .eq('licenca_vencimento', hojeStr)

    for (const salao of (vencendoHoje || [])) {
      const plano = (salao as any).plano
      await supabaseAdmin.from('notificacoes').insert({
        titulo: '🔴 PIX Vence HOJE',
        mensagem: `🚨 VENCIMENTO HOJE!\n\nSalão: ${salao.nome}\nEmail: ${salao.email}\nValor: R$${plano?.preco?.toFixed(2) || '—'}\n\nSe não pagar hoje, o acesso será bloqueado automaticamente.`,
        tipo: 'danger',
        para_todos: false,
        salao_id: null,
        metadata: {
          tipo: 'vencimento_hoje_pix',
          salao_id: salao.id,
          salao_nome: salao.nome,
        },
      })
    }

    return NextResponse.json({
      message: 'Lembretes enviados',
      lembretes_5dias: saloes.length,
      vencendo_hoje: vencendoHoje?.length || 0,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
