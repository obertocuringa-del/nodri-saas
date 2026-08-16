import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET — busca config de desconto do afiliado
export async function GET() {
  const { data } = await supabaseAdmin
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'afiliado_desconto_cliente')
    .maybeSingle()

  const v = (data?.valor || {}) as any
  return NextResponse.json({
    percentual: Number(v.percentual) >= 0 ? Number(v.percentual) : 10,
    // Desconto de estreia: vale só na primeira cobrança e depois o cliente
    // passa a pagar o preço de tabela.
    apenas_primeira: !!v.apenas_primeira,
  })
}

// POST — atualiza config (Admin)
export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const valor = {
    percentual: Math.max(0, Math.min(100, Number(body?.percentual) || 0)),
    apenas_primeira: !!body?.apenas_primeira,
  }

  await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: 'afiliado_desconto_cliente', valor }, { onConflict: 'chave' })

  return NextResponse.json({ ok: true })
}
