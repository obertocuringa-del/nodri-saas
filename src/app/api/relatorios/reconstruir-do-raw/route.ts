import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  const salaoId = payload?.salaoId
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    // Busca todos os atendimentos raw com paginação (Supabase limita 1000 por request)
    let rows: any[] = []
    let from = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('atendimentos_raw')
        .select('*')
        .eq('salao_id', salaoId)
        .order('ano').order('mes').order('data_comanda')
        .range(from, from + PAGE - 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) break
      rows = rows.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }

    if (rows.length === 0) return NextResponse.json({ error: 'Nenhum atendimento raw encontrado' }, { status: 404 })

    // Agrupa por ano+mes
    const meses: Record<string, typeof rows> = {}
    for (const r of rows) {
      const k = `${r.ano}-${r.mes}`
      if (!meses[k]) meses[k] = []
      meses[k].push(r)
    }

    const resultados: any[] = []

    for (const [chave, atend] of Object.entries(meses)) {
      const [anoS, mesS] = chave.split('-')
      const ano = parseInt(anoS)
      const mes = parseInt(mesS)

      // ── Resumo mensal ───────────────────────────────────────────────
      const faturamentoTotal = atend.reduce((s, r) => s + Number(r.total || 0), 0)
      const comandas = new Set(atend.map(r => `${r.profissional}-${r.num_comanda}-${r.data_comanda}`))
      const clientesSet = new Set(atend.map(r => (r.cliente || '').trim()).filter(Boolean))
      const totalAtendimentos = comandas.size
      const ticketMedio = totalAtendimentos > 0 ? faturamentoTotal / totalAtendimentos : 0

      const resumo_mensal = [{
        periodo: `${String(mes).padStart(2,'0')}/${ano}`,
        faturamento_total: Math.round(faturamentoTotal * 100) / 100,
        ticket_medio: Math.round(ticketMedio * 100) / 100,
        clientes_atendidos: clientesSet.size,
        clientes_novos: 0,
        faturamento_servicos: Math.round(faturamentoTotal * 100) / 100,
        faturamento_produtos: 0,
      }]

      // ── Faturamento diário ──────────────────────────────────────────
      const fatPorDia: Record<string, { valor: number; dia_semana: string }> = {}
      for (const r of atend) {
        const data = r.data_comanda || ''
        if (!data) continue
        if (!fatPorDia[data]) fatPorDia[data] = { valor: 0, dia_semana: r.dia_semana || '' }
        fatPorDia[data].valor += Number(r.total || 0)
      }
      const faturamento_diario = Object.entries(fatPorDia).map(([data, v]) => ({
        data,
        dia_semana: v.dia_semana,
        valor: Math.round(v.valor * 100) / 100,
      })).sort((a, b) => a.data.localeCompare(b.data))

      // ── Serviços do salão ───────────────────────────────────────────
      const svcMap: Record<string, number> = {}
      for (const r of atend) {
        const svc = (r.servico || '').trim()
        if (!svc) continue
        svcMap[svc] = (svcMap[svc] || 0) + Number(r.qtd || 1)
      }
      const servicos = Object.entries(svcMap).map(([servico, quantidade]) => ({ servico, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)

      // ── Serviços por profissional ───────────────────────────────────
      const profSvcMap: Record<string, Record<string, { quantidade: number; valor: number }>> = {}
      for (const r of atend) {
        const prof = (r.profissional || '').trim()
        const svc = (r.servico || '').trim()
        if (!prof || !svc) continue
        if (!profSvcMap[prof]) profSvcMap[prof] = {}
        if (!profSvcMap[prof][svc]) profSvcMap[prof][svc] = { quantidade: 0, valor: 0 }
        profSvcMap[prof][svc].quantidade += Number(r.qtd || 1)
        profSvcMap[prof][svc].valor += Number(r.total || 0)
      }
      const prof_servicos: any[] = []
      for (const [prof, svcs] of Object.entries(profSvcMap)) {
        for (const [svc, dados] of Object.entries(svcs)) {
          prof_servicos.push({
            profissional: prof,
            servico: svc,
            quantidade: dados.quantidade,
            valor: Math.round(dados.valor * 100) / 100,
          })
        }
      }

      // ── Busca o registro atual para preservar campos do Excel ──
      const { data: atual } = await supabaseAdmin
        .from('relatorio_periodos')
        .select('prof_pagamentos, prof_ticket, prof_preferencia, prof_ocupacao, prof_produtos, metas, data_inicio, data_fim, resumo_mensal, produtos, faturamento_diario')
        .eq('salao_id', salaoId)
        .eq('ano', ano)
        .eq('mes', mes)
        .maybeSingle()

      // ── RESUMO MENSAL: o Excel (0083/0088) é a FONTE OFICIAL ──
      // O raw (0031) só tem serviços e subconta (sem produtos, comandas diferentes).
      // Então, se o Excel já trouxe o resumo mensal, preserva ele INTEIRO
      // (total, ticket, clientes, serviços, produtos) e só reconstrói os
      // detalhamentos que o Excel não tem (lista de serviços, prof_servicos).
      const resumoAtual = (atual?.resumo_mensal || []) as Array<any>
      const fatTotalExcel = resumoAtual.reduce((s: number, r: any) => s + Number(r.faturamento_total || 0), 0)
      const temResumoExcel = resumoAtual.length > 0 && fatTotalExcel > 0

      const resumo_final = temResumoExcel ? resumoAtual : resumo_mensal

      // Faturamento diário: preserva o do Excel (0088, já inclui produtos por dia).
      // Só usa o reconstruído (apenas serviços) quando o Excel não trouxe o diário.
      const fatDiarioExcel = (atual?.faturamento_diario || []) as Array<any>
      const faturamento_diario_final = fatDiarioExcel.length > 0 ? fatDiarioExcel : faturamento_diario

      // ── Upsert com dados reconstruídos ──────────────────────────────
      const { error: eUp } = await supabaseAdmin
        .from('relatorio_periodos')
        .upsert({
          salao_id:           salaoId,
          ano,
          mes,
          data_inicio:        atual?.data_inicio || `01/${String(mes).padStart(2,'0')}/${ano}`,
          data_fim:           atual?.data_fim || '',
          resumo_mensal:       resumo_final,
          faturamento_diario:  faturamento_diario_final,
          servicos,
          produtos:           atual?.produtos || [],
          prof_servicos,
          prof_pagamentos:    atual?.prof_pagamentos || [],
          prof_ticket:        atual?.prof_ticket || [],
          prof_preferencia:   atual?.prof_preferencia || [],
          prof_ocupacao:      atual?.prof_ocupacao || [],
          prof_produtos:      atual?.prof_produtos || [],
          metas:              atual?.metas || [],
          atualizado_em:      new Date().toISOString(),
        }, { onConflict: 'salao_id,ano,mes' })

      if (eUp) {
        resultados.push({ chave, erro: eUp.message })
      } else {
        resultados.push({
          chave,
          atendimentos: atend.length,
          faturamento: Math.round(faturamentoTotal * 2) / 2,
          clientes: clientesSet.size,
          servicos_distintos: servicos.length,
          dias_com_movimento: faturamento_diario.length,
        })
      }
    }

    return NextResponse.json({
      ok: true,
      meses_reconstruidos: resultados.filter(r => !r.erro).length,
      erros: resultados.filter(r => r.erro),
      detalhes: resultados,
    })

  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
