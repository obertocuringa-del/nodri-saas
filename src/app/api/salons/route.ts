import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ehChaveDoModelo, sanitizar, versaoDoModelo, marcarOrigem } from '@/lib/modeloSalao'
import { copiarMoldesDeTabelas } from '@/lib/modeloTabelas'

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

  // Salão novo nasce com a ESTRUTURA do salão modelo (menus, check lists,
  // POPs, catálogos). Só estrutura viaja — o preenchimento de cada salão
  // fica onde está (ver lib/modeloSalao). Se não houver modelo, nasce vazio
  // e cai nos padrões do código, como era antes.
  const semeadas = await semearDoModelo(salao.id)
  // Moldes que vivem em tabelas próprias (feedback de cliente e de
  // profissional): vêm o formulário e as perguntas, com LINK NOVO e sem
  // nenhuma resposta — cada salão fica com os dados dele.
  const moldes = await semearMoldes(salao.id, salao.nome)

  return NextResponse.json({ ...salao, estrutura_do_modelo: semeadas, moldes }, { status: 201 })
}

/** Moldes do modelo que não moram em salao_config. */
async function semearMoldes(salaoId: string, nome: string) {
  try {
    const { data: mod } = await supabaseAdmin
      .from('saloes').select('id').eq('is_modelo', true).maybeSingle()
    if (!mod) return []
    return await copiarMoldesDeTabelas((mod as any).id, salaoId, nome)
  } catch {
    return []
  }
}

/** Copia a estrutura do salão modelo para um salão recém-criado. */
async function semearDoModelo(salaoId: string): Promise<number> {
  try {
    const { data: mod } = await supabaseAdmin
      .from('saloes').select('id').eq('is_modelo', true).maybeSingle()
    if (!mod) return 0

    const { data: cfg } = await supabaseAdmin
      .from('salao_config').select('chave, valor, atualizado_em').eq('salao_id', (mod as any).id)
    const linhasModelo = (cfg || []) as { chave: string; valor: any; atualizado_em?: string | null }[]

    const agora = new Date().toISOString()
    const linhas = linhasModelo
      .filter(c => ehChaveDoModelo(c.chave))
      .map(c => ({ salao_id: salaoId, chave: c.chave, valor: marcarOrigem(sanitizar(c.chave, c.valor)), atualizado_em: agora }))
    if (!linhas.length) return 0

    const { error } = await supabaseAdmin.from('salao_config').upsert(linhas, { onConflict: 'salao_id,chave' })
    if (error) return 0

    // Já nasce na versão atual do modelo — não recebe aviso de atualização.
    await supabaseAdmin.from('saloes')
      .update({ modelo_versao: versaoDoModelo(linhasModelo), modelo_aplicado_em: agora })
      .eq('id', salaoId)
    return linhas.length
  } catch {
    return 0   // semear é um plus: nunca derruba a criação do salão
  }
}
