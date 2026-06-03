import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('saloes')
    .select('*')
    .eq('id', payload.salaoId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  // FIX: verifica role 'salon' E salaoId (antes só verificava salaoId)
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { nome, responsavel, telefone, nova_senha } = await req.json()

  // FIX: só atualiza campos que foram enviados (evita sobrescrever com undefined/null)
  const updates: Record<string, any> = {}
  if (nome && nome.trim()) updates.nome = nome.trim()
  if (responsavel && responsavel.trim()) updates.responsavel = responsavel.trim()
  if (telefone !== undefined) updates.telefone = telefone || null

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin
      .from('saloes')
      .update(updates)
      .eq('id', payload.salaoId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (nova_senha && nova_senha.trim()) {
    const senhaHash = await hashPassword(nova_senha.trim())
    const { error: senhaError } = await supabaseAdmin
      .from('usuarios')
      .update({ senha_hash: senhaHash })
      .eq('salao_id', payload.salaoId)
      .eq('role', 'salon')
    if (senhaError) return NextResponse.json({ error: senhaError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
