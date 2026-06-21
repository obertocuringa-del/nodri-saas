import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('id')
    .eq('link_cadastro_token', params.token)
    .maybeSingle()

  if (!salao) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('arquivo') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const tipo = (formData.get('tipo') as string) || 'documento'
  const path = `cadastro-publico/${salao.id}/${Date.now()}-${tipo}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
