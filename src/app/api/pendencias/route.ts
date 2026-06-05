import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'NÃ£o autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const profissionalId = searchParams.get('profissional_id')

    let query = supabaseAdmin
      .from('pendencias_profissionais')
      .select('id, profissional_id, mensagem, data_limite, resolvido, resolvido_em, criado_em, profissionais(nome_completo, apelido)')
      .eq('salao_id', salaoId)
      .order('criado_em', { ascending: false })

    if (profissionalId) {
      query = query.eq('profissional_id', profissionalId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'NÃ£o autorizado' }, { status: 401 })

    const body = await req.json()
    const { profissional_id, mensagem, data_limite } = body

    if (!profissional_id || !mensagem) {
      return NextResponse.json({ error: 'profissional_id e mensagem sÃ£o obrigatÃ³rios' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('pendencias_profissionais')
      .insert({
        salao_id: salaoId,
        profissional_id,
        mensagem,
        data_limite: data_limite || null,
        resolvido: false,
      })
      .select('id, profissional_id, mensagem, data_limite, resolvido, resolvido_em, criado_em')
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

