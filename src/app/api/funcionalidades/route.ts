import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET é público (alimenta o menu e as páginas da vitrine).
// Escrita é do master.

export async function GET() {
  const { data } = await supabaseAdmin
    .from('funcionalidades')
    .select('*')
    .eq('ativo', true)
    .order('ordem_categoria')
    .order('ordem')
  return NextResponse.json(data || [])
}

async function ehMaster() {
  const t = cookies().get('nodri_token')?.value
  const p = t ? await verifyJWT(t) : null
  return p?.role === 'master'
}

/** Gera slug a partir do nome; o slug é o endereço público da página. */
function montarSlug(texto: string): string {
  return (texto || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

export async function POST(req: NextRequest) {
  if (!await ehMaster()) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  const b = await req.json().catch(() => ({} as any))
  if (!b?.nome || !b?.categoria) return NextResponse.json({ erro: 'Categoria e nome são obrigatórios' }, { status: 400 })

  // Slug com sufixo do tempo: dois "Relatórios" em categorias diferentes não
  // podem brigar pelo mesmo endereço.
  const slug = b.slug?.trim() || `${montarSlug(b.nome)}-${Date.now().toString(36).slice(-4)}`

  const { data, error } = await supabaseAdmin.from('funcionalidades').insert({
    categoria: b.categoria, nome: b.nome, slug,
    etiqueta: b.etiqueta || null, titulo: b.titulo || b.nome,
    descricao: b.descricao || null, destaques: b.destaques || [],
    video_url: b.video_url || null, imagem_url: b.imagem_url || null,
    botao_texto: b.botao_texto || 'Abrir',
    ordem_categoria: b.ordem_categoria ?? 0, ordem: b.ordem ?? 0,
  }).select().single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!await ehMaster()) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  const b = await req.json().catch(() => ({} as any))
  if (!b?.id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

  const { id, criado_em, ...campos } = b
  const { data, error } = await supabaseAdmin
    .from('funcionalidades').update(campos).eq('id', id).select().single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!await ehMaster()) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  const { error } = await supabaseAdmin.from('funcionalidades').delete().eq('id', id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
