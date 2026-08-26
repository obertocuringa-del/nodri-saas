import { NextResponse } from 'next/server'
import { configAfiliado } from '@/lib/afiliados'

export const dynamic = 'force-dynamic'

// Só o percentual de comissão, para a página pública de cadastro de afiliado
// mostrar o mesmo número que o e-mail de boas-vindas e o portal do afiliado.
//
// Aberta de propósito: é informação de propaganda, a mesma que já está escrita
// na página. Nada de afiliado, cliente ou salão sai por aqui.
export async function GET() {
  const cfg = await configAfiliado()
  return NextResponse.json({ comissao: cfg.comissao })
}
