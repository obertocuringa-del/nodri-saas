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

export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('salao_usuarios')
    .select('id, nome, usuario, papel, permissoes, ativo, criado_em')
    .eq('salao_id', salaoId)
    .order('criado_em', { ascending: true })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { nome, usuario, senha, papel, permissoes } = await req.json()
  if (!usuario || !senha) return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 })
  const login = String(usuario).trim().toLowerCase()
  const { data: jaExiste } = await supabaseAdmin.from('salao_usuarios').select('id').eq('usuario', login).maybeSingle()
  if (jaExiste) return NextResponse.json({ error: 'Esse login já está em uso. Escolha outro.' }, { status: 400 })
  const senha_hash = await hashPassword(String(senha))
  const { data, error } = await supabaseAdmin
    .from('salao_usuarios')
    .insert({ salao_id: salaoId, nome: nome || null, usuario: login, senha_hash, papel: papel || null, permissoes: Array.isArray(permissoes) ? permissoes : [], ativo: true })
    .select('id, nome, usuario, papel, permissoes, ativo')
    .single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'Já existe um usuário com esse login' : error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id, nome, usuario, senha, papel, permissoes, ativo } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const patch: any = {}
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
