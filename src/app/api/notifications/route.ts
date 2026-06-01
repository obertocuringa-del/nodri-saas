import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('notificacoes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // FIX: nunca retorna null — usa array vazio como fallback
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { mensagem, salao_id, para_todos, tipo } = await req.json()

  if (!mensagem) return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('notificacoes')
    .insert({
      mensagem,
      salao_id: para_todos ? null : salao_id,
      para_todos: !!para_todos,
      tipo: tipo || 'info',
      lida: false,  // FIX: define lida=false explicitamente para o filtro funcionar
      criado_por: payload.userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
