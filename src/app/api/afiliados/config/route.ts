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
    .single()

  return NextResponse.json(data?.valor || { percentual: 10 })
}

// POST — atualiza config (Admin)
export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()

  await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: 'afiliado_desconto_cliente', valor: body }, { onConflict: 'chave' })

  return NextResponse.json({ ok: true })
}
