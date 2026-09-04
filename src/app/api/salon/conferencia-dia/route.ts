import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { conferirDia, REGRAS_PADRAO, type Atendimento, type RegraComposicao } from '@/lib/conferenciaDia'
import { chaveDoMes, totalDoCaixa, type CaixaDoDia, type FolhaCaixas } from '@/lib/caixasDia'
import type { PrecoDeTabela } from '@/lib/tabelaPrecos'
import { chaveDoMes as chaveProdutos, type LinhaProduto } from '@/lib/produtosDia'
import { chaveDoMes as chavePapel, numeroComanda as numPapel, type FolhaPapel, type ValoresDoPapel } from '@/lib/conferenciaPapel'

export const dynamic = 'force-dynamic'

const CHAVE_REGRAS = 'conferencia_regras'

// Endereço da tela de Comandas Finalizadas no Avec.
//
// Fica no banco e não no código da extensão: se o Avec mudar o endereço, o
// dono corrige no painel e todas as máquinas passam a usar o novo — sem
// reinstalar extensão em nenhuma delas.
const CHAVE_AVEC = 'conferencia_avec_url'
const AVEC_PADRAO = 'https://admin.avec.beauty/admin/financeiro/comanda/historico'

// Conferência automática de um dia, sobre os atendimentos já importados.
//
// Não busca nada em sistema de fora: lê `atendimentos_raw`, que entra pela
// importação do relatório. É a parte da conferência que funciona hoje, sem
// extensão e sem câmera.
//
// O histórico serve de régua para o preço "normal" de cada serviço. Uso 90
// dias: menos que isso e um serviço pouco vendido nunca junta ocorrências
// suficientes para ter padrão; muito mais e uma tabela de preço antiga passa a
// contar como se fosse a de hoje.
const DIAS_DE_HISTORICO = 90

function paraISO(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || '').trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const data = String(new URL(req.url).searchParams.get('data') || '').trim()   // DD/MM/AAAA
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    return NextResponse.json({ error: 'Informe a data como DD/MM/AAAA' }, { status: 400 })
  }

  const iso = paraISO(data)
  const inicio = new Date(iso)
  inicio.setDate(inicio.getDate() - DIAS_DE_HISTORICO)

  const campos = 'num_comanda, data_comanda, profissional, cliente, servico, categoria, qtd, valor, desconto, total, pacote, ano, mes'

  const [diaN, mesN, anoN] = data.split('/').map(Number)

  // ── O DIA: buscado direto pela data ───────────────────────────────────────
  //
  // Antes eu trazia 4 meses de atendimento e filtrava o dia na memória. Duas
  // coisas davam errado: o PostgREST corta em 1000 linhas quando não se pede
  // limite, e os 4 meses incluíam junho — que sozinho encheu as 1000 vagas.
  // Setembro existia no banco e nunca chegava aqui. Pedir o dia ao banco é
  // exato, e é uma fração do volume.
  const { data: linhasDia, error: erroDia } = await supabaseAdmin
    .from('atendimentos_raw')
    .select(campos)
    .eq('salao_id', sess.salaoId)
    .eq('ano', anoN).eq('mes', mesN)
    .eq('data_comanda', data)
    .limit(5000)
  if (erroDia) return NextResponse.json({ error: erroDia.message }, { status: 500 })

  // ── O HISTÓRICO: régua do preço normal de cada serviço ────────────────────
  // Só o mês do dia e os dois anteriores, e com limite explícito.
  const meses: Array<{ ano: number; mes: number }> = []
  const d = new Date(iso)
  for (let i = 0; i < 3; i++) {
    meses.push({ ano: d.getFullYear(), mes: d.getMonth() + 1 })
    d.setMonth(d.getMonth() - 1)
  }
  const { data: linhasHist, error: erroHist } = await supabaseAdmin
    .from('atendimentos_raw')
    .select(campos)
    .eq('salao_id', sess.salaoId)
    .in('ano', Array.from(new Set(meses.map(m => m.ano))))
    .in('mes', Array.from(new Set(meses.map(m => m.mes))))
    .limit(20000)
  if (erroHist) return NextResponse.json({ error: erroHist.message }, { status: 500 })

  const doDia = (linhasDia || []) as unknown as Atendimento[]
  const todos = (linhasHist || []) as unknown as Atendimento[]
  const historico = todos.filter(a => String(a.data_comanda).trim() !== data)

  const { data: cfg } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess.salaoId).eq('chave', CHAVE_REGRAS).maybeSingle()
  const regras: RegraComposicao[] = Array.isArray((cfg as any)?.valor)
    ? (cfg as any).valor : REGRAS_PADRAO

  // ── O MOVIMENTO DE CAIXA, se a extensão já trouxe ─────────────────────────
  //
  // Parte híbrida: o que o relatório importado sabe (itens lançados) encontra
  // aqui o que só a tela do Avec sabe (quem fechou, quanto entrou, em que
  // forma). Se não veio, a conferência segue e diz que não conferiu o valor —
  // nunca finge que conferiu.
  const { data: cfgAvec } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess.salaoId).eq('chave', CHAVE_AVEC).maybeSingle()
  const avecUrl = String((cfgAvec as any)?.valor?.url || '') || AVEC_PADRAO

  const { data: cfgCaixa } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess.salaoId).eq('chave', chaveDoMes(data)).maybeSingle()
  const folha = ((cfgCaixa as any)?.valor || {}) as FolhaCaixas
  const caixas: CaixaDoDia[] = Array.isArray(folha[data]) ? folha[data] : []

  // ── A TABELA DE PREÇOS, se o robô já trouxe o 0033 ────────────────────────
  // É a régua boa: diz quanto o serviço DEVE custar, em vez do que costuma
  // custar. Sem ela o motor cai no histórico, como fazia antes.
  const { data: cfgTab } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess.salaoId).eq('chave', 'tabela_precos').maybeSingle()
  const tabela: PrecoDeTabela[] = Array.isArray((cfgTab as any)?.valor?.itens)
    ? (cfgTab as any).valor.itens : []

  // ── PRODUTOS do dia (relatório 0041) ──────────────────────────────────────
  // Sem eles o confronto compara serviços contra serviços+produtos, e toda
  // comanda que vendeu produto acusa diferença que não existe.
  const { data: cfgProd } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess.salaoId).eq('chave', chaveProdutos(data)).maybeSingle()
  const todosProdutos: LinhaProduto[] = Array.isArray((cfgProd as any)?.valor?.itens)
    ? (cfgProd as any).valor.itens : []
  const produtos = todosProdutos.filter(l => l.data_venda === data)

  // ── O PAPEL: o que foi digitado da comanda física ─────────────────────────
  const { data: cfgPapel } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess.salaoId).eq('chave', chavePapel(data)).maybeSingle()
  const folhaPapel = ((cfgPapel as any)?.valor || {}) as FolhaPapel
  const papel: ValoresDoPapel = folhaPapel[data] || {}

  const achados = conferirDia(doDia, regras, historico, caixas, tabela, produtos, papel)

  // ── A lista de comandas do dia, para a tela do papel ──────────────────────
  // A pessoa não deve digitar o número da comanda: o sistema já sabe quais são.
  // Ela digita só o valor do papel — metade do trabalho, e some a classe de
  // erro em que se digita o número errado e se comparam duas coisas sem relação.
  const porComandaLista = new Map<string, { cliente: string; profissional: string; servicos: number }>()
  for (const a of doDia) {
    const k = String(a.num_comanda ?? '').trim()
    if (!k) continue
    const atual = porComandaLista.get(k) || { cliente: '', profissional: '', servicos: 0 }
    porComandaLista.set(k, {
      cliente: atual.cliente || String(a.cliente || ''),
      profissional: atual.profissional || String(a.profissional || ''),
      servicos: atual.servicos + (Number(a.total) || 0),
    })
  }
  const prodPorComanda = new Map<string, number>()
  for (const l of produtos) {
    const k = numPapel(l.num_comanda)
    if (k) prodPorComanda.set(k, (prodPorComanda.get(k) || 0) + (Number(l.total) || 0))
  }
  const recebidoPorComanda = new Map<string, number>()
  for (const c of caixas) for (const x of c.comandas || []) {
    const k = String(x.comanda || '').trim()
    if (k) recebidoPorComanda.set(k, (recebidoPorComanda.get(k) || 0) + (Number(x.valor) || 0))
  }
  // Comandas que existem só no CAIXA entram na lista do mesmo jeito.
  //
  // A compra de pacote é o caso: não tem serviço executado, então não aparece
  // no relatório 0031 — e a comanda sumia da conferência do papel, justamente
  // uma das que mais precisa ser conferida, porque é dinheiro que entrou sem
  // contrapartida em serviço.
  for (const k of prodPorComanda.keys()) {
    if (!porComandaLista.has(k)) porComandaLista.set(k, { cliente: '', profissional: '', servicos: 0 })
  }
  for (const k of recebidoPorComanda.keys()) {
    if (!porComandaLista.has(k)) porComandaLista.set(k, { cliente: '', profissional: '', servicos: 0 })
  }

  const comandasDoDia = Array.from(porComandaLista.entries())
    .map(([comanda, v]) => {
      const prod = prodPorComanda.get(comanda) || 0
      const lancado = v.servicos + prod
      const receb = recebidoPorComanda.has(comanda) ? Number(recebidoPorComanda.get(comanda)!.toFixed(2)) : null
      // Sem serviço nem produto (compra de pacote), a referência do papel passa
      // a ser o que entrou no caixa — é o único valor que o sistema tem para
      // essa comanda, e comparar contra zero acusaria a comanda inteira.
      const referencia = lancado > 0 ? lancado : (receb ?? 0)
      return {
      comanda,
      cliente: v.cliente || '—',
      profissional: v.profissional || '—',
      servicos: Number(v.servicos.toFixed(2)),
      produtos: Number(prod.toFixed(2)),
      total: Number(referencia.toFixed(2)),
      soNoCaixa: lancado <= 0 && receb !== null,
      recebido: receb,
      caixa: caixas.find(c => (c.comandas || []).some(x => String(x.comanda).trim() === comanda))?.responsavel || null,
      }
    })
    .sort((a, b) => (Number(a.comanda) || 0) - (Number(b.comanda) || 0))

  const comandas = new Set(doDia.map(a => String(a.num_comanda)))
  const faturado = doDia.reduce((s, a) => s + (Number(a.total) || 0), 0)

  // Quando o dia vem vazio, dizer só "não tem" deixa o dono no escuro: ele não
  // sabe se esqueceu de importar, se importou outro mês, ou se a data está
  // gravada em outro formato. Então a resposta leva o que existe de fato.
  const doMes = todos.filter(a => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(a.data_comanda).trim())
    return m && `${m[2]}/${m[3]}` === data.slice(3)
  })
  const diasComDado = Array.from(new Set(doMes.map(a => String(a.data_comanda).trim())))
    .sort((x, y) => x.slice(0, 2).localeCompare(y.slice(0, 2)))

  return NextResponse.json({
    data,
    // As regras vão junto para a tela poder editá-las sem uma segunda ida ao
    // servidor — e os nomes de serviço reais junto delas, para o dono escolher
    // de uma lista em vez de digitar de cabeça e errar o nome por um acento.
    regras,
    servicosConhecidos: Array.from(new Set(
      [...doDia, ...todos].map(a => String(a.servico || '').trim()).filter(Boolean),
    )).sort((x, y) => x.localeCompare(y, 'pt-BR')),
    // Categorias vão separadas das dos serviços: escolher a categoria cobre
    // todos os serviços dela de uma vez, inclusive os que ainda vão nascer.
    categoriasConhecidas: Array.from(new Set(
      [...doDia, ...todos].map(a => String(a.categoria || '').trim()).filter(Boolean),
    )).sort((x, y) => x.localeCompare(y, 'pt-BR')),
    // Resumo por caixa: cada recepcionista responde pelo seu, então a tela
    // separa por responsável em vez de somar tudo num monte só.
    caixas: caixas.map(c => ({
      responsavel: c.responsavel,
      abertura: c.abertura || null,
      fechamento: c.fechamento || null,
      comandas: c.comandas.length,
      total: totalDoCaixa(c),
      formas: c.comandas.reduce((acc: Record<string, number>, x) => {
        const f = x.forma || 'Sem forma'
        acc[f] = (acc[f] || 0) + x.valor
        return acc
      }, {}),
    })),
    temCaixa: caixas.length > 0,
    // A tela precisa dizer QUAL régua usou: com a tabela, um preço fora dela é
    // problema; sem ela, é só "diferente do de costume".
    precosNaTabela: tabela.length,
    produtosNoDia: produtos.length,
    comandasDoDia,
    papel,
    produtosNoMes: todosProdutos.length,
    avecUrl,
    itens: doDia.length,
    comandas: comandas.size,
    faturado,
    baseDoHistorico: historico.length,
    achados,
    emRisco: achados.reduce((s, a) => s + (a.valorEmRisco || 0), 0),
    // Sem atendimento no dia não existe "conferido sem problema": existe
    // "não há o que conferir". A tela precisa saber a diferença.
    semDados: doDia.length === 0,
    // Pistas para quando não há dado no dia.
    totalNoBanco: todos.length,
    limiteAtingido: todos.length >= 20000,
    totalNoMes: doMes.length,
    diasComDado,
    // Uma amostra do que está gravado, para o caso de a data vir em outro
    // formato e o filtro por texto nunca casar.
    amostraDatas: Array.from(new Set(todos.slice(0, 200).map(a => String(a.data_comanda)))).slice(0, 6),
  })
}

// Regras de composição — o dono edita no painel, sem depender de deploy.
export async function PUT(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.regras)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { error } = await supabaseAdmin.from('salao_config').upsert(
    { salao_id: sess.salaoId, chave: CHAVE_REGRAS, valor: body.regras, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // O endereço do Avec vem junto quando o dono o edita. Guardo só endereço do
  // próprio Avec: um endereço trocado por engano faria a extensão abrir um
  // site qualquer já logado no navegador dele.
  if (typeof body?.avecUrl === 'string') {
    const limpo = body.avecUrl.trim()
    let valido = ''
    try {
      const u = new URL(limpo)
      if (u.protocol === 'https:' && u.hostname.endsWith('avec.beauty')) valido = u.href
    } catch { /* endereço inválido */ }
    if (limpo && !valido) {
      return NextResponse.json({ error: 'O endereço precisa ser https e do domínio avec.beauty' }, { status: 400 })
    }
    const { error: e2 } = await supabaseAdmin.from('salao_config').upsert(
      { salao_id: sess.salaoId, chave: CHAVE_AVEC, valor: { url: valido || AVEC_PADRAO }, atualizado_em: new Date().toISOString() },
      { onConflict: 'salao_id,chave' },
    )
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
