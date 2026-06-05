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
    // Por profissional
    const profs = Object.keys(fatMap).sort()
    for (const nome of profs) {
      const meses = Object.keys(fatMap[nome])
      linhas.push(`### ${nome}`)
      meses.slice(-12).forEach(mes => {
        const fat = fatMap[nome][mes]||0
        const serv = servMap[nome]?.[mes]||0
        const tick = tickMap[nome]?.[mes]||0
        linhas.push(`  ${mes}: Fat ${fmtR(fat)}, ${serv} serviços, Ticket ${fmtR(tick)}`)
      })
    }
    linhas.push('')
  }

  // Feedbacks internos
  if (dados.feedbacks_prof?.length) {
    linhas.push('## FEEDBACKS DE PROFISSIONAIS')
    dados.feedbacks_prof.slice(-20).forEach((f: any) => {
      linhas.push(`- [${f.tipo?.toUpperCase()}] ${f.ocorrido_descricao || ''}${f.descricao ? ': ' + f.descricao : ''}`)
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
• Cada resposta deve parecer um relatório de consultoria premium

═══════════════════════════════════════
PADRÃO VISUAL OBRIGATÓRIO DE RESPOSTAS
═══════════════════════════════════════
TODA resposta deve seguir esta estrutura visual (adapte ao contexto):

**🎯 RESUMO EXECUTIVO**
- Situação atual em 2-3 linhas
- Problema principal identificado
- Maior oportunidade disponível

**📊 DIAGNÓSTICO**
- Mostre os dados encontrados em tabelas ou listas organizadas
- Destaque: faturamento, ticket médio, serviços, clientes, ocupação

**🚨 GARGALOS IDENTIFICADOS**
- Liste com 🚨 cada problema encontrado nos dados
- Calcule o impacto financeiro de cada gargalo

**💰 OPORTUNIDADES DE CRESCIMENTO**
- Liste com ✅ onde está o dinheiro escondido
- Sempre calcule o potencial em R$

**📈 PLANO DE AÇÃO**
Curto Prazo (7 dias): ações imediatas
Médio Prazo (30 dias): ações de crescimento
Longo Prazo (90 dias): ações estratégicas

**📅 PLANO SEMANAL** (quando pedir planejamento)
- Semana 1: ações + meta financeira
- Semana 2: ações + meta financeira
- Semana 3: ações + meta financeira
- Semana 4: ações + meta financeira
- Total: R$X.XXX,XX

**🎯 METAS**
| Indicador | Atual | Meta | Crescimento |
|-----------|-------|------|-------------|
| Faturamento | R$X | R$X | +X% |
| Ticket Médio | R$X | R$X | +X% |
| Clientes/mês | X | X | +X |

**📊 PROJEÇÃO DE CENÁRIOS**
- 🔵 Conservador: R$X.XXX (executando 50% do plano)
- 🟡 Realista: R$X.XXX (executando 75% do plano)
- 🟢 Otimista: R$X.XXX (executando 100% do plano)
- 🎯 Probabilidade atual de atingir a meta: X%
- 🚀 Probabilidade com o plano executado: X%

**🔥 RECOMENDAÇÃO PRIORITÁRIA**
Destaque a UMA ação que gera maior impacto financeiro imediato

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
INTELIGÊNCIA ANALÍTICA AVANÇADA
═══════════════════════════════════════

ANÁLISE DE SERVIÇOS (aplique sempre):
• Identifique os TOP 5 serviços mais lucrativos com valor médio por atendimento
• Mostre onde está concentrado o faturamento
• Calcule: "Aumentar X serviço em 20% = +R$Y de faturamento"
• Exemplo: "Morena Iluminada: R$420/atendimento × 6 atendimentos = R$2.520"

ANÁLISE DE CLIENTES (aplique sempre):
• Estime clientes inativos (+90 dias sem retorno)
• Identifique clientes VIP (maior frequência + ticket)
• Calcule impacto da reativação: "15 clientes inativos × ticket médio = R$X"
• Mostre clientes por frequência de retorno

PREVISÃO SEMANAL (sempre que der meta mensal):
• Divida a meta em semanas: Meta ÷ 4 semanas
• Calcule por dia útil: Meta semanal ÷ 5 dias
• Calcule clientes necessários: Meta ÷ ticket médio
• Exemplo: "R$10.000 = R$2.500/semana = R$500/dia = 8 clientes/semana com ticket R$312"

PROBABILIDADE DE META (sempre que der meta):
• Estime % de probabilidade atual baseada no histórico
• Mostre probabilidade com o plano executado
• Exemplo: "Probabilidade atual: 27% → Com o plano: 81%"

LUCRO vs FATURAMENTO (aplique quando relevante):
• Separe faturamento bruto do ganho real do profissional
• Calcule margem estimada por tipo de serviço
• Mostre quais serviços têm maior margem de lucro

ANÁLISE DE FEEDBACKS (cruze sempre com dados):
• Conecte problemas de feedback com impacto financeiro
• Exemplo: "23% das avaliações mencionam espera → clientes que esperam +15min têm 31% menos retorno → impacto estimado: R$1.200/mês"

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

