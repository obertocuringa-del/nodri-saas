import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dataInicio = searchParams.get('inicio')
  const dataFim = searchParams.get('fim')

  // Verifica que o formulário pertence ao salão
  const { data: form } = await supabaseAdmin
    .from('feedback_formularios')
    .select('*, saloes(nome)')
    .eq('id', params.id)
    .eq('salao_id', payload.salaoId)
    .single()

  if (!form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })

  // Busca perguntas
  const { data: perguntas } = await supabaseAdmin
    .from('feedback_perguntas')
    .select('*')
    .eq('formulario_id', params.id)
    .order('ordem')

  // Busca respostas com filtros de data
  let query = supabaseAdmin
    .from('feedback_respostas')
    .select('id, dados, criado_em')
    .eq('formulario_id', params.id)
    .order('criado_em', { ascending: false })

  if (dataInicio) query = query.gte('criado_em', dataInicio)
  if (dataFim) query = query.lte('criado_em', dataFim + 'T23:59:59')

  const { data: respostas } = await query

  // Calcula estatísticas por pergunta
  const stats: Record<string, unknown> = {}

  for (const pergunta of (perguntas || [])) {
    const resps = (respostas || []).map(r => r.dados[pergunta.id]).filter(v => v !== undefined && v !== null && v !== '')

    if (pergunta.tipo === 'escala') {
      const valores = resps.map(Number).filter(n => !isNaN(n))
      const media = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0
      const dist: Record<number, number> = {}
      for (let i = 0; i <= 10; i++) dist[i] = 0
      valores.forEach(v => { if (dist[v] !== undefined) dist[v]++ })
      const detratores = valores.filter(v => v <= 6).length
      const neutros = valores.filter(v => v === 7 || v === 8).length
      const promotores = valores.filter(v => v >= 9).length
      const nps = valores.length ? Math.round(((promotores - detratores) / valores.length) * 100) : 0
      stats[pergunta.id] = { media: Math.round(media * 10) / 10, dist, total: valores.length, nps, detratores, neutros, promotores }

    } else if (pergunta.tipo === 'multipla_escolha') {
      const contagem: Record<string, number> = {}
      ;(pergunta.opcoes as string[]).forEach(o => { contagem[o] = 0 })
      resps.forEach(v => { if (contagem[v as string] !== undefined) contagem[v as string]++ })
      stats[pergunta.id] = { contagem, total: resps.length }

    } else if (pergunta.tipo === 'texto') {
      stats[pergunta.id] = { respostas: resps.slice(0, 100), total: resps.length }

    } else if (pergunta.tipo === 'sim_nao') {
      const contagem: Record<string, { sim: number; nao: number }> = {}
      ;(pergunta.opcoes as string[]).forEach(o => { contagem[o] = { sim: 0, nao: 0 } })
      resps.forEach(v => {
        const obj = v as Record<string, string>
        Object.entries(obj).forEach(([item, resp]) => {
          if (contagem[item]) {
            if (resp === 'sim') contagem[item].sim++
            else contagem[item].nao++
          }
        })
      })
      stats[pergunta.id] = { contagem, total: resps.length }

    } else if (pergunta.tipo === 'grid') {
      const contagem: Record<string, { soma: number; count: number; media: number }> = {}
      ;(pergunta.opcoes as string[]).forEach(o => { contagem[o] = { soma: 0, count: 0, media: 0 } })
      resps.forEach(v => {
        const obj = v as Record<string, string>
        Object.entries(obj).forEach(([item, nota]) => {
          if (contagem[item]) {
            const n = Number(nota)
            if (!isNaN(n)) { contagem[item].soma += n; contagem[item].count++ }
          }
        })
      })
      Object.keys(contagem).forEach(k => {
        const c = contagem[k]
        c.media = c.count ? Math.round((c.soma / c.count) * 10) / 10 : 0
      })
      stats[pergunta.id] = { contagem, total: resps.length }
    }
  }

  return NextResponse.json({
    formulario: { id: form.id, titulo: form.titulo, descricao: form.descricao },
    total_respostas: respostas?.length || 0,
    perguntas: perguntas || [],
    stats,
    respostas_recentes: (respostas || []).slice(0, 5).map(r => ({ id: r.id, criado_em: r.criado_em })),
  })
}
