import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { calcularIndicadoresMeta } from '@/lib/metasAnalitico'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload?.salaoId || null
}

// GET — meta do mês atual (ou ano/mes informado) + planejamento salvo
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const hoje = new Date()
  const ano = parseInt(searchParams.get('ano') || '') || hoje.getFullYear()
  const mes = parseInt(searchParams.get('mes') || '') || (hoje.getMonth() + 1)

  const { data: meta } = await supabaseAdmin
    .from('metas_profissionais')
    .select('*')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  const { data: plano } = await supabaseAdmin
    .from('planejamentos_metas')
    .select('*')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  const metaFinal = meta?.meta_manual ?? meta?.meta_redistribuida ?? 0

  const indicadores = await calcularIndicadoresMeta(params.id, salaoId, ano, mes, metaFinal)

  return NextResponse.json({
    ano, mes,
    meta_redistribuida: meta?.meta_redistribuida || 0,
    meta_manual: meta?.meta_manual ?? null,
    meta_final: metaFinal,
    ...indicadores,
    plano: plano || null,
  })
}

// PUT — define/limpa a meta manual do profissional para o mês
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const hoje = new Date()
  const ano = parseInt(body.ano) || hoje.getFullYear()
  const mes = parseInt(body.mes) || (hoje.getMonth() + 1)
  const meta_manual = body.meta_manual === '' || body.meta_manual === null || body.meta_manual === undefined
    ? null
    : Number(body.meta_manual)

  const { data, error } = await supabaseAdmin
    .from('metas_profissionais')
    .upsert({
      salao_id: salaoId,
      profissional_id: params.id,
      ano, mes,
      meta_manual,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'profissional_id,ano,mes' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
