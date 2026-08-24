import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { escritaBloqueadaSub } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { iaGerar, extrairJSON } from '@/lib/iaClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Ações para o produto que está parado na prateleira ──────────────────────
//
// A dosadora cadastra o que venceu ou está encalhado; aqui a IA devolve o que
// dá para FAZER com aquilo. O prompt pede ação concreta de salão (promoção,
// uso interno, kit, treinamento) em vez de conselho genérico, porque a lista
// só tem valor se virar decisão.
//
// Recebe a lista já filtrada pela tela: o botão "todos" manda tudo, o botão
// "selecionados" manda só os marcados. A rota não escolhe — ela responde sobre
// o que chegou, e é isso que faz os dois botões usarem o mesmo caminho.

interface ItemEntrada {
  tipo?: string
  numeracao?: string
  tipoProduto?: string
  marca?: string
  quantidade?: number | string
  observacao?: string
}

export async function POST(req: NextRequest) {
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !['salon', 'sub'].includes(payload.role) || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // A chave vive na tabela ia_config_global, não em variável de ambiente:
  // é de lá que as outras telas de IA do sistema leem, e é lá que o dono
  // troca o modelo sem precisar de deploy. Usar process.env aqui deixaria
  // esta tela como a única que não funciona.
  const { data: cfg } = await supabaseAdmin
    .from('ia_config_global')
    .select('api_key, modelo, ativo')
    .limit(1)
    .maybeSingle()

  if (!cfg?.api_key || !cfg.ativo)
    return NextResponse.json({ error: 'A IA não está configurada no sistema.' }, { status: 422 })

  const modelo = cfg.modelo || 'gemini-2.5-flash'

  const body = await req.json().catch(() => null)
  const itens: ItemEntrada[] = Array.isArray(body?.itens) ? body.itens : []
  const escopo = body?.escopo === 'selecionados' ? 'selecionados' : 'todos'

  if (!itens.length)
    return NextResponse.json({ error: 'Nenhum item para analisar. Cadastre ou selecione ao menos um.' }, { status: 400 })

  // Limite de segurança: lista muito grande estoura o contexto e a resposta
  // sai truncada no meio de um JSON, que é pior do que não responder.
  const lista = itens.slice(0, 120)

  const linhas = lista.map((it, i) => {
    const qtd = it.quantidade === undefined || it.quantidade === '' ? '?' : it.quantidade
    const obs = (it.observacao || '').trim()
    const marca = (it.marca || '').trim() || 'sem marca'
    if (it.tipo === 'tinta') {
      return `${i + 1}. TINTA ${it.numeracao || 's/ numeração'} | marca ${marca} | ${qtd} un.${obs ? ` | obs: ${obs}` : ''}`
    }
    return `${i + 1}. PRODUTO ${it.tipoProduto || 's/ tipo'} | marca ${marca} | ${qtd} un.${obs ? ` | obs: ${obs}` : ''}`
  })

  const porMarca: Record<string, number> = {}
  lista.forEach(it => {
    const m = (it.marca || '').trim() || 'sem marca'
    porMarca[m] = (porMarca[m] || 0) + (Number(it.quantidade) || 0)
  })
  const resumoMarcas = Object.entries(porMarca)
    .sort((a, b) => b[1] - a[1])
    .map(([m, q]) => `${m}: ${q} un.`)
    .join(' | ')

  const prompt = `Você é consultor de gestão de salão de beleza no Brasil, especialista em estoque e em transformar produto encalhado em faturamento.

O salão "${payload.salaoNome}" tem estes produtos e tintas parados ou vencidos${escopo === 'selecionados' ? ' (seleção feita pela dosadora)' : ''}:

${linhas.join('\n')}

TOTAL POR MARCA: ${resumoMarcas}

Monte um plano de ação PRÁTICO. Regras:
- Produto VENCIDO nunca pode ser usado na cliente. Para vencido, a ação é descarte correto, troca/negociação com o fornecedor, ou uso em treinamento e teste de mecha (nunca em cliente).
- Produto dentro da validade mas encalhado pode virar promoção, combo, brinde por faixa de valor, kit de revenda ou uso interno em serviço.
- Tinta parada costuma sair em serviço promocional daquela cor específica, em dia temático ou em transformação com desconto.
- Cite a numeração da tinta, a marca e a quantidade nas ações — ação genérica não serve.
- Considere o volume: 2 unidades pedem ação diferente de 30 unidades.

Responda APENAS com JSON válido, sem markdown:
{
  "resumo": "2-3 frases sobre o que essa lista revela do estoque",
  "prejuizo_estimado": "estimativa em linguagem simples do que está parado ali, ou 'não dá para estimar sem os valores de custo'",
  "acoes": [
    {
      "titulo": "nome curto da ação",
      "itens_envolvidos": "quais tintas/produtos entram, com numeração e marca",
      "como_fazer": "passo a passo curto e executável",
      "prazo": "hoje|esta semana|este mês",
      "retorno": "o que o salão ganha com isso"
    }
  ],
  "descarte": [{"item": "o que descartar", "motivo": "por que não dá para aproveitar"}],
  "evitar_repetir": ["o que mudar na compra para não encalhar de novo"]
}`

  try {
    // thinkingBudget 0: no Gemini o "pensar" consome o mesmo orcamento de
    // tokens da resposta. Com ele ligado o JSON sai cortado no meio e o
    // extrairJSON devolve null — que foi como esta rota falhou no primeiro
    // teste em producao. As outras rotas de IA do sistema ja zeram isso.
    const text = await iaGerar(cfg.api_key, modelo, prompt, { maxTokens: 6000, geminiThinkingBudget: 0 })
    const parsed = extrairJSON(text)
    if (!parsed) {
      return NextResponse.json(
        { error: 'A IA respondeu num formato inesperado. Tente de novo.', raw: String(text || '').slice(0, 400) },
        { status: 500 })
    }
    return NextResponse.json({ ...parsed, escopo, analisados: lista.length })
  } catch {
    return NextResponse.json({ error: 'A IA está sobrecarregada. Tente novamente em instantes.' }, { status: 503 })
  }
}
