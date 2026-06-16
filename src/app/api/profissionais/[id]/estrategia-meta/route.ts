import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
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

  // Faturamento realizado no mês corrente (mesma fonte usada nas métricas do profissional)
  const { data: metricaMes } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('faturamento')
    .eq('profissional_id', params.id)
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()
  const realizado = Number(metricaMes?.faturamento || 0)
  const faltam = Math.max(metaFinal - realizado, 0)

  const hojeNum = hoje.getDate()
  const ultimoDiaMes = new Date(ano, mes, 0).getDate()
  const diasRestantes = Math.max(ultimoDiaMes - hojeNum, 1)

  const prompt = `Você é um especialista em gestão de salões de beleza e produtividade de profissionais. Crie um planejamento estratégico SIMPLES e REALISTA para o profissional abaixo bater a meta do mês.

PROFISSIONAL: ${prof.nome_completo} (${prof.apelido || ''}) — Cargo: ${prof.cargo}
HABILIDADES (texto livre): ${prof.habilidades || 'não informado'}

SERVIÇOS QUE REALIZA (com preço e comissão líquida por serviço):
${servicosTexto}

FEEDBACKS DE CLIENTES:
${feedbacksTexto}

META DO MÊS: R$ ${metaFinal.toFixed(2)}
JÁ FATURADO ESTE MÊS: R$ ${realizado.toFixed(2)}
FALTA FATURAR: R$ ${faltam.toFixed(2)}
DIAS RESTANTES NO MÊS: ${diasRestantes}

Gere um plano de ação ALCANÇÁVEL, focado no resultado, considerando os serviços que ele realmente sabe fazer e o valor de comissão de cada um (priorize serviços com maior comissão quando fizer sentido). Estruture a resposta EXATAMENTE assim, em markdown, sem rodeios nem teoria:

## Resumo da Meta
(1-2 frases objetivas sobre a situação atual e o que precisa ser feito)

## Plano Diário
(o que fazer todo dia — ex: quantos atendimentos, quais serviços priorizar, meta de faturamento por dia)

## Plano Semanal
(metas e ações por semana até o fim do mês)

## Plano Quinzenal
(checkpoint de meio de mês — o que avaliar e ajustar)

## Plano Mensal
(visão consolidada do mês e o resultado esperado)

## Orientações Práticas
(3 a 5 dicas concretas e específicas para esse profissional, baseadas nas habilidades, comissões e feedbacks dele)

Seja direto, use valores em R$ sempre que possível, e não invente serviços ou preços que não estão na lista acima.`

  let plano_texto = ''
  try {
    plano_texto = await chamarIA(configGlobal.api_key, configGlobal.modelo || 'gemini-2.5-flash', prompt)
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao gerar estratégia: ' + err.message }, { status: 500 })
  }

  if (!plano_texto) return NextResponse.json({ error: 'A IA não retornou conteúdo.' }, { status: 500 })

  const { data: salvo, error } = await supabaseAdmin
    .from('planejamentos_metas')
    .upsert({
      salao_id: salaoId,
      profissional_id: params.id,
      ano, mes,
      meta_referencia: metaFinal,
      plano_texto,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'profissional_id,ano,mes' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...salvo, realizado, faltam })
}
