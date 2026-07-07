import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSalaoPorToken } from '@/lib/lojistasConfig'

// Marca que o lojista clicou em "Entrar no Grupo Promocional do WhatsApp".
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const achado = await getSalaoPorToken(params.token)
  if (!achado) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  await supabaseAdmin.from('lojistas')
    .update({ entrou_grupo: true, grupo_clicado_em: new Date().toISOString() })
    .eq('id', id).eq('salao_id', achado.salaoId)
  return NextResponse.json({ ok: true })
}
