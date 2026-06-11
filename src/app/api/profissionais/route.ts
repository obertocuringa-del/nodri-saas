import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || !payload.salaoId) return null
  return payload.salaoId
}

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId(req)
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ativo = searchParams.get('ativo')

  let query = supabaseAdmin
    .from('profissionais')
    .select('*')
    .eq('salao_id', salaoId)
    .order('nome_completo')

  if (ativo !== null) {
    query = query.eq('ativo', ativo === 'true')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Injeta contagem de pendências abertas para TODOS os profissionais
  const lista = data || []
  const todosIds = lista.map((p: any) => p.id)
  let pendCounts: Record<string, number> = {}
  if (todosIds.length > 0) {
    const { data: pends } = await supabaseAdmin
      .from('pendencias_profissionais')
      .select('profissional_id')
      .eq('salao_id', salaoId)
      .eq('resolvido', false)
      .in('profissional_id', todosIds)
    ;(pends || []).forEach((p: any) => {
      pendCounts[p.profissional_id] = (pendCounts[p.profissional_id] || 0) + 1
    })
  }

  return NextResponse.json(lista.map((p: any) => ({ ...p, pendencias_abertas: pendCounts[p.id] || 0 })))
}

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId(req)
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  // Converte campos vazios para null (evita erro de tipo no banco)
  const cleaned = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])
  )

  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .insert({ ...cleaned, salao_id: salaoId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
