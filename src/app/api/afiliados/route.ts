import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmailAfiliado } from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nodri-saas-jsx4.vercel.app'

function gerarCupom(nome: string): string {
  const primeiroNome = nome.trim().split(' ')[0].toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const codigo = Math.random().toString(36).toUpperCase().slice(2, 6)
  return `AFIL-${primeiroNome}-${codigo}`
}

// GET — listar afiliados (Admin)
export async function GET(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('afiliados')
    .select('*')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST — cadastrar novo afiliado (público)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nome, cpf, email, telefone, chave_pix } = body

  if (!nome || !cpf || !email || !chave_pix) {
    return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 })
  }

  // Verifica duplicado
  const { data: existente } = await supabaseAdmin
    .from('afiliados')
    .select('id')
    .or(`email.eq.${email},cpf.eq.${cpf}`)
    .single()

  if (existente) {
    return NextResponse.json({ error: 'Este email ou CPF já está cadastrado como afiliado.' }, { status: 409 })
  }

  // Gera cupom único
  let cupom = gerarCupom(nome)
  let tentativas = 0
  while (tentativas < 5) {
    const { data: cupomExistente } = await supabaseAdmin
      .from('afiliados').select('id').eq('cupom', cupom).single()
    if (!cupomExistente) break
    cupom = gerarCupom(nome)
    tentativas++
  }

  const link = `${SITE_URL}/?ref=${cupom}`

  // Cria afiliado
  const { data: afiliado, error } = await supabaseAdmin
    .from('afiliados')
    .insert({ nome, cpf, email, telefone, chave_pix, cupom, link })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Envia email para o afiliado
  try {
    await sendEmailAfiliado({ nome, email, cupom, link })
  } catch (e) {
    console.error('Erro ao enviar email afiliado:', e)
  }

  // Notifica Admin
  await supabaseAdmin.from('notificacoes').insert({
    titulo: '🤝 Novo Afiliado Cadastrado',
    mensagem: `${nome} (${email}) se cadastrou como afiliado. Cupom: ${cupom}`,
    tipo: 'info',
    para_todos: false,
    salao_id: null,
    metadata: { tipo: 'afiliado', nome, email, cpf, telefone, chave_pix, cupom, link },
  })

  return NextResponse.json({ ok: true, cupom, link }, { status: 201 })
}

// PATCH — atualizar comissão, status, bloquear/desbloquear (Admin)
export async function PATCH(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { id, ...updates } = body

  const { data, error } = await supabaseAdmin
    .from('afiliados').update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — excluir afiliado (Admin)
export async function DELETE(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin.from('afiliados').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
