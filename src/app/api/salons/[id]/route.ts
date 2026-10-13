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

  // ── Apagar o salão POR INTEIRO ───────────────────────────────────────────
  //
  // Aqui se apagavam TRÊS tabelas (usuarios, salao_modulos, notificacoes) e
  // depois o salão. Dois defeitos, achados em 12/10/2026 quando o dono tentou
  // excluir um salão de teste e só via "Erro ao excluir salão":
  //
  //   1. NÃO EXCLUÍA: `logs` aponta para `saloes` com NO ACTION e o banco
  //      recusava. A mensagem não dizia o porquê.
  //   2. Se passasse, deixaria 38 TABELAS ÓRFÃS -- o CRM inteiro (contatos,
  //      conversas, mensagens), salao_config, lista de espera, lojistas,
  //      auditoria. Cliente cancela, some da lista, e as conversas das
  //      clientes dele ficam no banco para sempre. Isso é LGPD, não bagunça.
  //
  // Quem apaga agora é a função `excluir_salao` no banco: ela descobre as
  // tabelas pelo catálogo, na hora. Lista escrita aqui envelheceria -- toda
  // tabela nova com salao_id teria de ser lembrada, e passo manual não
  // acontece. Tabela de backup ela não toca.
  const { data: apagado, error } = await supabaseAdmin.rpc('excluir_salao', { p_salao: params.id })
  if (error) return NextResponse.json({ error: 'Não deu para excluir: ' + error.message }, { status: 500 })

  // O resumo vai para o log do servidor: excluir é irreversível, e saber
  // depois quanto saiu de cada tabela é a única pista que resta.
  console.log('[excluir_salao]', params.id, JSON.stringify(apagado))
  return NextResponse.json({ ok: true, apagado })
}
