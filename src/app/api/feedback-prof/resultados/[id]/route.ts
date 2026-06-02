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

  // ── RANKING DE PROFISSIONAIS ───────────────────────────────
  const rankingMap: Record<string, { nome: string; positivo: number; negativo: number; total: number; score: number }> = {}
  lista.forEach(r => {
    if (!rankingMap[r.profissional_nome]) {
      rankingMap[r.profissional_nome] = { nome: r.profissional_nome, positivo: 0, negativo: 0, total: 0, score: 0 }
    }
    rankingMap[r.profissional_nome].total++
    if (r.tipo === 'positivo') rankingMap[r.profissional_nome].positivo++
    else rankingMap[r.profissional_nome].negativo++
  })
  Object.values(rankingMap).forEach(p => {
    p.score = p.total > 0 ? Math.round((p.positivo / p.total) * 100) : 0
  })
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

  // ── PROFISSIONAL CRÍTICO ──────────────────────────────────
  const profCritico = ranking.filter(p => p.total >= 2).sort((a, b) => a.score - b.score)[0] || null

  // ── LISTA DE PROFISSIONAIS (para filtro) ──────────────────
  const nomeProfissionais = [...new Set(lista.map(r => r.profissional_nome))].sort()

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
