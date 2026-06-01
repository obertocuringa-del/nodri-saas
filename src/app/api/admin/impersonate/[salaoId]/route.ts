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

  // Registra no log
  await supabaseAdmin.from('logs').insert({
    acao: 'impersonacao',
    descricao: `Admin acessou como salão "${salao.nome}" (${salao.email})`,
    usuario_id: payload.userId,
    salao_id: salaoId,
    metadata: { admin_email: payload.email, salao_nome: salao.nome },
  }).catch(() => {}) // silencioso se tabela logs não tiver essas colunas

  // Retorna o token do salão — o admin_token fica salvo no front para voltar
  return NextResponse.json({
    token: salaoToken,
    salao: { id: salao.id, nome: salao.nome, email: salao.email },
  })
}
