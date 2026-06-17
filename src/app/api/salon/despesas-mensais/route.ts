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

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const ano = searchParams.get('ano')
  const mes = searchParams.get('mes')
  let query = supabaseAdmin.from('salao_despesas_mensais').select('*').eq('salao_id', salaoId)
  if (ano) query = query.eq('ano', Number(ano))
  if (mes) query = query.eq('mes', Number(mes))
  const { data } = await query.order('ano', { ascending: false }).order('mes', { ascending: false }).limit(24)
  return NextResponse.json({ despesas: data || [] })
}

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  const { ano, mes, itens } = body
  if (!ano || !mes || !Array.isArray(itens)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const total = itens.reduce((s: number, i: any) => s + Number(i.valor || 0), 0)
  const { data, error } = await supabaseAdmin
    .from('salao_despesas_mensais')
    .upsert({ salao_id: salaoId, ano, mes, itens, total, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,ano,mes' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ despesa: data })
}
