import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

function safeNum(v: any): number { const n = Number(v); return isNaN(n) ? 0 : n }
function safeStr(v: any): string { if (v === null || v === undefined) return ''; return String(v).trim() }

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

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      periodos, resumo, fatDiario, servicos, produtos, profPag, profTicket,
      profPref, profOcup, profServicos, profProdutos, metas, feedbacks,
    } = body

    const grpPag   = agrupar(profPag || [],      ['categoria','valor_a_pagar','desconto'])
    const grpTick  = agrupar(profTicket || [],   ['ticket_medio'])
    const grpPref  = agrupar(profPref || [],     ['clientes_preferencia','clientes_sem_preferencia'])
    const grpOcup  = agrupar(profOcup || [],     ['dias_trabalhados','taxa_ocupacao'])
    const grpServ  = agrupar(profServicos || [], ['servico','quantidade','valor'])
    const grpProd  = agrupar(profProdutos || [], ['quantidade'])
    const grpRes   = agrupar(resumo || [],       ['periodo','faturamento_total','ticket_medio','clientes_atendidos','clientes_novos','faturamento_servicos','faturamento_produtos'], '')
    const grpFatD  = agrupar(fatDiario || [],    ['data','dia_semana','valor'], '')
    const grpSvc   = agrupar(servicos || [],     ['servico','quantidade'], '')
    const grpProd2 = agrupar(produtos || [],     ['produto','quantidade'], '')
    const grpMeta  = agrupar(metas || [],        ['meta_faturamento','meta_clientes'], '')

    const merge = (novoArr: any[], campoExistente: any) =>
      (novoArr && novoArr.length > 0) ? novoArr : (campoExistente || [])

    let salvos = 0
    const erros: string[] = []

    for (const per of (periodos || [])) {
      const chave = `${parseInt(per.ano)}-${parseInt(per.mes)}`
      const anoNum = safeNum(per.ano)
      const mesNum = safeNum(per.mes)

      const { data: existente } = await supabaseAdmin
        .from('relatorio_periodos')
        .select('*')
        .eq('salao_id', salaoId)
        .eq('ano', anoNum)
        .eq('mes', mesNum)
        .maybeSingle()

      const payload: any = {
        salao_id:           salaoId,
        ano:                anoNum,
        mes:                mesNum,
        data_inicio:        safeStr(per.data_inicio) || existente?.data_inicio || '',
        data_fim:           safeStr(per.data_fim)    || existente?.data_fim    || '',
        resumo_mensal:      merge(grpRes[chave],   existente?.resumo_mensal),
        faturamento_diario: merge(grpFatD[chave],  existente?.faturamento_diario),
        servicos:           merge(grpSvc[chave],   existente?.servicos),
        produtos:           merge(grpProd2[chave], existente?.produtos),
        prof_pagamentos:    merge(grpPag[chave],   existente?.prof_pagamentos),
        metas:              merge(grpMeta[chave],  existente?.metas),
        prof_ticket:        merge(grpTick[chave],  existente?.prof_ticket),
        prof_preferencia:   merge(grpPref[chave],  existente?.prof_preferencia),
        prof_ocupacao:      merge(grpOcup[chave],  existente?.prof_ocupacao),
        prof_servicos:      merge(grpServ[chave],  existente?.prof_servicos),
        prof_produtos:      merge(grpProd[chave],  existente?.prof_produtos),
        atualizado_em:      new Date().toISOString(),
      }

      const { error: eUps } = await supabaseAdmin
        .from('relatorio_periodos')
        .upsert(payload, { onConflict: 'salao_id,ano,mes' })

      if (eUps) { erros.push(`upsert ${per.ano}/${per.mes}: ${eUps.message}`); continue }
      salvos++
    }

    // Feedbacks
    let feedbacksSalvos = 0
    if (feedbacks?.length) {
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
      feedbacks_salvos: feedbacksSalvos,
      total_periodos: (periodos || []).length,
      erros: erros.length ? erros : undefined,
    })

  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
