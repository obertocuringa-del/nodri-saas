import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { enviarEmailRecuperacaoSenha } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

  // Busca usuário pelo email
  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome, email')
    .eq('email', email.toLowerCase())
    .eq('ativo', true)
    .single()

  // Responde sempre OK (não revelar se email existe)
  if (!usuario) {
    return NextResponse.json({ ok: true, message: 'Se o email existir, você receberá as instruções.' })
  }

  // Gera token seguro
  const token = crypto.randomBytes(32).toString('hex')
  const expira_em = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 horas

  // Invalida tokens anteriores
  await supabaseAdmin.from('tokens_senha').update({ usado: true }).eq('usuario_id', usuario.id).eq('usado', false)

  // Salva novo token
  await supabaseAdmin.from('tokens_senha').insert({
    usuario_id: usuario.id,
    token,
    expira_em: expira_em.toISOString(),
  })

  // Envia email
  await enviarEmailRecuperacaoSenha(usuario.email, usuario.nome, token)

  return NextResponse.json({ ok: true, message: 'Se o email existir, você receberá as instruções.' })
}
