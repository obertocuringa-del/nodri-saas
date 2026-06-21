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
    const { profNome, cargo, servicos_mais_vendidos, bundles_existentes, todos_servicos } = dados

    const prompt = `Você é um especialista em estratégia de vendas para salões de beleza brasileiros.

Profissional: ${profNome} — Cargo: ${cargo}

SERVIÇOS QUE MAIS VENDE (histórico real):
${(servicos_mais_vendidos || []).map((s: any, i: number) => `${i + 1}. ${s.servico} (${s.quantidade}x, ${s.pct}% do total)`).join('\n')}

BUNDLES JÁ IDENTIFICADOS NO SISTEMA (NÃO REPITA ESSES):
${(bundles_existentes || []).map((b: any) => `- ${b.servico_a} + ${b.servico_b}`).join('\n') || 'Nenhum ainda'}

TODOS OS SERVIÇOS HABILITADOS PARA ESTE PROFISSIONAL:
${(todos_servicos || []).join(', ')}

REGRAS IMPORTANTÍSSIMAS DE SENSO COMUM (aplique sempre):
- NUNCA sugira "Higienização + Nutrição" ou "Higienização + Hidratação" — se vai nutrir/hidratar, vai lavar o cabelo automaticamente, é redundante
- NUNCA sugira "Troca de Esmalte + Manicure" — a manicure já inclui esmalte
- NUNCA sugira "Remoção de Top Coat + Manicure" pois não sabemos se a cliente vem com esmalte em gel
- NUNCA sugira combos onde um serviço já está incluso no outro por natureza
- Priorize combos que REALMENTE aumentam o ticket médio com serviços complementares que fazem sentido juntos

OBJETIVO: Gerar 10 NOVAS sugestões de bundle (combo de 2 serviços) que:
1. Aumentem o ticket médio do profissional
2. Façam sentido técnico e prático juntos
3. Usem serviços que este profissional realmente faz
4. Variem o mix — não repita o mesmo serviço em muitos combos
5. Sejam diferentes dos bundles já identificados acima

FORMATO DE RESPOSTA (JSON puro, sem markdown, sem explicação fora do JSON):
[
  {
    "servico_a": "NOME EXATO DO SERVIÇO A",
    "servico_b": "NOME EXATO DO SERVIÇO B",
    "motivo": "Por que esse combo faz sentido e aumenta o ticket (1 frase direta)",
    "oportunidade": "Como oferecer — o que o profissional deve dizer ao cliente (1 frase prática)"
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

  // ── OCORRÊNCIAS IA ────────────────────────────────────────────────────────
  if (tipo === 'ocorrencias') {
    const { profNome, cargo, ocorrencias, periodo1, periodo2, total_p1, total_p2 } = dados

    const linhas = (ocorrencias || [])
      .map((o: any) => `- ${o.tipo}: ${o.p1 || 0}x em P1 → ${o.p2 || 0}x em P2 (${o.variacao !== null ? (o.variacao >= 0 ? '+' : '') + o.variacao + '%' : o.p2 > 0 ? 'NOVO' : '—'})`)
      .join('\n')

    const prompt = `Você é um consultor de gestão de salões de beleza. Preciso que você analise o comportamento de ocorrências de um profissional e gere um impacto DIRETO, FORTE e CLARO sobre o que isso causa para cada parte envolvida.

Profissional: ${profNome} — ${cargo}
Período anterior (P1): ${periodo1} — ${total_p1} ocorrências
Período atual (P2): ${periodo2} — ${total_p2} ocorrências

OCORRÊNCIAS REGISTRADAS:
${linhas || 'Nenhuma ocorrência registrada'}

INSTRUÇÕES:
- Seja direto, sem rodeios, sem enrolação
- Use linguagem profissional mas acessível (não acadêmica)
- Não proteja o profissional — se o comportamento é prejudicial, diga com clareza
- NÃO use bullet points genéricos — seja específico para o tipo de ocorrência deste profissional
- O gestor vai mostrar essa análise para o profissional, então precisa ter impacto real

FORMATO DE RESPOSTA (JSON puro, sem markdown):
{
  "resumo": "1 parágrafo resumindo o padrão de comportamento observado (máx 3 frases)",
  "impacto_profissional": "O que esse comportamento está gerando para a carreira e imagem deste profissional (2-3 frases fortes)",
  "impacto_cliente": "O que o cliente sente e como isso afeta a fidelização (2-3 frases)",
  "impacto_recepcao": "O que a recepção precisa lidar por causa disso (2-3 frases práticas)",
  "impacto_salao": "O custo financeiro e reputacional para o salão (2-3 frases com dados quando possível)",
  "mensagem_profissional": "Uma mensagem direta para o profissional — como se você fosse um consultor falando com ele pessoalmente. Máx 4 frases. Sem ser agressivo, mas sem ser mole."
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
