import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || !payload.salaoId) return null
  return payload.salaoId
}

function mesesEntreDatas(inicio: string, fim: string): Array<{ ano: number; mes: number }> {
  const mI = inicio?.match(/^(\d{4})-(\d{2})$/)
  const mF = fim?.match(/^(\d{4})-(\d{2})$/)
  if (!mI || !mF) return []
  const meses: Array<{ ano: number; mes: number }> = []
  let ano = parseInt(mI[1]), mes = parseInt(mI[2])
  const fAno = parseInt(mF[1]), fMes = parseInt(mF[2])
  while (ano < fAno || (ano === fAno && mes <= fMes)) {
    meses.push({ ano, mes })
    mes++; if (mes > 12) { mes = 1; ano++ }
    if (meses.length > 60) break
  }
  return meses
}

function agregar(rows: any[]) {
  if (!rows.length) return null
  const fat  = rows.reduce((s, r) => s + Number(r.faturamento || 0), 0)
  const serv = rows.reduce((s, r) => s + Number(r.total_servicos || 0), 0)
  const ticket = serv > 0 ? fat / serv : rows.reduce((s, r) => s + Number(r.ticket_medio || 0), 0) / rows.length
  const pref   = rows.reduce((s, r) => s + Number(r.clientes_preferencia || 0), 0)
  const semPref = rows.reduce((s, r) => s + Number(r.clientes_sem_preferencia || 0), 0)
  const dias   = rows.reduce((s, r) => s + Number(r.dias_trabalhados || 0), 0)
  const ocup   = rows.reduce((s, r) => s + Number(r.taxa_ocupacao || 0), 0) / rows.length
  const prod   = rows.reduce((s, r) => s + Number(r.total_produtos || 0), 0)
  const servMap: Record<string, { quantidade: number; valor: number }> = {}
  for (const r of rows) {
    for (const s of (Array.isArray(r.servicos_detalhados) ? r.servicos_detalhados : [])) {
      if (!servMap[s.servico]) servMap[s.servico] = { quantidade: 0, valor: 0 }
      servMap[s.servico].quantidade += Number(s.quantidade || 0)
      servMap[s.servico].valor += Number(s.valor || 0)
    }
  }
  const servicos = Object.entries(servMap)
    .map(([servico, v]) => ({ servico, ...v }))
    .sort((a, b) => b.quantidade - a.quantidade)
  return { faturamento: fat, ticket_medio: ticket, clientes_preferencia: pref,
    clientes_sem_preferencia: semPref, dias_trabalhados: dias, taxa_ocupacao: ocup,
    total_servicos: serv, total_produtos: prod, servicos }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const p1_inicio = url.searchParams.get('p1_inicio') || ''
  const p1_fim    = url.searchParams.get('p1_fim')    || ''
  const p2_inicio = url.searchParams.get('p2_inicio') || ''
  const p2_fim    = url.searchParams.get('p2_fim')    || ''

  if (!p1_inicio || !p1_fim || !p2_inicio || !p2_fim) {
    return NextResponse.json({ error: 'Obrigatório: p1_inicio, p1_fim, p2_inicio, p2_fim (YYYY-MM)' }, { status: 400 })
  }

  const mesesP1 = mesesEntreDatas(p1_inicio, p1_fim)
  const mesesP2 = mesesEntreDatas(p2_inicio, p2_fim)

  const { data: metricas } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('*')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)

  const inPeriod = (r: any, list: Array<{ano:number;mes:number}>) =>
    list.some(m => m.ano === Number(r.ano) && m.mes === Number(r.mes))

  const dadosP1 = agregar((metricas || []).filter(r => inPeriod(r, mesesP1)))
  const dadosP2 = agregar((metricas || []).filter(r => inPeriod(r, mesesP2)))

  // Fidelização
  let fidelizacao = null
  if (dadosP1 && dadosP2) {
    const total_novos = (dadosP1.clientes_sem_preferencia || 0) + (dadosP2.clientes_sem_preferencia || 0)
    const fidelizados = (dadosP2.clientes_preferencia || 0) - (dadosP1.clientes_preferencia || 0)
    const perdidos = total_novos - fidelizados
    const taxa_perda = total_novos > 0 ? (perdidos / total_novos) * 100 : 0
    const taxa_fidel = total_novos > 0 ? (fidelizados / total_novos) * 100 : 0
    fidelizacao = {
      total_novos, fidelizados, perdidos,
      taxa_perda: Number(taxa_perda.toFixed(1)),
      taxa_fidelizacao: Number(taxa_fidel.toFixed(1)),
      nivel: taxa_perda > 100 ? 'critico' : taxa_perda > 70 ? 'alto' : taxa_perda > 40 ? 'medio' : 'baixo',
      novos_p1: dadosP1.clientes_sem_preferencia,
      novos_p2: dadosP2.clientes_sem_preferencia,
      ticket_medio: dadosP2.ticket_medio,
      valor_perdido: Math.abs(perdidos) * (dadosP2.ticket_medio || 0),
    }
  }

  // Feedbacks — usa nome_completo ou apelido
  const { data: prof } = await supabaseAdmin
    .from('profissionais').select('nome_completo,apelido').eq('id', params.id).single()

  let feedbacks: any[] = []
  const nomeBase = prof?.apelido || prof?.nome_completo?.split(' ')[0] || ''
  if (nomeBase) {
    const { data: fb } = await supabaseAdmin
      .from('feedback_prof_respostas')
      .select('id,tipo,ocorrido_descricao,descricao,criado_em')
      .eq('salao_id', salaoId)
      .ilike('profissional_nome', `%${nomeBase}%`)
      .order('criado_em', { ascending: false })
      .limit(200)
    feedbacks = fb || []
  }

  const ocorrenciaMap: Record<string, number> = {}
  for (const fb of feedbacks) {
    const k = fb.ocorrido_descricao || 'Outro'
    ocorrenciaMap[k] = (ocorrenciaMap[k] || 0) + 1
  }
  const ocorrencias = Object.entries(ocorrenciaMap)
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total)

  const historico = (metricas || [])
    .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
    .slice(-12)
    .map(r => ({ ano: r.ano, mes: r.mes, faturamento: r.faturamento,
      total_servicos: r.total_servicos, ticket_medio: r.ticket_medio, taxa_ocupacao: r.taxa_ocupacao }))

  return NextResponse.json({ p1: dadosP1, p2: dadosP2, fidelizacao, feedbacks, ocorrencias, historico })
}

// POST — salvar/atualizar métricas de um mês
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { ano, mes } = body
  if (!ano || !mes) return NextResponse.json({ error: 'ano e mes obrigatórios' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .upsert({ salao_id: salaoId, profissional_id: params.id, ...body }, { onConflict: 'profissional_id,ano,mes' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
