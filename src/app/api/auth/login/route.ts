import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, signJWT } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    // Busca usuário com dados do salão
    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .select('*, salao:saloes(*, plano:planos(*))')
      .eq('email', email.toLowerCase())
      .eq('ativo', true)
      .single()

    if (error || !usuario) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    // Verifica senha
    const valid = await verifyPassword(password, usuario.senha_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    // Verifica se salão está ativo (para usuários de salão)
    if (usuario.role === 'salon' && usuario.salao) {
      if (usuario.salao.status === 'bloqueado') {
        return NextResponse.json({ error: 'Sua licença está bloqueada. Entre em contato com o suporte.' }, { status: 403 })
      }
      if (usuario.salao.status === 'vencido') {
        return NextResponse.json({ error: 'Sua licença venceu. Renove para continuar.' }, { status: 403 })
      }
    }

    // Atualiza último acesso
    await supabaseAdmin.from('usuarios').update({ ultimo_acesso: new Date().toISOString() }).eq('id', usuario.id)

    // Gera JWT
    const token = await signJWT({
      userId:    usuario.id,
      email:     usuario.email,
      role:      usuario.role,
      salaoId:   usuario.salao_id,
      salaoNome: usuario.salao?.nome,
      plano:     usuario.salao?.plano?.slug,
    })

    // Salva em cookie httpOnly
    const response = NextResponse.json({
      user: {
        id:    usuario.id,
        nome:  usuario.nome,
        email: usuario.email,
        role:  usuario.role,
        salao: usuario.salao,
      }
    })

    response.cookies.set('nodri_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7, // 7 dias
      path:     '/',
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
