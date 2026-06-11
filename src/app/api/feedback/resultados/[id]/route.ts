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
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dataInicio = searchParams.get('inicio')
  const dataFim = searchParams.get('fim')

  const { data: form } = await supabaseAdmin
    .from('feedback_formularios')
    .select('*, saloes(nome)')
    .eq('id', params.id)
    .eq('salao_id', payload.salaoId)
    .single()

  if (!form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })

  const { data: perguntas } = await supabaseAdmin
    .from('feedback_perguntas')
    .select('*')
    .eq('formulario_id', params.id)
    .order('ordem')

  let query = supabaseAdmin
    .from('feedback_respostas')
    .select('id, dados, criado_em')
    .eq('formulario_id', params.id)
    .order('criado_em', { ascending: true })

  if (dataInicio) query = query.gte('criado_em', dataInicio)
  if (dataFim) query = query.lte('criado_em', dataFim + 'T23:59:59')

  const { data: respostas } = await query
  const lista = respostas || []
  const pergs = perguntas || []

  // ── STATS POR PERGUNTA ────────────────────────────────────
  const stats: Record<string, unknown> = {}

  for (const pergunta of pergs) {
    const resps = lista.map(r => r.dados[pergunta.id]).filter(v => v !== undefined && v !== null && v !== '')

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

  // ── TENDÊNCIA SEMANAL (últimas 12 semanas) ────────────────
  const escalaGeral = pergs.find(p => p.tipo === 'escala')
  const tendenciaSemanal: { semana: string; media: number; total: number }[] = []

  if (escalaGeral) {
    const byWeek: Record<string, { soma: number; count: number }> = {}
    lista.forEach(r => {
      const val = Number(r.dados[escalaGeral.id])
      if (!isNaN(val) && val >= 0) {
        const wk = getISOWeek(new Date(r.criado_em))
        if (!byWeek[wk]) byWeek[wk] = { soma: 0, count: 0 }
        byWeek[wk].soma += val
        byWeek[wk].count++
      }
    })
    Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .forEach(([semana, { soma, count }]) => {
        tendenciaSemanal.push({ semana, media: Math.round((soma / count) * 10) / 10, total: count })
      })
  }

  // ── TAXA DE RETORNO ───────────────────────────────────────
  const pergRetorno = pergs.find(p =>
    p.tipo === 'multipla_escolha' &&
    (p.opcoes as string[]).some(o => o.toLowerCase().includes('voltar') || o.toLowerCase().includes('voltarei') || o.toLowerCase().includes('retornar'))
  )
  let taxaRetorno: { positivo: number; total: number; percentual: number } | null = null
  if (pergRetorno) {
    const resps = lista.map(r => r.dados[pergRetorno.id]).filter(Boolean) as string[]
    const positivo = resps.filter(v =>
      v.toLowerCase().includes('certeza') || v.toLowerCase().includes('provavelmente sim')
    ).length
    taxaRetorno = { positivo, total: resps.length, percentual: resps.length ? Math.round((positivo / resps.length) * 100) : 0 }
  }

  // ── SEGMENTAÇÃO NOVO X RECORRENTE ─────────────────────────
  const pergPrimeira = pergs.find(p =>
    p.tipo === 'multipla_escolha' &&
    (p.opcoes as string[]).some(o => o.toLowerCase().includes('primeira'))
  )
  let segmentacao: { novos: { count: number; media: number }; recorrentes: { count: number; media: number } } | null = null

  if (pergPrimeira && escalaGeral) {
    const novos: number[] = []
    const recorrentes: number[] = []
    lista.forEach(r => {
      const resp = r.dados[pergPrimeira.id] as string
      const nota = Number(r.dados[escalaGeral.id])
      if (!resp || isNaN(nota)) return
      if (resp.toLowerCase().includes('primeira')) novos.push(nota)
      else recorrentes.push(nota)
    })
    const media = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0
    segmentacao = {
      novos: { count: novos.length, media: media(novos) },
      recorrentes: { count: recorrentes.length, media: media(recorrentes) },
    }
  }

  // ── PIOR SERVIÇO ──────────────────────────────────────────
  const pergGrid = pergs.find(p => p.tipo === 'grid')
  let piorServico: { nome: string; media: number } | null = null

  if (pergGrid) {
    const s = stats[pergGrid.id] as { contagem: Record<string, { media: number; count: number }> } | undefined
    if (s) {
      const itens = Object.entries(s.contagem).filter(([, v]) => v.count > 0)
      if (itens.length) {
        const [nome, dados] = itens.sort((a, b) => a[1].media - b[1].media)[0]
        piorServico = { nome, media: dados.media }
      }
    }
  }

  // ── ALERTA DE MÉDIA BAIXA ─────────────────────────────────
  let alertaMedia: { ativo: boolean; media: number } = { ativo: false, media: 0 }
  if (escalaGeral && stats[escalaGeral.id]) {
    const s = stats[escalaGeral.id] as { media: number }
    alertaMedia = { ativo: s.media > 0 && s.media < 7, media: s.media }
  }

  // ── COMENTÁRIOS ───────────────────────────────────────────
  const comentarios = lista
    .map(r => r.dados['__comentario__'])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  return NextResponse.json({
    formulario: { id: form.id, titulo: form.titulo, descricao: form.descricao },
    total_respostas: lista.length,
    perguntas: pergs,
    stats,
    comentarios,
    tendenciaSemanal,
    taxaRetorno,
    segmentacao,
    piorServico,
    alertaMedia,
    respostas_recentes: [...lista].reverse().map(r => ({ id: r.id, criado_em: r.criado_em })),
  })
}
