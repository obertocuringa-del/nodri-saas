import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload?.salaoId || null
}

export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('salao_servicos')
    .select('*')
    .eq('salao_id', salaoId)
    .order('categoria')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { categoria, nome, preco_fixo, preco_min, comissao_valor, observacao, ciclo_retorno_dias } = body

  if (!categoria || !nome) return NextResponse.json({ error: 'Categoria e nome são obrigatórios' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('salao_servicos')
    .insert({ salao_id: salaoId, categoria, nome, preco_fixo: preco_fixo || null, preco_min: preco_min || null, comissao_valor: comissao_valor || null, observacao: observacao || null, ciclo_retorno_dias: ciclo_retorno_dias || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { id, categoria, nome, preco_fixo, preco_min, comissao_valor, observacao, ciclo_retorno_dias, ativo } = body

  const { data, error } = await supabaseAdmin
    .from('salao_servicos')
    .update({ categoria, nome, preco_fixo: preco_fixo || null, preco_min: preco_min || null, comissao_valor: comissao_valor || null, observacao: observacao || null, ciclo_retorno_dias: ciclo_retorno_dias || null, ativo, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('salao_id', salaoId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID não informado' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('salao_servicos')
    .delete()
    .eq('id', id)
    .eq('salao_id', salaoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
