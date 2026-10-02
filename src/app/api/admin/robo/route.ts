import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { carregarAgenda, gravarAgenda, lerAgenda, aprovarColeta, CHAVE_AGENDA, MINUTOS_POR_COLETA } from '@/lib/roboRelatorio'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Painel master > Robô do relatório: grade de horários, agenda de cada salão,
// histórico com o Excel de cada coleta, aprovar/descartar o que ficou seguro.

async function master() {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  return p && p.role === 'master' ? p : null
}

export async function GET(req: NextRequest) {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Histórico de UM salão num período (botão "Histórico" do painel).
  const hist = req.nextUrl.searchParams.get('historico')
  if (hist) {
    const de = req.nextUrl.searchParams.get('de') || '2000-01-01'
    const ate = req.nextUrl.searchParams.get('ate') || '2999-12-31'
    const { data } = await supabaseAdmin.from('robo_coletas')
      .select('id, salao_id, inicio, fim, situacao, motivo, linhas, faturamento, dias_com_dados, anterior, origem')
      .eq('salao_id', hist).gte('inicio', `${de}T00:00:00-03:00`).lte('inicio', `${ate}T23:59:59-03:00`)
      .order('inicio', { ascending: false }).limit(500)
    return NextResponse.json({ coletas: data || [] })
  }

  const baixar = req.nextUrl.searchParams.get('baixar')
  if (baixar) {
    const { data: c } = await supabaseAdmin.from('robo_coletas').select('arquivo, inicio').eq('id', baixar).maybeSingle()
    if (!c?.arquivo || !fs.existsSync(c.arquivo)) return NextResponse.json({ error: 'Excel não encontrado' }, { status: 404 })
    return new NextResponse(fs.readFileSync(c.arquivo), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="coleta_${String(c.inicio).slice(0, 10)}.xlsx"`,
      },
    })
  }

  const { data: saloes } = await supabaseAdmin.from('saloes').select('id, nome, is_modelo').order('nome')
  const { data: cfgs } = await supabaseAdmin.from('salao_config').select('salao_id, valor').eq('chave', CHAVE_AGENDA)
  const agendaDe = new Map((cfgs || []).map((c: any) => [c.salao_id, lerAgenda(c.valor)]))
  const { data: robos } = await supabaseAdmin.from('salao_config').select('salao_id, valor').eq('chave', 'crm_robo_avec')
  const temLogin = new Set((robos || []).filter((r: any) => r.valor?.email && r.valor?.senha_cifra && r.valor?.no_servidor).map((r: any) => r.salao_id))
  const { data: coletas } = await supabaseAdmin.from('robo_coletas')
    .select('id, salao_id, inicio, fim, situacao, motivo, linhas, faturamento, dias_com_dados, anterior, origem')
    .order('inicio', { ascending: false }).limit(300)

  const lista = (saloes || []).filter((s: any) => !s.is_modelo).map((s: any) => ({
    id: s.id, nome: s.nome,
    agenda: agendaDe.get(s.id) || lerAgenda(null),
    na_nuvem: temLogin.has(s.id),
    coletas: (coletas || []).filter((c: any) => c.salao_id === s.id).slice(0, 8),
  }))
  return NextResponse.json({ saloes: lista, minutos_por_coleta: MINUTOS_POR_COLETA, simultaneas: Number(process.env.ROBO_SIMULTANEAS || 1) })
}

export async function POST(req: NextRequest) {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const b = await req.json().catch(() => ({}))

  if (b.acao === 'agenda') {
    const atual = await carregarAgenda(b.salao_id)
    const nova = lerAgenda({ ...atual, ligado: !!b.ligado, horarios: b.horarios })
    await gravarAgenda(b.salao_id, nova)
    return NextResponse.json({ ok: true, agenda: nova })
  }
  if (b.acao === 'rodar_agora') {
    const atual = await carregarAgenda(b.salao_id)
    await gravarAgenda(b.salao_id, { ...atual, rodar_agora_em: new Date().toISOString() })
    return NextResponse.json({ ok: true })
  }
  if (b.acao === 'aprovar') {
    try { return NextResponse.json({ ok: true, resultado: await aprovarColeta(b.id) }) }
    catch (e: any) { return NextResponse.json({ error: String(e?.message || e) }, { status: 400 }) }
  }
  if (b.acao === 'descartar') {
    // Descartar não encosta no mês nem na planilha guardada: só diz que esta
    // coleta não vai ser usada, e tira ela da fila de decisão. O motivo fica
    // escrito para o histórico não virar um "descartado" sem explicação.
    const { data: c } = await supabaseAdmin.from('robo_coletas').select('motivo').eq('id', b.id).maybeSingle()
    await supabaseAdmin.from('robo_coletas')
      .update({ situacao: 'descartado', motivo: `Não aprovada pelo dono. ${c?.motivo || ''}`.trim().slice(0, 1000) })
      .eq('id', b.id).eq('situacao', 'aguardando')
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
