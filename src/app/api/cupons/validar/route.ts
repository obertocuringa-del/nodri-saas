import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const codigo = searchParams.get('codigo')?.toUpperCase().trim()

  if (!codigo) {
    return NextResponse.json({ valido: false, percentual: 0, mensagem: 'Código não informado' })
  }

  // 1. Verifica se é cupom de afiliado (começa com AFIL-)
  if (codigo.startsWith('AFIL-')) {
    const { data: afiliado, error } = await supabaseAdmin
      .from('afiliados')
      .select('id, nome, cupom, comissao_percentual, ativo')
      .eq('cupom', codigo)
      .single()

    if (afiliado && afiliado.ativo) {
      // Busca configuração de desconto do cliente (padrão 10%)
      let descontoCliente = 10
      try {
        const { data: config } = await supabaseAdmin
          .from('configuracoes')
          .select('valor')
          .eq('chave', 'afiliado_desconto_cliente')
          .single()
        if (config?.valor?.percentual) descontoCliente = config.valor.percentual
      } catch {}

      return NextResponse.json({
        valido: true,
        tipo: 'afiliado',
        afiliado_id: afiliado.id,
        afiliado_nome: afiliado.nome,
        percentual: descontoCliente,
        comissao_afiliado: afiliado.comissao_percentual || 40,
        mensagem: `✅ Cupom do afiliado ${afiliado.nome.split(' ')[0]}! Você ganhou ${descontoCliente}% de desconto!`,
      })
    }

    // Cupom AFIL não encontrado ou inativo
    return NextResponse.json({ valido: false, percentual: 0, mensagem: '❌ Cupom inválido ou inativo' })
  }

  // 2. Verifica cupom de desconto normal
  const { data: cupom } = await supabaseAdmin
    .from('cupons')
    .select('*')
    .eq('codigo', codigo)
    .eq('ativo', true)
    .single()

  if (cupom) {
    if (cupom.usos_maximos !== null && cupom.usos_atual >= cupom.usos_maximos) {
      return NextResponse.json({ valido: false, percentual: 0, mensagem: 'Este cupom já atingiu o limite de usos' })
    }
    return NextResponse.json({
      valido: true,
      tipo: 'desconto',
      percentual: cupom.percentual,
      mensagem: `✅ ${cupom.percentual}% de desconto aplicado!`,
    })
  }

  return NextResponse.json({ valido: false, percentual: 0, mensagem: '❌ Cupom inválido ou expirado' })
}
