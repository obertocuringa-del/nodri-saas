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

  // O envio pode falhar (sem RESEND_API_KEY, provedor fora do ar). A resposta
  // NÃO muda por causa disso: dizer "não consegui enviar" só para e-mails que
  // existem entregaria quais endereços estão cadastrados, que é justamente o
  // que a mensagem genérica evita. O erro fica no log.
  try {
    await enviarEmailRecuperacaoSenha(usuario.email, usuario.nome, token)
  } catch (e) {
    console.error('[recuperar-senha] e-mail não enviado:', e)
  }

  return NextResponse.json({ ok: true, message: 'Se o email existir, você receberá as instruções.' })
}
