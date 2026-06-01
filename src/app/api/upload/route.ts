import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File
  const tipo = formData.get('tipo') as string || 'imagem'

  if (!file) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const nome = `${tipo}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { data, error } = await supabaseAdmin.storage
    .from('nodri-conteudo')
    .upload(nome, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    // Bucket pode não existir — tenta criar
    if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
      await supabaseAdmin.storage.createBucket('nodri-conteudo', { public: true })
      const { data: data2, error: error2 } = await supabaseAdmin.storage
        .from('nodri-conteudo')
        .upload(nome, buffer, { contentType: file.type, upsert: false })
      if (error2) return NextResponse.json({ error: error2.message }, { status: 500 })
      const { data: url2 } = supabaseAdmin.storage.from('nodri-conteudo').getPublicUrl(data2.path)
      return NextResponse.json({ url: url2.publicUrl, nome: file.name })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('nodri-conteudo').getPublicUrl(data.path)
  return NextResponse.json({ url: urlData.publicUrl, nome: file.name })
}
