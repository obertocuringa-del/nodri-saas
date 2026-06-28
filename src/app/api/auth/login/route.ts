import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, signJWT } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    // Busca usuário (dono) com dados do salão
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('*, salao:saloes(*, plano:planos(*))')
      .eq('email', email.toLowerCase())
      .eq('ativo', true)
      .maybeSingle()

    // Se não for dono, tenta sub-usuário e depois profissional (login definidos pelo salão)
    if (!usuario) {
      const login = email.toLowerCase().trim()
      // 1) busca o sub-usuário (sem join — a tabela não tem FK pra saloes)
      const { data: sub } = await supabaseAdmin
        .from('salao_usuarios')
        .select('*')
        .eq('usuario', login)
        .eq('ativo', true)
        .maybeSingle()

      if (sub && await verifyPassword(password, sub.senha_hash)) {
        // busca o salão separadamente
        const { data: salaoSub } = await supabaseAdmin
          .from('saloes')
          .select('nome, status, plano:planos(slug)')
          .eq('id', sub.salao_id)
          .maybeSingle()
        if (salaoSub?.status === 'bloqueado' || salaoSub?.status === 'vencido') {
          return NextResponse.json({ error: 'A licença do salão está indisponível. Fale com o dono.' }, { status: 403 })
        }
        const tokenSub = await signJWT({
          userId: sub.id, email: sub.usuario, role: 'sub', salaoId: sub.salao_id,
          salaoNome: salaoSub?.nome, plano: (salaoSub?.plano as any)?.slug,
          permissoes: Array.isArray(sub.permissoes) ? sub.permissoes : [], nome: sub.nome || sub.usuario,
        })
        const respSub = NextResponse.json({ user: { id: sub.id, nome: sub.nome || sub.usuario, role: 'sub' } })
        respSub.cookies.set('nodri_token', tokenSub, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
        return respSub
      }

      // 2) PROFISSIONAL — portal somente leitura, login/senha definidos pelo salão
      let prof: any = null
      try {
        const r = await supabaseAdmin
          .from('profissionais')
          .select('id, salao_id, nome_completo, apelido, acesso_senha_hash, acesso_liberado')
          .eq('acesso_login', login)
          .eq('acesso_liberado', true)
          .maybeSingle()
        prof = r.data
      } catch { prof = null }

      if (prof && prof.acesso_senha_hash && await verifyPassword(password, prof.acesso_senha_hash)) {
        const { data: salaoP } = await supabaseAdmin
          .from('saloes')
          .select('nome, status, plano:planos(slug)')
          .eq('id', prof.salao_id)
          .maybeSingle()
        if (salaoP?.status === 'bloqueado' || salaoP?.status === 'vencido') {
          return NextResponse.json({ error: 'A licença do salão está indisponível. Fale com o dono.' }, { status: 403 })
        }
        const nomeP = prof.apelido || prof.nome_completo || login
        const tokenP = await signJWT({
          userId: prof.id, email: login, role: 'profissional', salaoId: prof.salao_id,
          salaoNome: salaoP?.nome, plano: (salaoP?.plano as any)?.slug, profissionalId: prof.id, nome: nomeP,
        })
        const respP = NextResponse.json({ user: { id: prof.id, nome: nomeP, role: 'profissional', profissionalId: prof.id } })
        respP.cookies.set('nodri_token', tokenP, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
        return respP
      }

      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
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
