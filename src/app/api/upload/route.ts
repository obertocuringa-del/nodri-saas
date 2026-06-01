import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  // Autenticação: apenas admin master
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const bucket = (formData.get('bucket') as string) || 'paginas'

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  // Limita tamanho: 50MB
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande (máx 50MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl, filename })
}
