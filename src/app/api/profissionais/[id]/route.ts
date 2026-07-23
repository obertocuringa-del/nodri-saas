import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'
import { fundirOcultos } from '@/lib/areasPortal'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || !payload.salaoId) return null
  return payload.salaoId
}

async function getSessaoRole() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return { salaoId: null as string | null, role: null as string | null }
  const payload = await verifyJWT(token)
  return { salaoId: (payload?.salaoId as string) || null, role: (payload?.role as string) || null }
}

async function lerOcultoGlobal(salaoId: string): Promise<Record<string, boolean>> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'acesso_oculto_global').maybeSingle()
  const v = (data as any)?.valor
  return v && typeof v === 'object' ? v : {}
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { salaoId, role } = await getSessaoRole()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('*')
    .eq('id', params.id)
    .eq('salao_id', salaoId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  // Nunca expõe o hash da senha; só informa se já existe uma senha definida
  const { acesso_senha_hash, ...semHash } = (data as any) || {}

  // Quando é a PRÓPRIA profissional carregando o portal, aplica o padrão global
  // do salão por cima do ajuste individual (oculta se qualquer um dos dois pedir).
  // Para o dono/sub, devolve o acesso_oculto cru — ele edita o individual.
  if (role === 'profissional') {
    const global = await lerOcultoGlobal(salaoId)
    semHash.acesso_oculto = fundirOcultos(global, semHash.acesso_oculto)
  }

  return NextResponse.json({ ...semHash, acesso_tem_senha: !!acesso_senha_hash })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const body = await req.json()

  // Colunas permitidas na tabela profissionais
  const ALLOWED_COLS = new Set([
    'nome_completo','apelido','email','cpf','rg','cnpj','cargo','habilidades',
    'endereco','data_aniversario','foto_url','cor_favorita','comida_favorita',
    'animal_favorito','hobbies','um_sonho','contato_responsavel','certificados',
    'conta_bancaria','ativo','data_admissao','servicos_habilitados',
    'ficha_entrevista','processo_contratacao','materiais_trabalho','perfil_ideal',
    'horarios_folgas','distrato','contrato_trabalho','tem_certificados','plano_carreira','data_demissao','cnpj_status','cnpj_observacao','vinculo','clt_observacao','avaliacoes','telefone','ferias',
    'tem_contrato','perfil_pessoal_completo','dados_pessoais_completo','dados_profissionais_completo',
    'is_departamento','departamento_cor',
    // Portal do profissional: login e visibilidade controlados pelo salão
    'acesso_login','acesso_liberado','acesso_oculto',
    // Aprovação do autocadastro público (pendente → aprovado)
    'status_cadastro',
  ])

  // Converte campos vazios para null e filtra apenas colunas conhecidas
  const cleaned: Record<string, any> = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => ALLOWED_COLS.has(k))
      .map(([k, v]) => [k, v === '' ? null : v])
  )
  // login sempre minúsculo e sem espaços (garante o índice único)
  if (typeof cleaned.acesso_login === 'string') cleaned.acesso_login = cleaned.acesso_login.trim().toLowerCase() || null
  // senha em texto puro nunca é salva: vira hash; vazio = não altera
  if (typeof body.acesso_senha === 'string' && body.acesso_senha.trim()) {
    cleaned.acesso_senha_hash = await hashPassword(body.acesso_senha.trim())
  }

  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .update({ ...cleaned, atualizado_em: new Date().toISOString() })
    .eq('id', params.id)
    .eq('salao_id', salaoId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Editou', 'Profissional', (data as any)?.nome_completo || params.id)
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  // Busca o id da tabela feedback_prof_profissionais vinculado a esse profissional
  const { data: fpf } = await supabaseAdmin
    .from('feedback_prof_profissionais')
    .select('id')
    .eq('profissional_id', params.id)
    .maybeSingle()

  if (fpf?.id) {
    // Remove respostas e bloqueios vinculados ao profissional no feedback
    await supabaseAdmin.from('feedback_prof_respostas').delete().eq('profissional_id', fpf.id).eq('salao_id', salaoId)
    await supabaseAdmin.from('feedback_prof_bloqueios').delete().eq('profissional_id', fpf.id).eq('salao_id', salaoId)
    await supabaseAdmin.from('feedback_prof_profissionais').delete().eq('id', fpf.id).eq('salao_id', salaoId)
  }

  // Remove relatório de feedbacks do profissional
  await supabaseAdmin
    .from('relatorio_feedbacks')
    .delete()
    .eq('salao_id', salaoId)
    .ilike('profissional', (await supabaseAdmin.from('profissionais').select('nome_completo, apelido').eq('id', params.id).maybeSingle()).data?.apelido || '')

  // Deleta o profissional (trigger do banco cuida do resto)
  const { error } = await supabaseAdmin
    .from('profissionais')
    .delete()
    .eq('id', params.id)
    .eq('salao_id', salaoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Excluiu', 'Profissional', params.id)
  return NextResponse.json({ ok: true })
}
