import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

// Serviços/itens que NUNCA podem entrar em promoções, pacotes, combos ou sugestões.
// São complementos/finalizações sem venda real — regra de negócio do salão.
const SERVICOS_PROIBIDOS = `REGRA ABSOLUTA — NUNCA, em hipótese alguma, inclua os seguintes itens em promoções, pacotes, combos ou sugestões (são complementos/finalizações, não vendas reais):
- Higienização / higienizações (qualquer tipo)
- Complementos
- Troca de esmalte
- Remoção de gel
- Top coat
- Secagem
- Shampoo, lavagem ou preparo
Se algum desses aparecer na lista oficial, IGNORE-O completamente. Sugestões que incluam qualquer um desses itens são inválidas.

REGRA DE GÊNERO — NUNCA vincule BARBA (ou serviços masculinos) com procedimentos femininos
(manicure, pedicure, escova, unhas, sobrancelha feminina, etc.) no mesmo combo/sugestão/ação.
ÚNICA EXCEÇÃO: quando a intenção for explicitamente PRESENTEAR alguém (ex: uma cliente comprando
barba de presente para um homem). Fora o caso de presente, manter serviços masculinos e femininos separados.`

// Chama a IA configurada — Claude (Anthropic) ou Gemini (Google), conforme o modelo.
async function iaCall(apiKey: string, modelo: string, prompt: string): Promise<string> {
  if (modelo.startsWith('claude')) {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: modelo,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    const txt = msg.content.find((c: any) => c.type === 'text') as any
    return txt?.text || ''
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096 },
    }),
  })
  const json = await res.json()
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function buildListaServicos(lista: any[]): string {
  return lista.map((s: any) => `- "${s.nome}" (comissão: R$${(s.comissao || 0).toFixed(2)})`).join('\n')
}

// Deduplication: remove serviços com mesmo prefixo de categoria (CORTE 10/18/19 → só o de maior comissão)
function deduplicarPorCategoria(lista: any[]): any[] {
  const categorias: Record<string, any> = {}
  for (const s of lista) {
    const cat = s.nome.replace(/\s*\d+.*$/, '').trim().toUpperCase()
    if (!categorias[cat] || (s.comissao || 0) > (categorias[cat].comissao || 0)) {
      categorias[cat] = s
    }
  }
  return Object.values(categorias)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { tipo, dados } = await req.json()

  const { data: config } = await supabaseAdmin
    .from('ia_config_global')
    .select('api_key, modelo, ativo')
    .limit(1)
    .maybeSingle()

  if (!config?.api_key || !config.ativo)
    return NextResponse.json({ error: 'IA não configurada ou inativa' }, { status: 422 })

  const modelo = config.modelo || 'gemini-2.5-flash'

  // ── BUNDLE IA ─────────────────────────────────────────────────────────────
  if (tipo === 'bundle') {
    const { profNome, cargo, servicos_mais_vendidos, bundles_existentes, todos_servicos_com_comissao } = dados

    // Deduplica categorias similares antes de passar à IA
    const servicosDed = deduplicarPorCategoria(todos_servicos_com_comissao || [])
    const nomesValidos = servicosDed.map((s: any) => `"${s.nome}"`).join(', ')
    const servicosStr = buildListaServicos(servicosDed)

    const maisVendeStr = (servicos_mais_vendidos || [])
      .map((s: any) => `"${s.servico}" — ${s.quantidade}x, ${s.pct}% do faturamento`)
      .join('\n')

    const bundlesExStr = (bundles_existentes || [])
      .map((b: any) => `"${b.servico_a}" + "${b.servico_b}"`)
      .join('\n') || 'Nenhum ainda'

    const prompt = `Você é especialista em estratégia de vendas para salões de beleza brasileiros.

Profissional: ${profNome} (${cargo})

══════════════════════════════════════════
LISTA OFICIAL DE SERVIÇOS — USE SOMENTE ESTES:
${servicosStr}

ATENÇÃO CRÍTICA: Os nomes no JSON devem ser CÓPIAS EXATAS de um dos nomes acima.
Qualquer serviço inventado ou com nome diferente torna a resposta inválida.
Nomes válidos: ${nomesValidos}
══════════════════════════════════════════

SERVIÇOS MAIS VENDIDOS ATUALMENTE:
${maisVendeStr}

COMBOS JÁ EXISTENTES — NÃO REPITA:
${bundlesExStr}

${SERVICOS_PROIBIDOS}

REGRAS OBRIGATÓRIAS:
1. Use APENAS serviços da lista oficial acima — ZERO invenção
2. NUNCA inclua higienização, shampoo, lavagem, preparo, troca de esmalte, remoção de gel, top coat, secagem ou complementos em nenhum combo
3. Cada serviço deve aparecer em no máximo 2 combos no total — VARIE ao máximo
4. Explore serviços pouco usados do profissional, não só os mais vendidos
5. Cada combo deve ter serviços de categorias DIFERENTES (ex: não juntar dois cortes)
6. Calcule a comissão combinada somando as duas comissões individuais

OBJETIVO: 10 combos novos que maximizem ticket médio + comissão do profissional

FORMATO (JSON puro, sem markdown, sem texto fora do array):
[
  {
    "servico_a": "NOME EXATO DA LISTA",
    "servico_b": "NOME EXATO DA LISTA",
    "comissao_total": 0.00,
    "motivo": "Por que esse par faz sentido para o cliente (1 frase concreta)",
    "oportunidade": "Frase que o profissional fala ao cliente para oferecer esse combo"
  }
]`

    const resposta = await iaCall(config.api_key, modelo, prompt)
    try {
      const limpo = resposta.replace(/```json[\s\S]*?```|```/g, '').trim()
      const sugestoes = JSON.parse(limpo)
      // Valida que os nomes estão na lista
      const nomesSet = new Set(servicosDed.map((s: any) => s.nome.toUpperCase()))
      const validas = sugestoes.filter((s: any) =>
        nomesSet.has((s.servico_a || '').toUpperCase()) && nomesSet.has((s.servico_b || '').toUpperCase())
      )
      return NextResponse.json({ sugestoes: validas.length > 0 ? validas : sugestoes })
    } catch {
      return NextResponse.json({ error: 'IA retornou formato inválido', raw: resposta }, { status: 500 })
    }
  }

  // ── OPORTUNIDADES IA ──────────────────────────────────────────────────────
  if (tipo === 'oportunidades') {
    const { profNome, cargo, mais_vende, deveria_vender, todos_servicos_com_comissao } = dados

    const servicosDed = deduplicarPorCategoria(todos_servicos_com_comissao || [])
    const nomesValidos = servicosDed.map((s: any) => `"${s.nome}"`).join(', ')
    const servicosStr = buildListaServicos(servicosDed)

    const maisVendeStr = (mais_vende || [])
      .map((s: any) => `"${s.servico}" — ${s.quantidade}x`)
      .join('\n') || 'Sem dados'

    const deveriaStr = (deveria_vender || [])
      .map((s: any) => `"${s.servico}" — ${s.motivo}`)
      .join('\n') || 'Nenhum identificado'

    const prompt = `Você é especialista em estratégia de vendas para salões de beleza brasileiros.

Profissional: ${profNome} (${cargo})

══════════════════════════════════════════
LISTA OFICIAL DE SERVIÇOS — USE SOMENTE ESTES:
${servicosStr}

ATENÇÃO CRÍTICA: O campo "servico" no JSON deve ser CÓPIA EXATA de um nome acima.
Nomes válidos: ${nomesValidos}
══════════════════════════════════════════

SERVIÇOS MAIS VENDIDOS HOJE:
${maisVendeStr}

SERVIÇOS HABILITADOS MAS POUCO EXPLORADOS:
${deveriaStr}

${SERVICOS_PROIBIDOS}

REGRAS:
1. Use APENAS serviços da lista oficial — ZERO invenção
2. Cada serviço deve aparecer no máximo 1 vez
3. Priorize serviços pouco explorados com comissão alta
4. Varie categorias — não sugira 3 cortes ou 3 tratamentos seguidos
5. Pense: qual cliente deste profissional aceitaria este serviço com mais facilidade?

OBJETIVO: 10 oportunidades de serviços individuais para aumentar ticket e comissão

FORMATO (JSON puro, sem markdown):
[
  {
    "servico": "NOME EXATO DA LISTA",
    "comissao": 0.00,
    "potencial": "alto",
    "motivo": "Por que é uma oportunidade real para este profissional (1 frase específica)",
    "abordagem": "Frase exata que o profissional pode dizer ao cliente"
  }
]`

    const resposta = await iaCall(config.api_key, modelo, prompt)
    try {
      const limpo = resposta.replace(/```json[\s\S]*?```|```/g, '').trim()
      const oportunidades = JSON.parse(limpo)
      const nomesSet = new Set(servicosDed.map((s: any) => s.nome.toUpperCase()))
      const validas = oportunidades.filter((s: any) => nomesSet.has((s.servico || '').toUpperCase()))
      return NextResponse.json({ oportunidades: validas.length > 0 ? validas : oportunidades })
    } catch {
      return NextResponse.json({ error: 'IA retornou formato inválido', raw: resposta }, { status: 500 })
    }
  }

  // ── META IA ───────────────────────────────────────────────────────────────
  if (tipo === 'meta') {
    const { profNome, cargo, faltam, meta, realizado, todos_servicos_com_comissao, historico_servicos } = dados

    const servicosDed = deduplicarPorCategoria(todos_servicos_com_comissao || [])
      .sort((a: any, b: any) => (b.comissao || 0) - (a.comissao || 0))

    const nomesValidos = servicosDed.map((s: any) => `"${s.nome}"`).join(', ')
    const servicosStr = servicosDed
      .map((s: any) => `- "${s.nome}": comissão R$${(s.comissao || 0).toFixed(2)} por serviço`)
      .join('\n')

    const historicoStr = (historico_servicos || [])
      .slice(0, 8)
      .map((s: any) => `"${s.servico}": ${s.quantidade}x`)
      .join('\n') || 'Sem histórico'

    const prompt = `Você é especialista em estratégia de vendas para salões de beleza brasileiros.

Profissional: ${profNome} (${cargo})
Meta do mês: R$${(meta || 0).toFixed(2)}
Já realizado: R$${(realizado || 0).toFixed(2)}
FALTAM em comissão: R$${(faltam || 0).toFixed(2)}

══════════════════════════════════════════
SERVIÇOS DISPONÍVEIS — USE APENAS ESTES:
${servicosStr}

Nomes válidos: ${nomesValidos}
══════════════════════════════════════════

HISTÓRICO (mais realizados):
${historicoStr}

${SERVICOS_PROIBIDOS}

REGRAS OBRIGATÓRIAS:
1. Use APENAS serviços da lista oficial acima
2. NO MIX PRINCIPAL use entre 4 e 6 serviços DIFERENTES — não repita categorias
3. Distribua as quantidades de forma equilibrada entre os serviços do mix
4. A soma das comissões do mix principal deve ser >= R$${(faltam || 0).toFixed(2)}
5. Nas alternativas, use serviços que NÃO estão no mix principal
6. Não inclua higienização, shampoo ou lavagem em nenhuma sugestão

OBJETIVO: Plano realista e variado para bater a meta usando toda a gama de serviços do profissional

FORMATO (JSON puro, sem markdown):
{
  "resumo": "Motivação direta e específica (máx 2 frases)",
  "mix_principal": [
    {
      "servico": "NOME EXATO DA LISTA",
      "comissao_unit": 0.00,
      "quantidade": 0,
      "comissao_total": 0.00,
      "porque": "Por que incluir este serviço no mix (1 frase)"
    }
  ],
  "total_mix_comissao": 0.00,
  "alternativas": [
    {
      "servico": "NOME EXATO DA LISTA",
      "comissao_unit": 0.00,
      "quantidade_necessaria": 0,
      "comissao_total": 0.00
    }
  ],
  "dica_tatica": "1 dica prática e específica para este profissional converter mais agora"
}`

    const resposta = await iaCall(config.api_key, modelo, prompt)
    try {
      const limpo = resposta.replace(/```json[\s\S]*?```|```/g, '').trim()
      const plano = JSON.parse(limpo)
      return NextResponse.json({ plano })
    } catch {
      return NextResponse.json({ error: 'IA retornou formato inválido', raw: resposta }, { status: 500 })
    }
  }

  // ── OCORRÊNCIAS IA ────────────────────────────────────────────────────────
  if (tipo === 'ocorrencias') {
    const { profNome, cargo, ocorrencias, periodo1, periodo2, total_p1, total_p2 } = dados

    const linhas = (ocorrencias || [])
      .map((o: any) => `- ${o.tipo}: ${o.p1 || 0}x em P1 → ${o.p2 || 0}x em P2 (${o.variacao !== null ? (o.variacao >= 0 ? '+' : '') + o.variacao + '%' : o.p2 > 0 ? 'NOVO' : '—'})`)
      .join('\n')

    const prompt = `Você é consultor de gestão de salões de beleza. Analise as ocorrências e gere impacto DIRETO e FORTE.

Profissional: ${profNome} — ${cargo}
P1: ${periodo1} — ${total_p1} ocorrências | P2: ${periodo2} — ${total_p2} ocorrências

OCORRÊNCIAS:
${linhas || 'Nenhuma registrada'}

Seja direto. Não proteja o profissional. Use linguagem profissional mas acessível.

FORMATO (JSON puro, sem markdown):
{
  "resumo": "Padrão observado em 1-3 frases",
  "impacto_profissional": "Impacto na carreira e imagem (2-3 frases fortes)",
  "impacto_cliente": "O que o cliente sente (2-3 frases)",
  "impacto_recepcao": "O que a recepção lida (2-3 frases práticas)",
  "impacto_salao": "Custo financeiro e reputacional (2-3 frases)",
  "mensagem_profissional": "Mensagem direta ao profissional — consultor falando pessoalmente. Máx 4 frases. Sem ser agressivo, mas sem papas na língua."
}`

    const resposta = await iaCall(config.api_key, modelo, prompt)
    try {
      const limpo = resposta.replace(/```json[\s\S]*?```|```/g, '').trim()
      const analise = JSON.parse(limpo)
      return NextResponse.json({ analise })
    } catch {
      return NextResponse.json({ error: 'IA retornou formato inválido', raw: resposta }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
}
