import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  calcularIndicadoresMeta, calcularScoreNodri, calcularBenchmarking,
  calcularPotencialOculto, buscarResumoComportamental, buscarFidelizacaoAtual,
  identificarCausaRaiz, buscarPendencias, buscarVendaProdutos,
  calcularSimuladorMeta, calcularDinheiroPerdido, calcularOportunidadesOcultas,
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
      generationConfig: { maxOutputTokens: 16000, thinkingConfig: { thinkingBudget: 0 } },
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

  // Feedbacks do profissional — agrupados por categoria com contagem e tendência
  const nomeBase = prof.apelido || prof.nome_completo?.split(' ')[0] || ''
  let feedbacksTexto = 'Sem feedbacks registrados.'
  if (nomeBase) {
    const trintaDiasAtras = new Date(); trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
    const { data: respostas } = await supabaseAdmin
      .from('feedback_prof_respostas')
      .select('tipo, ocorrido_descricao, descricao, criado_em')
      .eq('salao_id', salaoId)
      .ilike('profissional_nome', `%${nomeBase}%`)
      .gte('criado_em', trintaDiasAtras.toISOString())
      .order('criado_em', { ascending: false })
    if (respostas && respostas.length > 0) {
      const positivos = respostas.filter((r: any) => (r.tipo || '').toLowerCase().includes('positiv'))
      const negativos = respostas.filter((r: any) => (r.tipo || '').toLowerCase().includes('negativ'))

      // Agrupa negativos por descrição com contagem
      const contagemNeg: Record<string, number> = {}
      for (const r of negativos) {
        const desc = (r.ocorrido_descricao || r.descricao || '').trim()
        if (desc) contagemNeg[desc] = (contagemNeg[desc] || 0) + 1
      }
      const negativosAgrupados = Object.entries(contagemNeg)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([desc, qtd]) => `  - ${desc}: ${qtd}x`)
        .join('\n')

      // Agrupa positivos por descrição com contagem
      const contagemPos: Record<string, number> = {}
      for (const r of positivos) {
        const desc = (r.ocorrido_descricao || r.descricao || '').trim()
        if (desc) contagemPos[desc] = (contagemPos[desc] || 0) + 1
      }
      const positivosAgrupados = Object.entries(contagemPos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([desc, qtd]) => `  - ${desc}: ${qtd}x`)
        .join('\n')

      // Tendência: primeira quinzena vs segunda quinzena do mês
      const agora = new Date()
      const corte15 = new Date(agora); corte15.setDate(agora.getDate() - 15)
      const negSegundaQ = negativos.filter((r: any) => new Date(r.criado_em) >= corte15).length
      const negPrimeiraQ = negativos.filter((r: any) => new Date(r.criado_em) < corte15).length
      const tendencia = negSegundaQ > negPrimeiraQ ? '📈 piorando' : negSegundaQ < negPrimeiraQ ? '📉 melhorando' : '➡️ estável'

      feedbacksTexto = [
        `POSITIVOS (${positivos.length} total):`,
        positivosAgrupados || '  - sem registros detalhados',
        ``,
        `NEGATIVOS (${negativos.length} total no mês) — Tendência: ${tendencia} (1ª quinzena: ${negPrimeiraQ} → 2ª quinzena: ${negSegundaQ}):`,
        negativosAgrupados || '  - sem reclamações registradas',
      ].join('\n')
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
    ticketAtual: ticket_atual, ticketMedioHistorico: ticket_medio_historico,
    ocupacaoAtual: ocupacao_atual,
    clientesPreferencia: fidelizacao.clientesPreferencia,
    clientesSemPreferencia: fidelizacao.clientesSemPreferencia,
    positivos: comportamental.positivos, negativos: comportamental.negativos,
    atrasos: comportamental.atrasos, faltas: comportamental.faltas,
    taxaMediaCrescimento: taxa_media_crescimento,
  })

  const mediaFaturamentoDiario = diasRestantes > 0 ? realizado / Math.max(1, 30 - diasRestantes) : 0

  const [simuladorMeta, dinheiroPerdido, oportunidadesOcultas] = await Promise.all([
    calcularSimuladorMeta(salaoId, params.id, prof.servicos_habilitados || [], faltam, diasRestantes),
    calcularDinheiroPerdido(salaoId, params.id, comportamental.atrasos, comportamental.faltas, mediaFaturamentoDiario),
    calcularOportunidadesOcultas(salaoId, params.id, prof.cargo, prof.servicos_habilitados || [], ano, mes),
  ])

  const projecaoConservadora = Math.round((alcancabilidade.projecao_ritmo_atual || realizado) * 100) / 100
  const projecaoRealista = Math.round(((alcancabilidade.projecao_ritmo_atual || realizado) * 1.1) * 100) / 100
  const projecaoOtimista = Math.round((metaFinal * 1.05) * 100) / 100

  const contratoJson = JSON.stringify({
    aviso_unidades: 'meta/faturado/falta/necessario_por_dia/simulador/dinheiro_perdido estão em COMISSÃO. ticket_medio está em VALOR CHEIO (preço cobrado do cliente). Nunca some ou compare diretamente.',
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
    efeito_se_resolver_gargalo: probabilidade_se_resolver_gargalo != null
      ? `chance sobe de ${alcancabilidade.probabilidade}% para ${probabilidade_se_resolver_gargalo}%`
      : 'sem dado histórico suficiente',
    score_nodri: scoreNodri,
    benchmarking: benchmarking || 'sem colegas suficientes para comparar',
    oportunidades_ocultas: oportunidadesOcultas.length > 0 ? oportunidadesOcultas : 'sem dado suficiente',
    simulador_meta: simuladorMeta || 'sem comissões cadastradas para simular',
    dinheiro_perdido: dinheiroPerdido || 'sem dado suficiente',
    comportamental: {
      feedbacks_positivos: comportamental.positivos,
      feedbacks_negativos: comportamental.negativos,
      atrasos_recentes: comportamental.atrasos,
      faltas_recentes: comportamental.faltas,
      principais_elogios: comportamental.top_elogios,
      principais_reclamacoes: comportamental.top_reclamacoes,
    },
    fidelizacao: {
      clientes_preferencia: fidelizacao.clientesPreferencia,
      clientes_sem_preferencia: fidelizacao.clientesSemPreferencia,
    },
    pendencias_abertas: pendencias.length > 0 ? pendencias : 'nenhuma',
    venda_produtos: {
      quantidade_mes_atual: vendaProdutos.quantidade_atual,
      media_historica_mensal: vendaProdutos.media_historica,
    },
    cenarios: { conservador: projecaoConservadora, realista: projecaoRealista, otimista: projecaoOtimista },
  }, null, 2)

  const prompt = `Você é a NODRI IA, mentora de alta performance de salão de beleza. Tom: mentor direto, humano, sem enrolação. Frases curtas. Nunca escreva relatório corporativo. NUNCA repita a mesma informação em duas seções diferentes.

REGRAS CRÍTICAS:
1. Todos os números em "DADOS DO SISTEMA" são fatos calculados — NÃO recalcule, NÃO corrija, NÃO estime diferente.
2. Use EXATAMENTE os números de simulador_meta e dinheiro_perdido — esses vieram do banco de dados, não os altere.
3. Listas de ações: máximo 3 itens. Escolha os 3 de maior impacto e descarte o resto.
4. Campo "sem dado suficiente" → diga isso, não invente.
5. Use apenas serviços da lista SERVIÇOS DO PROFISSIONAL. Nunca invente serviço ou preço.
6. UNIDADES: meta/faturado/falta/necessario_por_dia/simulador/dinheiro_perdido = COMISSÃO do profissional. ticket_medio = VALOR CHEIO cobrado do cliente. São escalas diferentes — nunca some um com o outro.
7. Não repita dados do Resumo Executivo nas seções seguintes — cada seção acrescenta, nunca repete.

PROFISSIONAL: ${prof.nome_completo} (${prof.apelido || ''}) | Cargo: ${prof.cargo}
HABILIDADES: ${prof.habilidades || 'não informado'}

SERVIÇOS DO PROFISSIONAL (preço cheio | comissão líquida):
${servicosTexto}

FEEDBACKS DE CLIENTES:
${feedbacksTexto}

DADOS DO SISTEMA (calculados pelo backend — use como verdade absoluta):
${contratoJson}

---
Gere a resposta na estrutura abaixo. Use **negrito** real (não literal **). Use tabelas markdown onde indicado. Siga a ordem e os títulos exatamente.

# PLANEJAMENTO ESTRATÉGICO DE META
## ${prof.nome_completo.toUpperCase()} | ${prof.cargo} | NODRI IA

---

## 🎯 RESUMO EXECUTIVO

| Item | Valor |
|---|---|
| Meta Mensal | R$ {meta} |
| Faturamento Atual | R$ {faturado} |
| Valor Restante | R$ {falta} |
| Dias Restantes | {dias_restantes} dias |
| Meta Diária Necessária | R$ {necessario_por_dia} |
| Probabilidade de Atingir | {chance_de_bater_meta_pct}% |

**Diagnóstico em uma frase:** (escreva 1 frase direta explicando o que precisa acontecer para atingir a meta — sem repetir os números da tabela, interprete a situação)

---

## 📊 SCORE NODRI — ${scoreNodri.total}/100 (${scoreNodri.classificacao})

| Indicador | Nota | Status |
|---|---|---|
(preencha com os 6 componentes de score_nodri, adicionando na coluna Status: ✅ se nota ≥ 60, ⚠️ se entre 30-59, 🔴 se < 30)

**Pontos Fortes:** (liste apenas os indicadores com nota ≥ 60)
**Pontos Críticos:** (liste apenas os indicadores com nota < 50, explicando em 1 frase o impacto real no faturamento)

---

## 🔍 RAIO-X 360°

Para cada eixo abaixo, escreva APENAS o que os dados reais mostram. Não repita entre eixos.

**💰 Financeiro**
✅ O que está funcionando: (1 ponto — se não há nenhum, diga "sem ponto forte identificado nos dados")
⚠️ O que está prejudicando: (1-2 pontos baseados nos dados reais)

**🛒 Comercial**
✅ O que está funcionando: (considere venda_produtos e frequência de serviços)
⚠️ O que está prejudicando: (1-2 pontos)

**👥 Comportamental**
✅ O que está funcionando: (considere pendencias_abertas e pontos positivos do comportamental)
⚠️ O que está prejudicando: (atrasos, faltas, feedbacks negativos — com números reais)

**❤️ Experiência do Cliente**
✅ O que está funcionando: (fidelização, elogios reais)
⚠️ O que está prejudicando: (reclamações reais, impacto na retenção)

---

## 🧠 CAUSA RAIZ

Escreva no estilo: "O problema não é [X]. Também não é [Y]. O verdadeiro gargalo é [Z] — e é por isso que [consequência em cadeia]."
Use causa_raiz_do_gargalo e conecte com os dados de comportamental e fidelizacao.

---

## 💰 SIMULADOR DE META

**Faltam R$ {falta} — veja como atingir:**

Para cada cenário em simulador_meta, monte uma tabela:

| Serviço | Comissão por Atend. | Quantidade | Subtotal |
|---|---|---|---|
(preencha com os dados exatos de cada cenário)
**Total do cenário: R$ X** ✅ Meta atingida / ⚠️ Parcialmente coberta

Escreva 1 frase de recomendação indicando qual cenário é mais realista dado o histórico do profissional.

---

## 💎 OPORTUNIDADES OCULTAS + BENCHMARKING

**Posição entre colegas:**
| Indicador | Posição |
|---|---|
(use dados de benchmarking)

**Serviços com potencial não explorado:**
(use oportunidades_ocultas — para cada item: nome do serviço, frequência própria vs colegas, potencial perdido em R$/mês. Se sem dado, diga isso.)

1 frase final: o problema deste profissional é valor por atendimento ou volume de atendimentos?

---

## 💸 DINHEIRO PERDIDO ESTE MÊS

Use EXATAMENTE os números de dinheiro_perdido. Monte assim:

🔴 **Atrasos:** {atrasos} atrasos × comissão do serviço mais vendido ({servico_mais_vendido} = R$ {comissao_servico_mais_vendido}) = **R$ {perda_atrasos} perdidos**

🔴 **Faltas:** {faltas} faltas × média diária (R$ {media_faturamento_diario}) = **R$ {perda_faltas} perdidos**

🔴 **Produtos não vendidos:** {clientes_sem_produto_estimado} clientes (~10% dos {clientes_atendidos_mes} atendidos) × R$ {comissao_media_produto} comissão média = **R$ {perda_produtos} deixados na mesa**

**💰 Total potencial perdido: R$ {total_perdido}**

(Se algum campo vier nulo, omita aquela linha e explique brevemente por que não foi possível calcular)

---

## ❤️ RETENÇÃO E FIDELIZAÇÃO

Use dados de fidelizacao e comportamental.
- Clientes com preferência: {clientes_preferencia} | Sem preferência: {clientes_sem_preferencia}
- (1-2 frases interpretando o que isso significa para a estabilidade do faturamento)
- Para cada reclamação negativa com ≥ 2 ocorrências nos FEEDBACKS DE CLIENTES, escreva 1 ação prática de melhoria específica. Máximo 5 ações. Se não há reclamações repetidas, sugira 2 ações de fidelização baseadas nos elogios positivos.

---

## 🎯 AS 3 AÇÕES QUE MAIS MOVEM O RESULTADO

Exatamente 3, ordenadas por impacto financeiro estimado. Cada uma:
**1. [Nome da ação]**
- Meta: (o que fazer, quantidade, prazo)
- Impacto: (quanto adiciona em comissão ou qual gargalo resolve — use números reais)

---

## 📅 PLANO DE EXECUÇÃO

**📍 Diário** — Meta: R$ {necessario_por_dia} de comissão
- (2-3 comportamentos obrigatórios diários)

**📍 Semanal**
- (3 prioridades da semana — diferentes das diárias)

**📍 Mensal**
- Meta: R$ {meta} de comissão total
- (resultado esperado em ocupação e comportamento)

---

## 📋 CHECKLIST DOS PRÓXIMOS 30 DIAS

□ Não faltar nenhum dia
□ Não atrasar nenhum atendimento
□ Não sair antes do horário
□ Fazer pós-venda para pelo menos 10 clientes
□ Oferecer serviço adicional em todo atendimento
□ Vender pelo menos 1 produto por dia
□ (adicione 1-2 itens específicos para este profissional baseados nos dados reais)

---

## 📱 PRESENÇA DIGITAL E POSICIONAMENTO

(Escreva 3-4 orientações práticas e diretas para este cargo/perfil — sem inventar dados de redes sociais que não existem no sistema. Foco em: como usar o próprio resultado do trabalho para atrair clientes, como pedir indicações, como fortalecer relacionamento com clientes fiéis.)

---

## 👔 VISÃO DO GESTOR

"Se eu estivesse acompanhando ${prof.nome_completo} hoje, minhas 3 prioridades seriam:"
1. (prioridade mais urgente — com número ou prazo)
2. (segunda prioridade)
3. (terceira prioridade)

---

🤖 **Insight NODRI:** (1 frase final — o insight mais valioso, do tipo que faz o gestor pensar "essa IA entendeu a situação de verdade")`

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
