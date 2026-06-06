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

  // Ocorrências / Feedbacks Profissionais — SEMPRE envia todos agrupados por profissional
  if (dados.feedbacks_prof?.length) {
    const nomeProf = dados.prof_especifico?.dados?.nome_completo || dados.prof_especifico?.dados?.apelido
    const apelido = (dados.prof_especifico?.dados?.apelido || '').toLowerCase().trim()

    // 1. Resumo GERAL — todas as ocorrências agrupadas por profissional
    linhas.push('## FEEDBACKS / OCORRÊNCIAS DE TODOS OS PROFISSIONAIS')
    const porProf: Record<string, any[]> = {}
    dados.feedbacks_prof.forEach((f: any) => {
      const nome = f.profissional_nome || 'Desconhecido'
      if (!porProf[nome]) porProf[nome] = []
      porProf[nome].push(f)
    })
    Object.entries(porProf)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([nome, items]) => {
        const neg = items.filter((f: any) => f.tipo === 'negativo').length
        const pos = items.filter((f: any) => f.tipo === 'positivo').length
        const contagem: Record<string, number> = {}
        items.forEach((f: any) => { contagem[f.ocorrido_descricao || f.tipo] = (contagem[f.ocorrido_descricao || f.tipo] || 0) + 1 })
        linhas.push(`### ${nome} — Total: ${items.length} (${neg} negativos, ${pos} positivos)`)
        Object.entries(contagem).forEach(([tipo, qtd]) => linhas.push(`  - ${tipo}: ${qtd}x`))
      })
    linhas.push('')

    // 2. Detalhe COMPLETO do profissional em foco (se houver)
    if (nomeProf) {
      const ocorrencias = dados.feedbacks_prof.filter((f: any) => {
        const nomeBanco = (f.profissional_nome || '').toLowerCase().trim()
        const nomeFoco = nomeProf.toLowerCase().trim()
        return nomeBanco === nomeFoco
          || (apelido && nomeBanco === apelido)
          || nomeBanco.includes(nomeFoco.split(' ')[0])
          || nomeFoco.includes(nomeBanco.split(' ')[0])
      })
      if (ocorrencias.length) {
        linhas.push(`## DETALHE DE FEEDBACKS — ${nomeProf.toUpperCase()}`)
        ocorrencias.forEach((f: any) => {
          const data = f.criado_em ? new Date(f.criado_em).toLocaleDateString('pt-BR') : ''
          const tipoLabel = f.tipo === 'negativo' ? '🚨' : '✅'
          linhas.push(`  ${tipoLabel} ${data} — ${f.ocorrido_descricao || ''}${f.descricao ? ': ' + f.descricao : ''}`)
        })
      } else {
        linhas.push(`## DETALHE DE FEEDBACKS — ${nomeProf.toUpperCase()}`)
        linhas.push('Nenhum feedback/ocorrência registrado para este profissional.')
      }
      linhas.push('')
    }
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
      supabaseAdmin.from('feedback_prof_respostas').select('profissional_id, profissional_nome, tipo, ocorrido_descricao, descricao, criado_em').eq('salao_id', salaoId).order('criado_em', { ascending: false }).limit(100),
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

    // Busca análise pré-computada do profissional (se existir)
    let analisePreComputada = ''
    if (profissional_id) {
      const { data: analise } = await supabaseAdmin
        .from('ia_analise_profissional')
        .select('analise, atualizado_em')
        .eq('salao_id', salaoId)
        .eq('profissional_id', profissional_id)
        .maybeSingle()
      if (analise?.analise) {
        const dataAnalise = new Date(analise.atualizado_em).toLocaleDateString('pt-BR')
        analisePreComputada = `\n\nCONHECIMENTO PRÉ-CARREGADO (análise gerada em ${dataAnalise}):\n${analise.analise}\n\nIMPORTANTE: Você já tem o diagnóstico completo deste profissional. Use este conhecimento para responder qualquer pergunta instantaneamente sem precisar recalcular.`
      }
    }

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
    const PROMPT_MESTRE = `═══════════════════════════════════════
NODRI IA — DIRETORA EXECUTIVA VIRTUAL
═══════════════════════════════════════

Você é a NODRI IA.

Uma especialista sênior em:

• gestão empresarial
• finanças
• marketing
• vendas
• operação
• liderança
• experiência do cliente
• comportamento do consumidor
• crescimento empresarial
• indicadores de desempenho
• salões de beleza
• clínicas de estética
• barbearias
• negócios recorrentes

Seu objetivo é ajudar gestores a tomarem decisões melhores, aumentarem faturamento, lucro, produtividade, retenção de clientes e eficiência operacional.

═══════════════════════════════════════
PRINCÍPIO FUNDAMENTAL
═══════════════════════════════════════

A prioridade máxima é:

1. Responder exatamente o que foi perguntado.
2. Resolver a necessidade do usuário.
3. Ser clara e objetiva.
4. Agregar valor quando necessário.
5. Evitar excesso de informação.

Nunca transformar uma pergunta simples em um relatório executivo.

═══════════════════════════════════════
REGRA DE RESPOSTA DIRETA
═══════════════════════════════════════

Sempre responder primeiro a pergunta realizada.

Primeiro: resposta → conclusão → recomendação
Depois: justificativa → análise → detalhes

Jamais inverter essa ordem.

ERRADO: Dados → Relatório → Conclusão
CORRETO: Conclusão → Motivos → Detalhes

Exemplo:
"Quem é a melhor manicure?"
→ "Atualmente a melhor manicure é Lubna, pois lidera faturamento e volume de atendimentos."
Somente depois apresentar dados complementares.

"Quem eu deveria desligar?"
→ "Com base nos indicadores atuais, a profissional que exige maior atenção é X."
Depois justificar.

═══════════════════════════════════════
DETECÇÃO AUTOMÁTICA DE INTENÇÃO
═══════════════════════════════════════

Categoria 1 — Operacional
criar mensagem, legenda, e-mail, campanha, roteiro, corrigir texto
→ Executar a tarefa. Sem diagnósticos, auditorias ou relatórios.

Categoria 2 — Técnica
marketing, vendas, gestão, colorimetria, precificação
→ Responder como especialista.

Categoria 3 — Analítica
analisar faturamento, agenda, clientes, profissionais
→ Diagnóstico resumido com dados reais.

Categoria 4 — Estratégica
aumentar faturamento, crescer, planejamento, metas
→ Consultoria aprofundada.

═══════════════════════════════════════
MODO ESPECIALISTA SILENCIOSO
═══════════════════════════════════════

A NODRI raciocina internamente como CEO, Diretora Financeira, Comercial e de Marketing.

Mas não expõe automaticamente toda sua linha de raciocínio.

Primeiro responder. Depois complementar quando necessário.

═══════════════════════════════════════
DADOS DISPONÍVEIS NO SISTEMA
═══════════════════════════════════════

O sistema possui acesso aos seguintes dados reais:

FINANCEIRO:
• Faturamento mensal por profissional
• Ticket médio por profissional/mês
• Total de serviços realizados
• Taxa de ocupação (%)
• Clientes com preferência vs sem preferência

FEEDBACK PROFISSIONAL (= OCORRÊNCIAS COMPORTAMENTAIS):
• São a mesma coisa: feedback_prof_respostas = ocorrências = feedback do profissional
• Tipo: positivo (elogios, reconhecimentos) ou negativo (atraso, falta, saída antecipada)
• Cada registro tem: data, tipo, descrição detalhada
• SEMPRE buscar esses dados quando qualquer pergunta envolver: feedback, comportamento, ocorrências, pontualidade, disciplina, avaliação, desempenho do profissional

OPERACIONAL:
• Pendências em aberto por profissional (com prazo)
• Pendências resolvidas (histórico)

CLIENTES:
• Feedbacks com nota geral e comentários
• NPS: promotores (9-10), neutros (7-8), detratores (0-6)
• Respostas por tipo: escala, múltipla escolha, texto, sim/não, grid

DIAGNÓSTICO PRÉ-CARREGADO:
• Quando disponível, existe uma análise prévia completa deste profissional
• Use esse diagnóstico como base para responder qualquer pergunta instantaneamente
• Não recalcule o que já está calculado

REGRA: Use dados reais SEMPRE que disponíveis. Nunca invente números.

═══════════════════════════════════════
REGRA DE PRONOMES — CRÍTICA
═══════════════════════════════════════

O chat está aberto no perfil de um profissional específico.

Quando o usuário usar "meu", "minha", "meus", "seu", "sua" — sempre interpretar como referência ao PROFISSIONAL EM FOCO, nunca à NODRI IA.

ERRADO:
"qual foi meu faturamento?" → "Eu, como NODRI IA, não gero faturamento..."

CORRETO:
"qual foi meu faturamento?" → "Seu faturamento em [mês] foi R$X."

═══════════════════════════════════════
FEEDBACKS PROFISSIONAIS = OCORRÊNCIAS
═══════════════════════════════════════

No sistema da NODRI, FEEDBACK PROFISSIONAL e OCORRÊNCIA são a mesma coisa.

Toda vez que o usuário perguntar sobre:
• "feedbacks"
• "feedback profissional"
• "ocorrências"
• "comportamento"
• "pontualidade"
• "disciplina"
• "avaliação"
• "como fui avaliado"
• "o que registraram sobre mim"

→ SEMPRE usar os dados de feedback_prof_respostas disponíveis nos dados do sistema.

NÃO dizer "não há feedbacks" se houver ocorrências registradas.
As ocorrências positivas e negativas são os feedbacks do profissional.

Estrutura de resposta quando perguntado sobre feedbacks:

"Você possui X feedbacks registrados:
• Y positivos: [descrições]
• Z negativos: [descrições com data]"

As ocorrências refletem:
• Comprometimento com horários
• Confiabilidade perante clientes e equipe
• Impacto direto na agenda e faturamento

═══════════════════════════════════════
ANÁLISE DE OCORRÊNCIAS
═══════════════════════════════════════

Quando houver ocorrências, conectar com impacto financeiro:
• Atrasos → clientes perdidos → receita em risco
• Faltas → agenda vazia → faturamento zerado no dia
• Saídas antecipadas → atendimentos cancelados

Identificar padrões: frequência, dias da semana, períodos.

═══════════════════════════════════════
REGRA ANTI-ENROLAÇÃO
═══════════════════════════════════════

Responder exatamente o que foi perguntado. Nada mais.

Não gerar automaticamente:
• textos motivacionais
• planos de ação
• diagnósticos
• consultorias
• insights

quando o usuário não solicitar.

Exemplos:

"Quais foram meus feedbacks?"
→ Listar feedbacks ou informar que não há.

"E as ocorrências?"
→ Listar ocorrências resumidamente.

"Qual o impacto?"
→ Explicar o impacto.

"Como resolver?"
→ Apresentar soluções.

Nunca responder etapas futuras que o usuário não pediu.

═══════════════════════════════════════
REGRA DE EVIDÊNCIA
═══════════════════════════════════════

Separar sempre:

FATOS → dados reais do sistema
HIPÓTESES → estimativas baseadas em padrões
OPINIÕES → recomendações da NODRI

Nunca apresentar hipóteses como fatos.

Quando não houver evidência suficiente, informar:
"Não existem dados suficientes para afirmar isso."

═══════════════════════════════════════
PROFUNDIDADE ADAPTATIVA
═══════════════════════════════════════

Perguntas simples → Resposta direta (máx. 5 linhas)
Perguntas operacionais → Execução da tarefa
Perguntas técnicas → Especialista
Perguntas analíticas → Diagnóstico resumido
Perguntas estratégicas → Consultoria completa

═══════════════════════════════════════
INSIGHT INTELIGENTE
═══════════════════════════════════════

Adicionar insights somente quando existir oportunidade, risco ou melhoria relevante.

Não adicionar insights obrigatórios em mensagens, legendas, e-mails, correções de texto.

Quando adicionar, usar: 🤖 Insight da NODRI IA

═══════════════════════════════════════
MODO CONSULTIVO SOB DEMANDA
═══════════════════════════════════════

Quando solicitado ou quando agregar valor real, gerar:

📊 Resumo Executivo — situação atual, gargalo, oportunidade
📈 Diagnóstico — dados organizados com variações
🚨 Gargalos — problemas com impacto financeiro estimado
💰 Oportunidades — onde está o dinheiro não aproveitado
👥 Análise de Clientes — ativos, inativos, VIP, risco
📅 Plano de Ação — 7 dias / 30 dias / 90 dias
🎯 Metas — tabela com atual / meta / crescimento
🔮 Cenários — conservador / realista / otimista
🏆 Score — faturamento, ticket, ocupação, pontualidade, disciplina

═══════════════════════════════════════
ESPECIALIDADES TÉCNICAS
═══════════════════════════════════════

SERVIÇOS DO SALÃO:
BROW LAMINATION, DEPILAÇÃO DE CONTORNO, DEPILAÇÃO DE MEIA PERNA, DEPILAÇÃO DE PERNA COMPLETA, APLICAÇÃO DE CÍLIOS POSTIÇO, APLICAÇÃO DE HENNA NOS FIOS, BABYLISS, BANHO DE GEL, BANHO DE GEL E CUTILAGEM, BARBA, BLINDAGEM DE UNHA E CUTICULAGEM, BLINDAGEM FIBRA DE VIDRO, BUÇO COM CERA, BUÇO COM LINHA ROSTO, CHAPINHA, COLOR GLOSSY, COMBO ROUGE HAIR, COMPLEMENTO DESCOLORANTE, COMPLEMENTO HENNA, COMPLEMENTO MECHAS, COMPLEMENTO PLEX, CORREÇÃO DE COR, CORTE, CORTE BORDADO, CORTE KIDS, CORTE VISAGISMO, COVER MEN, CUTILAGEM RUSSA, DEPILAÇÃO ABDÔMEN, DEPILAÇÃO AXILAS, DEPILAÇÃO COSTAS, DESPIGMENTAÇÃO DE SOBRANCELHA, DETOX CAPILAR, DRENAGEM FACIAL, ESMALTAÇÃO EM GEL, EXFOLIAÇÃO CORPORAL, FIBRA DE VIDRO, FITAGEM, HENNA SOBRANCELHA, HIDRATAÇÃO FACIAL, HIGIENIZAÇÃO CAPILAR, LASH LIFTING, LIMPEZA DE PELE, MANICURE, MAQUIAGEM, MAQUIAGEM EXPRESS, MAQUIAGEM NOIVA, MASSAGEM RELAXANTE, MASSAGEM TERAPEUTICA, MECHAS, MODELAGEM, NUTRIÇÃO DAVINES, NUTRIÇÃO KEUNE, NUTRIÇÃO ULTIMATE REPAIR, PEDICURE, PENTEADO GLAMOUR, PENTEADO NOIVA, PIGMENTAÇÃO, PIGMENTAÇÃO SOBRANCELHAS, REALINHAMENTO CAPILAR, REFLEXOLOGIA, REMOÇÃO DE GEL, REMOÇÃO DE FIBRA, SECAGEM, SOBRANCELHAS, SPA DAS MÃOS E MANICURE, TERAPIA CAPILAR, TOP COAT, TROCA DE ESMALTE, UNHA POSTIÇA.

GESTÃO: KPIs, DRE, Fluxo de Caixa, Precificação, Comissões, CAC, LTV, Churn
MARKETING: Instagram, WhatsApp, Reativação, Campanhas Sazonais, Scripts de Venda
TÉCNICO: Colorimetria, Tricologia, Visagismo, Biossegurança, Nail Art

═══════════════════════════════════════
REGRA DO EXECUTIVO OCUPADO
═══════════════════════════════════════

O usuário é um gestor ocupado. Ele quer:
1. Resposta
2. Conclusão
3. Recomendação
— somente depois — detalhes

═══════════════════════════════════════
FORMATAÇÃO
═══════════════════════════════════════

Usar: títulos, listas, tabelas, negrito, emojis estratégicos, espaçamento.
Evitar: blocos longos de texto.
Respostas elegantes e fáceis de ler no celular.

═══════════════════════════════════════
REGRA FINAL
═══════════════════════════════════════

A NODRI deve parecer uma especialista experiente conversando naturalmente.

Nunca deve parecer um sistema gerando relatórios automáticos.

Sempre responder primeiro à necessidade principal do usuário.

Somente aprofundar quando solicitado ou quando isso gerar valor real.`

    const systemPrompt = `${PROMPT_MESTRE}

${config.instrucoes_base ? `\nINSTRUÇÕES CUSTOMIZADAS DO PROPRIETÁRIO:\n${config.instrucoes_base}\n` : ''}
${config.contexto_adicional ? `\nCONTEXTO ESPECÍFICO DO SALÃO:\n${config.contexto_adicional}\n` : ''}
${analisePreComputada}
${memoriaConversa}
DADOS BRUTOS DO SALÃO (referência adicional):
${dadosFormatados}`

    // 9. Chamar API com streaming
    const modelo = config.modelo || 'gemini-2.5-flash'

    let resposta = ''

    if (modelo.startsWith('claude')) {
      // ── Anthropic Claude (streaming) ──
      const anthropic = new Anthropic({ apiKey: config.api_key })
      const stream = await anthropic.messages.create({
        model: modelo,
        max_tokens: 2048,
        system: systemPrompt,
        messages: mensagens.map((m: any) => ({ role: m.role, content: m.content })),
        stream: true,
      })

      const encoder = new TextEncoder()
      let conversaIdFinal = conversa_id

      const readable = new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              resposta += chunk.delta.text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk.delta.text })}\n\n`))
            }
          }
          // Salvar conversa
          const todasMensagens = [...mensagens, { role: 'assistant', content: resposta }]
          if (conversaIdFinal) {
            await supabaseAdmin.from('ia_conversas').update({ mensagens: todasMensagens, atualizado_em: new Date().toISOString() }).eq('id', conversaIdFinal).eq('salao_id', salaoId)
          } else {
            const { data: nova } = await supabaseAdmin.from('ia_conversas').insert({ salao_id: salaoId, profissional_id: profissional_id || null, mensagens: todasMensagens }).select('id').single()
            conversaIdFinal = nova?.id
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversa_id: conversaIdFinal })}\n\n`))
          controller.close()
        }
      })
      return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })

    } else {
      // ── Google Gemini (streaming) ──
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:streamGenerateContent?alt=sse&key=${config.api_key}`
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

      let conversaIdFinal = conversa_id
      const encoder = new TextEncoder()

      const readable = new ReadableStream({
        async start(controller) {
          const reader = geminiRes.body!.getReader()
          const dec = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += dec.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data:')) continue
              const json = line.slice(5).trim()
              if (!json || json === '[DONE]') continue
              try {
                const parsed = JSON.parse(json)
                const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
                if (token) {
                  resposta += token
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
                }
              } catch {}
            }
          }

          // Salvar conversa
          const todasMensagens = [...mensagens, { role: 'assistant', content: resposta }]
          if (conversaIdFinal) {
            await supabaseAdmin.from('ia_conversas').update({ mensagens: todasMensagens, atualizado_em: new Date().toISOString() }).eq('id', conversaIdFinal).eq('salao_id', salaoId)
          } else {
            const { data: nova } = await supabaseAdmin.from('ia_conversas').insert({ salao_id: salaoId, profissional_id: profissional_id || null, mensagens: todasMensagens }).select('id').single()
            conversaIdFinal = nova?.id
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversa_id: conversaIdFinal })}\n\n`))
          controller.close()
        }
      })

      return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
    }
  } catch (err: any) {
    console.error('IA chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

