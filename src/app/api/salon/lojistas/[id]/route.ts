import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { salaoIdSe, escritaBloqueadaSub } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'

const CAMPOS_EDITAVEIS = [
  'nome', 'celular', 'data_aniversario', 'email', 'instagram',
  'nome_loja', 'segmento', 'bloco', 'numero_loja',
  'servicos_interesse', 'observacoes', 'situacao',
]

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const { data, error } = await supabaseAdmin.from('lojistas').select('*').eq('id', params.id).eq('salao_id', salaoId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const b = await req.json()
  const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
  for (const c of CAMPOS_EDITAVEIS) if (b[c] !== undefined) patch[c] = b[c]

  const { data, error } = await supabaseAdmin.from('lojistas').update(patch).eq('id', params.id).eq('salao_id', salaoId).select().maybeSingle()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Já existe um lojista com esse celular.' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  registrarAuditoria('Editou', 'Lojista', data?.nome_loja || params.id)
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const { error } = await supabaseAdmin.from('lojistas').delete().eq('id', params.id).eq('salao_id', salaoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Excluiu', 'Lojista', params.id)
  return NextResponse.json({ ok: true })
}
