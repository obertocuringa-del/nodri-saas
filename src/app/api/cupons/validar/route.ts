import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const codigo = searchParams.get('codigo')?.toUpperCase().trim()

  if (!codigo) {
    return NextResponse.json({ valido: false, percentual: 0, mensagem: 'Código não informado' })
  }

  const { data: cupom } = await supabaseAdmin
    .from('cupons')
    .select('*')
    .eq('codigo', codigo)
    .eq('ativo', true)
    .single()

  if (!cupom) {
    return NextResponse.json({ valido: false, percentual: 0, mensagem: 'Cupom inválido ou expirado' })
  }

  if (cupom.usos_maximos !== null && cupom.usos_atual >= cupom.usos_maximos) {
    return NextResponse.json({ valido: false, percentual: 0, mensagem: 'Este cupom já foi utilizado o máximo de vezes' })
  }

  return NextResponse.json({
    valido: true,
    percentual: cupom.percentual,
    mensagem: `${cupom.percentual}% de desconto aplicado com sucesso!`,
  })
}
