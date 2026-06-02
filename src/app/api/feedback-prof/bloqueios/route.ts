import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function getISOWeekRange() {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return { start, end }
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { monday, sunday } = getISOWeekRange()
  const { start: mesInicio, end: mesFim } = getMonthRange()

  // Busca profissionais cadastrados
  const { data: profissionais } = await supabaseAdmin
    .from('feedback_prof_profissionais')
    .select('id, nome, ativo')
    .eq('salao_id', payload.salaoId)
    .order('nome')

  if (!profissionais || profissionais.length === 0)
    return NextResponse.json({ profissionais: [], periodo_semana: '', periodo_mes: '' })

  // Busca todas as respostas negativas com ATRASO ou FALTA no período relevante
  const { data: respostas } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('profissional_nome, ocorrido_descricao, criado_em')
    .eq('salao_id', payload.salaoId)
    .eq('tipo', 'negativo')
    .in('ocorrido_descricao', ['ATRASO', 'FALTA'])
    .gte('criado_em', mesInicio.toISOString())
    .lte('criado_em', mesFim.toISOString())

  const lista = respostas || []

  // Agrupa por profissional
  const mapa: Record<string, { atrasos: string[]; faltas: string[] }> = {}
  for (const prof of profissionais) {
    mapa[prof.nome] = { atrasos: [], faltas: [] }
  }

  for (const r of lista) {
    const nome = r.profissional_nome
    if (!mapa[nome]) continue
    const data = new Date(r.criado_em)

    if (r.ocorrido_descricao === 'ATRASO' && data >= monday && data <= sunday) {
      mapa[nome].atrasos.push(formatDate(data))
    } else if (r.ocorrido_descricao === 'FALTA' && data >= mesInicio && data <= mesFim) {
      mapa[nome].faltas.push(formatDate(data))
    }
  }

  const resultado = profissionais.map(prof => {
    const dados = mapa[prof.nome] || { atrasos: [], faltas: [] }
    const bloqueio7 = dados.atrasos.length >= 3
    const bloqueio15 = dados.faltas.length >= 2
    const bloqueado = bloqueio7 || bloqueio15
    const dias_bloqueio = bloqueio15 ? 15 : bloqueio7 ? 7 : 0

    let motivo = ''
    if (bloqueio7) motivo += `${dados.atrasos.length} atrasos na semana (${dados.atrasos.join(', ')})`
    if (bloqueio15) {
      if (motivo) motivo += ' | '
      motivo += `${dados.faltas.length} faltas no mês (${dados.faltas.join(', ')})`
    }

    return {
      nome: prof.nome,
      ativo: prof.ativo,
      atrasos_semana: dados.atrasos.length,
      faltas_mes: dados.faltas.length,
      datas_atrasos: dados.atrasos,
      datas_faltas: dados.faltas,
      bloqueado,
      dias_bloqueio,
      motivo,
    }
  })

  const periodoSemana = `${formatDate(monday)} a ${formatDate(sunday)}`
  const periodoMes = `${formatDate(mesInicio)} a ${formatDate(mesFim)}`

  return NextResponse.json({
    profissionais: resultado,
    periodo_semana: periodoSemana,
    periodo_mes: periodoMes,
  })
}
