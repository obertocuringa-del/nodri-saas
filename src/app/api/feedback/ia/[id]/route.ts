import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Chave da IA não configurada. Adicione ANTHROPIC_API_KEY nas variáveis de ambiente.' }, { status: 500 })
  }

  // Busca dados do formulário
  const { data: form } = await supabaseAdmin
    .from('feedback_formularios')
    .select('titulo')
    .eq('id', params.id)
    .eq('salao_id', payload.salaoId)
    .single()

  if (!form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })

  // Busca perguntas e respostas
  const { data: perguntas } = await supabaseAdmin
    .from('feedback_perguntas')
    .select('*')
    .eq('formulario_id', params.id)
    .order('ordem')

  const { data: respostas } = await supabaseAdmin
    .from('feedback_respostas')
    .select('dados, criado_em')
    .eq('formulario_id', params.id)
    .order('criado_em', { ascending: false })
    .limit(200)

  if (!respostas || respostas.length === 0) {
    return NextResponse.json({ error: 'Sem respostas suficientes para análise.' }, { status: 400 })
  }

  // Monta resumo dos dados para o prompt
  const resumo: string[] = []
  resumo.push(`Formulário: "${form.titulo}"`)
  resumo.push(`Total de respostas analisadas: ${respostas.length}`)
  resumo.push(`Salão: ${payload.salaoNome}`)
  resumo.push('')

  for (const perg of (perguntas || [])) {
    resumo.push(`## Pergunta: "${perg.titulo}" (tipo: ${perg.tipo})`)
    const resps = respostas.map(r => r.dados[perg.id]).filter(v => v !== undefined && v !== null && v !== '')

    if (perg.tipo === 'escala') {
      const valores = resps.map(Number).filter(n => !isNaN(n))
      if (valores.length) {
        const media = valores.reduce((a, b) => a + b, 0) / valores.length
        const promotores = valores.filter(v => v >= 9).length
        const detratores = valores.filter(v => v <= 6).length
        resumo.push(`- Média: ${media.toFixed(1)}/10`)
        resumo.push(`- Promotores (9-10): ${promotores} (${Math.round(promotores/valores.length*100)}%)`)
        resumo.push(`- Neutros (7-8): ${valores.filter(v=>v===7||v===8).length}`)
        resumo.push(`- Detratores (0-6): ${detratores} (${Math.round(detratores/valores.length*100)}%)`)
        resumo.push(`- NPS: ${Math.round((promotores-detratores)/valores.length*100)}`)
      }

    } else if (perg.tipo === 'multipla_escolha') {
      const contagem: Record<string, number> = {}
      resps.forEach(v => { contagem[v as string] = (contagem[v as string] || 0) + 1 })
      Object.entries(contagem).sort((a,b) => b[1]-a[1]).forEach(([op, n]) => {
        resumo.push(`- ${op}: ${n} (${Math.round(n/resps.length*100)}%)`)
      })

    } else if (perg.tipo === 'texto') {
      resps.slice(0, 20).forEach(v => resumo.push(`- "${v}"`))

    } else if (perg.tipo === 'sim_nao') {
      const contagem: Record<string, { sim: number; nao: number }> = {}
      resps.forEach(v => {
        const obj = v as Record<string, string>
        Object.entries(obj).forEach(([item, resp]) => {
          if (!contagem[item]) contagem[item] = { sim: 0, nao: 0 }
          if (resp === 'sim') contagem[item].sim++
          else contagem[item].nao++
        })
      })
      Object.entries(contagem).forEach(([item, c]) => {
        const total = c.sim + c.nao
        resumo.push(`- ${item}: ${c.sim} sim (${total ? Math.round(c.sim/total*100) : 0}%), ${c.nao} não`)
      })

    } else if (perg.tipo === 'grid') {
      const contagem: Record<string, { soma: number; count: number }> = {}
      resps.forEach(v => {
        const obj = v as Record<string, string>
        Object.entries(obj).forEach(([item, nota]) => {
          if (!contagem[item]) contagem[item] = { soma: 0, count: 0 }
          const n = Number(nota)
          if (!isNaN(n)) { contagem[item].soma += n; contagem[item].count++ }
        })
      })
      Object.entries(contagem)
        .filter(([, c]) => c.count > 0)
        .sort((a, b) => (b[1].soma/b[1].count) - (a[1].soma/a[1].count))
        .forEach(([item, c]) => {
          resumo.push(`- ${item}: média ${(c.soma/c.count).toFixed(1)}/5 (${c.count} avaliações)`)
        })
    }
    resumo.push('')
  }

  const prompt = `Você é um consultor especializado em gestão de salões de beleza e experiência do cliente no Brasil.

Analise os seguintes dados de feedback dos clientes do salão "${payload.salaoNome}" e forneça uma análise estratégica completa, prática e acionável para o dono do salão tomar decisões de melhoria imediata.

Considere especialmente:
- NPS (promotores/neutros/detratores) como indicador de lealdade
- Taxa de retorno declarada pelos clientes
- Horários de pico e queda de qualidade
- Ticket médio e oportunidades de upsell
- Serviços com nota baixa que precisam de ação urgente
- Perfil de clientes novos vs recorrentes
- Gargalos operacionais (tempo de espera)
- Canais de captação mais eficazes

DADOS DO FEEDBACK:
${resumo.join('\n')}

Forneça sua análise no seguinte formato JSON (responda APENAS com JSON válido, sem markdown):
{
  "resumo_executivo": "2-3 frases resumindo a situação geral do salão com dados concretos",
  "nota_geral": número de 1-10 representando a saúde geral baseada nos dados,
  "pontos_fortes": [
    {"titulo": "...", "descricao": "cite dados específicos do feedback"}
  ],
  "areas_melhoria": [
    {"titulo": "...", "descricao": "cite o problema com dados e impacto no negócio", "prioridade": "alta|media|baixa"}
  ],
  "acoes_prioritarias": [
    {"acao": "ação específica e executável", "impacto": "impacto esperado no negócio", "prazo": "imediato|curto prazo|médio prazo", "dificuldade": "fácil|media|difícil"}
  ],
  "insight_nps": "análise do NPS e índice de indicação com comparativo do mercado de beleza (NPS acima de 50 é excelente, 25-50 é bom, 0-25 é neutro, negativo é crítico)",
  "insight_retencao": "análise da taxa de retorno declarada e estratégias para aumentá-la",
  "insight_ticket": "análise do ticket médio declarado e oportunidades de aumento via upsell ou novos serviços",
  "insight_horario": "análise dos horários de visita e recomendações operacionais",
  "oportunidades_receita": [
    "oportunidade concreta baseada nos dados coletados"
  ]
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[IA] Anthropic error:', err)
      return NextResponse.json({ error: 'Erro ao consultar a IA. Tente novamente.' }, { status: 500 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || ''

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ error: 'A IA retornou um formato inesperado.', raw: text }, { status: 500 })
    }
  } catch (e) {
    console.error('[IA] fetch error:', e)
    return NextResponse.json({ error: 'Falha na conexão com a IA.' }, { status: 500 })
  }
}
