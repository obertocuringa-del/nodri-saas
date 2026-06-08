import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { nome, marca, unidade, qtd_embalagem, preco } = await req.json()

  const { data, error } = await supabaseAdmin
    .from('produtos_catalogo')
    .update({ nome, marca, unidade, qtd_embalagem, preco, atualizado_em: new Date().toISOString() })
    .eq('id', params.id)
    .eq('salao_id', salaoId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produto: data })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('produtos_catalogo')
    .delete()
    .eq('id', params.id)
    .eq('salao_id', salaoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
