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

  // FIX BUG 1: normaliza email para minúsculas — login usa .toLowerCase() na busca
  const emailNormalizado = email.trim().toLowerCase()

  // FIX BUG 2: converte strings vazias para null (evita erro de FK no Postgres)
  const planoIdFinal = plano_id && plano_id.trim() ? plano_id.trim() : null
  const vencimentoFinal = licenca_vencimento && licenca_vencimento.trim() ? licenca_vencimento.trim() : null
  const nomeResponsavel = responsavel?.trim() || nome.trim()

  // Verifica se email já existe
  const { data: emailExistente } = await supabaseAdmin
    .from('usuarios')
    .select('id')
    .eq('email', emailNormalizado)
    .maybeSingle()

  if (emailExistente) {
    return NextResponse.json({ error: 'Este email já está cadastrado no sistema' }, { status: 400 })
  }

  // Cria salão
  const { data: salao, error: salaoErr } = await supabaseAdmin
    .from('saloes')
    .insert({
      nome: nome.trim(),
      responsavel: nomeResponsavel,
      email: emailNormalizado,
      telefone: telefone?.trim() || null,
      plano_id: planoIdFinal,
      licenca_vencimento: vencimentoFinal,
      observacoes: observacoes?.trim() || null,
      status: 'ativo',
    })
    .select()
    .single()

  if (salaoErr) return NextResponse.json({ error: salaoErr.message }, { status: 500 })

  // FIX BUG 3: se criação do usuário falhar, remove o salão para evitar dados órfãos
  const senhaHash = await hashPassword(senha_acesso)
  const { error: userErr } = await supabaseAdmin
    .from('usuarios')
    .insert({
      salao_id: salao.id,
      nome: nomeResponsavel,
      email: emailNormalizado,   // FIX: email normalizado igual ao login
      senha_hash: senhaHash,
      role: 'salon',
      ativo: true,
    })

  if (userErr) {
    // Remove o salão criado para não deixar órfão
    await supabaseAdmin.from('saloes').delete().eq('id', salao.id)
    return NextResponse.json({ error: `Erro ao criar usuário: ${userErr.message}` }, { status: 500 })
  }

  return NextResponse.json(salao, { status: 201 })
}
