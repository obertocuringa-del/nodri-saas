import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

function safeNum(v: any): number { const n = Number(v); return isNaN(n) ? 0 : n }
function safeStr(v: any): string { if (v === null || v === undefined) return ''; return String(v).trim() }
function sheetToArray(wb: XLSX.WorkBook, name: string): any[] {
  const ws = wb.Sheets[name]; if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { defval: null })
}

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('arquivo') as File
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: true })

    const periodos      = sheetToArray(wb, 'PERIODOS')
    const resumo        = sheetToArray(wb, 'RESUMO_MENSAL')
    const fatDiario     = sheetToArray(wb, 'FATURAMENTO_DIARIO')
    const servicos      = sheetToArray(wb, 'SERVICOS')
    const produtos      = sheetToArray(wb, 'PRODUTOS')
    const profPag       = sheetToArray(wb, 'PROF_PAGAMENTOS')
    const profTicket    = sheetToArray(wb, 'PROF_TICKET')
    const profPref      = sheetToArray(wb, 'PROF_PREFERENCIA')
    const profOcup      = sheetToArray(wb, 'PROF_OCUPACAO')
    const profServicos  = sheetToArray(wb, 'PROF_SERVICOS')
    const profProdutos  = sheetToArray(wb, 'PROF_PRODUTOS')
    const metas         = sheetToArray(wb, 'METAS')
    const feedbacks     = sheetToArray(wb, 'FEEDBACK')

    function agrupar(rows: any[], cols: string[], profCol = 'profissional') {
      const m: Record<string, any[]> = {}
      for (const r of rows) {
        const k = `${parseInt(r.ano)}-${parseInt(r.mes)}`
        if (!m[k]) m[k] = []
        const item: any = {}
        if (profCol && r[profCol] !== undefined) item[profCol] = safeStr(r[profCol])
        for (const c of cols) if (r[c] !== undefined) item[c] = r[c]
        m[k].push(item)
      }
      return m
    }

    const grpPag   = agrupar(profPag,      ['categoria','valor_a_pagar','desconto'])
    const grpTick  = agrupar(profTicket,   ['ticket_medio'])
    const grpPref  = agrupar(profPref,     ['clientes_preferencia','clientes_sem_preferencia'])
    const grpOcup  = agrupar(profOcup,     ['dias_trabalhados','taxa_ocupacao'])
    const grpServ  = agrupar(profServicos, ['servico','quantidade','valor'])
    const grpProd  = agrupar(profProdutos, ['quantidade'])
    const grpRes   = agrupar(resumo,       ['periodo','faturamento_total','ticket_medio','clientes_atendidos','clientes_novos','faturamento_servicos','faturamento_produtos'], '')
    const grpFatD  = agrupar(fatDiario,    ['data','dia_semana','valor'], '')
    const grpSvc   = agrupar(servicos,     ['servico','quantidade'], '')
    const grpProd2 = agrupar(produtos,     ['produto','quantidade'], '')
    const grpMeta  = agrupar(metas,        ['meta_faturamento','meta_clientes'], '')

    let salvos = 0
    let salvosExtras = 0
    const erros: string[] = []

    for (const per of periodos) {
      const chave = `${parseInt(per.ano)}-${parseInt(per.mes)}`

      const anoNum = safeNum(per.ano)
      const mesNum = safeNum(per.mes)

      // Delete + Insert (garante sobrescrita total, evita problema de upsert/update em rows antigas)
      const { error: eDel } = await supabaseAdmin
        .from('relatorio_periodos')
        .delete()
        .eq('salao_id', salaoId)
        .eq('ano', anoNum)
        .eq('mes', mesNum)

      if (eDel) { erros.push(`delete ${per.ano}/${per.mes}: ${eDel.message}`); continue }

      const { error: eIns } = await supabaseAdmin
        .from('relatorio_periodos')
        .insert({
          salao_id:           salaoId,
          ano:                anoNum,
          mes:                mesNum,
          data_inicio:        safeStr(per.data_inicio),
          data_fim:           safeStr(per.data_fim),
          resumo_mensal:      grpRes[chave]   || [],
          faturamento_diario: grpFatD[chave]  || [],
          servicos:           grpSvc[chave]   || [],
          produtos:           grpProd2[chave] || [],
          prof_pagamentos:    grpPag[chave]   || [],
          metas:              grpMeta[chave]  || [],
          prof_ticket:        grpTick[chave]  || [],
          prof_preferencia:   grpPref[chave]  || [],
          prof_ocupacao:      grpOcup[chave]  || [],
          prof_servicos:      grpServ[chave]  || [],
          prof_produtos:      grpProd[chave]  || [],
          atualizado_em:      new Date().toISOString(),
        })

      if (eIns) { erros.push(`insert ${per.ano}/${per.mes}: ${eIns.message}`); continue }

      salvos++
      salvosExtras++
    }

    // Feedbacks
    let feedbacksSalvos = 0
    if (feedbacks.length) {
      const rows = feedbacks.map((f: any) => ({
        salao_id:      salaoId,
        ano:           safeNum(f.ano) || null,
        mes:           safeNum(f.mes) || null,
        profissional:  safeStr(f.profissional),
        tipo:          safeStr(f.tipo),
        oque_houve:    safeStr(f.oque_houve),
        comentario:    safeStr(f.comentario),
        data_feedback: safeStr(f.data),
      }))
      const { error: ef } = await supabaseAdmin
        .from('relatorio_feedbacks')
        .upsert(rows, { onConflict: 'salao_id,profissional,data_feedback,tipo,oque_houve', ignoreDuplicates: true })
      if (!ef) feedbacksSalvos = rows.length
    }

    return NextResponse.json({
      ok: true,
      periodos_salvos: salvos,
      periodos_com_metricas_extras: salvosExtras,
      feedbacks_salvos: feedbacksSalvos,
      total_periodos: periodos.length,
      erros: erros.length ? erros : undefined,
      diagnostico: {
        chaves_ticket: Object.keys(grpTick),
        chaves_pref: Object.keys(grpPref),
        chaves_ocup: Object.keys(grpOcup),
        chaves_pag: Object.keys(grpPag),
        ticket_junho: (grpTick['2026-6'] || []).length,
        pref_junho: (grpPref['2026-6'] || []).length,
        ocup_junho: (grpOcup['2026-6'] || []).length,
        ticket_amostra: (grpTick['2026-6'] || []).slice(0,2),
        abas_lidas: { profTicket: profTicket.length, profPref: profPref.length, profOcup: profOcup.length },
      },
    })

  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
