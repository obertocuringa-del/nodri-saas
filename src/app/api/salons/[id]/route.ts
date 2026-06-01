import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { nova_senha, ...dadosSalao } = body

  // Normaliza email para minúsculas (mesmo padrão do login)
  const emailNormalizado = dadosSalao.email?.trim().toLowerCase() || dadosSalao.email

  const { data, error } = await supabaseAdmin
    .from('saloes')
    .update({
      nome: dadosSalao.nome,
      responsavel: dadosSalao.responsavel,
      email: emailNormalizado,
      telefone: dadosSalao.telefone || null,
      plano_id: dadosSalao.plano_id || null,
      licenca_vencimento: dadosSalao.licenca_vencimento || null,
      status: dadosSalao.status,
      observacoes: dadosSalao.observacoes || null,
    })
    .eq('id', params.id)
    .select('*, plano:planos(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualiza email do usuário também (manter sincronizado)
  if (emailNormalizado) {
    await supabaseAdmin.from('usuarios').update({ email: emailNormalizado }).eq('salao_id', params.id)
  }

  if (nova_senha && nova_senha.trim()) {
    const senhaHash = await hashPassword(nova_senha)
    await supabaseAdmin.from('usuarios').update({ senha_hash: senhaHash }).eq('salao_id', params.id)
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await supabaseAdmin.from('usuarios').delete().eq('salao_id', params.id)
  await supabaseAdmin.from('salao_modulos').delete().eq('salao_id', params.id)
  await supabaseAdmin.from('notificacoes').delete().eq('salao_id', params.id)
  const { error } = await supabaseAdmin.from('saloes').delete().eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
