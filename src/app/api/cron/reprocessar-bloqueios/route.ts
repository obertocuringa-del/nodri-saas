import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Roda diariamente às 03:00 — reprocessa bloqueios de todos os salões
export async function GET() {
  try {
    const todayStr = new Date().toISOString().slice(0, 10)

    // Busca todos os salões ativos
    const { data: saloes, error: errSaloes } = await supabaseAdmin
      .from('saloes')
      .select('id')
      .eq('status', 'ativo')
    if (errSaloes) return NextResponse.json({ error: errSaloes.message }, { status: 500 })

    let totalBloqueios = 0
    const erros: string[] = []

    for (const salao of saloes || []) {
      try {
        const salaoId = salao.id

        // Regras do salão
        const { data: regrasDb } = await supabaseAdmin
          .from('feedback_prof_regras').select('*').eq('salao_id', salaoId).single()
        const regras = {
          atrasos_por_semana: regrasDb?.atrasos_por_semana ?? 3,
          dias_bloqueio_atraso: regrasDb?.dias_bloqueio_atraso ?? 7,
          faltas_por_mes: regrasDb?.faltas_por_mes ?? 2,
          dias_bloqueio_falta: regrasDb?.dias_bloqueio_falta ?? 15,
        }

        // Regras custom
        const { data: regrasCustom } = await supabaseAdmin
          .from('feedback_prof_regras_custom').select('*').eq('salao_id', salaoId).eq('ativo', true)

        // Formulários
        const { data: forms } = await supabaseAdmin
          .from('feedback_prof_formularios').select('id').eq('salao_id', salaoId)
        const formIds = (forms || []).map((f: { id: string }) => f.id)
        if (formIds.length === 0) continue

        // Respostas negativas
        const { data: respostas } = await supabaseAdmin
          .from('feedback_prof_respostas')
          .select('profissional_nome, ocorrido_descricao, criado_em')
          .in('formulario_id', formIds)
          .eq('tipo', 'negativo')
          .in('ocorrido_descricao', ['ATRASO', 'FALTA', ...((regrasCustom || []).map((r: { ocorrencia: string }) => r.ocorrencia))])
          .order('criado_em', { ascending: true })

        if (!respostas || respostas.length === 0) continue

        // Agrupa por profissional
        function getISOWeekKey(date: Date) {
          const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
          const day = d.getUTCDay() || 7
          d.setUTCDate(d.getUTCDate() + 4 - day)
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
          const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
          return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
        }
        function getMonthKey(date: Date) {
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        }
        function addDays(dateStr: string, days: number) {
          const d = new Date(dateStr + 'T12:00:00')
          d.setDate(d.getDate() + days)
          return d.toISOString().slice(0, 10)
        }
        function formatBR(date: Date) {
          return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        }

        type Oc = { dataBR: string; dateStr: string }
        const atrasosSemana: Record<string, Record<string, Oc[]>> = {}
        const faltasMes: Record<string, Record<string, Oc[]>> = {}
        const customProf: Record<string, Record<string, Record<string, Oc[]>>> = {}

        for (const r of respostas) {
          const nome = r.profissional_nome
          const data = new Date(r.criado_em)
          const dataBR = formatBR(data)
          const dateStr = data.toISOString().slice(0, 10)
          const desc = r.ocorrido_descricao

          if (desc === 'ATRASO') {
            const semana = getISOWeekKey(data)
            if (!atrasosSemana[nome]) atrasosSemana[nome] = {}
            if (!atrasosSemana[nome][semana]) atrasosSemana[nome][semana] = []
            atrasosSemana[nome][semana].push({ dataBR, dateStr })
          } else if (desc === 'FALTA') {
            const mes = getMonthKey(data)
            if (!faltasMes[nome]) faltasMes[nome] = {}
            if (!faltasMes[nome][mes]) faltasMes[nome][mes] = []
            faltasMes[nome][mes].push({ dataBR, dateStr })
          }
          for (const rc of regrasCustom || []) {
            if (rc.profissional_nome && rc.profissional_nome !== nome) continue
            if (desc === rc.ocorrencia) {
              if (!customProf[nome]) customProf[nome] = {}
              if (!customProf[nome][rc.id]) customProf[nome][rc.id] = {}
              const chave = rc.periodo === 'semana' ? getISOWeekKey(data) : getMonthKey(data)
              if (!customProf[nome][rc.id][chave]) customProf[nome][rc.id][chave] = []
              customProf[nome][rc.id][chave].push({ dataBR, dateStr })
            }
          }
        }

        const todosProfs = Array.from(new Set([
          ...Object.keys(atrasosSemana), ...Object.keys(faltasMes), ...Object.keys(customProf)
        ]))

        const upserts: object[] = []

        for (const nome of todosProfs) {
          let melhorFimStr: string | null = null
          let melhorDias = 0
          let melhorMotivo = ''
          let melhorDatasAtrasos: string[] = []
          let melhorDatasFaltas: string[] = []

          for (const [semanaKey, ocorrs] of Object.entries(atrasosSemana[nome] || {})) {
            if (ocorrs.length >= regras.atrasos_por_semana) {
              const fimStr = addDays(ocorrs[ocorrs.length - 1].dateStr, regras.dias_bloqueio_atraso)
              if (fimStr >= todayStr && (!melhorFimStr || fimStr > melhorFimStr)) {
                melhorFimStr = fimStr
                melhorDias = regras.dias_bloqueio_atraso
                melhorMotivo = `${ocorrs.length} atrasos semana ${semanaKey} (${ocorrs.map(o => o.dataBR).join(', ')})`
                melhorDatasAtrasos = ocorrs.map(o => o.dataBR)
              }
            }
          }
          for (const [mesKey, ocorrs] of Object.entries(faltasMes[nome] || {})) {
            if (ocorrs.length >= regras.faltas_por_mes) {
              const fimStr = addDays(ocorrs[ocorrs.length - 1].dateStr, regras.dias_bloqueio_falta)
              if (fimStr >= todayStr && (!melhorFimStr || fimStr > melhorFimStr)) {
                const mFaltas = `${ocorrs.length} faltas mês ${mesKey} (${ocorrs.map(o => o.dataBR).join(', ')})`
                melhorFimStr = fimStr
                melhorDias = regras.dias_bloqueio_falta
                melhorMotivo = melhorDatasAtrasos.length > 0 ? melhorMotivo + ' | ' + mFaltas : mFaltas
                melhorDatasFaltas = ocorrs.map(o => o.dataBR)
              }
            }
          }
          for (const rc of regrasCustom || []) {
            for (const [periodoKey, ocorrs] of Object.entries((customProf[nome]?.[rc.id]) || {})) {
              if (ocorrs.length >= rc.quantidade) {
                const fimStr = addDays(ocorrs[ocorrs.length - 1].dateStr, rc.dias_bloqueio)
                if (fimStr >= todayStr && (!melhorFimStr || fimStr > melhorFimStr)) {
                  melhorFimStr = fimStr
                  melhorDias = rc.dias_bloqueio
                  const mCustom = `${ocorrs.length}x "${rc.ocorrencia}" em ${periodoKey} (${ocorrs.map(o => o.dataBR).join(', ')})`
                  melhorMotivo = melhorMotivo ? melhorMotivo + ' | ' + mCustom : mCustom
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
          }
        }

        if (upserts.length > 0) {
          await supabaseAdmin
            .from('feedback_prof_bloqueios')
            .upsert(upserts, { onConflict: 'salao_id,profissional_nome' })
          totalBloqueios += upserts.length
        }
      } catch (e: any) {
        erros.push(`Salão ${salao.id}: ${e.message}`)
      }
    }

    return NextResponse.json({ ok: true, data: todayStr, bloqueios_atualizados: totalBloqueios, erros })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
