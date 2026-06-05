import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
// Gemini via fetch como fallback

function formatarDadosSalao(dados: any, profissionalId?: string): string {
  const linhas: string[] = []
  const fmtR = (v: number) => `R$${(v||0).toFixed(2)}`
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  // Profissionais
  if (dados.profissionais?.length) {
    linhas.push('## PROFISSIONAIS DO SALÃO')
    dados.profissionais.forEach((p: any) => {
      linhas.push(`- ${p.nome_completo} (${p.cargo}) — ${p.ativo ? 'Ativo' : 'Inativo'}`)
    })
    linhas.push('')
  }

  // Dados financeiros de relatorio_periodos (JSONB)
  if (dados.periodos_raw?.length) {
    linhas.push('## DADOS FINANCEIROS POR PROFISSIONAL')
    // Agrega faturamento por profissional/mês
    const fatMap: Record<string, Record<string, number>> = {}
    const servMap: Record<string, Record<string, number>> = {}
    const tickMap: Record<string, Record<string, number>> = {}
    for (const per of dados.periodos_raw) {
      const chave = `${MESES[per.mes-1]}/${String(per.ano).slice(2)}`
      for (const item of (per.prof_pagamentos || [])) {
        const nome = item.profissional || ''; if (!nome) continue
        if (!fatMap[nome]) fatMap[nome] = {}
        fatMap[nome][chave] = (fatMap[nome][chave]||0) + Number(item.valor_a_pagar||0) + Number(item.desconto||0)
      }
      for (const item of (per.prof_servicos || [])) {
        const nome = item.profissional || ''; if (!nome) continue
        if (!servMap[nome]) servMap[nome] = {}
        servMap[nome][chave] = (servMap[nome][chave]||0) + Number(item.quantidade||0)
      }
      for (const item of (per.prof_ticket || [])) {
        const nome = item.profissional || ''; if (!nome) continue
        if (!tickMap[nome]) tickMap[nome] = {}
        tickMap[nome][chave] = Number(item.ticket_medio||0)
      }
    }
    // Total geral do salão por mês
    const totaisMes: Record<string, number> = {}
    for (const per of dados.periodos_raw) {
      const chave = `${MESES[per.mes-1]}/${String(per.ano).slice(2)}`
      for (const item of (per.resumo_mensal || [])) {
        totaisMes[chave] = (totaisMes[chave]||0) + Number(item.faturamento_total||0)
      }
    }
    if (Object.keys(totaisMes).length) {
      linhas.push('### FATURAMENTO TOTAL DO SALÃO')
      Object.entries(totaisMes).slice(-12).forEach(([mes, fat]) => {
        linhas.push(`  ${mes}: ${fmtR(fat)}`)
      })
      linhas.push('')
    }
    // Ocupação por profissional
    const ocupMap: Record<string, Record<string, number>> = {}
    const prefMap: Record<string, Record<string, number>> = {}
    for (const per of dados.periodos_raw) {
      const chave = `${MESES[per.mes-1]}/${String(per.ano).slice(2)}`
      for (const item of (per.prof_ocupacao || [])) {
        const nome = item.profissional || ''; if (!nome) continue
        if (!ocupMap[nome]) ocupMap[nome] = {}
        ocupMap[nome][chave] = Number(item.ocupacao || 0)
      }
      for (const item of (per.prof_preferencia || [])) {
        const nome = item.profissional || ''; if (!nome) continue
        if (!prefMap[nome]) prefMap[nome] = {}
        prefMap[nome][chave] = Number(item.preferencia || 0)
      }
    }

    // Por profissional
    const profs = Object.keys(fatMap).sort()
    for (const nome of profs) {
      const meses = Object.keys(fatMap[nome])
      linhas.push(`### ${nome}`)
      meses.slice(-12).forEach(mes => {
        const fat = fatMap[nome][mes]||0
        const serv = servMap[nome]?.[mes]||0
        const tick = tickMap[nome]?.[mes]||0
        const ocup = ocupMap[nome]?.[mes]
        const pref = prefMap[nome]?.[mes]
        const ocupStr = ocup !== undefined ? `, Ocupação ${ocup}%` : ''
        const prefStr = pref !== undefined ? `, Preferências ${pref}` : ''
        linhas.push(`  ${mes}: Fat ${fmtR(fat)}, ${serv} serviços, Ticket ${fmtR(tick)}${ocupStr}${prefStr}`)
      })
    }
    linhas.push('')
  }

  // Ocorrências de profissionais (atraso, falta, saída cedo, etc.)
  if (dados.feedbacks_prof?.length) {
    linhas.push('## OCORRÊNCIAS DE PROFISSIONAIS')
    const contagemOcorr: Record<string, number> = {}
    dados.feedbacks_prof.forEach((f: any) => {
      const tipo = f.tipo?.toUpperCase() || 'OUTRO'
      contagemOcorr[tipo] = (contagemOcorr[tipo] || 0) + 1
    })
    Object.entries(contagemOcorr).sort((a,b) => b[1]-a[1]).forEach(([tipo, qtd]) => {
      linhas.push(`- ${tipo}: ${qtd} ocorrência(s)`)
    })
    linhas.push('Detalhe das ocorrências:')
    dados.feedbacks_prof.slice(-20).forEach((f: any) => {
      const data = f.criado_em ? new Date(f.criado_em).toLocaleDateString('pt-BR') : ''
      linhas.push(`  [${f.tipo?.toUpperCase()}] ${data} — ${f.ocorrido_descricao || ''}${f.descricao ? ': ' + f.descricao : ''}`)
    })
    linhas.push('')
  }

  // Feedbacks de clientes
  if (dados.feedbacks_clientes?.length) {
    linhas.push('## FEEDBACKS DE CLIENTES')
    dados.feedbacks_clientes.slice(-10).forEach((f: any) => {
      linhas.push(`- Nota: ${f.nota_geral || '?'} â€” ${f.comentario || ''}`)
    })
    linhas.push('')
  }

  // PendÃªncias em aberto
  if (dados.pendencias?.length) {
    linhas.push('## PENDÃŠNCIAS EM ABERTO')
    dados.pendencias.forEach((p: any) => {
      const prof = dados.profissionais?.find((pr: any) => pr.id === p.profissional_id)
      const nome = prof?.nome_completo || 'Desconhecido'
      const venc = p.data_limite ? ` [Vence: ${p.data_limite}]` : ''
      linhas.push(`- ${nome}: ${p.mensagem}${venc}`)
    })
    linhas.push('')
  }

  // Dados especÃ­ficos do profissional
  if (profissionalId && dados.prof_especifico) {
    const pe = dados.prof_especifico
    linhas.push('## PROFISSIONAL EM FOCO')
    if (pe.dados) {
      const d = pe.dados
      linhas.push(`Nome: ${d.nome_completo}, Cargo: ${d.cargo}, CNPJ: ${d.cnpj || 'nÃ£o cadastrado'}`)
    }
    if (pe.periodos?.length) {
      linhas.push('Ãšltimos perÃ­odos:')
      pe.periodos.slice(-6).forEach((r: any) => {
        linhas.push(`  - ${r.ano}/${String(r.mes).padStart(2,'0')}: Fat R$${(r.faturamento||0).toFixed(2)}`)
      })
    }
    linhas.push('')
  }

  return linhas.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'NÃ£o autorizado' }, { status: 401 })

    const body = await req.json()
    const { mensagens, profissional_id, conversa_id } = body

    if (!mensagens?.length) {
      return NextResponse.json({ error: 'mensagens sÃ£o obrigatÃ³rias' }, { status: 400 })
    }

    // 1. Verificar se IA estÃ¡ ativa para o salÃ£o
    const { data: salaoData } = await supabaseAdmin
      .from('saloes')
      .select('ia_ativa')
      .eq('id', salaoId)
      .maybeSingle()

    if (!salaoData?.ia_ativa) {
      return NextResponse.json({ error: 'IA nÃ£o ativada para este salÃ£o' }, { status: 403 })
    }

    // 2. Buscar config global da IA
    const { data: configGlobal } = await supabaseAdmin
      .from('ia_config_global')
      .select('api_key, modelo, instrucoes_base, ativo')
      .limit(1)
      .maybeSingle()

    if (!configGlobal?.api_key) {
      return NextResponse.json({ error: 'API key nÃ£o configurada pelo administrador.' }, { status: 422 })
    }

    if (!configGlobal.ativo) {
      return NextResponse.json({ error: 'IA desativada pelo administrador.' }, { status: 403 })
    }

    // 3. Buscar config adicional do salÃ£o (contexto especÃ­fico)
    const { data: configSalao } = await supabaseAdmin
      .from('ia_configuracao')
      .select('contexto_adicional')
      .eq('salao_id', salaoId)
      .maybeSingle()

    const config = {
      api_key: configGlobal.api_key,
      modelo: configGlobal.modelo,
      instrucoes_base: configGlobal.instrucoes_base,
      contexto_adicional: configSalao?.contexto_adicional || '',
    }

    if (!config?.api_key) {
      return NextResponse.json({ error: 'API key nÃ£o configurada pelo administrador.' }, { status: 422 })
    }

    // 4. Buscar dados do salÃ£o
    const dataInicio = new Date()
    dataInicio.setMonth(dataInicio.getMonth() - 24)
    const dataInicioStr = dataInicio.toISOString().slice(0, 7)

    const anoInicio = parseInt(dataInicioStr.slice(0,4)) - 1
    const [
      { data: profissionais },
      { data: periodos },
      { data: feedbacksProf },
      { data: feedbacksClientes },
      { data: pendencias },
    ] = await Promise.all([
      supabaseAdmin.from('profissionais').select('id, nome_completo, cargo, ativo').eq('salao_id', salaoId),
      supabaseAdmin.from('relatorio_periodos').select('ano, mes, prof_pagamentos, prof_servicos, prof_ticket, prof_preferencia, prof_ocupacao, resumo_mensal').eq('salao_id', salaoId).gte('ano', anoInicio).order('ano').order('mes'),
      supabaseAdmin.from('feedback_prof_respostas').select('profissional_id, tipo, ocorrido_descricao, descricao, criado_em').eq('salao_id', salaoId).order('criado_em', { ascending: false }).limit(100),
      supabaseAdmin.from('feedback_respostas').select('nota_geral, comentario, criado_em').eq('salao_id', salaoId).order('criado_em', { ascending: false }).limit(20),
      supabaseAdmin.from('pendencias_profissionais').select('profissional_id, mensagem, data_limite').eq('salao_id', salaoId).eq('resolvido', false),
    ])

    // Extrai faturamento por profissional dos períodos
    const fatPorProf: Record<string, any[]> = {}
    for (const per of (periodos || [])) {
      for (const item of (per.prof_pagamentos || [])) {
        const nome = item.profissional || ''
        if (!nome) continue
        if (!fatPorProf[nome]) fatPorProf[nome] = []
        fatPorProf[nome].push({ ano: per.ano, mes: per.mes, valor: item.valor_a_pagar + (item.desconto||0) })
      }
    }
    const relatorioPeriodos = Object.entries(fatPorProf).map(([profissional, meses]) => ({
      profissional, meses
    }))

    const dadosSalao: any = {
      profissionais: profissionais || [],
      relatorio_periodos: relatorioPeriodos || [],
      periodos_raw: periodos || [],
      feedbacks_prof: feedbacksProf || [],
      feedbacks_clientes: feedbacksClientes || [],
      pendencias: pendencias || [],
    }

    // 5. Dados especÃ­ficos do profissional
    if (profissional_id) {
      const [{ data: dadosProf }, { data: periodosProf }] = await Promise.all([
        supabaseAdmin.from('profissionais').select('*').eq('id', profissional_id).maybeSingle(),
        supabaseAdmin.from('prof_pagamentos').select('*').eq('profissional_id', profissional_id).order('ano').order('mes'),
      ])
      dadosSalao.prof_especifico = {
        dados: dadosProf,
        periodos: periodosProf || [],
      }
    }

    const dadosFormatados = formatarDadosSalao(dadosSalao, profissional_id)

    // 6. Carregar histórico de conversas anteriores para memória
    let memoriaConversa = ''
    if (profissional_id) {
      const { data: conversasAnteriores } = await supabaseAdmin
        .from('ia_conversas')
        .select('mensagens, atualizado_em')
        .eq('salao_id', salaoId)
        .eq('profissional_id', profissional_id)
        .order('atualizado_em', { ascending: false })
        .limit(3)

      if (conversasAnteriores && conversasAnteriores.length > 1) {
        const historicoTexto = conversasAnteriores.slice(1).flatMap((c: any) =>
          (c.mensagens || []).slice(-4).map((m: any) => `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.content}`)
        ).join('\n')
        if (historicoTexto) {
          memoriaConversa = `\nCONVERSAS ANTERIORES (contexto de memória):\n${historicoTexto}\n`
        }
      }
    }

    // 7. Montar system prompt com PROMPT MESTRE
    const PROMPT_MESTRE = `Você é a SALON AI EXPERT — a maior consultora especialista em gestão, operação, marketing, finanças, atendimento e crescimento de salões de beleza do mercado brasileiro.

Você atua simultaneamente como: Diretora Operacional, Consultora Financeira, Analista de BI, Especialista Técnica em Beleza, Mentora de Equipe, Consultora Comercial, Especialista em Marketing e Assistente de Alta Performance.

O usuário nunca deve sentir que está conversando com um chatbot. Ele deve sentir que possui um diretor estratégico, financeiro, operacional e comercial trabalhando para ele 24 horas por dia.

═══════════════════════════════════════
REGRA NÚMERO 1 — JAMAIS RESPONDA APENAS O QUE FOI PERGUNTADO
═══════════════════════════════════════
SEMPRE analise dados relacionados e apresente oportunidades, riscos e recomendações adicionais.

Exemplo ERRADO:
Usuário: "Quanto Patrick faturou em janeiro?"
Resposta errada: "Patrick faturou R$3.272,62."

Exemplo CORRETO:
"Patrick faturou R$3.272,62 em janeiro.
Além disso identifiquei:
• Ocupação de apenas 33,4% — agenda com grande capacidade ociosa
• 5 atrasos registrados no período — risco de insatisfação de clientes
• Ticket médio de R$165,78 — abaixo do potencial para o cargo
• 0 produtos vendidos — oportunidade de receita desperdiçada
• Recuperando 30% da agenda ociosa, o faturamento pode chegar a R$4.200"

═══════════════════════════════════════
REGRAS DE COMPORTAMENTO OBRIGATÓRIAS
═══════════════════════════════════════
• Responda DIRETO ao ponto — sem repetir o que o usuário disse
• Use dados reais SEMPRE que existirem — NUNCA diga "não tenho dados" se estiverem abaixo
• Quando pedir planejamento: entregue COMPLETO sem pedir confirmação
• Valores financeiros SEMPRE completos: R$7.184,27 (jamais R$7.18...)
• Tom: consultivo, direto, humanizado, orientado a resultados
• Pense como CEO + Analista Financeiro + Especialista Técnico ao mesmo tempo
• Identifique SEMPRE as oportunidades ocultas nos dados
• Cada resposta deve parecer um relatório de consultoria premium de R$5.000/mês
• PROIBIDO: responder apenas o valor solicitado, respostas genéricas, respostas sem números, respostas sem oportunidades, respostas sem recomendações, respostas sem insight exclusivo

═══════════════════════════════════════
PADRÃO VISUAL OBRIGATÓRIO DE RESPOSTAS
═══════════════════════════════════════
TODA resposta deve seguir esta estrutura (adapte ao contexto):

**📊 RESUMO EXECUTIVO**
Situação Atual: [faturamento, ticket médio, serviços, ocupação]
Principal Gargalo: [o problema mais crítico]
Principal Oportunidade: [onde está o dinheiro]

**📈 DIAGNÓSTICO DOS DADOS**
- Mostre os números em tabelas ou listas organizadas
- Faturamento por período com variação %
- Ticket médio, serviços, ocupação, preferências
- Ocorrências: atrasos, faltas, saídas antecipadas

**🚨 GARGALOS IDENTIFICADOS**
🚨 [Problema 1 com impacto financeiro estimado]
🚨 [Problema 2 com impacto financeiro estimado]
🚨 [Problema 3 com impacto financeiro estimado]

**💰 OPORTUNIDADES ESCONDIDAS**
✅ [Oportunidade 1] → Potencial: R$X.XXX
✅ [Oportunidade 2] → Potencial: R$X.XXX

**👥 ANÁLISE DE CLIENTES** (quando dados disponíveis)
- Clientes ativos, inativos, VIPs, em risco de abandono
- Impacto financeiro da reativação dos inativos

**📅 ANÁLISE DA AGENDA** (quando dados disponíveis)
- Ocupação atual vs ideal (meta: mínimo 70%)
- Horários vagos com potencial de receita

**💵 ANÁLISE FINANCEIRA**
- Faturamento, ticket médio, receita em risco, receita potencial

**📈 PLANO DE AÇÃO**
🔥 Próximos 7 dias: [ações imediatas]
📅 Próximos 30 dias: [ações de crescimento]
🗓️ Próximos 90 dias: [ações estratégicas]

**🎯 METAS**
| Indicador | Atual | Meta | Crescimento |
|-----------|-------|------|-------------|
| Faturamento | R$X | R$X | +X% |
| Ticket Médio | R$X | R$X | +X% |
| Ocupação | X% | 70% | +X% |

**🔮 PREVISÃO DE CENÁRIOS**
🔵 Conservador: R$X.XXX (50% do plano) — probabilidade 70%
🟡 Realista: R$X.XXX (75% do plano) — probabilidade 55%
🟢 Otimista: R$X.XXX (100% do plano) — probabilidade 35%

**🤖 INSIGHT EXCLUSIVO DA IA**
[Algo importante que o usuário NÃO perguntou mas que os dados revelam — deve ser surpreendente e acionável]

**📋 PRÓXIMOS PASSOS**
1. [Ação imediata hoje]
2. [Ação esta semana]
3. [Ação este mês]

REGRAS DE FORMATAÇÃO:
• Use **negrito** para números, metas e informações críticas
• Use tabelas quando comparar dados
• Use listas organizadas — NUNCA blocos de texto corrido
• Separe bem as seções com espaçamento
• Respostas devem ser elegantes e fáceis de ler no celular

═══════════════════════════════════════
ANÁLISE DE OCORRÊNCIAS (regra especial)
═══════════════════════════════════════
Quando houver ocorrências (atraso, falta, saída antecipada, reunião):
• Calcule o impacto financeiro: "5 atrasos = estimativa de X clientes impactados = R$Y em risco"
• Conecte ocorrências com indicadores de faturamento e ocupação
• Identifique padrões: "Atrasos concentrados às segundas → ocupação 33% na semana seguinte"
• Dê recomendações práticas de gestão de pessoas

═══════════════════════════════════════
INTELIGÊNCIA ANALÍTICA AVANÇADA
═══════════════════════════════════════

ANÁLISE DE SERVIÇOS (aplique sempre):
• Identifique os TOP 5 serviços mais lucrativos com valor médio por atendimento
• Mostre onde está concentrado o faturamento
• Calcule: "Aumentar X serviço em 20% = +R$Y de faturamento"

ANÁLISE DE CLIENTES (aplique sempre):
• Estime clientes inativos (+90 dias sem retorno)
• Identifique clientes VIP (maior frequência + ticket)
• Calcule impacto da reativação: "15 clientes inativos × ticket médio = R$X"

PREVISÃO SEMANAL (sempre que der meta mensal):
• Divida a meta em semanas: Meta ÷ 4 semanas
• Calcule por dia útil: Meta semanal ÷ 5 dias
• Calcule clientes necessários: Meta ÷ ticket médio

PROBABILIDADE DE META (sempre que der meta):
• Estime % de probabilidade atual baseada no histórico
• Mostre probabilidade com o plano executado

LUCRO vs FATURAMENTO (aplique quando relevante):
• Separe faturamento bruto do ganho real do profissional
• Calcule margem estimada por tipo de serviço
• Mostre quais serviços têm maior margem de lucro

ANÁLISE DE FEEDBACKS (cruze sempre com dados):
• Conecte problemas de feedback com impacto financeiro

═══════════════════════════════════════
ESPECIALIDADES TÉCNICAS
═══════════════════════════════════════

CABELOS: Colorimetria, mechas, loiros, ruivos, alisamentos, progressivas, botox capilar, terapias, tricologia, visagismo, tendências mundiais

UNHAS: Gel, blindagem, alongamento, nail art, biossegurança, saúde das unhas

GESTÃO: Fluxo de caixa, precificação, comissões, estoque, KPIs, DRE, CAC, LTV, churn

MARKETING: Campanhas sazonais, reativação, indicação, WhatsApp, Instagram, scripts prontos

═══════════════════════════════════════
MISSÃO FINAL
═══════════════════════════════════════
Ser a IA mais completa do mercado da beleza. Cada resposta deve fazer o usuário sentir que está conversando com uma consultoria premium de R$5.000/mês — não com um chatbot comum.`

    const systemPrompt = `${PROMPT_MESTRE}

${config.instrucoes_base ? `\nINSTRUÇÕES CUSTOMIZADAS DO PROPRIETÁRIO:\n${config.instrucoes_base}\n` : ''}
${config.contexto_adicional ? `\nCONTEXTO ESPECÍFICO DO SALÃO:\n${config.contexto_adicional}\n` : ''}
${memoriaConversa}
DADOS REAIS DO SALÃO (use sempre que disponíveis):
${dadosFormatados}`

    // 9. Chamar Google Gemini API
    // Detecta automaticamente o modelo pelo prefixo
    const modelo = 'gemini-2.5-flash'
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${config.api_key}`

    let resposta = ''

    if (modelo.startsWith('claude')) {
      // ── Anthropic Claude ──
      const anthropic = new Anthropic({ apiKey: config.api_key })
      const response = await anthropic.messages.create({
        model: modelo,
        max_tokens: 2048,
        system: systemPrompt,
        messages: mensagens.map((m: any) => ({ role: m.role, content: m.content })),
      })
      resposta = response.content[0].type === 'text' ? response.content[0].text : ''
    } else {
      // ── Google Gemini ──
      const geminiBody = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: mensagens.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
      }
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      })
      if (!geminiRes.ok) {
        const errBody = await geminiRes.text()
        return NextResponse.json({ error: `Gemini API erro ${geminiRes.status}: ${errBody}` }, { status: 500 })
      }
      const geminiData = await geminiRes.json()
      resposta = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta da IA.'
    }

    // 10. Salvar/atualizar conversa
    let conversaIdFinal = conversa_id
    const todasMensagens = [
      ...mensagens,
      { role: 'assistant', content: resposta },
    ]

    if (conversaIdFinal) {
      await supabaseAdmin
        .from('ia_conversas')
        .update({ mensagens: todasMensagens, atualizado_em: new Date().toISOString() })
        .eq('id', conversaIdFinal)
        .eq('salao_id', salaoId)
    } else {
      const { data: novaConversa } = await supabaseAdmin
        .from('ia_conversas')
        .insert({
          salao_id: salaoId,
          profissional_id: profissional_id || null,
          mensagens: todasMensagens,
        })
        .select('id')
        .single()
      conversaIdFinal = novaConversa?.id
    }

    return NextResponse.json({ resposta, conversa_id: conversaIdFinal })
  } catch (err: any) {
    console.error('IA chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

