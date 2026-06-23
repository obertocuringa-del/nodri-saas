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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const nomeCliente = url.searchParams.get('cliente') || ''
  const celular = url.searchParams.get('celular') || ''

  if (!nomeCliente) return NextResponse.json({ error: 'cliente obrigatório' }, { status: 400 })

  // Busca todos atendimentos do cliente no salão
  let query = supabaseAdmin
    .from('atendimentos_raw')
    .select('servico, data_comanda, profissional, qtd, valor, total, celular, cliente')
    .eq('salao_id', salaoId)

  if (celular && celular.replace(/\D/g,'').length >= 8) {
    query = query.or(`cliente.ilike.%${nomeCliente}%,celular.ilike.%${celular.replace(/\D/g,'')}%`)
  } else {
    query = query.ilike('cliente', `%${nomeCliente}%`)
  }

  const { data: atendimentos } = await query.order('data_comanda', { ascending: true })

  if (!atendimentos || atendimentos.length === 0) {
    return NextResponse.json({
      primeira_visita_real: true,
      data_primeira_visita: null,
      ultima_visita: null,
      dias_desde_ultima: null,
      total_visitas: 0,
      faturamento_acumulado: 0,
      ticket_medio: 0,
      cliente_fiel: false,
      profissionais_atendidos: [],
      servicos: {},
      servicos_ultima: [],
      profissionais_ultima: [],
      alertas: ['primeira_visita'],
    })
  }

  // ── Datas únicas (cada data = 1 visita) ─────────────────────────────────
  // Ordena pela DATA REAL (não como texto): "DD/MM/YYYY" como string ordena errado
  // (ex: 02/01 viria depois de 31/12). Converte para timestamp antes de ordenar.
  const tsData = (s: string) => {
    if (!s) return 0
    if (s.includes('/')) { const [d, m, y] = s.split('/'); return new Date(`${y}-${m}-${d}`).getTime() || 0 }
    return new Date(s).getTime() || 0
  }
  const datasUnicas = [...new Set(atendimentos.map(a => a.data_comanda).filter(Boolean))]
    .sort((a, b) => tsData(a) - tsData(b))
  const data_primeira_visita = datasUnicas[0] || null
  const ultima_visita = datasUnicas[datasUnicas.length - 1] || null
  const total_visitas = datasUnicas.length

  // Dias desde última visita
  let dias_desde_ultima: number | null = null
  if (ultima_visita) {
    const [d, m, y] = ultima_visita.includes('/') ? ultima_visita.split('/') : [ultima_visita.slice(8,10), ultima_visita.slice(5,7), ultima_visita.slice(0,4)]
    const dt = new Date(`${y}-${m}-${d}`)
    if (!isNaN(dt.getTime())) {
      dias_desde_ultima = Math.floor((Date.now() - dt.getTime()) / 86400000)
    }
  }

  // ── Serviços totais ──────────────────────────────────────────────────────
  const servicos: Record<string, number> = {}
  let faturamento_acumulado = 0
  for (const a of atendimentos) {
    const s = a.servico || 'Não informado'
    servicos[s] = (servicos[s] || 0) + (Number(a.qtd) || 1)
    faturamento_acumulado += Number(a.total) || Number(a.valor) || 0
  }
  const ticket_medio = total_visitas > 0 ? faturamento_acumulado / total_visitas : 0

  // ── Última visita: serviços e profissionais ──────────────────────────────
  const atendUltima = ultima_visita ? atendimentos.filter(a => a.data_comanda === ultima_visita) : []
  const servicos_ultima = [...new Set(atendUltima.map(a => a.servico).filter(Boolean))]
  const profissionais_ultima = [...new Set(atendUltima.map(a => a.profissional).filter(Boolean))]

  // ── Todos os profissionais que já atenderam ──────────────────────────────
  const profissionais_atendidos = [...new Set(atendimentos.map(a => a.profissional).filter(Boolean))]

  // ── Cliente fiel: 5+ visitas ─────────────────────────────────────────────
  const cliente_fiel = total_visitas >= 5

  // ── Tempo médio entre visitas ────────────────────────────────────────────
  let freq_media_dias: number | null = null
  if (datasUnicas.length >= 2) {
    const parseData = (s: string) => {
      if (s.includes('/')) { const [d,m,y] = s.split('/'); return new Date(`${y}-${m}-${d}`) }
      return new Date(s)
    }
    const diffs = []
    for (let i = 1; i < datasUnicas.length; i++) {
      const diff = (parseData(datasUnicas[i]).getTime() - parseData(datasUnicas[i-1]).getTime()) / 86400000
      if (!isNaN(diff) && diff > 0) diffs.push(diff)
    }
    if (diffs.length) freq_media_dias = Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length)
  }

  // ── Dias sem fazer cada serviço (top 5) ─────────────────────────────────
  // IMPORTANTE: comparar as datas DE VERDADE (timestamp), não confiar na ordem
  // do array — data_comanda é "DD/MM/YYYY" e ordena errado como texto.
  // Guardamos sempre a data MAIS RECENTE de cada serviço.
  const ultima_vez_servico: Record<string, string> = {}
  for (const a of atendimentos) {
    if (a.servico && a.data_comanda) {
      const anterior = ultima_vez_servico[a.servico]
      if (!anterior || tsData(a.data_comanda) > tsData(anterior)) {
        ultima_vez_servico[a.servico] = a.data_comanda
      }
    }
  }

  // ── Alertas automáticos ─────────────────────────────────────────────────
  const alertas: string[] = []
  if (total_visitas === 1 && datasUnicas[0] === ultima_visita) alertas.push('primeira_visita')
  if (total_visitas >= 10) alertas.push('cliente_vip')
  if (faturamento_acumulado >= 2000) alertas.push('alto_ticket')
  if (dias_desde_ultima !== null && freq_media_dias !== null && dias_desde_ultima > freq_media_dias * 2 && total_visitas >= 3) alertas.push('risco_abandono')
  if (dias_desde_ultima !== null && dias_desde_ultima > 90 && total_visitas >= 2) alertas.push('longo_ausente')

  return NextResponse.json({
    primeira_visita_real: total_visitas === 0,
    data_primeira_visita,
    ultima_visita,
    dias_desde_ultima,
    total_visitas,
    faturamento_acumulado,
    ticket_medio,
    cliente_fiel,
    freq_media_dias,
    profissionais_atendidos,
    servicos,
    servicos_ultima,
    profissionais_ultima,
    ultima_vez_servico,
    alertas,
  })
}
