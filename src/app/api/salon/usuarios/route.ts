import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || !payload.salaoId) return null
  // Apenas o dono (role salon/master) gerencia usuários — sub-usuários não.
  if ((payload as any).role === 'sub') return null
  return payload.salaoId
}

/**
 * O e-mail do usuario extra e obrigatorio desde 13/10/2026.
 *
 * Nao e enfeite de cadastro: e o UNICO endereco para onde o "esqueci minha
 * senha" dele pode ir. Sem ele, quem esquece a senha depende do dono estar
 * por perto -- foi exatamente o beco em que o sistema estava.
 *
 * Tem de ser unico em TODO o sistema: se o mesmo endereco servisse a dois
 * acessos, o link de recuperacao iria para um e o outro nunca receberia, sem
 * ninguem entender por que. Por isso a conferencia cruza as tres tabelas de
 * acesso, nao so a dos usuarios extras.
 */
async function conferirEmail(email: string, ignorarId?: string): Promise<string | null> {
  const e = String(email || '').trim().toLowerCase()
  if (!e) return 'Informe o e-mail. E por ele que a pessoa recupera a senha se esquecer.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'E-mail invalido.'

  const [dono, outroSub, prof] = await Promise.all([
    supabaseAdmin.from('usuarios').select('id').eq('email', e).maybeSingle(),
    supabaseAdmin.from('salao_usuarios').select('id').ilike('email', e).maybeSingle(),
    supabaseAdmin.from('profissionais').select('id').ilike('email', e).eq('acesso_liberado', true).maybeSingle(),
  ])
  if (dono.data) return 'Esse e-mail ja e o de acesso de um salao. Use outro.'
  if (outroSub.data && outroSub.data.id !== ignorarId) return 'Esse e-mail ja esta em uso por outro usuario.'
  if (prof.data) return 'Esse e-mail ja e o de um profissional com acesso ao portal. Use outro.'
  return null
}

export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('salao_usuarios')
    .select('id, nome, usuario, email, papel, permissoes, ativo, criado_em')
    .eq('salao_id', salaoId)
    .order('criado_em', { ascending: true })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { nome, usuario, senha, email, papel, permissoes } = await req.json()
  if (!usuario || !senha) return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 })
  const erroEmail = await conferirEmail(email)
  if (erroEmail) return NextResponse.json({ error: erroEmail }, { status: 400 })
  const login = String(usuario).trim().toLowerCase()
  const { data: jaExiste } = await supabaseAdmin.from('salao_usuarios').select('id').eq('usuario', login).maybeSingle()
  if (jaExiste) return NextResponse.json({ error: 'Esse login já está em uso. Escolha outro.' }, { status: 400 })
  const senha_hash = await hashPassword(String(senha))
  const { data, error } = await supabaseAdmin
    .from('salao_usuarios')
    .insert({ salao_id: salaoId, nome: nome || null, usuario: login, email: String(email).trim().toLowerCase(), senha_hash, papel: papel || null, permissoes: Array.isArray(permissoes) ? permissoes : [], ativo: true })
    .select('id, nome, usuario, email, papel, permissoes, ativo')
    .single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'Já existe um usuário com esse login' : error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id, nome, usuario, senha, email, papel, permissoes, ativo } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const patch: any = {}
  if (email !== undefined) {
    const erro = await conferirEmail(email, String(id))
    if (erro) return NextResponse.json({ error: erro }, { status: 400 })
    patch.email = String(email).trim().toLowerCase()
  }
  if (nome !== undefined) patch.nome = nome || null
  if (usuario !== undefined) patch.usuario = String(usuario).trim().toLowerCase()
  if (papel !== undefined) patch.papel = papel || null
  if (permissoes !== undefined) patch.permissoes = Array.isArray(permissoes) ? permissoes : []
  if (ativo !== undefined) patch.ativo = !!ativo
  if (senha) patch.senha_hash = await hashPassword(String(senha))
  const { error } = await supabaseAdmin.from('salao_usuarios').update(patch).eq('id', id).eq('salao_id', salaoId)
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'Login já em uso' : error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('salao_usuarios').delete().eq('id', id).eq('salao_id', salaoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
