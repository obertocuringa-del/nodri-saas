import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = await verifyJWT(token)
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('ia_config')
      .select('modelo, instrucoes_base, contexto_adicional, api_key')
      .eq('salao_id', salaoId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({
        tem_api_key: false,
        modelo: 'claude-haiku-4-5',
        instrucoes_base: '',
        contexto_adicional: '',
      })
    }

    return NextResponse.json({
      tem_api_key: !!data.api_key,
      modelo: data.modelo || 'claude-haiku-4-5',
      instrucoes_base: data.instrucoes_base || '',
      contexto_adicional: data.contexto_adicional || '',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = await verifyJWT(token)
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { api_key, modelo, instrucoes_base, contexto_adicional } = body

    const upsertData: Record<string, any> = {
      salao_id: salaoId,
      modelo: modelo || 'claude-haiku-4-5',
      instrucoes_base: instrucoes_base || '',
      contexto_adicional: contexto_adicional || '',
    }

    if (api_key && api_key.trim()) {
      upsertData.api_key = api_key.trim()
    }

    const { error } = await supabaseAdmin
      .from('ia_config')
      .upsert(upsertData, { onConflict: 'salao_id' })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
