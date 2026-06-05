import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
// Gemini via fetch como fallback

function formatarDadosSalao(dados: any, profissionalId?: string): string {
  const linhas: string[] = []

  // Profissionais
  if (dados.profissionais?.length) {
    linhas.push('## PROFISSIONAIS DO SALÃƒO')
    dados.profissionais.forEach((p: any) => {
      linhas.push(`- ${p.nome_completo} (${p.cargo}) â€” ${p.ativo ? 'Ativo' : 'Inativo'}`)
    })
    linhas.push('')
  }

  // RelatÃ³rio de perÃ­odos (Ãºltimos meses)
  if (dados.relatorio_periodos?.length) {
    linhas.push('## DADOS FINANCEIROS (Ãºltimos perÃ­odos)')
    const porProf: Record<string, any[]> = {}
    dados.relatorio_periodos.forEach((r: any) => {
      if (!porProf[r.profissional_id]) porProf[r.profissional_id] = []
      porProf[r.profissional_id].push(r)
    })
    for (const profId of Object.keys(porProf)) {
      const prof = dados.profissionais?.find((p: any) => p.id === profId)
      const nome = prof?.nome_completo || profId
      linhas.push(`### ${nome}`)
      porProf[profId].slice(-6).forEach((r: any) => {
        linhas.push(`  - ${r.ano}/${String(r.mes).padStart(2,'0')}: Fat R$${(r.faturamento||0).toFixed(2)}, ServiÃ§os: ${r.total_servicos||0}, Ticket: R$${(r.ticket_medio||0).toFixed(2)}`)
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

    const [
      { data: profissionais },
      { data: relatorioPeriodos },
      { data: feedbacksProf },
      { data: feedbacksClientes },
      { data: pendencias },
    ] = await Promise.all([
      supabaseAdmin.from('profissionais').select('id, nome_completo, cargo, ativo').eq('salao_id', salaoId),
      supabaseAdmin.from('prof_pagamentos').select('profissional_id, ano, mes, faturamento, total_servicos, ticket_medio').eq('salao_id', salaoId).gte('ano', parseInt(dataInicioStr.slice(0,4)) - 1),
      supabaseAdmin.from('feedback_prof_respostas').select('profissional_id, tipo, ocorrido_descricao, descricao, criado_em').eq('salao_id', salaoId).order('criado_em', { ascending: false }).limit(100),
      supabaseAdmin.from('feedback_respostas').select('nota_geral, comentario, criado_em').eq('salao_id', salaoId).order('criado_em', { ascending: false }).limit(20),
      supabaseAdmin.from('pendencias_profissionais').select('profissional_id, mensagem, data_limite').eq('salao_id', salaoId).eq('resolvido', false),
    ])

    const dadosSalao: any = {
      profissionais: profissionais || [],
      relatorio_periodos: relatorioPeriodos || [],
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

    // 6. Montar system prompt
    const systemPrompt = `VocÃª Ã© a IA NODRI, assistente especialista em gestÃ£o de salÃ£o de beleza.

ESPECIALIDADES:
- AnÃ¡lise de dados e KPIs do setor de beleza
- GestÃ£o de equipes e profissionais
- FidelizaÃ§Ã£o de clientes e estratÃ©gias de crescimento
- CriaÃ§Ã£o e acompanhamento de metas realistas
- Coaching de desempenho para profissionais
- IdentificaÃ§Ã£o de problemas e oportunidades nos dados

INSTRUÃ‡Ã•ES:
- Responda SEMPRE em portuguÃªs brasileiro informal mas profissional
- Use os dados reais do salÃ£o quando disponÃ­veis
- Seja direto, prÃ¡tico e acionÃ¡vel
- Gere insights que gerem resultado real
- FaÃ§a perguntas de follow-up quando necessÃ¡rio
- Memorize o contexto da conversa

DADOS DO SALÃƒO:
${dadosFormatados}

${config.instrucoes_base ? `INSTRUÃ‡Ã•ES CUSTOMIZADAS:\n${config.instrucoes_base}\n` : ''}
${config.contexto_adicional ? `CONTEXTO ADICIONAL:\n${config.contexto_adicional}` : ''}`

    // 7. Chamar Google Gemini API
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
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
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

    // 8. Salvar/atualizar conversa
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

