import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { bloquearEdicao } from '@/lib/apiAuth'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .select('*')
    .eq('salao_id', salaoId)
    .order('nome', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ servicos: data || [] })
}

export async function POST(req: NextRequest) {
    if (await bloquearEdicao('POST')) return NextResponse.json({ error: 'Modo Caixa: você pode adicionar, mas não editar nem excluir.' }, { status: 403 })
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { nome, rateio_pct, imposto_pct, produto_padrao } = await req.json()
  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .insert({ salao_id: salaoId, nome, rateio_pct, imposto_pct, produto_padrao })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ servico: data })
}
