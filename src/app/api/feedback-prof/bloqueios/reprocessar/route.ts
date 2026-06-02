import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function getMondayOfWeek(weekKey: string): Date {
  const [year, w] = weekKey.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (w - 1) * 7)
  return monday
}

function getSundayOfWeek(weekKey: string): Date {
  const monday = getMondayOfWeek(weekKey)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return sunday
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getLastDayOfMonth(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month, 0) // dia 0 do próximo mês = último dia do mês atual
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDateBR(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function POST() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const salaoId = payload.salaoId
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  // Busca TODOS os feedbacks negativos de ATRASO e FALTA do salão
  const { data: respostas } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('profissional_nome, ocorrido_descricao, criado_em')
    .eq('salao_id', salaoId)
    .eq('tipo', 'negativo')
    .in('ocorrido_descricao', ['ATRASO', 'FALTA'])
    .order('criado_em', { ascending: true })

  if (!respostas || respostas.length === 0)
    return NextResponse.json({ ok: true, bloqueios_gerados: 0, mensagem: 'Nenhum registro de atraso/falta encontrado.' })

  // Agrupa por profissional → semana (ATRASO) e mês (FALTA)
  const atrasosPorProfSemana: Record<string, Record<string, string[]>> = {}
  const faltasPorProfMes: Record<string, Record<string, string[]>> = {}

  for (const r of respostas) {
    const nome = r.profissional_nome
    const data = new Date(r.criado_em)

    if (r.ocorrido_descricao === 'ATRASO') {
      const semana = getISOWeekKey(data)
      if (!atrasosPorProfSemana[nome]) atrasosPorProfSemana[nome] = {}
      if (!atrasosPorProfSemana[nome][semana]) atrasosPorProfSemana[nome][semana] = []
      atrasosPorProfSemana[nome][semana].push(formatDateBR(data))
    } else if (r.ocorrido_descricao === 'FALTA') {
      const mes = getMonthKey(data)
      if (!faltasPorProfMes[nome]) faltasPorProfMes[nome] = {}
      if (!faltasPorProfMes[nome][mes]) faltasPorProfMes[nome][mes] = []
      faltasPorProfMes[nome][mes].push(formatDateBR(data))
    }
  }

  // Para cada profissional, calcula o maior bloqueio ainda ativo
  const todosProfs = new Set([
    ...Object.keys(atrasosPorProfSemana),
    ...Object.keys(faltasPorProfMes),
  ])

  const upserts: object[] = []
  const log: string[] = []

  for (const nome of todosProfs) {
    let melhorBloqueioFim: Date | null = null
    let melhorDias = 0
    let melhorMotivo = ''
    let melhorDatasAtrasos: string[] = []
    let melhorDatasFaltas: string[] = []

    // Analisa cada semana com atrasos
    const semanas = atrasosPorProfSemana[nome] || {}
    for (const [semanaKey, datas] of Object.entries(semanas)) {
      if (datas.length >= 3) {
        const domingo = getSundayOfWeek(semanaKey)
        const fimBloqueio = addDays(domingo, 7)

        if (fimBloqueio > today) {
          // bloqueio ainda ativo
          if (!melhorBloqueioFim || fimBloqueio > melhorBloqueioFim || melhorDias < 7) {
            if (!melhorBloqueioFim || fimBloqueio > melhorBloqueioFim) {
              melhorBloqueioFim = fimBloqueio
              melhorDias = 7
              melhorMotivo = `${datas.length} atrasos na semana ${semanaKey} (${datas.join(', ')})`
              melhorDatasAtrasos = datas
            }
          }
        }
      }
    }

    // Analisa cada mês com faltas
    const meses = faltasPorProfMes[nome] || {}
    for (const [mesKey, datas] of Object.entries(meses)) {
      if (datas.length >= 2) {
        const ultimoDia = getLastDayOfMonth(mesKey)
        const fimBloqueio = addDays(ultimoDia, 15)

        if (fimBloqueio > today) {
          if (!melhorBloqueioFim || fimBloqueio > melhorBloqueioFim) {
            melhorBloqueioFim = fimBloqueio
            melhorDias = 15
            const motivoFaltas = `${datas.length} faltas no mês ${mesKey} (${datas.join(', ')})`
            melhorMotivo = melhorDatasAtrasos.length > 0 ? melhorMotivo + ' | ' + motivoFaltas : motivoFaltas
            melhorDatasFaltas = datas
          } else if (fimBloqueio === melhorBloqueioFim && melhorDias < 15) {
            melhorDias = 15
            melhorDatasFaltas = datas
            melhorMotivo += ` | ${datas.length} faltas no mês ${mesKey} (${datas.join(', ')})`
          }
        }
      }
    }

    if (melhorBloqueioFim) {
      const bloqueadoAteStr = toDateStr(melhorBloqueioFim)
      upserts.push({
        salao_id: salaoId,
        profissional_nome: nome,
        bloqueado_ate: bloqueadoAteStr,
        dias_bloqueio: melhorDias,
        motivo: melhorMotivo,
        datas_atrasos: melhorDatasAtrasos,
        datas_faltas: melhorDatasFaltas,
        updated_at: new Date().toISOString(),
      })
      log.push(`${nome}: bloqueado até ${bloqueadoAteStr} (${melhorDias}d) — ${melhorMotivo}`)
    }
  }

  if (upserts.length > 0) {
    const { error } = await supabaseAdmin
      .from('feedback_prof_bloqueios')
      .upsert(upserts, { onConflict: 'salao_id,profissional_nome' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    bloqueios_gerados: upserts.length,
    data_referencia: todayStr,
    detalhes: log,
  })
}
