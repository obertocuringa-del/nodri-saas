import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function gerarCodigo(percentual: number): string {
  const sufixo = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `NODRI${percentual}${sufixo}`
}

async function autenticar() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload?.role === 'master' ? payload : null
}

export async function GET() {
  const payload = await autenticar()
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('cupons')
    .select('*')
    .order('criado_em', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const payload = await autenticar()
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { percentual, codigo_personalizado } = await req.json()

  if (!percentual || percentual < 1 || percentual > 100) {
    return NextResponse.json({ error: 'Percentual inválido (deve ser entre 1 e 100)' }, { status: 400 })
  }

  const codigo = codigo_personalizado?.trim().toUpperCase() || gerarCodigo(percentual)

  const { data, error } = await supabaseAdmin
    .from('cupons')
    .insert({ codigo, percentual })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const payload = await autenticar()
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, ativo } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('cupons')
    .update({ ativo })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const payload = await autenticar()
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin.from('cupons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
