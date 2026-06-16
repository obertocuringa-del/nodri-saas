import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  calcularIndicadoresMeta, calcularScoreNodri, calcularBenchmarking,
  calcularPotencialOculto, buscarResumoComportamental, buscarFidelizacaoAtual,
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
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
  })
  const j = await r.json()
  return j?.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
  const { realizado, faltam, dias_restantes: diasRestantes, necessario_por_dia, ticket_atual, ocupacao_atual, ticket_medio_historico, taxa_media_crescimento, principal_gargalo, alcancabilidade } = indicadores

  const [comportamental, fidelizacao, benchmarking, potencialOculto] = await Promise.all([
    buscarResumoComportamental(salaoId, nomeBase),
    buscarFidelizacaoAtual(salaoId, params.id, ano, mes).catch(() => ({ clientesPreferencia: 0, clientesSemPreferencia: 0 })),
    calcularBenchmarking(salaoId, prof.cargo, params.id, ano, mes),
    calcularPotencialOculto(salaoId, params.id, prof.servicos_habilitados || []),
  ])

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
    cenarios: {
      conservador: projecaoConservadora,
      realista: projecaoRealista,
      otimista: projecaoOtimista,
    },
  }, null, 2)

  const prompt = `Você é a NODRI IA atuando simultaneamente como Diretora Executiva, Gestora Comercial, Gestora Financeira, Especialista em Performance, Mentora de Desenvolvimento Profissional e Consultora de Experiência do Cliente. Seu objetivo não é apenas calcular números — é identificar o caminho mais provável, realista e executável para este profissional atingir ou superar sua meta.

PROFISSIONAL: ${prof.nome_completo} (${prof.apelido || ''}) — Cargo: ${prof.cargo}
HABILIDADES (texto livre): ${prof.habilidades || 'não informado'}

SERVIÇOS QUE REALIZA (com preço e comissão líquida por serviço):
${servicosTexto}

FEEDBACKS DE CLIENTES (texto livre, contexto qualitativo):
${feedbacksTexto}

DADOS NUMÉRICOS JÁ CALCULADOS PELO SISTEMA (regra crítica: estes números são fatos. NÃO recalcule, NÃO corrija, NÃO estime valores diferentes destes — apenas interprete e construa a estratégia em cima deles. Se um campo vier como "sem dado suficiente", diga isso com transparência em vez de inventar um número):
${contratoJson}

Gere a resposta EXATAMENTE na estrutura abaixo, em markdown, direta e sem teoria, usando R$ sempre que possível e nunca inventando serviços/preços fora da lista acima:

## 🎯 Resumo Executivo
(meta, faturado, falta, dias restantes, chance de atingir, principal oportunidade, principal risco — em frases curtas e diretas)

## 📊 Score NODRI
(mostre o total e a classificação vindos de score_nodri, e comente em 1 frase cada um dos 6 componentes: financeiro, comercial, fidelização, qualidade, comprometimento, evolução)

## 🔍 Raio-X 360°
(para cada eixo — Financeiro, Comercial, Técnico, Comportamental, Experiência do Cliente — liste 1 ponto forte e 1 ponto fraco, baseado nos dados reais fornecidos, especialmente feedbacks e comportamental)

## 🔮 Inteligência Preditiva
(apresente os 3 cenários de "cenarios" — conservador, realista, otimista — explicando o que cada um significa na prática)

## 💎 Potencial Oculto
(se "potencial_oculto" tiver dado, explique a oportunidade com os números reais fornecidos; se vier como "sem dado suficiente", diga isso claramente e sugira como o profissional pode começar a gerar esse dado)

## 🏆 Benchmarking
(se "benchmarking" tiver dado, mostre a posição do profissional entre os colegas do mesmo cargo; se vier como mensagem de "sem colegas suficientes", diga isso claramente)

## 💰 Estratégia para Bater a Meta
(como aumentar faturamento, ticket médio e ocupação usando APENAS os serviços e habilidades reais deste profissional, e atacando o "principal_gargalo" identificado)

## 📅 Plano de Execução
### Diário
(ações simples e executáveis, com meta de faturamento por dia baseada em "necessario_por_dia")
### Semanal
(prioridades da semana)
### Quinzenal
(checkpoint de meio de mês — o que avaliar e ajustar)
### Mensal
(visão consolidada e resultado esperado)

## 🎯 Foco da Semana
(exatamente 3 prioridades, curtas e objetivas)

## 🧠 Plano de Evolução Profissional
(com base no comportamental e feedbacks: hábitos a corrigir, competências a desenvolver, treinamentos recomendados)

## 🚨 Alertas Críticos
(os 3 maiores riscos para bater a meta, baseados nos dados reais)

## 🚀 Oportunidades de Alto Impacto
(as 3 ações com maior potencial de resultado)

## 👔 Visão do Gestor
"Se eu fosse o gestor hoje, minhas prioridades seriam:" (liste 3 prioridades objetivas)

## 🏆 Missão dos Próximos 30 Dias
(resumo simples: meta principal, meta diária, comportamento obrigatório, serviço prioritário, resultado esperado)`

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
