import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  calcularIndicadoresMeta, calcularScoreNodri, calcularBenchmarking,
  calcularPotencialOculto, buscarResumoComportamental, buscarFidelizacaoAtual,
  identificarCausaRaiz, buscarPendencias, buscarVendaProdutos,
} from '@/lib/metasAnalitico'
import Anthropic from '@anthropic-ai/sdk'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload?.salaoId || null
}

async function chamarIA(apiKey: string, modelo: string, prompt: string): Promise<string> {
  if (modelo.startsWith('claude')) {
    const anthropic = new Anthropic({ apiKey })
    const resp = await anthropic.messages.create({
      model: modelo,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    const bloco = resp.content.find((b: any) => b.type === 'text') as any
    return bloco?.text || ''
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // Prompt ficou bem mais longo (15 seções); sem isso o modelo 2.5 gasta o
      // orçamento de tokens "pensando" e retorna texto vazio (finishReason MAX_TOKENS).
      generationConfig: { maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  const j = await r.json()

  if (j?.error) throw new Error(`Gemini: ${j.error.message || JSON.stringify(j.error)}`)
  if (j?.promptFeedback?.blockReason) throw new Error(`Gemini bloqueou o prompt: ${j.promptFeedback.blockReason}`)

  const texto = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') || ''
  if (!texto) {
    const finishReason = j?.candidates?.[0]?.finishReason || 'desconhecido'
    throw new Error(`Gemini não retornou texto (finishReason: ${finishReason})`)
  }
  return texto
}

// POST — gera (ou regenera) o planejamento estratégico para bater a meta do mês
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const hoje = new Date()
  const ano = parseInt(body.ano) || hoje.getFullYear()
  const mes = parseInt(body.mes) || (hoje.getMonth() + 1)

  const { data: configGlobal } = await supabaseAdmin
    .from('ia_config_global')
    .select('api_key, modelo, ativo')
    .limit(1)
    .maybeSingle()

  if (!configGlobal?.api_key) return NextResponse.json({ error: 'API key não configurada pelo administrador.' }, { status: 422 })
  if (!configGlobal.ativo) return NextResponse.json({ error: 'IA desativada pelo administrador.' }, { status: 403 })

  // Dados do profissional
  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, cargo, habilidades, servicos_habilitados')
    .eq('id', params.id)
    .eq('salao_id', salaoId)
    .single()

  if (!prof) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

  // Meta atual (manual ou redistribuída)
  const { data: metaRow } = await supabaseAdmin
    .from('metas_profissionais')
    .select('*')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)
    .eq('ano', ano).eq('mes', mes)
    .maybeSingle()

  const metaFinal = metaRow?.meta_manual ?? metaRow?.meta_redistribuida ?? 0

  // Serviços que ele realiza, com preço e comissão
  let servicosTexto = 'Nenhum serviço cadastrado para este profissional ainda.'
  if (Array.isArray(prof.servicos_habilitados) && prof.servicos_habilitados.length > 0) {
    const { data: servicos } = await supabaseAdmin
      .from('salao_servicos')
      .select('categoria, nome, preco_min, preco_fixo, comissao_valor')
      .in('id', prof.servicos_habilitados)
      .eq('ativo', true)
    if (servicos && servicos.length > 0) {
      servicosTexto = servicos.map((s: any) => {
        const preco = s.preco_fixo ? `R$ ${Number(s.preco_fixo).toFixed(2)}` : (s.preco_min ? `a partir de R$ ${Number(s.preco_min).toFixed(2)}` : 'sem preço definido')
        const comissao = s.comissao_valor ? `, comissão líquida R$ ${Number(s.comissao_valor).toFixed(2)}` : ''
        return `- [${s.categoria}] ${s.nome}: ${preco}${comissao}`
      }).join('\n')
    }
  }

  // Feedbacks (positivos e negativos) do profissional — mesmo padrão usado em /metricas
  const nomeBase = prof.apelido || prof.nome_completo?.split(' ')[0] || ''
  let feedbacksTexto = 'Sem feedbacks registrados.'
  if (nomeBase) {
    const { data: respostas } = await supabaseAdmin
      .from('feedback_prof_respostas')
      .select('tipo, ocorrido_descricao, descricao, criado_em')
      .eq('salao_id', salaoId)
      .ilike('profissional_nome', `%${nomeBase}%`)
      .order('criado_em', { ascending: false })
      .limit(30)
    if (respostas && respostas.length > 0) {
      const positivos = respostas.filter((r: any) => (r.tipo || '').toLowerCase().includes('positiv'))
      const negativos = respostas.filter((r: any) => (r.tipo || '').toLowerCase().includes('negativ'))
      const resumo = (arr: any[]) => arr.slice(0, 5).map((r: any) => r.ocorrido_descricao || r.descricao).filter(Boolean).join(' | ') || 'sem registros detalhados'
      feedbacksTexto = `Positivos recentes (${positivos.length}): ${resumo(positivos)}\nNegativos recentes (${negativos.length}): ${resumo(negativos)}`
    }
  }

  // Indicadores 100% determinísticos (mesmo motor de cálculo usado na aba Metas) —
  // a IA recebe esses números prontos e NÃO deve recalculá-los, apenas interpretar.
  const indicadores = await calcularIndicadoresMeta(params.id, salaoId, ano, mes, metaFinal)
  const {
    realizado, faltam, dias_restantes: diasRestantes, necessario_por_dia, ticket_atual, ocupacao_atual,
    ticket_medio_historico, ocupacao_media_historico, taxa_media_crescimento, principal_gargalo,
    probabilidade_se_resolver_gargalo, alcancabilidade,
  } = indicadores

  const [comportamental, fidelizacao, benchmarking, potencialOculto, pendencias, vendaProdutos] = await Promise.all([
    buscarResumoComportamental(salaoId, nomeBase),
    buscarFidelizacaoAtual(salaoId, params.id, ano, mes).catch(() => ({ clientesPreferencia: 0, clientesSemPreferencia: 0 })),
    calcularBenchmarking(salaoId, prof.cargo, params.id, ano, mes),
    calcularPotencialOculto(salaoId, params.id, prof.servicos_habilitados || [], diasRestantes, faltam),
    buscarPendencias(salaoId, params.id),
    buscarVendaProdutos(salaoId, params.id, ano, mes),
  ])

  const pendenciasVencidas = pendencias.filter((p: any) => p.vencida).length

  const causaRaiz = identificarCausaRaiz({
    ocupacaoAtual: ocupacao_atual, ocupacaoMediaHistorico: ocupacao_media_historico,
    ticketAtual: ticket_atual, ticketMedioHistorico: ticket_medio_historico,
    atrasos: comportamental.atrasos, faltas: comportamental.faltas,
    pendenciasVencidas,
  })

  const scoreNodri = calcularScoreNodri({
    chanceDeBaterMetaPct: alcancabilidade.probabilidade,
    ticketAtual: ticket_atual,
    ticketMedioHistorico: ticket_medio_historico,
    ocupacaoAtual: ocupacao_atual,
    clientesPreferencia: fidelizacao.clientesPreferencia,
    clientesSemPreferencia: fidelizacao.clientesSemPreferencia,
    positivos: comportamental.positivos,
    negativos: comportamental.negativos,
    atrasos: comportamental.atrasos,
    faltas: comportamental.faltas,
    taxaMediaCrescimento: taxa_media_crescimento,
  })

  // Cenários de projeção (determinísticos, a partir do ritmo atual + ajuste de execução do plano)
  const projecaoConservadora = Math.round((alcancabilidade.projecao_ritmo_atual || realizado) * 100) / 100
  const projecaoRealista = Math.round(((alcancabilidade.projecao_ritmo_atual || realizado) * 1.1) * 100) / 100
  const projecaoOtimista = Math.round((metaFinal * 1.05) * 100) / 100

  const contratoJson = JSON.stringify({
    meta: Math.round(metaFinal * 100) / 100,
    faturado: Math.round(realizado * 100) / 100,
    falta: Math.round(faltam * 100) / 100,
    dias_restantes: diasRestantes,
    necessario_por_dia: Math.round(necessario_por_dia * 100) / 100,
    ticket_medio_atual: ticket_atual,
    ticket_medio_historico,
    taxa_ocupacao_atual: ocupacao_atual,
    chance_de_bater_meta_pct: alcancabilidade.probabilidade,
    principal_gargalo,
    causa_raiz_do_gargalo: causaRaiz,
    efeito_dominó_se_resolver_gargalo: probabilidade_se_resolver_gargalo != null
      ? `se resolver "${principal_gargalo}", a chance de bater a meta sobe de ${alcancabilidade.probabilidade}% para ${probabilidade_se_resolver_gargalo}%`
      : 'sem dado histórico suficiente para projetar o efeito de resolver o gargalo',
    score_nodri: scoreNodri,
    benchmarking: benchmarking || 'sem colegas suficientes na mesma categoria para comparar',
    potencial_oculto: potencialOculto || 'sem dado suficiente de serviços para identificar oportunidade específica',
    comportamental: {
      feedbacks_positivos: comportamental.positivos,
      feedbacks_negativos: comportamental.negativos,
      atrasos_recentes: comportamental.atrasos,
      faltas_recentes: comportamental.faltas,
      principais_elogios: comportamental.top_elogios,
      principais_reclamacoes: comportamental.top_reclamacoes,
    },
    pendencias_abertas: pendencias.length > 0 ? pendencias : 'nenhuma pendência aberta registrada pelo gestor',
    venda_produtos: {
      quantidade_mes_atual: vendaProdutos.quantidade_atual,
      media_historica_mensal: vendaProdutos.media_historica,
    },
    cenarios: {
      conservador: projecaoConservadora,
      realista: projecaoRealista,
      otimista: projecaoOtimista,
    },
  }, null, 2)

  const prompt = `Você é a NODRI IA, mentora de performance de um salão de beleza. Você não escreve relatório corporativo — você fala como um mentor experiente que olhou os números e foi direto ao ponto com o profissional. Frases curtas, tom humano, sem enrolação teórica.

REGRAS CRÍTICAS:
1. Os números abaixo em "DADOS NUMÉRICOS JÁ CALCULADOS PELO SISTEMA" são fatos. NÃO recalcule, NÃO corrija, NÃO estime valores diferentes destes.
2. NUNCA sugira uma quantidade de atendimentos, serviços ou volume de trabalho fora da capacidade real de agenda do profissional nos dias restantes do mês — os números de "potencial_oculto" já vêm limitados a um volume realista, use exatamente esses.
3. Limite TODA lista de ações a no máximo 3 itens. Não gere 8 ou 10 sugestões — escolha as 3 que mais movem o resultado e descarte o resto.
4. Se um campo vier como "sem dado suficiente" ou similar, diga isso com transparência em vez de inventar um número.
5. Nunca invente serviços ou preços fora da lista de SERVIÇOS QUE REALIZA.

PROFISSIONAL: ${prof.nome_completo} (${prof.apelido || ''}) — Cargo: ${prof.cargo}
HABILIDADES (texto livre): ${prof.habilidades || 'não informado'}

SERVIÇOS QUE REALIZA (com preço e comissão líquida por serviço):
${servicosTexto}

FEEDBACKS DE CLIENTES (texto livre, contexto qualitativo):
${feedbacksTexto}

DADOS NUMÉRICOS JÁ CALCULADOS PELO SISTEMA:
${contratoJson}

Gere a resposta EXATAMENTE na estrutura abaixo, em markdown, usando R$ sempre que possível. Use **negrito** (markdown de verdade) para destacar números e palavras-chave. Use tabelas markdown (| Coluna | Coluna |) sempre que o conteúdo for tabular (Score, Benchmarking). Use os marcadores "✅ Pontos Fortes" e "⚠️ Pontos de Atenção" exatamente assim, como subtítulos dentro de cada eixo do Raio-X.

## 🚀 PLANEJAMENTO ESTRATÉGICO DE META — ${prof.nome_completo.toUpperCase()}

## 🎯 Resumo Executivo
(liste: Meta Mensal, Faturamento Atual, Valor Restante, Dias Restantes — cada um em uma linha com **negrito** no valor)

### 📈 Cenário Atual
(probabilidade atual, principal oportunidade, principal gargalo, principal risco — uma linha cada)

### 📌 Diagnóstico Rápido
(2-3 frases tom de mentor conectando esses pontos — não repita os números, interprete-os)

## 📊 Score NODRI
**${scoreNodri.total}/100 — ${scoreNodri.classificacao}**

Monte uma tabela markdown com colunas "Indicador" e "Nota" para os 6 componentes (financeiro, comercial, fidelização, qualidade, comprometimento, evolução), depois 2-3 frases de interpretação.

## 🔍 Raio-X 360°
(para cada eixo — 💰 Financeiro, 🛒 Comercial, ✂️ Técnico, 👥 Comportamental, ❤️ Experiência do Cliente — escreva o nome do eixo como subtítulo, depois "✅ Pontos Fortes" com 1-2 bullets e "⚠️ Pontos de Atenção" com 1-2 bullets, baseado nos dados reais; no eixo Comercial considere "venda_produtos"; no eixo Comportamental considere "pendencias_abertas" se houver)

## 🧠 Causa Raiz
(use "causa_raiz_do_gargalo" e, se houver, "pendencias_abertas" vencidas — no estilo: "O problema principal não é X. Também não é Y. O verdadeiro gargalo é Z." — conecte os pontos, não repita o dado)

## ⚡ Efeito Dominó
(use "efeito_dominó_se_resolver_gargalo" — monte uma tabela markdown com "Situação" e "Probabilidade de atingir a meta" (Atual vs. Com melhora operacional), depois explique a cadeia de causa-efeito em bullets com ➡️. Se vier "sem dado suficiente", diga isso e explique por que ainda vale resolver o gargalo)

## 🔮 Inteligência Preditiva
(para cada cenário de "cenarios" — conservador, realista, otimista — um parágrafo curto)

## 💎 Potencial Oculto
(se "potencial_oculto" tiver dado, destaque o nome do serviço, quantidade sugerida e receita estimada e "cobertura_pct_do_que_falta", usando EXATAMENTE os números fornecidos. A "receita estimada" já é a COMISSÃO do profissional nesse serviço — não o preço cheio cobrado do cliente — então não chame de "faturamento do salão", chame de "quanto isso adiciona ao que você ganha". Se vier "sem dado suficiente", diga isso e sugira como começar a gerar esse dado)

## 🏆 Benchmarking
(monte uma tabela markdown com "Indicador" e "Posição" para faturamento/ticket médio/ocupação, se houver dado; se não, diga que não há colegas suficientes para comparar. Termine com 1 frase de diagnóstico: o problema é valor por atendimento ou quantidade de atendimentos?)

## 🎯 As 3 Ações Com Maior Impacto
(exatamente 3 ações numeradas, cada uma com "Meta:" e "Impacto:" em linhas separadas, usando apenas serviços/habilidades reais do profissional)

## 💰 Caminho Mais Curto Para Bater a Meta
(combine potencial_oculto + resolver o principal_gargalo: quanto isso cobre do valor que falta, e quanto resta por dia depois disso — usando "cobertura_pct_do_que_falta" e "necessario_por_dia")

## 📅 Plano de Execução
### 📍 Diário
(meta de faturamento diário de "necessario_por_dia" + 2-3 compromissos objetivos)
### 📍 Semanal
(no máximo 3 prioridades da semana)
### 📍 Mensal
(resultado esperado no fim do mês)

## 🚨 Alertas Críticos
(os 2-3 maiores riscos, cada um com um emoji 🔴 antes do título; se houver "pendencias_abertas" vencidas, isso deve ser o primeiro alerta)

## 🏆 Missão dos Próximos 30 Dias
(Meta Principal, Meta Diária, Comportamento Obrigatório, Serviço Prioritário, Resultado Esperado — cada um em uma linha com **negrito**)

## 👔 Visão do Gestor
"Se eu estivesse acompanhando este profissional hoje, minhas prioridades seriam:" seguido de no máximo 3 prioridades numeradas

🤖 Insight NODRI: (1 frase final, direta, com o insight mais valioso de tudo que foi analisado — o tipo de frase que faz o gestor pensar "essa IA realmente entendeu a situação")`

  let plano_texto = ''
  try {
    plano_texto = await chamarIA(configGlobal.api_key, configGlobal.modelo || 'gemini-2.5-flash', prompt)
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao gerar estratégia: ' + err.message }, { status: 500 })
  }

  if (!plano_texto) return NextResponse.json({ error: 'A IA não retornou conteúdo.' }, { status: 500 })

  // Gera apenas o rascunho — não salva ainda. O usuário decide salvar com o botão "Salvar Estratégia".
  return NextResponse.json({
    ano, mes,
    meta_referencia: metaFinal,
    plano_texto,
    realizado,
    faltam,
  })
}

// PUT — salva (persiste) o plano que já foi gerado e revisado
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const hoje = new Date()
  const ano = parseInt(body.ano) || hoje.getFullYear()
  const mes = parseInt(body.mes) || (hoje.getMonth() + 1)
  const { plano_texto, meta_referencia } = body

  if (!plano_texto) return NextResponse.json({ error: 'plano_texto obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('planejamentos_metas')
    .upsert({
      salao_id: salaoId,
      profissional_id: params.id,
      ano, mes,
      meta_referencia: meta_referencia || 0,
      plano_texto,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'profissional_id,ano,mes' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
