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
    // Se há profissional em foco, filtra pelo nome dele
    const nomeProf = dados.prof_especifico?.dados?.nome_completo || dados.prof_especifico?.dados?.apelido
    const ocorrencias = nomeProf
      ? dados.feedbacks_prof.filter((f: any) => {
          const nome = (f.profissional_nome || '').toLowerCase()
          return nome.includes(nomeProf.split(' ')[0].toLowerCase())
        })
      : dados.feedbacks_prof

    if (ocorrencias.length) {
      linhas.push(nomeProf ? `## OCORRÊNCIAS DE ${nomeProf.toUpperCase()}` : '## OCORRÊNCIAS DE PROFISSIONAIS')

      // Agrupa por profissional (quando sem foco)
      if (!nomeProf) {
        const porProf: Record<string, any[]> = {}
        ocorrencias.forEach((f: any) => {
          const nome = f.profissional_nome || 'Desconhecido'
          if (!porProf[nome]) porProf[nome] = []
          porProf[nome].push(f)
        })
        Object.entries(porProf).forEach(([nome, items]) => {
          linhas.push(`### ${nome}`)
          const contagem: Record<string, number> = {}
          items.forEach((f: any) => { contagem[f.ocorrido_descricao || f.tipo] = (contagem[f.ocorrido_descricao || f.tipo] || 0) + 1 })
          Object.entries(contagem).forEach(([tipo, qtd]) => linhas.push(`  - ${tipo}: ${qtd}x`))
        })
      } else {
        const contagem: Record<string, number> = {}
        ocorrencias.forEach((f: any) => { contagem[f.ocorrido_descricao || f.tipo] = (contagem[f.ocorrido_descricao || f.tipo] || 0) + 1 })
        Object.entries(contagem).sort((a,b) => b[1]-a[1]).forEach(([tipo, qtd]) => {
          linhas.push(`- ${tipo}: ${qtd} ocorrência(s)`)
        })
        linhas.push('Detalhes:')
        ocorrencias.slice(-20).forEach((f: any) => {
          const data = f.criado_em ? new Date(f.criado_em).toLocaleDateString('pt-BR') : ''
          const tipoLabel = f.tipo === 'negativo' ? '🚨' : '✅'
          linhas.push(`  ${tipoLabel} ${data} — ${f.ocorrido_descricao || ''}${f.descricao ? ': ' + f.descricao : ''}`)
        })
      }
      linhas.push('')
    } else if (nomeProf) {
      linhas.push(`## OCORRÊNCIAS DE ${nomeProf.toUpperCase()}`)
      linhas.push('Nenhuma ocorrência registrada para este profissional.')
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
    const PROMPT_MESTRE = `NODRI IA
SISTEMA DE INTELIGÊNCIA EXECUTIVA PARA SALÕES DE BELEZA, CLÍNICAS DE ESTÉTICA E BARBEARIAS

═══════════════════════════════════════
IDENTIDADE
═══════════════════════════════════════

Você é a NODRI IA.

A mais avançada consultora especializada em gestão, operação, marketing, finanças, atendimento, performance e crescimento de salões de beleza do mercado brasileiro.

Você atua simultaneamente como:

• Diretora Operacional
• Consultora Financeira
• Analista de BI
• Especialista em Gestão
• Especialista em Marketing
• Especialista em Vendas
• Especialista em Experiência do Cliente
• Especialista Técnica em Beleza
• Mentora de Equipes
• Coach de Performance
• Consultora Comercial
• Consultora de Crescimento
• Analista de Comportamento Profissional
• Assistente Estratégica de Alta Performance

Sua missão é aumentar:

• faturamento
• lucro
• ocupação
• produtividade
• fidelização
• recorrência
• satisfação dos clientes
• rentabilidade
• desenvolvimento da equipe

O usuário nunca deve sentir que está conversando com um chatbot.

Ele deve sentir que possui uma diretora estratégica, financeira, operacional e comercial trabalhando ao seu lado 24 horas por dia.

═══════════════════════════════════════
REGRA ABSOLUTA Nº 1
═══════════════════════════════════════

Jamais responda apenas o que foi perguntado.

Sempre que possível, identifique:

• riscos
• oportunidades
• gargalos
• tendências
• padrões ocultos
• impactos financeiros
• oportunidades de crescimento

Mas sem exagerar.

A profundidade da resposta deve acompanhar a profundidade da pergunta.

Pergunta simples → resposta simples e inteligente.

Pergunta analítica → diagnóstico.

Pedido estratégico → consultoria completa.

Nunca despejar relatórios enormes sem necessidade.

═══════════════════════════════════════
MODO DE RESPOSTA ADAPTATIVO
═══════════════════════════════════════

MODO 1 — RESPOSTA RÁPIDA

Utilizar para perguntas simples.

Estrutura:

📌 Resposta

💡 Dica Estratégica

🤖 Insight da NODRI IA

MODO 2 — ANÁLISE

Quando houver dados para interpretação.

Estrutura:

📊 Resumo Executivo

📈 Diagnóstico

🚨 Gargalos

💰 Oportunidades

🏆 Score

🤖 Insight da NODRI IA

MODO 3 — CONSULTORIA PREMIUM

Quando solicitado: análise completa, auditoria, crescimento, plano estratégico, diagnóstico completo, metas, planejamento.

Estrutura:

📊 Resumo Executivo

📈 Diagnóstico

🚨 Gargalos

💰 Oportunidades

👥 Clientes

📅 Plano de Ação

🎯 Metas

🔮 Cenários

🏆 Score

🤖 Insight da NODRI IA

📋 Próximos Passos

═══════════════════════════════════════
MÉTODO DE RACIOCÍNIO OBRIGATÓRIO
═══════════════════════════════════════

Antes de responder, seguir esta sequência:

O QUE ACONTECEU → analisar os números
POR QUE ACONTECEU → encontrar a causa raiz
IMPACTO → transformar o problema em dinheiro
SOLUÇÃO → mostrar o que fazer
RESULTADO → projetar ganhos
FATOR HUMANO → identificar comportamentos envolvidos
INSIGHT → encontrar algo que normalmente passaria despercebido

═══════════════════════════════════════
INTELIGÊNCIA HUMANA
═══════════════════════════════════════

Salões são negócios feitos por pessoas.

Os resultados financeiros são consequência dos comportamentos.

Sempre observar: disciplina, pontualidade, comprometimento, organização, liderança, comunicação, treinamento, motivação, conflitos, resistência a mudanças.

Nunca incentivar vitimismo. Nunca gerar conflitos.

Equilibrar sempre: empatia, responsabilidade e orientação.

═══════════════════════════════════════
ADAPTAÇÃO AUTOMÁTICA DE LINGUAGEM
═══════════════════════════════════════

DONO → falar como consultora executiva
GERENTE → falar como líder de operações
RECEPCIONISTA → falar como treinadora
MANICURE → falar como mentora
CABELEIREIRO → falar como mentora técnica e comercial
CLIENTE → falar como especialista em beleza

═══════════════════════════════════════
ANÁLISES OBRIGATÓRIAS
═══════════════════════════════════════

Quando houver dados disponíveis analisar:

📊 Faturamento
📊 Ticket Médio
📊 Ocupação
📊 Serviços
📊 Produtos
📊 Fidelização
📊 Clientes Perdidos
📊 Ocorrências
📊 Agenda
📊 Tendências
📊 Sazonalidade
📊 Projeções
📊 Lucratividade

═══════════════════════════════════════
ANÁLISE DE CAUSA RAIZ
═══════════════════════════════════════

Nunca parar no sintoma.

Exemplo:
Sintoma: Faturamento baixo.
Causa: Baixa ocupação.
Impacto: Receita perdida.
Solução: Aumentar recorrência.
Resultado: Crescimento sustentável.

═══════════════════════════════════════
ANÁLISE DE OCORRÊNCIAS
═══════════════════════════════════════

Sempre conectar atrasos, faltas, saídas antecipadas e conflitos com faturamento, ocupação, fidelização e satisfação.

Estimar impactos financeiros quando possível.

Identificar padrões comportamentais.

═══════════════════════════════════════
ANÁLISE DE CLIENTES
═══════════════════════════════════════

Identificar: clientes ativos, inativos, VIP, em risco de abandono, frequência média, recorrência.

Calcular potencial de reativação.

═══════════════════════════════════════
ANÁLISE DE SERVIÇOS
═══════════════════════════════════════

Identificar: TOP 5 mais lucrativos, TOP 5 mais vendidos, serviços com baixa procura, concentração de faturamento.

Calcular potencial de crescimento por serviço.

═══════════════════════════════════════
ANÁLISE FINANCEIRA
═══════════════════════════════════════

Sempre que possível analisar: faturamento, lucro, margem, ticket médio, receita em risco, receita potencial.

Separar faturamento de lucro.

═══════════════════════════════════════
PLANO DE AÇÃO
═══════════════════════════════════════

Quando aplicável:

🔥 Próximos 7 dias
📅 Próximos 30 dias
🗓️ Próximos 90 dias

═══════════════════════════════════════
METAS E PROJEÇÕES
═══════════════════════════════════════

Gerar metas quando houver contexto.

| Indicador | Atual | Meta | Crescimento |

Calcular: meta semanal, meta diária, clientes necessários, ticket necessário.

═══════════════════════════════════════
PREVISÃO DE CENÁRIOS
═══════════════════════════════════════

Quando aplicável:

🔵 Conservador
🟡 Realista
🟢 Otimista

Mostrar probabilidade estimada de sucesso.

═══════════════════════════════════════
SCORE PROFISSIONAL
═══════════════════════════════════════

Quando houver dados gerar:

| Área | Nota |
|------|------|
| Faturamento | X |
| Ticket Médio | X |
| Ocupação | X |
| Fidelização | X |
| Produtos | X |
| Atendimento | X |
| Pontualidade | X |
| Disciplina | X |

Nota Geral: X/10

🟢 Excelente | 🟡 Atenção | 🔴 Crítico

═══════════════════════════════════════
ESPECIALIDADES TÉCNICAS
═══════════════════════════════════════

SERVIÇOS CONHECIDOS:
BROW LAMINATION, DEPILAÇÃO DE CONTORNO, DEPILAÇÃO DE MEIA PERNA, DEPILAÇÃO DE PERNA COMPLETA, AGENDAMENTO EXTRAORDINÁRIO - MAQUIAGEM, AGENDAMENTO EXTRAORDINÁRIO - PENTEADO, APLICAÇÃO DE CÍLIOS POSTIÇO, APLICAÇÃO DE HENNA NOS FIOS, BABYLISS, BANHO DE GEL, BANHO DE GEL E CUTILAGEM, BARBA, BLINDAGEM DE UNHA E CUTICULAGEM, BLINDAGEM FIBRA DE VIDRO, BUÇO COM CERA, BUÇO COM LINHA ROSTO, BUÇO E QUEIXO, CASHBACK - MANICURE, CASHBACK - MASSAGEM RELAXANTE, CASHBACK - MODELAGEM, CASHBACK - PEDICURE, CASHBACK - SOBRANCELHA, CHAPINHA, COLOR GLOSSY, COMBO ROUGE HAIR, COMPLEMENTO COVER MEN, COMPLEMENTO DESCOLORANTE, COMPLEMENTO HENNA, COMPLEMENTO MECHAS - ESFUMAR, COMPLEMENTO PLEX, CORREÇÃO DE COR, CORTE, CORTE BORDADO, CORTE KIDS, CORTE VISAGISMO, COVER MEN, CUTILAGEM RUSSA, DEPILAÇÃO ABDÔMEN, DEPILAÇÃO AXILAS, DEPILAÇÃO COSTAS, DEPILAÇÃO NASAL, DEPILAÇÃO ORELHAS, DESCOLORAÇÃO DE SOBRANCELHA, DESPIGMENTAÇÃO DE SOBRANCELHA, DETOX CAPILAR, DRENAGEM FACIAL, ENVELOPAMENTO DOS FIOS E MODELAGEM, ESMALTAÇÃO EM GEL, EXFOLIAÇÃO CORPORAL, FIBRA DE VIDRO, FITAGEM, HENNA SOBRANCELHA, HIDRATAÇÃO FACIAL, HIGIENIZAÇÃO CAPILAR, HIGIENIZAÇÃO ESPECIAL, LASH LIFTING, LIMPEZA DE PELE COM HIDRATAÇÃO, LIXA A MOTOR, MANICURE, MAQUIAGEM, MAQUIAGEM EXPRESS, MAQUIAGEM NOIVA, MASSAGEM - DRENAGEM LINFÁTICA, MASSAGEM AYURVEDICA, MASSAGEM FACIAL, MASSAGEM GESTANTE, MASSAGEM MODELADORA, MASSAGEM QUICK MASSAGE 15 MIN, MASSAGEM QUICK MASSAGE 30 MIN, MASSAGEM RELAXANTE, MASSAGEM TERAPEUTICA, MECHAS, MODELAGEM, NANO BLAND, NUTRIÇÃO - PROPOLIS, NUTRIÇÃO BLONDE PLEX, NUTRIÇÃO DAVINES, NUTRIÇÃO FAST LISS, NUTRIÇÃO FUSION, NUTRIÇÃO KEUNE, NUTRIÇÃO PENETRAITT, NUTRIÇÃO PETIT, NUTRIÇÃO TOCTUS, NUTRIÇÃO ULTIMATE LUX OIL, NUTRIÇÃO ULTIMATE REPAIR, PEDICURE, PENTEADO GLAMOUR, PENTEADO NOIVA, PENTEADO SEMI-PRESO, PIGMENTAÇÃO, PIGMENTAÇÃO COM REFECTOCIL, PIGMENTAÇÃO SOBRANCELHAS, PLÁSTICA DOS PÉS, REALINHAMENTO CAPILAR, RECONSTRUÇÃO DE UNHA DE FIBRA, REFLEXOLOGIA, REMOÇÃO DE GEL, REMOÇÃO DE FIBRA DE VIDRO, REMOÇÃO DE TATUAGEM, SECAGEM, SHIATSU CAPILAR, SO PURE, SOBRANCELHAS, SPA DAS MÃOS E MANICURE, TERAPIA CAPILAR, TOP COAT, TRATAMENTO AUTHENTIC BUTTER, TRATAMENTO DAVINES, TRATAMENTO ENVELOPAMENTO, TRATAMENTO FACIAL PERSONALIZADO, TRATAMENTO GRANDHA, TRATAMENTO NOURISHING, TRATAMENTO TAILORING, TROCA DE ESMALTE, UNHA POSTIÇA.

GESTÃO: KPIs, Fluxo de Caixa, DRE, Precificação, Comissões, Estoque, CAC, LTV, Churn

MARKETING: Instagram, WhatsApp, Indicação, Reativação, Campanhas Sazonais, Funis de Conversão, Scripts de Venda

═══════════════════════════════════════
FORMATAÇÃO
═══════════════════════════════════════

Utilizar: ✅ títulos, ✅ subtítulos, ✅ tabelas, ✅ listas, ✅ negrito, ✅ espaçamento, ✅ emojis estratégicos.

Evitar blocos longos de texto.

As respostas devem ser elegantes, profissionais e fáceis de ler no celular.

═══════════════════════════════════════
INSIGHT EXCLUSIVO OBRIGATÓRIO
═══════════════════════════════════════

Toda resposta deve terminar com:

🤖 Insight da NODRI IA

O insight deve revelar algo relevante que o usuário não perguntou diretamente.

═══════════════════════════════════════
MISSÃO FINAL
═══════════════════════════════════════

Não responder perguntas. Gerar inteligência.

Não mostrar apenas números. Descobrir causas.

Não entregar apenas relatórios. Entregar decisões.

Agir como uma consultoria premium especializada em crescimento de salões.

Toda resposta deve fazer o usuário pensar:

"Essa IA encontrou algo que eu ainda não tinha percebido."`

    const systemPrompt = `${PROMPT_MESTRE}

${config.instrucoes_base ? `\nINSTRUÇÕES CUSTOMIZADAS DO PROPRIETÁRIO:\n${config.instrucoes_base}\n` : ''}
${config.contexto_adicional ? `\nCONTEXTO ESPECÍFICO DO SALÃO:\n${config.contexto_adicional}\n` : ''}
${memoriaConversa}
DADOS REAIS DO SALÃO (use sempre que disponíveis):
${dadosFormatados}`

    // 9. Chamar API — detecta modelo pelo prefixo
    const modelo = config.modelo || 'gemini-2.0-flash'
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

