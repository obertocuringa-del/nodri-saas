import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: valida token e retorna nome do salão
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { data } = await supabaseAdmin
    .from('saloes')
    .select('id, nome')
    .eq('link_cadastro_token', params.token)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })
  return NextResponse.json({ salao_id: data.id, salao_nome: data.nome })
}

// POST: cria o profissional (sem autenticação — link público)
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('id')
    .eq('link_cadastro_token', params.token)
    .maybeSingle()

  if (!salao) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

  const body = await req.json()

  const cleaned = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])
  )

  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .insert({
      ...cleaned,
      salao_id: salao.id,
      ativo: false,
      status_cadastro: 'pendente',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
