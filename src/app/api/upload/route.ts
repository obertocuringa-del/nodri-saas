import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

export async function POST(req: NextRequest) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
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

  // SEC-006 — só o tamanho era validado. Sem checar tipo, um .svg ou .html
  // com script, servido do mesmo domínio, vira XSS; e o contentType vinha do
  // cliente, que podia mentir. Agora: extensão em allowlist, e o tipo servido
  // é o que NÓS decidimos, não o que o navegador informou.
  const TIPOS: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', avif: 'image/avif',
    pdf: 'application/pdf',
    mp4: 'video/mp4', webm: 'video/webm',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
  }
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
  const contentType = TIPOS[ext]
  if (!contentType) {
    return NextResponse.json({
      error: `Tipo de arquivo não permitido (.${ext || '?'}). Aceitos: ${Object.keys(TIPOS).join(', ')}`,
    }, { status: 400 })
  }

  // Nome gerado por nós: o nome enviado pelo usuário nunca entra no caminho
  // (evita path traversal e sobrescrita).
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filename, buffer, { contentType, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl, filename })
}
