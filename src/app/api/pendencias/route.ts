import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { escritaBloqueadaSub, getSessao, sessaoModoCaixa } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'NÃ£o autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const profissionalId = searchParams.get('profissional_id')
    const solicitanteId = searchParams.get('solicitante_id')

    let query = supabaseAdmin
      .from('pendencias_profissionais')
      .select('*')
      .eq('salao_id', salaoId)
      .order('criado_em', { ascending: false })

    if (profissionalId) {
      query = query.eq('profissional_id', profissionalId)
    }
    if (solicitanteId) {
      query = query.eq('solicitante_id', solicitanteId)
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
    // Modo Caixa pode ADICIONAR pendências; sub comum continua somente leitura
    if (await escritaBloqueadaSub()) {
      const sess = await getSessao()
      if (!sessaoModoCaixa(sess)) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
    }

    const body = await req.json()
    const { profissional_id, mensagem, data_limite, solicitante_id, solicitante_nome, prioridade, origem } = body

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
        solicitante_id: solicitante_id || null,
        solicitante_nome: solicitante_nome || null,
        prioridade: prioridade || null,
        origem: origem || null,
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

