import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

async function geminiCall(apiKey: string, modelo: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
  })
  const json = await res.json()
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Regras comuns para todos os prompts
const REGRAS_GERAIS = `
REGRAS OBRIGATÓRIAS (violá-las invalida a resposta):
- NUNCA sugira shampoo, higienização, lavagem ou qualquer serviço de preparo como parte de um combo — eles são automaticamente realizados quando necessário e não geram venda adicional
- Se houver serviços com nomes semelhantes ou mesma categoria (ex: CORTE 10, CORTE 18, CORTE 19, CORTE 20), escolha apenas O MAIS RENTÁVEL (maior comissão) como representante — não repita a mesma categoria
- Priorize SEMPRE a combinação de ticket médio + comissão: o que gera mais valor real para o profissional
- Varie ao máximo os serviços sugeridos — use toda a gama de habilidades do profissional, não apenas os mais vendidos
- Pense em probabilidades reais: o cliente que faz X tem alta chance de aceitar Y?
`

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    const servicosStr = (todos_servicos_com_comissao || [])
      .map((s: any) => `${s.nome} (comissão: R$${s.comissao?.toFixed(2) || '0,00'})`)
      .join('\n')

    const maisVendeStr = (servicos_mais_vendidos || [])
      .map((s: any) => `${s.servico} — ${s.quantidade}x realizações, ${s.pct}% do total`)
      .join('\n')

    const bundlesExistentesStr = (bundles_existentes || [])
      .map((b: any) => `${b.servico_a} + ${b.servico_b}`)
      .join('\n') || 'Nenhum ainda'

    const prompt = `Você é especialista em estratégia de vendas para salões de beleza brasileiros.

Profissional: ${profNome} — ${cargo}

TODOS OS SERVIÇOS HABILITADOS COM COMISSÃO:
${servicosStr}

SERVIÇOS QUE MAIS VENDE (histórico):
${maisVendeStr}

COMBOS JÁ IDENTIFICADOS (NÃO REPITA):
${bundlesExistentesStr}

${REGRAS_GERAIS}

OBJETIVO: Gerar 10 NOVOS combos (2 serviços) que:
1. Maximizem o ticket médio E a comissão do profissional
2. Façam sentido técnico e sejam vendáveis no dia a dia
3. Variem bastante — explore toda a gama de habilidades, não só os top serviços
4. Sejam completamente diferentes dos combos já existentes acima
5. Para cada combo, calcule a comissão combinada dos dois serviços

FORMATO (JSON puro, sem markdown):
[
  {
    "servico_a": "NOME EXATO",
    "servico_b": "NOME EXATO",
    "comissao_total": 0.00,
    "motivo": "Por que esse combo faz sentido e aumenta o ticket (1 frase direta e específica)",
    "oportunidade": "Frase exata que o profissional pode dizer ao cliente para oferecer esse combo"
  }
]`

    const resposta = await geminiCall(config.api_key, modelo, prompt)
    try {
      const limpo = resposta.replace(/```json|```/g, '').trim()
      const sugestoes = JSON.parse(limpo)
      return NextResponse.json({ sugestoes })
    } catch {
      return NextResponse.json({ error: 'IA retornou formato inválido', raw: resposta }, { status: 500 })
    }
  }

  // ── OPORTUNIDADES IA ──────────────────────────────────────────────────────
  if (tipo === 'oportunidades') {
    const { profNome, cargo, mais_vende, deveria_vender, todos_servicos_com_comissao } = dados

    const servicosStr = (todos_servicos_com_comissao || [])
      .map((s: any) => `${s.nome} (comissão: R$${s.comissao?.toFixed(2) || '0,00'})`)
      .join('\n')

    const maisVendeStr = (mais_vende || [])
      .map((s: any) => `${s.servico} — ${s.quantidade}x, R$${s.valor?.toFixed(2) || '0'}`)
      .join('\n')

    const deveriaStr = (deveria_vender || [])
      .map((s: any) => `${s.servico} — ${s.motivo}`)
      .join('\n') || 'Nenhum identificado'

    const prompt = `Você é especialista em estratégia de vendas para salões de beleza brasileiros.

Profissional: ${profNome} — ${cargo}

SERVIÇOS MAIS VENDIDOS (histórico real):
${maisVendeStr}

SERVIÇOS HABILITADOS QUE RARAMENTE OU NUNCA VENDE:
${deveriaStr}

TODOS OS SERVIÇOS COM COMISSÃO:
${servicosStr}

${REGRAS_GERAIS}

OBJETIVO: Identificar 10 OPORTUNIDADES individuais (serviços isolados, não combos) que este profissional deveria explorar mais, priorizando:
1. Alto potencial de aceitação pelo perfil de clientes
2. Alta comissão para o profissional
3. Serviços que o profissional faz mas não explora — ou que clientes habituais precisam e não pedem
4. Variedade — não repita categorias similares

FORMATO (JSON puro, sem markdown):
[
  {
    "servico": "NOME EXATO",
    "comissao": 0.00,
    "potencial": "alto | médio",
    "motivo": "Por que este serviço é uma oportunidade real para este profissional (1 frase específica)",
    "abordagem": "Como oferecer — frase prática que o profissional pode usar com o cliente"
  }
]`

    const resposta = await geminiCall(config.api_key, modelo, prompt)
    try {
      const limpo = resposta.replace(/```json|```/g, '').trim()
      const oportunidades = JSON.parse(limpo)
      return NextResponse.json({ oportunidades })
    } catch {
      return NextResponse.json({ error: 'IA retornou formato inválido', raw: resposta }, { status: 500 })
    }
  }

  // ── META IA ───────────────────────────────────────────────────────────────
  if (tipo === 'meta') {
    const { profNome, cargo, faltam, meta, realizado, todos_servicos_com_comissao, historico_servicos } = dados

    const servicosStr = (todos_servicos_com_comissao || [])
      .map((s: any) => `${s.nome}: comissão R$${s.comissao?.toFixed(2) || '0,00'} | preço R$${s.preco?.toFixed(2) || '0,00'}`)
      .join('\n')

    const historicoStr = (historico_servicos || [])
      .slice(0, 10)
      .map((s: any) => `${s.servico}: ${s.quantidade}x realizações`)
      .join('\n') || 'Sem histórico'

    const prompt = `Você é especialista em estratégia de vendas para salões de beleza brasileiros.

Profissional: ${profNome} — ${cargo}
Meta do mês: R$${meta?.toFixed(2) || '0'}
Já realizado: R$${realizado?.toFixed(2) || '0'}
FALTAM: R$${faltam?.toFixed(2) || '0'} em COMISSÕES para bater a meta

SERVIÇOS HABILITADOS (nome | comissão por serviço | preço para cliente):
${servicosStr}

HISTÓRICO DE SERVIÇOS MAIS REALIZADOS:
${historicoStr}

${REGRAS_GERAIS}

OBJETIVO: Criar um PLANO ESTRATÉGICO personalizado para este profissional bater a meta, com:
1. Mix principal: combinação de 2-3 serviços que juntos maximizam comissão e têm alta probabilidade de venda
2. As quantidades de cada serviço devem somar exatamente (ou mais que) R$${faltam?.toFixed(2)} em comissão
3. Estratégias alternativas com serviços diferentes
4. Dica tática prática para o dia a dia

FORMATO (JSON puro, sem markdown):
{
  "resumo": "Frase motivacional e direta sobre o que precisa acontecer (máx 2 frases)",
  "mix_principal": [
    {
      "servico": "NOME EXATO",
      "comissao_unit": 0.00,
      "quantidade": 0,
      "comissao_total": 0.00,
      "porque": "Por que focar neste serviço (1 frase)"
    }
  ],
  "total_mix_comissao": 0.00,
  "alternativas": [
    {
      "servico": "NOME EXATO",
      "comissao_unit": 0.00,
      "quantidade_necessaria": 0,
      "comissao_total": 0.00
    }
  ],
  "dica_tatica": "1 dica prática e específica para este profissional converter mais neste mês"
}`

    const resposta = await geminiCall(config.api_key, modelo, prompt)
    try {
      const limpo = resposta.replace(/```json|```/g, '').trim()
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

    const prompt = `Você é um consultor de gestão de salões de beleza. Analise as ocorrências e gere um impacto DIRETO, FORTE e CLARO.

Profissional: ${profNome} — ${cargo}
Período anterior (P1): ${periodo1} — ${total_p1} ocorrências
Período atual (P2): ${periodo2} — ${total_p2} ocorrências

OCORRÊNCIAS:
${linhas || 'Nenhuma registrada'}

Seja direto, sem rodeios. Não proteja o profissional. Use linguagem profissional mas acessível.

FORMATO (JSON puro, sem markdown):
{
  "resumo": "Padrão observado em 1-3 frases",
  "impacto_profissional": "Impacto na carreira e imagem (2-3 frases fortes)",
  "impacto_cliente": "O que o cliente sente (2-3 frases)",
  "impacto_recepcao": "O que a recepção lida (2-3 frases práticas)",
  "impacto_salao": "Custo financeiro e reputacional (2-3 frases)",
  "mensagem_profissional": "Mensagem direta ao profissional — consultor falando pessoalmente. Máx 4 frases. Direto, sem ser agressivo, mas sem papas na língua."
}`

    const resposta = await geminiCall(config.api_key, modelo, prompt)
    try {
      const limpo = resposta.replace(/```json|```/g, '').trim()
      const analise = JSON.parse(limpo)
      return NextResponse.json({ analise })
    } catch {
      return NextResponse.json({ error: 'IA retornou formato inválido', raw: resposta }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
}
