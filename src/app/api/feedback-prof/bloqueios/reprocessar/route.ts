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

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDateBR(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

export async function POST() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const salaoId = payload.salaoId
  const todayStr = toDateStr(new Date())

  // Busca formulários do salão para garantir escopo correto
  const { data: forms } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id')
    .eq('salao_id', salaoId)

  const formIds = (forms || []).map(f => f.id)
  if (formIds.length === 0)
    return NextResponse.json({ ok: true, bloqueios_gerados: 0, mensagem: 'Nenhum formulário encontrado.' })

  // Busca TODOS os feedbacks negativos de ATRASO e FALTA via formulario_id
  const { data: respostas, error: errResp } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('profissional_nome, ocorrido_descricao, criado_em')
    .in('formulario_id', formIds)
    .eq('tipo', 'negativo')
    .in('ocorrido_descricao', ['ATRASO', 'FALTA'])
    .order('criado_em', { ascending: true })

  if (errResp) return NextResponse.json({ error: errResp.message }, { status: 500 })

  if (!respostas || respostas.length === 0)
    return NextResponse.json({
      ok: true, bloqueios_gerados: 0,
      mensagem: 'Nenhum atraso/falta encontrado.',
      debug: { formIds, total_respostas: 0 }
    })

  // Mostra amostra para debug
  const amostra = respostas.slice(0, 5).map(r => ({
    nome: r.profissional_nome,
    ocorrencia: r.ocorrido_descricao,
    tipo: r.tipo,
    data: r.criado_em,
  }))

  // Agrupa por profissional → semana (ATRASO) e mês (FALTA)
  // Cada entrada guarda as datas dos eventos
  type Ocorrencia = { dataBR: string; dateStr: string }

  const atrasosPorProfSemana: Record<string, Record<string, Ocorrencia[]>> = {}
  const faltasPorProfMes: Record<string, Record<string, Ocorrencia[]>> = {}

  for (const r of respostas) {
    const nome = r.profissional_nome
    const data = new Date(r.criado_em)
    const dataBR = formatDateBR(data)
    const dateStr = toDateStr(data)

    if (r.ocorrido_descricao === 'ATRASO') {
      const semana = getISOWeekKey(data)
      if (!atrasosPorProfSemana[nome]) atrasosPorProfSemana[nome] = {}
      if (!atrasosPorProfSemana[nome][semana]) atrasosPorProfSemana[nome][semana] = []
      atrasosPorProfSemana[nome][semana].push({ dataBR, dateStr })
    } else if (r.ocorrido_descricao === 'FALTA') {
      const mes = getMonthKey(data)
      if (!faltasPorProfMes[nome]) faltasPorProfMes[nome] = {}
      if (!faltasPorProfMes[nome][mes]) faltasPorProfMes[nome][mes] = []
      faltasPorProfMes[nome][mes].push({ dataBR, dateStr })
    }
  }

  const todosProfs = Array.from(new Set([
    ...Object.keys(atrasosPorProfSemana),
    ...Object.keys(faltasPorProfMes),
  ]))

  const upserts: object[] = []
  const log: string[] = []

  for (const nome of todosProfs) {
    let melhorFimStr: string | null = null
    let melhorDias = 0
    let melhorMotivo = ''
    let melhorDatasAtrasos: string[] = []
    let melhorDatasFaltas: string[] = []

    // Analisa cada semana com atrasos
    const semanas = atrasosPorProfSemana[nome] || {}
    for (const [semanaKey, ocorrs] of Object.entries(semanas)) {
      if (ocorrs.length >= 3) {
        // Fim do bloqueio = data do 3º atraso + 7 dias
        const dataGatilho = ocorrs[2].dateStr // 3º atraso (índice 2)
        const fimStr = addDays(dataGatilho, 7)

        if (fimStr >= todayStr) {
          if (!melhorFimStr || fimStr > melhorFimStr) {
            melhorFimStr = fimStr
            melhorDias = 7
            melhorMotivo = `${ocorrs.length} atrasos na semana ${semanaKey} (${ocorrs.map(o => o.dataBR).join(', ')})`
            melhorDatasAtrasos = ocorrs.map(o => o.dataBR)
          }
        }
      }
    }

    // Analisa cada mês com faltas
    const meses = faltasPorProfMes[nome] || {}
    for (const [mesKey, ocorrs] of Object.entries(meses)) {
      if (ocorrs.length >= 2) {
        // Fim do bloqueio = data da 2ª falta + 15 dias
        const dataGatilho = ocorrs[1].dateStr // 2ª falta (índice 1)
        const fimStr = addDays(dataGatilho, 15)

        if (fimStr >= todayStr) {
          if (!melhorFimStr || fimStr > melhorFimStr) {
            // bloqueio de falta é maior, sobrescreve
            const motivoFaltas = `${ocorrs.length} faltas no mês ${mesKey} (${ocorrs.map(o => o.dataBR).join(', ')})`
            melhorFimStr = fimStr
            melhorDias = 15
            melhorMotivo = melhorDatasAtrasos.length > 0 ? melhorMotivo + ' | ' + motivoFaltas : motivoFaltas
            melhorDatasFaltas = ocorrs.map(o => o.dataBR)
          }
        }
      }
    }

    if (melhorFimStr) {
      upserts.push({
        salao_id: salaoId,
        profissional_nome: nome,
        bloqueado_ate: melhorFimStr,
        dias_bloqueio: melhorDias,
        motivo: melhorMotivo,
        datas_atrasos: melhorDatasAtrasos,
        datas_faltas: melhorDatasFaltas,
        updated_at: new Date().toISOString(),
      })
      log.push(`${nome}: bloqueado até ${melhorFimStr} (${melhorDias}d) — ${melhorMotivo}`)
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
    debug: { formIds, total_respostas: respostas.length, amostra },
  })
}
