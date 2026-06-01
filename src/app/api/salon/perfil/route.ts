import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !payload.salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { nome, responsavel, telefone, nova_senha } = await req.json()

  const { error } = await supabaseAdmin
    .from('saloes')
    .update({ nome, responsavel, telefone })
    .eq('id', payload.salaoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (nova_senha) {
    const senhaHash = await hashPassword(nova_senha)
    await supabaseAdmin.from('usuarios').update({ senha_hash: senhaHash }).eq('salao_id', payload.salaoId)
  }

  return NextResponse.json({ ok: true })
}
