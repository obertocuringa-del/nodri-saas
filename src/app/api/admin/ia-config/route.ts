import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = await verifyJWT(token)
  if (payload?.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('ia_config_global')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) return NextResponse.json({ api_key: '', modelo: 'gemini-1.5-flash', instrucoes_base: '', ativo: false, api_key_salva: false })

  const masked = data.api_key ? `****${data.api_key.slice(-6)}` : ''

  return NextResponse.json({
    ...data,
    api_key: masked,
    api_key_salva: !!data.api_key,
  })
}

export async function PUT(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = await verifyJWT(token)
  if (payload?.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { api_key, modelo, instrucoes_base, ativo } = body

  // Buscar registro existente
  const { data: existing } = await supabaseAdmin
    .from('ia_config_global')
    .select('id, api_key')
    .limit(1)
    .maybeSingle()

  const updateData: Record<string, any> = {
    modelo,
    instrucoes_base,
    ativo,
    atualizado_em: new Date().toISOString(),
  }

  // Só sobrescreve api_key se foi enviada e não está vazia
  if (api_key && api_key.trim() !== '') {
    updateData.api_key = api_key.trim()
  }

  let result
  if (existing?.id) {
    result = await supabaseAdmin
      .from('ia_config_global')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    result = await supabaseAdmin
      .from('ia_config_global')
      .insert(updateData)
      .select()
      .single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
