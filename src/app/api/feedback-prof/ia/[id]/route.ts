import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !['salon','sub'].includes(payload.role) || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada.' }, { status: 500 })

  const { data: form } = await supabaseAdmin.from('feedback_prof_formularios').select('titulo').eq('id', params.id).eq('salao_id', payload.salaoId).single()
  if (!form) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const { data: respostas } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('*')
    .eq('formulario_id', params.id)
    .order('criado_em', { ascending: false })
    .limit(300)

  if (!respostas || respostas.length === 0)
    return NextResponse.json({ error: 'Sem dados suficientes para análise.' }, { status: 400 })

  // Monta resumo por profissional
  const rankMap: Record<string, { pos: number; neg: number; ocorr: Record<string, number> }> = {}
  respostas.forEach(r => {
    if (!rankMap[r.profissional_nome]) rankMap[r.profissional_nome] = { pos: 0, neg: 0, ocorr: {} }
    if (r.tipo === 'positivo') rankMap[r.profissional_nome].pos++
    else rankMap[r.profissional_nome].neg++
    rankMap[r.profissional_nome].ocorr[r.ocorrido_descricao] = (rankMap[r.profissional_nome].ocorr[r.ocorrido_descricao] || 0) + 1
  })

  const resumo = [`Salão: ${payload.salaoNome}`, `Total de registros: ${respostas.length}`, '']
  Object.entries(rankMap).forEach(([nome, d]) => {
    const total = d.pos + d.neg
    const score = Math.round((d.pos / total) * 100)
    resumo.push(`## ${nome}: ${total} registros | ${score}% positivo`)
    resumo.push(`  Positivos: ${d.pos} | Negativos: ${d.neg}`)
    const topOcorr = Object.entries(d.ocorr).sort((a, b) => b[1] - a[1]).slice(0, 5)
    topOcorr.forEach(([o, n]) => resumo.push(`  - ${o}: ${n}x`))
    resumo.push('')
  })

  const prompt = `Você é um consultor especializado em gestão de equipes de salões de beleza no Brasil.

Analise os dados de desempenho dos profissionais do salão "${payload.salaoNome}" e forneça uma análise estratégica para o gestor tomar decisões sobre sua equipe.

DADOS DE DESEMPENHO:
${resumo.join('\n')}

Responda APENAS com JSON válido, sem markdown:
{
  "resumo_executivo": "2-3 frases sobre o estado geral da equipe",
  "clima_equipe": número de 1-10 representando o clima geral,
  "destaques_positivos": [{"nome": "profissional", "motivo": "por que se destaca"}],
  "alertas_urgentes": [{"nome": "profissional", "problema": "o problema", "recomendacao": "ação imediata"}],
  "padroes_ocorrencias": [{"ocorrencia": "...", "frequencia": "alta/media/baixa", "impacto": "impacto no negócio", "acao": "como resolver"}],
  "acoes_gestao": [{"acao": "ação específica", "prazo": "imediato|esta semana|este mês", "profissional": "nome ou 'equipe geral'"}],
  "riscos_retencao": "análise de risco de perda de clientes por problemas da equipe",
  "recomendacoes_treinamento": ["treinamento recomendado baseado nos dados"]
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return NextResponse.json({ error: 'Erro na IA' }, { status: 500 })
    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    try { return NextResponse.json(JSON.parse(text)) }
    catch { return NextResponse.json({ error: 'Formato inesperado da IA', raw: text }, { status: 500 }) }
  } catch {
    return NextResponse.json({ error: 'Falha na conexão com a IA.' }, { status: 500 })
  }
}
