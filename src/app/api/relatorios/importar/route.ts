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

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { periodos_dados, feedbacks } = body

  // periodos_dados: array de { ano, mes, data_inicio, data_fim, resumo_mensal, faturamento_diario, servicos, produtos, prof_pagamentos, metas }

  if (!periodos_dados?.length) {
    return NextResponse.json({ error: 'Nenhum dado recebido' }, { status: 400 })
  }

  const erros: string[] = []

  // UPSERT por período — SOBRESCREVE O MÊS INTEIRO
  for (const p of periodos_dados) {
    const { error } = await supabaseAdmin
      .from('relatorio_periodos')
      .upsert({
        salao_id:          salaoId,
        ano:               p.ano,
        mes:               p.mes,
        data_inicio:       p.data_inicio || '',
        data_fim:          p.data_fim || '',
        resumo_mensal:     p.resumo_mensal || [],
        faturamento_diario: p.faturamento_diario || [],
        servicos:          p.servicos || [],
        produtos:          p.produtos || [],
        prof_pagamentos:   p.prof_pagamentos || [],
        metas:             p.metas || [],
        atualizado_em:     new Date().toISOString(),
      }, { onConflict: 'salao_id,ano,mes' })

    if (error) erros.push(`${p.ano}/${p.mes}: ${error.message}`)
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
