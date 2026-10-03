import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { calcularIndicadoresMeta } from '@/lib/metasAnalitico'
import { getSessao } from '@/lib/apiAuth'
import { travaDoMes } from '@/lib/metasTravadas'

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

  // A tela precisa saber para travar o campo e explicar por quê.
  const trava = await travaDoMes(salaoId, ano, mes)

  return NextResponse.json({
    ano, mes,
    travada: !!trava,
    travada_em: trava?.em || null,
    meta_redistribuida: meta?.meta_redistribuida || 0,
    meta_manual: meta?.meta_manual ?? null,
    meta_final: metaFinal,
    ...indicadores,
    plano: plano || null,
  })
}

// PUT — define/limpa a meta manual do profissional para o mês.
// Sub-usuário é somente leitura. A profissional pode definir a PRÓPRIA meta.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sess = await getSessao()
  if (sess?.role === 'sub') return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  if (sess?.role === 'profissional' && sess.profissionalId !== params.id)
    return NextResponse.json({ error: 'Você só pode definir a sua própria meta' }, { status: 403 })
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const hoje = new Date()
  const ano = parseInt(body.ano) || hoje.getFullYear()
  const mes = parseInt(body.mes) || (hoje.getMonth() + 1)
  const meta_manual = body.meta_manual === '' || body.meta_manual === null || body.meta_manual === undefined
    ? null
    : Number(body.meta_manual)

  // ── Mês travado: ninguém mexe, nem o dono ────────────────────────────────
  //
  // A trava é ligada na aba Redistribuição depois que as metas estão como o
  // dono quer (umas automáticas, outras manuais). A partir dali o número é o
  // combinado da corrida.
  //
  // Esta checagem é a que vale: desabilitar o campo na tela só esconde o
  // botão, e esta rota continuaria aceitando qualquer PUT -- inclusive o da
  // própria profissional, que a regra acima autoriza a mexer na meta DELA. Com
  // a corrida valendo, é quem está competindo mexendo no próprio alvo.
  const trava = await travaDoMes(salaoId, ano, mes)
  if (trava) {
    return NextResponse.json({
      error: 'As metas deste mês estão travadas. Para mudar, destrave em Relatórios > Redistribuição.',
      travada_em: trava.em,
    }, { status: 423 })
  }

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
