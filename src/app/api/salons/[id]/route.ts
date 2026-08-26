import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { trocarPlanoDoSalao } from '@/lib/planoDoSalao'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { nova_senha, ...dadosSalao } = body

  // Normaliza email para minúsculas (mesmo padrão do login)
  const emailNormalizado = dadosSalao.email?.trim().toLowerCase() || dadosSalao.email

  // ── Plano: mudar aqui é mudar dinheiro ────────────────────────────────────
  //
  // Este formulário gravava `plano_id` direto e não falava com o Asaas. Quem
  // subisse um cliente de plano por aqui liberava o acesso e continuava
  // cobrando o valor antigo — o prejuízo só apareceria meses depois, na
  // conferência. O campo continua nesta tela, mas a troca passa pelo mesmo
  // caminho de todo mundo, que atualiza a cobrança e o acesso juntos.
  const { data: antes } = await supabaseAdmin
    .from('saloes').select('plano_id').eq('id', params.id).maybeSingle()

  const planoNovo = dadosSalao.plano_id || null
  const planoMudou = antes && planoNovo && planoNovo !== antes.plano_id
  let avisoPlano: string | null = null

  if (planoMudou) {
    const r = await trocarPlanoDoSalao(params.id, planoNovo)
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400 })
    avisoPlano = r.mensagem || null
  }

  const { data, error } = await supabaseAdmin
    .from('saloes')
    .update({
      nome: dadosSalao.nome,
      responsavel: dadosSalao.responsavel,
      email: emailNormalizado,
      telefone: dadosSalao.telefone || null,
      // `plano_id` já foi gravado por trocarPlanoDoSalao quando mudou; repetir
      // o valor aqui é inofensivo e mantém o caso de tirar o plano (null).
      plano_id: planoNovo,
      licenca_vencimento: dadosSalao.licenca_vencimento || null,
      status: dadosSalao.status,
      observacoes: dadosSalao.observacoes || null,
    })
    .eq('id', params.id)
    .select('*, plano:planos(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sincroniza email do usuário
  if (emailNormalizado) {
    await supabaseAdmin.from('usuarios').update({ email: emailNormalizado }).eq('salao_id', params.id)
  }

  if (nova_senha && nova_senha.trim()) {
    const senhaHash = await hashPassword(nova_senha)
    await supabaseAdmin.from('usuarios').update({ senha_hash: senhaHash }).eq('salao_id', params.id)
  }

  return NextResponse.json(avisoPlano ? { ...data, avisoPlano } : data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // FIX: verifica cada erro de cascade para não deixar dados órfãos
  const { error: errUsuarios } = await supabaseAdmin
    .from('usuarios').delete().eq('salao_id', params.id)
  if (errUsuarios) return NextResponse.json({ error: 'Erro ao remover usuários: ' + errUsuarios.message }, { status: 500 })

  const { error: errModulos } = await supabaseAdmin
    .from('salao_modulos').delete().eq('salao_id', params.id)
  if (errModulos) return NextResponse.json({ error: 'Erro ao remover módulos: ' + errModulos.message }, { status: 500 })

  const { error: errNotifs } = await supabaseAdmin
    .from('notificacoes').delete().eq('salao_id', params.id)
  if (errNotifs) return NextResponse.json({ error: 'Erro ao remover notificações: ' + errNotifs.message }, { status: 500 })

  const { error } = await supabaseAdmin.from('saloes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
