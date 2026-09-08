import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  calcularIndicadoresMeta, calcularScoreNodri, calcularBenchmarking,
  calcularPotencialOculto, buscarResumoComportamental, buscarFidelizacaoAtual,
  identificarCausaRaiz, buscarPendencias, buscarVendaProdutos,
  calcularSimuladorMeta, calcularDinheiroPerdido, calcularOportunidadesOcultas, buscarTendenciaFidelizacao,
} from '@/lib/metasAnalitico'
import { getSessao } from '@/lib/apiAuth'
import { iaGerarConfigurado } from '@/lib/iaClient'

// Prompt longo + retry pode passar de 10s; garante margem de tempo na função.
export const maxDuration = 60

// Sub-usuário é somente leitura. A profissional pode gerar/salvar a PRÓPRIA
// estratégia de meta (só o próprio id). Dono nunca é bloqueado.
async function bloqueioEstrategia(idAlvo: string): Promise<NextResponse | null> {
  const sess = await getSessao()
  if (sess?.role === 'sub') return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  if (sess?.role === 'profissional' && sess.profissionalId !== idAlvo)
    return NextResponse.json({ error: 'Você só pode gerar a sua própria estratégia' }, { status: 403 })
  return null
}

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload?.salaoId || null
}

// Prompt longo (15 seções): tokens altos e thinkingBudget:0 no Gemini para não
// gastar o orçamento "pensando" e voltar vazio. Retry/backoff vêm do iaGerar.
async function chamarIA(apiKey: string, modelo: string, prompt: string): Promise<string> {
  // Passa pelo resolvedor central: chave e modelo do painel, com reserva
  // automatica se o provedor principal cair.
  // 2200, nao 16000. O teto antigo nao era um limite: era uma permissao para
  // escrever doze secoes, e o modelo usava. Duas geracoes dessas queimavam a
  // cota diaria inteira do Gemini — um planejamento por profissional custava
  // mais do que um dia de conversa de todo o salao.
  return iaGerarConfigurado(prompt, { maxTokens: 2200, geminiThinkingBudget: 0 })
}

// POST — gera (ou regenera) o planejamento estratégico para bater a meta do mês
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const bloq = await bloqueioEstrategia(params.id); if (bloq) return bloq
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
      const tendencia = negSegundaQ > negPrimeiraQ ? 'piorando' : negSegundaQ < negPrimeiraQ ? 'melhorando' : 'estável'

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

  const [simuladorMeta, dinheiroPerdido, oportunidadesOcultas, tendenciaFidelizacao] = await Promise.all([
    calcularSimuladorMeta(salaoId, params.id, prof.servicos_habilitados || [], faltam, diasRestantes),
    calcularDinheiroPerdido(salaoId, params.id, comportamental.atrasos, comportamental.faltas, mediaFaturamentoDiario),
    calcularOportunidadesOcultas(salaoId, params.id, prof.cargo, prof.servicos_habilitados || [], ano, mes),
    buscarTendenciaFidelizacao(salaoId, params.id, ano, mes),
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
    oportunidades_ocultas: (oportunidadesOcultas as any)?.oportunidades_habilitadas?.length > 0 || (oportunidadesOcultas as any)?.servicos_para_aprender?.length > 0
      ? oportunidadesOcultas
      : 'sem dado suficiente',
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
      tendencia: tendenciaFidelizacao || 'sem histórico suficiente',
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
8. REGRA ABSOLUTA — NUNCA inclua em promoções, pacotes, combos ou sugestões: higienização (qualquer tipo), complementos, troca de esmalte, remoção de gel, top coat, secagem, shampoo, lavagem ou preparo. São complementos/finalizações, não vendas reais.
9. REGRA DE GÊNERO — NUNCA vincule BARBA (ou serviços masculinos) com procedimentos femininos (manicure, pedicure, escova, unhas, sobrancelha feminina, etc.) na mesma sugestão/combo/ação. ÚNICA EXCEÇÃO: quando a intenção for PRESENTEAR alguém. Fora isso, mantenha serviços masculinos e femininos separados.

PROFISSIONAL: ${prof.nome_completo} (${prof.apelido || ''}) | Cargo: ${prof.cargo}
HABILIDADES: ${prof.habilidades || 'não informado'}

SERVIÇOS DO PROFISSIONAL (preço cheio | comissão líquida):
${servicosTexto}

FEEDBACKS DE CLIENTES:
${feedbacksTexto}

DADOS DO SISTEMA (calculados pelo backend — use como verdade absoluta):
${contratoJson}

---
ESTRUTURA DA RESPOSTA — siga exatamente, sem acrescentar secoes.

REGRA DE TAMANHO, ACIMA DE TODAS: no maximo 400 palavras no total.
Quem le isso e uma profissional entre um atendimento e outro. Documento longo
nao e lido com mais atencao: e lido pela metade, ou nao e lido. Se um trecho
nao muda o que ela vai fazer amanha, ele nao entra.
Nunca repita um numero que ja apareceu na tabela. Nada de introducao, nada de
fechamento, nada de "espero ter ajudado".

# PLANO DE META — ${prof.nome_completo.toUpperCase()}

| Item | Valor |
|---|---|
| Meta | R$ {meta} |
| Feito ate agora | R$ {faturado} |
| Falta | R$ {falta} |
| Dias restantes | {dias_restantes} |
| Precisa por dia | R$ {necessario_por_dia} |
| Chance de bater | {chance_de_bater_meta_pct}% |

**O que precisa acontecer:** uma frase, no maximo 25 palavras, interpretando a
situacao — sem repetir os numeros da tabela.

## O QUE ESTA TRAVANDO

Maximo 3 linhas. Use causa_raiz_do_gargalo e prove com UM numero real (ocupacao,
ticket, retencao ou comportamento — o que for o gargalo de verdade). Escreva no
estilo: "O gargalo nao e X. E Y — e por isso Z."
Se benchmarking existir, encaixe a posicao dela numa dessas linhas
("Xo lugar de Y em ocupacao"). Se for null, nao mencione.

## AS 3 ACOES QUE MAIS MOVEM

Exatamente 3, da maior para a menor em dinheiro. Cada uma em DUAS linhas:
**1. [Acao em ate 5 palavras]**
- Fazer: (o que e quanto, concreto, ate 15 palavras)
- Vale: R$ X a mais (use simulador_meta, oportunidades ou dinheiro_perdido — numeros do sistema, nunca estimados por voce)

## TODO DIA

3 itens, ate 8 palavras cada, especificos para ESTA profissional a partir dos
dados dela. Nada de conselho generico que serviria para qualquer pessoa.

**Insight NODRI:** uma frase final, no maximo 20 palavras, com a observacao mais
valiosa que os dados permitem — do tipo que so quem olhou os numeros dela diria.`

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
  const bloq = await bloqueioEstrategia(params.id); if (bloq) return bloq
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
