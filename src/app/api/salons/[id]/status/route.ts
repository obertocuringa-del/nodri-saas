import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Admin libera ou bloqueia manualmente qualquer salão
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { acao, licenca_vencimento } = await req.json()
  // acao: 'liberar' | 'bloquear'

  if (!['liberar', 'bloquear'].includes(acao)) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const novoStatus = acao === 'liberar' ? 'ativo' : 'bloqueado'

  const updateData: any = { status: novoStatus }
  if (acao === 'liberar' && licenca_vencimento) {
    updateData.licenca_vencimento = licenca_vencimento
  }

  const { data, error } = await supabaseAdmin
    .from('saloes')
    .update(updateData)
    .eq('id', params.id)
    .select('*, plano:planos(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log da ação manual
  await supabaseAdmin.from('logs').insert({
    usuario_id: payload.userId,
    salao_id: params.id,
    acao: acao === 'liberar' ? 'LICENCA_LIBERADA_MANUAL' : 'LICENCA_BLOQUEADA_MANUAL',
    detalhes: { status: novoStatus, admin: payload.email },
  })

  // Notificação no admin
  await supabaseAdmin.from('notificacoes').insert({
    titulo: acao === 'liberar' ? 'Acesso Liberado' : 'Acesso Bloqueado',
    mensagem: `Salão "${data.nome}" foi ${acao === 'liberar' ? 'liberado' : 'bloqueado'} manualmente pelo administrador.`,
    tipo: acao === 'liberar' ? 'success' : 'warning',
    para_todos: false,
    salao_id: null,
  })

  return NextResponse.json(data)
}
