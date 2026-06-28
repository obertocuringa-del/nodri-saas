import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

// Upload genérico de arquivos (qualquer formato) para o bucket 'uploads'.
export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const payload = await verifyJWT(token)
  if (!payload?.salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('arquivo') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo muito grande (máx. 50 MB)' }, { status: 400 })

  const safe = (file.name || 'arquivo').replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80)
  const path = `arquivos/${payload.salaoId}/${Date.now()}_${safe}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, filename: file.name || safe, type: file.type || '' })
}
