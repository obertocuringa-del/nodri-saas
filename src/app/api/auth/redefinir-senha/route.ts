import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { token, nova_senha } = await req.json()

  if (!token || !nova_senha) {
    return NextResponse.json({ error: 'Token e nova senha são obrigatórios' }, { status: 400 })
  }

  if (nova_senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  // Busca token válido
  const { data: tokenData } = await supabaseAdmin
    .from('tokens_senha')
    .select('id, usuario_id, expira_em, usado')
    .eq('token', token)
    .single()

  if (!tokenData) return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  if (tokenData.usado) return NextResponse.json({ error: 'Token já utilizado' }, { status: 400 })
  if (new Date(tokenData.expira_em) < new Date()) {
    return NextResponse.json({ error: 'Token expirado. Solicite um novo.' }, { status: 400 })
  }

  // Atualiza senha
  const senhaHash = await hashPassword(nova_senha)
  await supabaseAdmin.from('usuarios').update({ senha_hash: senhaHash }).eq('id', tokenData.usuario_id)

  // Marca token como usado
  await supabaseAdmin.from('tokens_senha').update({ usado: true }).eq('id', tokenData.id)

  return NextResponse.json({ ok: true, message: 'Senha redefinida com sucesso!' })
}
