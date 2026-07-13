import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
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

  const prompt = `Você é o diretor estratégico, financeiro, operacional e comercial de uma consultoria premium especializada em salões de beleza no Brasil. Você trabalha 24 horas por dia para o dono do salão e NUNCA responde apenas o que foi perguntado — você sempre entrega uma análise completa de consultoria empresarial.

REGRAS OBRIGATÓRIAS:
1. NUNCA responda apenas o dado solicitado. Sempre analise dados relacionados e apresente oportunidades, riscos e recomendações adicionais.
2. Toda resposta deve fazer o dono do salão sentir que possui um diretor estratégico trabalhando para ele.
3. Sempre inclua números, percentuais, estimativas de receita e comparativos.
4. Sempre encontre algo que o usuário NÃO perguntou mas que é relevante (insight exclusivo).
5. Nunca seja genérico — cite dados específicos do feedback recebido.

Analise os dados de feedback do salão "${payload.salaoNome}" e entregue uma análise completa de consultoria premium.

DADOS DO FEEDBACK:
${resumo.join('\n')}

Forneça sua análise no seguinte formato JSON (responda APENAS com JSON válido, sem markdown):
{
  "resumo_executivo": {
    "situacao_atual": "frase descrevendo a situação atual com dados concretos do feedback",
    "resultado_encontrado": "principal achado quantificado (ex: NPS X, média Y/10, Z% de promotores)",
    "principal_problema": "o gargalo mais crítico identificado nos dados",
    "principal_oportunidade": "a maior oportunidade de crescimento identificada"
  },
  "nota_geral": 0,
  "diagnostico": {
    "nps": {"valor": 0, "promotores_pct": 0, "neutros_pct": 0, "detratores_pct": 0, "classificacao": "excelente|bom|neutro|critico", "benchmark": "comparativo com mercado de beleza"},
    "media_geral": 0,
    "tendencia": "crescendo|estavel|caindo"
  },
  "gargalos": [
    {"emoji": "🚨", "titulo": "...", "descricao": "problema com dados específicos e impacto financeiro estimado"}
  ],
  "oportunidades_escondidas": [
    {"emoji": "✅", "titulo": "...", "descricao": "oportunidade com potencial de receita estimado em R$"}
  ],
  "pontos_fortes": [
    {"titulo": "...", "descricao": "cite dados específicos do feedback"}
  ],
  "areas_melhoria": [
    {"titulo": "...", "descricao": "cite o problema com dados e impacto no negócio", "prioridade": "alta|media|baixa"}
  ],
  "analise_clientes": {
    "perfil_dominante": "descrição do perfil mais frequente",
    "clientes_em_risco": "estimativa de clientes que podem não voltar com base nos detratores",
    "potencial_reativacao": "estimativa de receita recuperável"
  },
  "analise_servicos": {
    "mais_elogiados": ["serviço 1", "serviço 2"],
    "mais_criticados": ["serviço 1", "serviço 2"],
    "oportunidade_upsell": "serviço ou pacote que pode aumentar o ticket médio"
  },
  "analise_agenda": {
    "horarios_pico": "horários mais mencionados pelos clientes",
    "horarios_problema": "horários com mais reclamações",
    "recomendacao_operacional": "ação concreta para otimizar a agenda"
  },
  "analise_financeira": {
    "ticket_medio_estimado": "estimativa baseada nos dados de feedback",
    "receita_em_risco": "valor estimado em risco pelos detratores",
    "receita_potencial": "valor estimado de oportunidade identificada"
  },
  "plano_acao": {
    "proximos_7_dias": [
      {"acao": "ação específica e executável", "impacto": "resultado esperado", "dificuldade": "fácil|media|difícil"}
    ],
    "proximos_30_dias": [
      {"acao": "ação de médio prazo", "impacto": "resultado esperado", "dificuldade": "fácil|media|difícil"}
    ],
    "proximos_90_dias": [
      {"acao": "ação estratégica", "impacto": "resultado esperado", "dificuldade": "fácil|media|difícil"}
    ]
  },
  "previsao": {
    "cenario_conservador": {"descricao": "mantendo operação atual", "probabilidade_pct": 70},
    "cenario_realista": {"descricao": "aplicando ações de curto prazo", "probabilidade_pct": 55},
    "cenario_otimista": {"descricao": "aplicando plano completo", "probabilidade_pct": 35}
  },
  "insight_exclusivo": "algo importante que o dono do salão NÃO perguntou mas que os dados revelam — deve ser surpreendente e acionável",
  "insight_nps": "análise do NPS com comparativo: acima de 50 é excelente, 25-50 é bom, 0-25 é neutro, negativo é crítico",
  "insight_retencao": "análise da taxa de retorno e estratégias concretas para aumentá-la",
  "insight_ticket": "oportunidades de upsell ou novos serviços baseadas nos dados",
  "insight_horario": "recomendações operacionais baseadas nos horários mencionados",
  "oportunidades_receita": [
    "oportunidade concreta com valor estimado em R$"
  ],
  "acoes_prioritarias": [
    {"acao": "ação específica e executável", "impacto": "impacto esperado no negócio", "prazo": "imediato|curto prazo|médio prazo", "dificuldade": "fácil|media|difícil"}
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
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
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
