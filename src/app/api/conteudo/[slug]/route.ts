import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { data, error } = await supabaseAdmin
    .from('conteudo_submenus')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !data) {
    return NextResponse.json({ slug: params.slug, titulo: '', video_url: '', conteudo: {}, existe: false })
  }

  return NextResponse.json({ ...data, existe: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  await supabaseAdmin.from('conteudo_submenus').delete().eq('slug', params.slug)
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('conteudo_submenus')
    .upsert(
      { slug: params.slug, ...body },
      { onConflict: 'slug' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
