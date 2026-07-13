import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

export async function POST(req: NextRequest) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { periodos_dados, feedbacks } = body

  // periodos_dados: array de { ano, mes, data_inicio, data_fim, resumo_mensal, faturamento_diario, servicos, produtos, prof_pagamentos, metas }

  if (!periodos_dados?.length) {
    return NextResponse.json({ error: 'Nenhum dado recebido' }, { status: 400 })
  }

  const erros: string[] = []

  // DELETE + INSERT por período — garante sobrescrita total
  for (const p of periodos_dados) {
    const { error: eDel } = await supabaseAdmin
      .from('relatorio_periodos')
      .delete()
      .eq('salao_id', salaoId)
      .eq('ano', p.ano)
      .eq('mes', p.mes)

    if (eDel) { erros.push(`delete ${p.ano}/${p.mes}: ${eDel.message}`); continue }

    const { error: eIns } = await supabaseAdmin
      .from('relatorio_periodos')
      .insert({
        salao_id:           salaoId,
        ano:                p.ano,
        mes:                p.mes,
        data_inicio:        p.data_inicio || '',
        data_fim:           p.data_fim || '',
        resumo_mensal:      p.resumo_mensal      || [],
        faturamento_diario: p.faturamento_diario || [],
        servicos:           p.servicos           || [],
        produtos:           p.produtos           || [],
        prof_pagamentos:    p.prof_pagamentos    || [],
        metas:              p.metas              || [],
        prof_ticket:        p.prof_ticket        || [],
        prof_preferencia:   p.prof_preferencia   || [],
        prof_ocupacao:      p.prof_ocupacao      || [],
        prof_servicos:      p.prof_servicos      || [],
        prof_produtos:      p.prof_produtos      || [],
        atualizado_em:      new Date().toISOString(),
      })

    if (eIns) erros.push(`insert ${p.ano}/${p.mes}: ${eIns.message}`)
  }

  // Feedbacks: INSERT IGNORE duplicatas (UNIQUE constraint)
  if (feedbacks?.length) {
    const rows = feedbacks.map((f: any) => ({
      salao_id:     salaoId,
      ano:          f.ano || null,
      mes:          f.mes || null,
      profissional: f.profissional || '',
      tipo:         f.tipo || '',
      oque_houve:   f.oque_houve || '',
      comentario:   f.comentario || '',
      data_feedback: f.data || '',
    }))

    const { error } = await supabaseAdmin
      .from('relatorio_feedbacks')
      .upsert(rows, { onConflict: 'salao_id,profissional,data_feedback,tipo,oque_houve', ignoreDuplicates: true })

    if (error) erros.push(`feedbacks: ${error.message}`)
  }

  if (erros.length) {
    return NextResponse.json({ ok: false, erros }, { status: 500 })
  }

  return NextResponse.json({ ok: true, periodos_salvos: periodos_dados.length })
}
