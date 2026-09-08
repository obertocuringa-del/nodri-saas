import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (payload?.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('ia_config_global')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) return NextResponse.json({ api_key: '', api_key_gemini: '', modelo: 'gemini-1.5-flash', instrucoes_base: '', ativo: false, api_key_salva: false, api_key_gemini_salva: false })

  const masked = data.api_key ? `****${data.api_key.slice(-6)}` : ''
  // A chave do Google fica num campo proprio: o embedding da memoria semantica
  // e sempre do Google, mesmo quando quem responde e o Claude. Com uma chave
  // so, trocar de modelo apagava a memoria sem avisar ninguem.
  const maskedGemini = data.api_key_gemini ? `****${String(data.api_key_gemini).slice(-6)}` : ''

  return NextResponse.json({
    ...data,
    api_key: masked,
    api_key_gemini: maskedGemini,
    api_key_salva: !!data.api_key,
    api_key_gemini_salva: !!data.api_key_gemini,
    tavily_keys: data.tavily_keys || [],
  })
}

export async function PUT(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (payload?.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { api_key, api_key_gemini, modelo, instrucoes_base, ativo, tavily_keys } = body

  // Buscar registro existente
  const { data: existing } = await supabaseAdmin
    .from('ia_config_global')
    .select('id, api_key, api_key_gemini, modelo')
    .limit(1)
    .maybeSingle()

  const updateData: Record<string, any> = {
    atualizado_em: new Date().toISOString(),
  }

  if (modelo !== undefined) updateData.modelo = modelo
  if (instrucoes_base !== undefined) updateData.instrucoes_base = instrucoes_base
  if (ativo !== undefined) updateData.ativo = ativo
  if (tavily_keys !== undefined) updateData.tavily_keys = tavily_keys

  if (api_key_gemini && String(api_key_gemini).trim() !== '') {
    updateData.api_key_gemini = String(api_key_gemini).trim()
  }

  // Só sobrescreve api_key se foi enviada e não está vazia
  if (api_key && api_key.trim() !== '') {
    // ── Resgate da chave que está saindo ────────────────────────────────
    //
    // Este campo guarda a chave do provedor ESCOLHIDO. Quem estava no Gemini
    // e troca para o Claude cola a chave nova exatamente por cima da antiga —
    // e a do Google some, levando junto a memória semântica (que é sempre do
    // Google) e a reserva do failover.
    //
    // Ninguém deveria precisar saber disso para não se machucar. Se a chave
    // que está saindo é a do Google e ainda não há cópia no campo próprio,
    // ela é copiada para lá antes da troca.
    const saindoEhGoogle = !String((existing as any)?.modelo || '').startsWith('claude')
    if (saindoEhGoogle && (existing as any)?.api_key && !(existing as any)?.api_key_gemini && !updateData.api_key_gemini) {
      updateData.api_key_gemini = (existing as any).api_key
    }
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
