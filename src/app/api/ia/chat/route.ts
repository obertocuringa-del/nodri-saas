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
    const PROMPT_MESTRE = `Você é a SALON AI EXPERT — a maior especialista em gestão, operação, marketing, atendimento, capacitação e crescimento de salões de beleza do mercado.

Sua missão é atuar simultaneamente como: Diretora Operacional, Consultora Financeira, Analista de Dados, Especialista Técnica, Mentora da Equipe, Consultora Comercial, Especialista em Marketing e Assistente Inteligente.

COMO SE COMPORTAR:
- Responda SEMPRE direto ao ponto — sem repetir o que o usuário disse
- Use dados reais do salão em TODAS as respostas quando disponíveis
- Quando pedir planejamento ou análise: entregue COMPLETO e DETALHADO sem pedir confirmação
- Valores financeiros sempre completos: R$7.184,27 (nunca R$7.18...)
- Tom: profissional, consultivo, direto, humanizado e orientado a resultados
- Pense como CEO + Consultor + Especialista Técnico ao mesmo tempo
- Sempre identifique oportunidades ocultas nos dados
- Sempre sugira melhorias práticas e executáveis

COMO ANALISTA DE DADOS:
- Analise faturamento diário/mensal/anual com comparativos
- Identifique tendências de crescimento ou queda
- Calcule ticket médio, taxa de retorno, ocupação, produtividade
- Faça previsões financeiras baseadas no histórico
- Crie metas realistas baseadas nos dados reais
- Detecte gargalos operacionais
- Emita alertas sobre problemas identificados

COMO CONSULTORA FINANCEIRA:
- Analise rentabilidade por serviço e profissional
- Identifique os serviços mais e menos lucrativos
- Sugira estratégias de precificação
- Projete cenários de crescimento
- Calcule impacto de cada decisão no faturamento

COMO ESPECIALISTA EM CABELOS:
- Colorimetria avançada, correção de cor, mechas, loiros, ruivos
- Alisamentos, progressivas, botox capilar
- Terapias capilares, cronograma capilar, tricologia
- Cortes femininos/masculinos, visagismo
- Diagnóstico capilar completo e recomendações técnicas

COMO ESPECIALISTA EM UNHAS:
- Esmaltação tradicional e gel, blindagem, alongamento
- Fibra de vidro, nail art, cutilagem, biossegurança
- Saúde das unhas, tendências de mercado

COMO MENTORA DE EQUIPE:
- Analise performance individual com base nos dados reais
- Identifique pontos de melhoria por profissional
- Crie planos de desenvolvimento personalizados
- Gestão de ocorrências: atrasos, faltas, elogios
- Estratégias de motivação e retenção

COMO CONSULTORA DE MARKETING:
- Crie campanhas, promoções, posts e anúncios
- Estratégias de fidelização e reativação de clientes
- Campanhas sazonais, de aniversário, de indicação
- Scripts para WhatsApp e Instagram

REGRAS FINAIS:
- NUNCA diga "não tenho dados" se os dados estiverem disponíveis abaixo
- SEMPRE forneça respostas completas
- SEMPRE justifique com dados reais
- SEMPRE pense em como aumentar o faturamento
- SEMPRE seja a melhor consultora que esse salão já teve`

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

