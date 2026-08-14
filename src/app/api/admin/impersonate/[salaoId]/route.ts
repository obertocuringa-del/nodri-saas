import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, signJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { salaoId: string } }) {
  // Apenas master pode impersonar
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { salaoId } = params

  // Busca o salão e o usuário associado
  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('*, plano:planos(*)')
    .eq('id', salaoId)
    .maybeSingle()

  if (!salao) {
    return NextResponse.json({ error: 'Salão não encontrado' }, { status: 404 })
  }

  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('salao_id', salaoId)
    .eq('role', 'salon')
    .maybeSingle()

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário do salão não encontrado' }, { status: 404 })
  }

  // Gera token temporário do salão (expira em 2 horas)
  const salaoToken = await signJWT({
    userId:    usuario.id,
    email:     usuario.email,
    role:      'salon',
    salaoId:   salao.id,
    salaoNome: salao.nome,
    plano:     salao.plano?.slug || 'basico',
  })

  // Registra no log (silencioso se tabela não tiver essas colunas)
  try {
    await supabaseAdmin.from('logs').insert({
      acao: 'impersonacao',
      descricao: `Admin acessou como salão "${salao.nome}" (${salao.email})`,
      usuario_id: payload.userId,
      salao_id: salaoId,
      metadata: { admin_email: payload.email, salao_nome: salao.nome },
    })
  } catch { /* ignora */ }

  // SEC-007 — o token NÃO volta no corpo da resposta.
  //
  // Antes ele era devolvido em JSON e o navegador o gravava com
  // `document.cookie = ...`, criando um cookie SEM httpOnly/Secure/SameSite:
  // ficava legível na inspeção e qualquer XSS o roubaria. Agora quem grava é
  // o servidor, com as mesmas proteções do cookie de login.
  //
  // O token do admin vai para um cookie httpOnly à parte, para o "voltar"
  // funcionar sem que o front precise guardar credencial nenhuma.
  const resposta = NextResponse.json({
    ok: true,
    salao: { id: salao.id, nome: salao.nome, email: salao.email },
  })
  const seguro = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }
  const tokenAdmin = cookies().get('nodri_token')?.value
  if (tokenAdmin) resposta.cookies.set('nodri_admin_token', tokenAdmin, { ...seguro, maxAge: 60 * 60 * 24 * 7 })
  resposta.cookies.set('nodri_token', salaoToken, { ...seguro, maxAge: 60 * 60 * 2 })
  return resposta
}

// Volta para a conta do admin: troca o cookie de volta, também no servidor.
export async function DELETE() {
  const tokenAdmin = cookies().get('nodri_admin_token')?.value
  const admin = tokenAdmin ? await verifyJWT(tokenAdmin) : null
  if (!admin || admin.role !== 'master') {
    return NextResponse.json({ error: 'Não há sessão de admin para retomar' }, { status: 401 })
  }
  const resposta = NextResponse.json({ ok: true })
  const seguro = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }
  resposta.cookies.set('nodri_token', tokenAdmin, { ...seguro, maxAge: 60 * 60 * 24 * 7 })
  resposta.cookies.set('nodri_admin_token', '', { ...seguro, maxAge: 0 })
  return resposta
}
