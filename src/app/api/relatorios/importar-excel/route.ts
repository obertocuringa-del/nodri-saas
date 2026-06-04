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

function safeNum(v: any): number {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function safeStr(v: any): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function sheetToArray(wb: XLSX.WorkBook, name: string): any[] {
  const ws = wb.Sheets[name]
  if (!ws) return []
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
    const wb = XLSX.read(buffer, { type: 'buffer' })

    // ── Ler todas as abas ──
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

    // ── Agrupar por período ──
    function agrupar(rows: any[], cols: string[], profCol = 'profissional') {
      const m: Record<string, any[]> = {}
      for (const r of rows) {
        const k = `${r.ano}-${r.mes}`
        if (!m[k]) m[k] = []
        const item: any = {}
        if (profCol && r[profCol] !== undefined) item[profCol] = safeStr(r[profCol])
        for (const c of cols) item[c] = r[c] !== null ? r[c] : undefined
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
    const grpRes   = agrupar(resumo,       ['faturamento_total','ticket_medio','clientes_atendidos','clientes_novos'], '')
    const grpFatD  = agrupar(fatDiario,    ['data','dia_semana','valor'], '')
    const grpSvc   = agrupar(servicos,     ['servico','quantidade'], '')
    const grpProd2 = agrupar(produtos,     ['produto','quantidade'], '')
    const grpMeta  = agrupar(metas,        ['meta_faturamento','meta_clientes'], '')

    // ── Processar cada período ──
    const erros: string[] = []
    let salvos = 0

    for (const per of periodos) {
      const chave = `${per.ano}-${per.mes}`
      const { error } = await supabaseAdmin
        .from('relatorio_periodos')
        .upsert({
          salao_id:          salaoId,
          ano:               safeNum(per.ano),
          mes:               safeNum(per.mes),
          data_inicio:       safeStr(per.data_inicio),
          data_fim:          safeStr(per.data_fim),
          resumo_mensal:     grpRes[chave]   || [],
          faturamento_diario: grpFatD[chave] || [],
          servicos:          grpSvc[chave]   || [],
          produtos:          grpProd2[chave] || [],
          prof_pagamentos:   grpPag[chave]   || [],
          prof_ticket:       grpTick[chave]  || [],
          prof_preferencia:  grpPref[chave]  || [],
          prof_ocupacao:     grpOcup[chave]  || [],
          prof_servicos:     grpServ[chave]  || [],
          prof_produtos:     grpProd[chave]  || [],
          metas:             grpMeta[chave]  || [],
          atualizado_em:     new Date().toISOString(),
        }, { onConflict: 'salao_id,ano,mes' })

      if (error) erros.push(`${per.ano}/${per.mes}: ${error.message}`)
      else salvos++
    }

    // ── Feedbacks ──
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
      const { error } = await supabaseAdmin
        .from('relatorio_feedbacks')
        .upsert(rows, { onConflict: 'salao_id,profissional,data_feedback,tipo,oque_houve', ignoreDuplicates: true })
      if (error) erros.push(`feedbacks: ${error.message}`)
      else feedbacksSalvos = rows.length
    }

    return NextResponse.json({
      ok: true,
      periodos_salvos: salvos,
      feedbacks_salvos: feedbacksSalvos,
      total_periodos: periodos.length,
      erros: erros.length ? erros : undefined,
    })

  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
