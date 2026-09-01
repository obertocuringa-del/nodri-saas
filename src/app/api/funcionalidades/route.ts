import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { FUNCIONALIDADES_CATALOGO } from '@/lib/funcionalidadesCatalogo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET é público (alimenta o menu e as páginas da vitrine).
// Escrita é do master.

// ── Catálogo + banco ─────────────────────────────────────────────────────────
//
// A vitrine tinha UMA funcionalidade cadastrada, e o sistema tem dezenas. Criar
// as outras uma a uma no painel seria meia hora de digitação antes de a página
// começar a vender.
//
// Então a lista pública é a soma de dois lugares: o que está no BANCO manda, e
// o CATÁLOGO do código preenche o que ainda não foi criado. A comparação é por
// slug.
//
// Consequência que importa: as páginas já existem e já vendem, sem ninguém
// precisar cadastrar nada. E no instante em que uma delas for criada no painel
// (botão "Trazer as recomendadas"), a versão do banco passa a mandar naquele
// slug — o que for escrito lá nunca é sobrescrito por este arquivo.
function doCatalogo() {
  return FUNCIONALIDADES_CATALOGO.map((f, i) => ({
    id: `catalogo:${f.slug}`,
    origem: 'catalogo' as const,
    categoria: f.categoria,
    nome: f.nome,
    slug: f.slug,
    etiqueta: f.etiqueta,
    titulo: f.titulo,
    descricao: f.descricao,
    destaques: f.destaques,
    video_url: null,
    imagem_url: `/func/${f.slug}.svg`,
    botao_texto: 'Quero conhecer',
    ordem_categoria: i,
    ordem: i,
    ativo: true,
  }))
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('funcionalidades')
    .select('*')
    .eq('ativo', true)
    .order('ordem_categoria')
    .order('ordem')

  const doBanco = (data || []) as any[]
  const slugsNoBanco = new Set(doBanco.map(f => f.slug))
  const complemento = doCatalogo().filter(f => !slugsNoBanco.has(f.slug))

  return NextResponse.json([...doBanco, ...complemento])
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
