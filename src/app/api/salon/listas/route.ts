import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || !payload.salaoId) return null
  return payload.salaoId
}

const MSG_KEY = 'listas_mensagens'

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)

  if (searchParams.get('mensagens')) {
    const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', MSG_KEY).maybeSingle()
    return NextResponse.json(Array.isArray(data?.valor) ? data!.valor : [])
  }

  const servico = searchParams.get('servico') || ''
  const mes = searchParams.get('mes') || ''
  if (!servico || !mes) return NextResponse.json(null)
  const chave = `lista_${servico}_${mes}`
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', chave).maybeSingle()
  return NextResponse.json(data?.valor ?? null)
}

export async function PUT(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()

  // Registrar mensagem enviada no histórico
  if (body.mensagem) {
    const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', MSG_KEY).maybeSingle()
    const lista = Array.isArray(data?.valor) ? data!.valor : []
    const nova = [{ id: Date.now().toString(), enviada_em: new Date().toISOString(), ...body.mensagem }, ...lista].slice(0, 300)
    const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: MSG_KEY, valor: nova, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, mensagens: nova })
  }

  // Salvar grid de uma lista (servico + mes)
  const { servico, mes, doc } = body
  if (!servico || !mes) return NextResponse.json({ error: 'Faltam servico/mes' }, { status: 400 })
  const chave = `lista_${servico}_${mes}`
  const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave, valor: doc, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
