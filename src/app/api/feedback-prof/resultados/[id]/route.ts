import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getMes(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const CATEGORIAS_MAP: Record<string, string> = {
  'FALTA': 'Pontualidade',
  'ATRASO': 'Pontualidade',
  'SAÍDA MAIS CEDO': 'Pontualidade',
  'FALTA - JUSTIFICADA PELO GERENTE': 'Pontualidade',
  'ATRASO - JUSTIFICADA PELO GERENTE': 'Pontualidade',
  'PASSOU CLIENTE': 'Atendimento ao Cliente',
  'NEGOU ATENDIMENTO': 'Atendimento ao Cliente',
  'RECLAMAÇÃO DE CLIENTE': 'Atendimento ao Cliente',
  'ATENDIMENTO EM ATRASO': 'Atendimento ao Cliente',
  'ENCAIXE INDEVIDO': 'Atendimento ao Cliente',
  'DEMORA PARA DESCER DA COPA E ATENDER O CLIENTE': 'Atendimento ao Cliente',
  'CLIENTES FANTASMAS NA AGENDA': 'Atendimento ao Cliente',
  'UNIFORME INADEQUADO': 'Conduta e Apresentação',
  'IMAGEM PESSOAL': 'Conduta e Apresentação',
  'USO DE EPI': 'Conduta e Apresentação',
  'CORRIDA INTERNA': 'Conduta e Apresentação',
  'LOCAL DE ATENDIMENTO DESORGANIZADO': 'Conduta e Apresentação',
  'CURSO DE CAPACITAÇÃO - FALTA': 'Capacitação',
  'CURSO DE CAPACITAÇÃO - ATRASO': 'Capacitação',
  'TREINAMENTO EXTERNO - FALTA': 'Capacitação',
  'TREINAMENTO INTERNO - ATRASO': 'Capacitação',
  'REUNIÃO GERAL': 'Capacitação',
  'AUSÊNCIA DO SALÃO': 'Gestão e Operação',
  'PRODUTOS DE CARRINHO': 'Gestão e Operação',
  'PRODUÇÃO': 'Gestão e Operação',
  'FEEDBACK COORDENADOR': 'Gestão e Operação',
  'FEEDBACK GERENTE': 'Gestão e Operação',
}

const CATEGORIA_CORES: Record<string, string> = {
  'Pontualidade': '#f87171',
  'Atendimento ao Cliente': '#fb923c',
  'Conduta e Apresentação': '#facc15',
  'Capacitação': '#60a5fa',
  'Gestão e Operação': '#a78bfa',
  'Outros': '#94a3b8',
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dataInicio = searchParams.get('inicio')
  const dataFim = searchParams.get('fim')
  const filtroProfissional = searchParams.get('profissional')
  const filtroTipo = searchParams.get('tipo')

  const { data: form } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id, titulo')
    .eq('id', params.id)
    .eq('salao_id', payload.salaoId)
    .single()
  if (!form) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  let query = supabaseAdmin
    .from('feedback_prof_respostas')
    .select('*')
    .eq('formulario_id', params.id)
    .order('criado_em', { ascending: true })

  if (dataInicio) query = query.gte('criado_em', dataInicio)
  if (dataFim) query = query.lte('criado_em', dataFim + 'T23:59:59')
  if (filtroProfissional) query = query.eq('profissional_nome', filtroProfissional)
  if (filtroTipo) query = query.eq('tipo', filtroTipo)

  const { data: respostas } = await query
  const lista = respostas || []

  // ── RANKING ───────────────────────────────────────────────
  const rankingMap: Record<string, { nome: string; positivo: number; negativo: number; total: number; score: number }> = {}
  lista.forEach(r => {
    if (!rankingMap[r.profissional_nome]) rankingMap[r.profissional_nome] = { nome: r.profissional_nome, positivo: 0, negativo: 0, total: 0, score: 0 }
    rankingMap[r.profissional_nome].total++
    if (r.tipo === 'positivo') rankingMap[r.profissional_nome].positivo++
    else rankingMap[r.profissional_nome].negativo++
  })
  Object.values(rankingMap).forEach(p => { p.score = p.total > 0 ? Math.round((p.positivo / p.total) * 100) : 0 })
  const ranking = Object.values(rankingMap).sort((a, b) => b.score - a.score)

  // ── OCORRÊNCIAS MAIS FREQUENTES ───────────────────────────
  const ocorrMap: Record<string, { descricao: string; positivo: number; negativo: number; total: number }> = {}
  lista.forEach(r => {
    const key = r.ocorrido_descricao
    if (!ocorrMap[key]) ocorrMap[key] = { descricao: key, positivo: 0, negativo: 0, total: 0 }
    ocorrMap[key].total++
    if (r.tipo === 'positivo') ocorrMap[key].positivo++
    else ocorrMap[key].negativo++
  })
  const ocorrencias = Object.values(ocorrMap).sort((a, b) => b.total - a.total)

  // ── TENDÊNCIA SEMANAL ─────────────────────────────────────
  const byWeek: Record<string, { positivo: number; negativo: number }> = {}
  lista.forEach(r => {
    const wk = getISOWeek(new Date(r.criado_em))
    if (!byWeek[wk]) byWeek[wk] = { positivo: 0, negativo: 0 }
    if (r.tipo === 'positivo') byWeek[wk].positivo++
    else byWeek[wk].negativo++
  })
  const tendencia = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([semana, d]) => ({ semana, ...d, total: d.positivo + d.negativo }))

  // ── RESUMO ────────────────────────────────────────────────
  const totalPositivo = lista.filter(r => r.tipo === 'positivo').length
  const totalNegativo = lista.filter(r => r.tipo === 'negativo').length
  const alertaDesempenho = ranking.some(p => p.total >= 3 && p.score < 30)
  const profCritico = ranking.filter(p => p.total >= 2).sort((a, b) => a.score - b.score)[0] || null
  const nomeProfissionais = Array.from(new Set(lista.map(r => r.profissional_nome))).sort()

  // ── 1. REINCIDÊNCIA ───────────────────────────────────────
  const reincMap: Record<string, { count: number; ultima: string; tipo_predominante: string }> = {}
  const listaNegativos = lista.filter(r => r.tipo === 'negativo')
  listaNegativos.forEach(r => {
    const key = `${r.profissional_nome}||${r.ocorrido_descricao}`
    if (!reincMap[key]) reincMap[key] = { count: 0, ultima: r.criado_em, tipo_predominante: 'negativo' }
    reincMap[key].count++
    if (r.criado_em > reincMap[key].ultima) reincMap[key].ultima = r.criado_em
  })
  const reincidencia = Object.entries(reincMap)
    .filter(([, v]) => v.count >= 2)
    .map(([key, v]) => {
      const [profissional, ocorrencia] = key.split('||')
      const dias = Math.floor((Date.now() - new Date(v.ultima).getTime()) / 86400000)
      return { profissional, ocorrencia, count: v.count, ultima_vez: v.ultima, dias_desde: dias }
    })
    .sort((a, b) => b.count - a.count)

  // ── 2. AGRUPAMENTO POR CATEGORIA ──────────────────────────
  const catMap: Record<string, { total: number; positivo: number; negativo: number }> = {}
  lista.forEach(r => {
    const cat = CATEGORIAS_MAP[r.ocorrido_descricao] || 'Outros'
    if (!catMap[cat]) catMap[cat] = { total: 0, positivo: 0, negativo: 0 }
    catMap[cat].total++
    if (r.tipo === 'positivo') catMap[cat].positivo++
    else catMap[cat].negativo++
  })
  const categorias = Object.entries(catMap)
    .map(([nome, d]) => ({
      nome,
      total: d.total,
      positivo: d.positivo,
      negativo: d.negativo,
      percentual_negativo: d.total > 0 ? Math.round((d.negativo / d.total) * 100) : 0,
      cor: CATEGORIA_CORES[nome] || '#94a3b8',
    }))
    .sort((a, b) => b.negativo - a.negativo)

  // ── 3. MATRIZ PROFISSIONAL × OCORRÊNCIA ───────────────────
  const topOcorrencias = ocorrencias.slice(0, 8).map(o => o.descricao)
  const matrizMap: Record<string, Record<string, number>> = {}
  lista.filter(r => r.tipo === 'negativo').forEach(r => {
    if (!matrizMap[r.profissional_nome]) matrizMap[r.profissional_nome] = {}
    if (topOcorrencias.includes(r.ocorrido_descricao)) {
      matrizMap[r.profissional_nome][r.ocorrido_descricao] = (matrizMap[r.profissional_nome][r.ocorrido_descricao] || 0) + 1
    }
  })
  const matriz = Object.entries(matrizMap)
    .map(([profissional, ocorr]) => ({
      profissional,
      ocorrencias: ocorr,
      total: Object.values(ocorr).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total)

  // ── 4. DIAS DA SEMANA ─────────────────────────────────────
  const diasMap: Record<number, { positivo: number; negativo: number }> = {}
  for (let i = 0; i < 7; i++) diasMap[i] = { positivo: 0, negativo: 0 }
  lista.forEach(r => {
    const dia = new Date(r.criado_em).getDay()
    if (r.tipo === 'positivo') diasMap[dia].positivo++
    else diasMap[dia].negativo++
  })
  const diasSemana = DIAS.map((nome, i) => ({
    dia: nome,
    positivo: diasMap[i].positivo,
    negativo: diasMap[i].negativo,
    total: diasMap[i].positivo + diasMap[i].negativo,
  }))

  // ── 5. EVOLUÇÃO INDIVIDUAL ────────────────────────────────
  const evolMap: Record<string, Record<string, { pos: number; neg: number }>> = {}
  lista.forEach(r => {
    const wk = getISOWeek(new Date(r.criado_em))
    if (!evolMap[r.profissional_nome]) evolMap[r.profissional_nome] = {}
    if (!evolMap[r.profissional_nome][wk]) evolMap[r.profissional_nome][wk] = { pos: 0, neg: 0 }
    if (r.tipo === 'positivo') evolMap[r.profissional_nome][wk].pos++
    else evolMap[r.profissional_nome][wk].neg++
  })
  const evolucaoIndividual = Object.entries(evolMap).map(([profissional, weeks]) => ({
    profissional,
    semanas: Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([semana, d]) => ({
        semana,
        score: (d.pos + d.neg) > 0 ? Math.round((d.pos / (d.pos + d.neg)) * 100) : 0,
        total: d.pos + d.neg,
      })),
  }))

  // ── 6. PLACAR MENSAL ──────────────────────────────────────
  const mesMap: Record<string, Record<string, { pos: number; neg: number; ocorr: Record<string, number> }>> = {}
  lista.forEach(r => {
    const mes = getMes(new Date(r.criado_em))
    if (!mesMap[mes]) mesMap[mes] = {}
    if (!mesMap[mes][r.profissional_nome]) mesMap[mes][r.profissional_nome] = { pos: 0, neg: 0, ocorr: {} }
    if (r.tipo === 'positivo') mesMap[mes][r.profissional_nome].pos++
    else {
      mesMap[mes][r.profissional_nome].neg++
      mesMap[mes][r.profissional_nome].ocorr[r.ocorrido_descricao] = (mesMap[mes][r.profissional_nome].ocorr[r.ocorrido_descricao] || 0) + 1
    }
  })
  const placardMensal = Object.entries(mesMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([mes, profs]) => ({
      mes,
      profissionais: Object.entries(profs)
        .map(([nome, d]) => {
          const total = d.pos + d.neg
          const score = total > 0 ? Math.round((d.pos / total) * 100) : 0
          const topProblema = Object.entries(d.ocorr).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
          return { nome, positivo: d.pos, negativo: d.neg, total, score, top_problema: topProblema }
        })
        .sort((a, b) => b.score - a.score),
    }))

  // ── 7. CORRELAÇÃO COM CLIENTE ─────────────────────────────
  // Busca formulários de feedback de cliente do mesmo salão
  let correlacaoCliente: { semana: string; negProf: number; mediaCliente: number | null }[] = []
  try {
    const { data: formCliente } = await supabaseAdmin
      .from('feedback_formularios')
      .select('id')
      .eq('salao_id', payload.salaoId)
      .limit(1)
      .single()

    if (formCliente) {
      const { data: pergsCliente } = await supabaseAdmin
        .from('feedback_perguntas')
        .select('id')
        .eq('formulario_id', formCliente.id)
        .eq('tipo', 'escala')
        .order('ordem')
        .limit(1)
        .single()

      if (pergsCliente) {
        const { data: respCliente } = await supabaseAdmin
          .from('feedback_respostas')
          .select('dados, criado_em')
          .eq('formulario_id', formCliente.id)

        if (respCliente) {
          const clienteByWeek: Record<string, { soma: number; count: number }> = {}
          respCliente.forEach(r => {
            const val = Number((r.dados as Record<string, string>)[pergsCliente.id])
            if (!isNaN(val)) {
              const wk = getISOWeek(new Date(r.criado_em))
              if (!clienteByWeek[wk]) clienteByWeek[wk] = { soma: 0, count: 0 }
              clienteByWeek[wk].soma += val
              clienteByWeek[wk].count++
            }
          })

          const allWeeks = Array.from(new Set([
            ...tendencia.map(t => t.semana),
            ...Object.keys(clienteByWeek),
          ])).sort().slice(-12)

          correlacaoCliente = allWeeks.map(semana => {
            const profData = tendencia.find(t => t.semana === semana)
            const clienteData = clienteByWeek[semana]
            return {
              semana,
              negProf: profData?.negativo || 0,
              mediaCliente: clienteData ? Math.round((clienteData.soma / clienteData.count) * 10) / 10 : null,
            }
          })
        }
      }
    }
  } catch { /* sem dados de cliente ainda */ }

  return NextResponse.json({
    formulario: { id: form.id, titulo: form.titulo },
    total: lista.length,
    totalPositivo,
    totalNegativo,
    ranking,
    ocorrencias,
    tendencia,
    alertaDesempenho,
    profCritico,
    nomeProfissionais,
    // Novos
    reincidencia,
    categorias,
    matriz,
    topOcorrencias,
    diasSemana,
    evolucaoIndividual,
    placardMensal,
    correlacaoCliente,
    respostas_recentes: lista.slice(-10).reverse().map(r => ({
      id: r.id,
      profissional_nome: r.profissional_nome,
      tipo: r.tipo,
      ocorrido_descricao: r.ocorrido_descricao,
      descricao: r.descricao,
      criado_em: r.criado_em,
    })),
  })
}
