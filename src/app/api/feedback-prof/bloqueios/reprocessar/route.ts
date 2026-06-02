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

  // Busca regras do salão (ou usa padrão)
  const { data: regrasDb } = await supabaseAdmin
    .from('feedback_prof_regras')
    .select('*')
    .eq('salao_id', salaoId)
    .single()
  const regras = {
    atrasos_por_semana: regrasDb?.atrasos_por_semana ?? 3,
    dias_bloqueio_atraso: regrasDb?.dias_bloqueio_atraso ?? 7,
    faltas_por_mes: regrasDb?.faltas_por_mes ?? 2,
    dias_bloqueio_falta: regrasDb?.dias_bloqueio_falta ?? 15,
  }

  // Busca regras customizadas ativas
  const { data: regrasCustomDb } = await supabaseAdmin
    .from('feedback_prof_regras_custom')
    .select('*')
    .eq('salao_id', salaoId)
    .eq('ativo', true)
  const regrasCustom = regrasCustomDb || []

  // Busca formulários do salão para garantir escopo correto
  const { data: forms } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id')
    .eq('salao_id', salaoId)

  const formIds = (forms || []).map(f => f.id)
  if (formIds.length === 0)
    return NextResponse.json({ ok: true, bloqueios_gerados: 0, mensagem: 'Nenhum formulário encontrado.' })

  // Busca TODOS os registros via paginação (Supabase limita 1000 por request)
  const respostas: { profissional_nome: string; ocorrido_descricao: string; criado_em: string }[] = []
  const PAGE = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('feedback_prof_respostas')
      .select('profissional_nome, ocorrido_descricao, criado_em')
      .in('formulario_id', formIds)
      .eq('tipo', 'negativo')
      .in('ocorrido_descricao', ['ATRASO', 'FALTA', ...regrasCustom.map(r => r.ocorrencia)])
      .order('criado_em', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    respostas.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  if (!respostas || respostas.length === 0)
    return NextResponse.json({
      ok: true, bloqueios_gerados: 0,
      mensagem: 'Nenhum atraso/falta encontrado.',
      debug: { formIds, total_respostas: 0 }
    })

  // Debug específico: mostra registros de SUELEN
  const debugSuelen = respostas
    .filter(r => r.profissional_nome.toUpperCase().includes('SUEL'))
    .map(r => ({ nome: r.profissional_nome, ocorrencia: r.ocorrido_descricao, data: r.criado_em }))

  // Mostra amostra para debug
  const amostra = respostas.slice(0, 5).map(r => ({
    nome: r.profissional_nome,
    ocorrencia: r.ocorrido_descricao,
    data: r.criado_em,
  }))

  // Agrupa por profissional → semana (ATRASO) e mês (FALTA)
  // Cada entrada guarda as datas dos eventos
  type Ocorrencia = { dataBR: string; dateStr: string }

  const atrasosPorProfSemana: Record<string, Record<string, Ocorrencia[]>> = {}
  const faltasPorProfMes: Record<string, Record<string, Ocorrencia[]>> = {}
  // customPorProf[profNome][regraId][periodoKey] = ocorrencias[]
  const customPorProf: Record<string, Record<string, Record<string, Ocorrencia[]>>> = {}

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
    // Regras custom: agrupa por ocorrência → semana ou mês
    for (const rc of regrasCustom) {
      // se a regra é para um profissional específico, ignora os demais
      if (rc.profissional_nome && rc.profissional_nome !== nome) continue
      if (r.ocorrido_descricao === rc.ocorrencia) {
        if (!customPorProf[nome]) customPorProf[nome] = {}
        if (!customPorProf[nome][rc.id]) customPorProf[nome][rc.id] = {}
        const chave = rc.periodo === 'semana' ? getISOWeekKey(data) : getMonthKey(data)
        if (!customPorProf[nome][rc.id][chave]) customPorProf[nome][rc.id][chave] = []
        customPorProf[nome][rc.id][chave].push({ dataBR, dateStr })
      }
    }
  }

  const todosProfs = Array.from(new Set([
    ...Object.keys(atrasosPorProfSemana),
    ...Object.keys(faltasPorProfMes),
    ...Object.keys(customPorProf),
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
      if (ocorrs.length >= regras.atrasos_por_semana) {
        const dataGatilho = ocorrs[regras.atrasos_por_semana - 1].dateStr
        const fimStr = addDays(dataGatilho, regras.dias_bloqueio_atraso)

        if (fimStr >= todayStr) {
          if (!melhorFimStr || fimStr > melhorFimStr) {
            melhorFimStr = fimStr
            melhorDias = regras.dias_bloqueio_atraso
            melhorMotivo = `${ocorrs.length} atrasos na semana ${semanaKey} (${ocorrs.map(o => o.dataBR).join(', ')})`
            melhorDatasAtrasos = ocorrs.map(o => o.dataBR)
          }
        }
      }
    }

    // Analisa cada mês com faltas
    const meses = faltasPorProfMes[nome] || {}
    for (const [mesKey, ocorrs] of Object.entries(meses)) {
      if (ocorrs.length >= regras.faltas_por_mes) {
        const dataGatilho = ocorrs[regras.faltas_por_mes - 1].dateStr
        const fimStr = addDays(dataGatilho, regras.dias_bloqueio_falta)

        if (fimStr >= todayStr) {
          if (!melhorFimStr || fimStr > melhorFimStr) {
            const motivoFaltas = `${ocorrs.length} faltas no mês ${mesKey} (${ocorrs.map(o => o.dataBR).join(', ')})`
            melhorFimStr = fimStr
            melhorDias = regras.dias_bloqueio_falta
            melhorMotivo = melhorDatasAtrasos.length > 0 ? melhorMotivo + ' | ' + motivoFaltas : motivoFaltas
            melhorDatasFaltas = ocorrs.map(o => o.dataBR)
          }
        }
      }
    }

    // Regras custom
    const customDoProf = customPorProf[nome] || {}
    for (const rc of regrasCustom) {
      const periodos = customDoProf[rc.id] || {}
      for (const [periodoKey, ocorrs] of Object.entries(periodos)) {
        if (ocorrs.length >= rc.quantidade) {
          const dataGatilho = ocorrs[rc.quantidade - 1].dateStr
          const fimStr = addDays(dataGatilho, rc.dias_bloqueio)
          if (fimStr >= todayStr && (!melhorFimStr || fimStr > melhorFimStr)) {
            const motivo = `${ocorrs.length}x "${rc.ocorrencia}" em ${periodoKey} (${ocorrs.map(o => o.dataBR).join(', ')})`
            melhorFimStr = fimStr
            melhorDias = rc.dias_bloqueio
            melhorMotivo = melhorMotivo ? melhorMotivo + ' | ' + motivo : motivo
            if (rc.ocorrencia === 'ATRASO') melhorDatasAtrasos = ocorrs.map(o => o.dataBR)
            else melhorDatasFaltas = ocorrs.map(o => o.dataBR)
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
    debug: { formIds, total_respostas: respostas.length, amostra, debugSuelen },
  })
}
