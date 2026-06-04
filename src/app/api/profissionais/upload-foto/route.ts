import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const payload = await verifyJWT(token)
  if (!payload?.salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('foto') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const path = `profissionais/${payload.salaoId}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
