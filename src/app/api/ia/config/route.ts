import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Verifica se o salão tem IA ativa
    const { data: salao } = await supabaseAdmin
      .from('saloes')
      .select('ia_ativa')
      .eq('id', salaoId)
      .maybeSingle()

    // Verifica se o admin tem chave configurada na ia_config_global
    const { data: globalConfig } = await supabaseAdmin
      .from('ia_config_global')
      .select('api_key, modelo')
      .limit(1)
      .maybeSingle()

    const tem_api_key = !!(salao?.ia_ativa && globalConfig?.api_key && globalConfig.api_key.length > 10)

    // Busca instruções adicionais do salão
    const { data: config } = await supabaseAdmin
      .from('ia_configuracao')
      .select('contexto_adicional')
      .eq('salao_id', salaoId)
      .maybeSingle()

    return NextResponse.json({
      tem_api_key,
      ia_ativa: !!salao?.ia_ativa,
      contexto_adicional: config?.contexto_adicional || '',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'NÃ£o autorizado' }, { status: 401 })

    const body = await req.json()
    const { contexto_adicional } = body

    const { error } = await supabaseAdmin
      .from('ia_configuracao')
      .upsert({ salao_id: salaoId, contexto_adicional: contexto_adicional || '' }, { onConflict: 'salao_id' })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

