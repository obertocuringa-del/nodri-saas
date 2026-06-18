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

async function recalcularPerfisClientes(salaoId: string) {
  try {
    const treAnosAtras = new Date()
    treAnosAtras.setFullYear(treAnosAtras.getFullYear() - 3)
    const anoMin = treAnosAtras.getFullYear()

    // Busca todos os registros com paginação ordenada (sem order fixo o Supabase pula registros)
    let rows: any[] = []
    let from = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('atendimentos_raw')
        .select('cliente, servico, total, data_comanda, ano, mes')
        .eq('salao_id', salaoId)
        .gte('ano', anoMin)
        .neq('cliente', '')
        .order('ano').order('mes').order('data_comanda')
        .range(from, from + PAGE - 1)
      if (error || !data || data.length === 0) break
      rows = rows.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }

    if (!rows || rows.length === 0) return

    const hoje = new Date()
    const perfis: Record<string, any> = {}
    const resumoMensal: Record<string, any> = {}

    for (const r of rows) {
      const nome = (r.cliente || '').trim()
      if (!nome || nome === 'nan') continue

      // Perfil lifetime
      if (!perfis[nome]) {
        perfis[nome] = { ltv: 0, visitas: 0, datas: [], servicos: new Set(), primeira: null, ultima: null }
      }
      const p = perfis[nome]
      p.ltv += Number(r.total || 0)
      // Conta visitas únicas por dia (cliente no salão = 1 visita por data)
      if (!p.dias) p.dias = new Set()
      p.dias.add(r.data_comanda)
      p.visitas = p.dias.size
      if (r.servico) p.servicos.add(r.servico)

      const dataStr = r.data_comanda || `01/${String(r.mes).padStart(2,'0')}/${r.ano}`
      const partes = dataStr.split('/')
      let dataVisita: Date | null = null
      if (partes.length === 3) {
        dataVisita = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`)
        if (!isNaN(dataVisita.getTime())) {
          p.datas.push(dataVisita)
          if (!p.primeira || dataVisita < p.primeira) p.primeira = dataVisita
          if (!p.ultima || dataVisita > p.ultima) p.ultima = dataVisita
        }
      }

      // Resumo mensal
      const chave = `${nome}__${r.ano}__${r.mes}`
      if (!resumoMensal[chave]) {
        resumoMensal[chave] = { cliente_nome: nome, ano: r.ano, mes: r.mes, visitas: 0, gasto: 0, servicos: [] }
      }
      resumoMensal[chave].visitas += 1
      resumoMensal[chave].gasto += Number(r.total || 0)
      if (r.servico && !resumoMensal[chave].servicos.includes(r.servico)) {
        resumoMensal[chave].servicos.push(r.servico)
      }
    }

    // Calcular intervalo médio e score RFM
    const perfisParaSalvar = Object.entries(perfis).map(([nome, p]: [string, any]) => {
      const datas = p.datas.sort((a: Date, b: Date) => a.getTime() - b.getTime())
      let intervaloMedio = 0
      if (datas.length >= 2) {
        const intervalos = []
        for (let i = 1; i < datas.length; i++) {
          intervalos.push((datas[i].getTime() - datas[i-1].getTime()) / (1000*60*60*24))
        }
        intervaloMedio = Math.round(intervalos.reduce((s: number, v: number) => s + v, 0) / intervalos.length)
      }

      const diasUltima = p.ultima
        ? Math.round((hoje.getTime() - p.ultima.getTime()) / (1000*60*60*24))
        : 999

      // Score RFM
      const isVip = p.visitas >= 10 && p.ltv >= 1000
      // Limiar mínimo: VIP precisa de 30 dias ausente para ser risco, outros usam 2x o intervalo
      const limiarRisco  = isVip ? Math.max(intervaloMedio * 2, 45) : Math.max(intervaloMedio * 2, 30)
      const limiarPerdido = isVip ? Math.max(intervaloMedio * 4, 90) : Math.max(intervaloMedio * 3.5, 60)

      let status = 'ativo'
      let scoreRfm = isVip ? 'vip' : 'regular'

      if (diasUltima > limiarRisco) {
        status = 'risco'
        if (!isVip) scoreRfm = 'em_risco'
      }
      if (diasUltima > limiarPerdido) {
        status = 'perdido'
        scoreRfm = isVip ? 'vip' : 'perdido'
      }
      if (p.visitas <= 1) { scoreRfm = 'novo'; status = 'ativo' }

      return {
        salao_id: salaoId,
        cliente_nome: nome,
        ltv_total: Math.round(p.ltv * 100) / 100,
        total_visitas: p.visitas,
        primeira_visita: p.primeira ? p.primeira.toISOString().split('T')[0] : null,
        ultima_visita: p.ultima ? p.ultima.toISOString().split('T')[0] : null,
        intervalo_medio_dias: intervaloMedio,
        servicos_feitos: Array.from(p.servicos),
        score_rfm: scoreRfm,
        status,
        dias_desde_ultima_visita: diasUltima,
        atualizado_em: new Date().toISOString(),
      }
    })

    // Salvar perfis (upsert)
    const CHUNK = 200
    for (let i = 0; i < perfisParaSalvar.length; i += CHUNK) {
      await supabaseAdmin.from('clientes_perfil')
        .upsert(perfisParaSalvar.slice(i, i + CHUNK), { onConflict: 'salao_id,cliente_nome' })
    }

    // Salvar resumo mensal
    const resumoArray = Object.values(resumoMensal).map((r: any) => ({
      salao_id: salaoId,
      cliente_nome: r.cliente_nome,
      ano: r.ano,
      mes: r.mes,
      visitas: r.visitas,
      gasto_total: Math.round(r.gasto * 100) / 100,
      servicos: r.servicos,
    }))
    for (let i = 0; i < resumoArray.length; i += CHUNK) {
      await supabaseAdmin.from('clientes_resumo_mensal')
        .upsert(resumoArray.slice(i, i + CHUNK), { onConflict: 'salao_id,cliente_nome,ano,mes' })
    }
  } catch (e) {
    console.error('Erro ao recalcular perfis clientes:', e)
  }
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

    const periodos          = sheetToArray(wb, 'PERIODOS')
    const resumo            = sheetToArray(wb, 'RESUMO_MENSAL')
    const fatDiario         = sheetToArray(wb, 'FATURAMENTO_DIARIO')
    const servicos          = sheetToArray(wb, 'SERVICOS')
    const produtos          = sheetToArray(wb, 'PRODUTOS')
    const profPag           = sheetToArray(wb, 'PROF_PAGAMENTOS')
    const profTicket        = sheetToArray(wb, 'PROF_TICKET')
    const profPref          = sheetToArray(wb, 'PROF_PREFERENCIA')
    const profOcup          = sheetToArray(wb, 'PROF_OCUPACAO')
    const profServicos      = sheetToArray(wb, 'PROF_SERVICOS')
    const profProdutos      = sheetToArray(wb, 'PROF_PRODUTOS')
    const metas             = sheetToArray(wb, 'METAS')
    const feedbacks         = sheetToArray(wb, 'FEEDBACK')
    const atendimentosRaw   = sheetToArray(wb, 'ATENDIMENTOS_RAW')

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

      // Busca o que já existe no banco para preservar campos não enviados
      const { data: existente } = await supabaseAdmin
        .from('relatorio_periodos')
        .select('*')
        .eq('salao_id', salaoId)
        .eq('ano', anoNum)
        .eq('mes', mesNum)
        .maybeSingle()

      // Só sobrescreve um campo se o Excel trouxe dados (array não vazio)
      const merge = (novoArr: any[], campoExistente: any) =>
        (novoArr && novoArr.length > 0) ? novoArr : (campoExistente || [])

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
      salvosExtras++
    }

    // ── ATENDIMENTOS_RAW ────────────────────────────────────────────────────
    let rawSalvos = 0
    if (atendimentosRaw.length > 0) {
      // Agrupa por salao+ano+mes para delete+insert eficiente
      const periodoRaw = new Set(atendimentosRaw.map((r: any) => `${safeNum(r.ano)}-${safeNum(r.mes)}`))
      for (const chave of periodoRaw) {
        const [anoS, mesS] = chave.split('-')
        await supabaseAdmin.from('atendimentos_raw')
          .delete().eq('salao_id', salaoId).eq('ano', parseInt(anoS)).eq('mes', parseInt(mesS))
      }

      const CHUNK = 500
      for (let i = 0; i < atendimentosRaw.length; i += CHUNK) {
        const chunk = atendimentosRaw.slice(i, i + CHUNK).map((r: any) => ({
          salao_id:     salaoId,
          ano:          safeNum(r.ano),
          mes:          safeNum(r.mes),
          profissional: safeStr(r.profissional),
          data_comanda: safeStr(r.data_comanda),
          dia_semana:   safeStr(r.dia_semana),
          num_comanda:  safeStr(r.num_comanda),
          servico:      safeStr(r.servico),
          categoria:    safeStr(r.categoria),
          cliente:      safeStr(r.cliente),
          cpf:          safeStr(r.cpf),
          telefone:     safeStr(r.telefone),
          celular:      safeStr(r.celular),
          qtd:          safeNum(r.qtd),
          valor:        safeNum(r.valor),
          desconto:     safeNum(r.desconto),
          total:        safeNum(r.total),
          pacote:       safeStr(r.pacote),
        }))
        await supabaseAdmin.from('atendimentos_raw').insert(chunk)
        rawSalvos += chunk.length
      }

      // Recalcular perfil de clientes a partir dos dados acumulados
      await recalcularPerfisClientes(salaoId)
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
      atendimentos_raw_salvos: rawSalvos,
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
        profTicket_row0: profTicket[0] ? JSON.parse(JSON.stringify(profTicket[0])) : null,
        profPag_row0: profPag[0] ? JSON.parse(JSON.stringify(profPag[0])) : null,
        profTicket_keys: profTicket[0] ? Object.keys(profTicket[0]) : [],
        profPag_keys: profPag[0] ? Object.keys(profPag[0]) : [],
        todas_chaves_ticket: Object.keys(grpTick),
      },
    })

  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
