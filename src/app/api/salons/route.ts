import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('saloes')
    .select('*, plano:planos(*)')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { nome, responsavel, email, telefone, plano_id, licenca_vencimento, senha_acesso, observacoes } = body

  if (!nome || !email || !senha_acesso) {
    return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 })
  }

  // Cria salão
  const { data: salao, error: salaoErr } = await supabaseAdmin
    .from('saloes')
    .insert({ nome, responsavel, email, telefone, plano_id, licenca_vencimento, observacoes, status: 'ativo' })
    .select()
    .single()

  if (salaoErr) return NextResponse.json({ error: salaoErr.message }, { status: 500 })

  // Cria usuário do salão
  const senhaHash = await hashPassword(senha_acesso)
  const { error: userErr } = await supabaseAdmin
    .from('usuarios')
    .insert({ salao_id: salao.id, nome: responsavel, email, senha_hash: senhaHash, role: 'salon', ativo: true })

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })

  return NextResponse.json(salao, { status: 201 })
}
