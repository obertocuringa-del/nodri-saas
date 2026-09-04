// Conferência automática do dia, a partir do que já está no banco.
//
// ── A regra que rege este arquivo ────────────────────────────────────────────
//
// Nunca acusar sem certeza. Um relatório que aponta erro onde não há erro é
// pior que relatório nenhum: em duas semanas ninguém abre mais, e os achados
// verdadeiros morrem junto com os falsos.
//
// Por isso todo achado nasce em uma de três gavetas:
//   PROBLEMA        — tenho certeza. Ex.: serviço lançado com valor zero.
//   ATENCAO         — é estranho, mas pode ter explicação. Ex.: preço fora do
//                     habitual, que pode ser cortesia combinada.
//   NAO_CONFERIDO   — falta dado para julgar. Aparece separado, e NUNCA some
//                     no meio dos outros fingindo que foi conferido.
//
// ── Um erro que já foi cometido aqui, para não repetir ───────────────────────
//
// `valor` é o preço UNITÁRIO; `total` é valor × qtd. Na primeira versão desta
// conferência eu dividi `valor` por `qtd` e acusei uma TROCA DE ESMALTE de
// "R$ 16 em vez de R$ 32" — a comanda tinha 2 unidades de R$ 32, e o preço
// estava certo. Comparar sempre `valor` com `valor`.

import type { PrecoDeTabela } from './tabelaPrecos'
import { indicePorServico } from './tabelaPrecos'
import type { ValoresDoPapel } from './conferenciaPapel'
import type { LinhaProduto } from './produtosDia'
import { totalPorComanda as produtosPorComanda, numeroComanda as numProd } from './produtosDia'
import type { CaixaDoDia } from './caixasDia'
import { donoDaComanda, recebidoPorComanda } from './caixasDia'

/**
 * Como a extensão nomeia a comanda que não passou por caixa.
 *
 * É o texto que o Avec escreve na coluna do responsável ("Não utiliza um
 * caixa."), traduzido para um rótulo curto. Fica aqui como constante porque as
 * duas pontas — o motor e a tela — precisam concordar sobre ele.
 */
export const SEM_CAIXA = 'Sem caixa'

/** Valor no padrão do Brasil — o texto do achado é lido por gente daqui. */
const rs = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export type Gravidade = 'problema' | 'atencao' | 'nao_conferido'

export interface Achado {
  id: string
  gravidade: Gravidade
  tipo: string
  comanda: string
  cliente: string
  profissional: string
  servico: string
  texto: string
  /** Quanto está em jogo, em reais. Zero quando não dá para medir. */
  valorEmRisco: number
  /** Responsável pelo caixa da comanda, quando o dado do caixa chegou. */
  caixa?: string
}

export interface Atendimento {
  num_comanda: string | number
  data_comanda: string
  profissional: string
  cliente: string
  servico: string
  categoria: string
  qtd: number
  valor: number
  desconto: number
  total: number
  /** Preenchido quando o item é resgate de pacote já pago antes. */
  pacote?: string
}

/**
 * Regra de composição da comanda. Dois tipos:
 *
 *   exige   — quem tem A precisa ter B junto.
 *             Ex.: toda COLORAÇÃO exige COMPLEMENTO; todo CORTE exige HIGIENIZAÇÃO.
 *   proibe  — quem tem A não pode ter B junto.
 *             Ex.: ou é HIGIENIZAÇÃO ou é TRATAMENTO, nunca os dois.
 *
 * `tipo` é opcional porque as regras já gravadas não o têm: ausente vale
 * 'exige', que era o único comportamento até aqui. Sem isso, ligar o campo
 * mudaria em silêncio o sentido das regras que o salão já cadastrou.
 */
export interface RegraComposicao {
  id: string
  /**
   * exige  — precisa ter PELO MENOS UM dos alvos
   * proibe — não pode ter NENHUM dos alvos
   * um_so  — precisa ter EXATAMENTE UM: nem zero, nem dois
   */
  tipo?: 'exige' | 'proibe' | 'um_so'
  quando: string      // nome do serviço OU categoria que dispara a regra
  exige: string       // primeiro alvo (mantido: é o que as regras antigas gravaram)
  /**
   * Os demais alvos, como alternativas.
   *
   * "Coloração exige Shampoo ou Tratamento ou Terapia" é uma regra só, com
   * três alvos — e não três regras, que acusariam a comanda duas vezes por
   * não ter as outras duas.
   */
  alternativas?: string[]
  /**
   * Serviços que a regra NÃO alcança, mesmo estando dentro do gatilho.
   *
   * Existe porque o gatilho costuma ser uma CATEGORIA — é o que faz uma linha
   * cobrir o salão inteiro — e categoria quase sempre tem uma ovelha fora do
   * padrão. "Toda Coloração exige Complemento" é verdade, menos para
   * PIGMENTAÇÃO SOBRANCELHAS, que está na categoria Coloração e não leva
   * complemento nenhum.
   *
   * Sem isto, a saída seria abrir mão da categoria e listar serviço por
   * serviço — e regra que dá trabalho de manter é regra que envelhece errada.
   */
  exceto?: string[]
  ativa: boolean
}

/** Os serviços que a regra deixa de fora. */
export function excecoesDaRegra(r: RegraComposicao): string[] {
  return (r.exceto || []).map(x => String(x || '').trim()).filter(Boolean)
}

/** Todos os alvos da regra: o primeiro mais as alternativas. */
export function alvosDaRegra(r: RegraComposicao): string[] {
  return [r.exige, ...(r.alternativas || [])]
    .map(x => String(x || '').trim())
    .filter(Boolean)
}

const norm = (s: any) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/\s+/g, ' ').trim()

const rid = () => Math.random().toString(36).slice(2, 9)

/**
 * O texto contém o alvo como PALAVRA INTEIRA (ou sequência de palavras)?
 *
 * Casar por pedaço de palavra fez a regra "COLORAÇÃO exige COMPLEMENTO" acusar
 * uma "DESCOLORAÇÃO DE SOBRANCELHA" — que é clareamento de sobrancelha, não
 * química de cabelo. Um falso positivo desses na primeira semana e o dono para
 * de ler o relatório.
 */
function contemPalavra(texto: string, alvo: string): boolean {
  const t = norm(texto).split(' ').filter(Boolean)
  const a = norm(alvo).split(' ').filter(Boolean)
  if (!a.length || a.length > t.length) return false
  for (let i = 0; i + a.length <= t.length; i++) {
    if (a.every((p, j) => t[i + j] === p)) return true
  }
  return false
}

/**
 * Quantas ocorrências do mesmo preço são necessárias para ele virar "o preço
 * normal" e o resto virar exceção.
 *
 * Com duas cobranças, uma de cada valor, não existe maioria — existe empate, e
 * apontar uma delas seria escolher no palpite. Nesse caso o serviço vai para
 * NAO_CONFERIDO em vez de acusar.
 */
const MINIMO_PARA_PADRAO = 3

export function conferirDia(
  atendimentos: Atendimento[],
  regras: RegraComposicao[],
  historico: Atendimento[] = [],
  caixas: CaixaDoDia[] = [],
  tabela: PrecoDeTabela[] = [],
  produtos: LinhaProduto[] = [],
  papel: ValoresDoPapel = {},
): Achado[] {
  const achados: Achado[] = []
  const dono = donoDaComanda(caixas)
  const recebido = recebidoPorComanda(caixas)
  const temCaixa = caixas.length > 0

  const add = (a: Omit<Achado, 'id'>) =>
    achados.push({ ...a, id: rid(), caixa: dono.get(String(a.comanda)) || undefined })

  const ctx = (a: Atendimento) => ({
    comanda: String(a.num_comanda ?? ''),
    cliente: String(a.cliente || '—'),
    profissional: String(a.profissional || '—'),
    servico: String(a.servico || '—'),
  })

  // ── 1. Serviço lançado com valor zero ─────────────────────────────────────
  // Certeza: ou é cortesia (e precisa estar registrada como tal) ou é lançamento
  // esquecido. Nos dois casos o dono tem de ver.
  //
  // MENOS quando é resgate de PACOTE: aí o valor zero é o correto, porque a
  // cliente pagou antes. Sem esta exceção, a conferência acusaria a comanda 48
  // (TERAPIA CAPILAR, pacote) exatamente como acusa a 29 (CORTE, sem pacote) —
  // e um falso positivo logo na primeira regra faz o dono parar de ler o resto.
  for (const a of atendimentos) {
    if (String(a.pacote || '').trim()) continue
    if (Number(a.valor) === 0 && Number(a.total) === 0) {
      add({ ...ctx(a), gravidade: 'problema', tipo: 'valor_zero', valorEmRisco: 0,
        texto: 'Serviço lançado com valor zero. Se foi cortesia, registre como cortesia.' })
    }
  }

  // ── 2. Total que não fecha com valor × quantidade ─────────────────────────
  for (const a of atendimentos) {
    const esperado = Number(a.valor) * Number(a.qtd || 1) - Number(a.desconto || 0)
    if (Math.abs(esperado - Number(a.total)) > 0.02) {
      add({ ...ctx(a), gravidade: 'problema', tipo: 'total_nao_fecha',
        valorEmRisco: Math.max(esperado - Number(a.total), 0),
        texto: `Total lançado R$ ${rs(a.total)}, mas ${a.qtd}× R$ ${rs(a.valor)}`
          + (Number(a.desconto) ? ` menos R$ ${rs(Number(a.desconto))} de desconto` : '')
          + ` dá R$ ${rs(esperado)}.` })
    }
  }

  // ── 3. Preço fora do habitual ─────────────────────────────────────────────
  //
  // Duas réguas, e a ordem entre elas importa.
  //
  // A TABELA OFICIAL (relatório 0033, que o robô traz) é a régua boa: ela diz
  // quanto o serviço DEVE custar. Quando o serviço está nela, cobrar diferente
  // é PROBLEMA, com o valor da diferença medido — não é palpite.
  //
  // O HISTÓRICO é a régua de reserva, para o serviço que ainda não está na
  // tabela. Ele só diz o que costuma acontecer, não o que deveria: por isso
  // continua gerando ATENÇÃO, e sem maioria clara vai para NÃO CONFERIDO.
  // O índice é montado com o norm DESTE arquivo, de propósito: é ele que
  // normaliza o serviço do lançamento logo abaixo, e as duas pontas têm de
  // ser a mesma função.
  const oficial = indicePorServico(tabela, norm)
  const porServico = new Map<string, number[]>()
  for (const a of [...historico, ...atendimentos]) {
    if (Number(a.valor) <= 0) continue
    const k = norm(a.servico)
    if (!k) continue
    porServico.set(k, [...(porServico.get(k) || []), Number(a.valor)])
  }

  for (const a of atendimentos) {
    if (Number(a.valor) <= 0) continue        // já virou achado na regra 1
    const k = norm(a.servico)

    const daTabela = oficial.get(k)
    if (daTabela !== undefined) {
      const dif = daTabela - Number(a.valor)
      if (Math.abs(dif) > 0.02) {
        add({ ...ctx(a), gravidade: 'problema', tipo: 'preco_fora_da_tabela',
          valorEmRisco: Math.max(dif, 0),
          texto: `Cobrado R$ ${rs(a.valor)}; a tabela de preços do salão diz R$ ${rs(daTabela)}. `
            + (dif > 0 ? `Faltam R$ ${rs(dif)}.` : `Cobrado R$ ${rs(-dif)} a mais.`) })
      }
      continue                                 // a tabela já respondeu: histórico não opina
    }

    const vals = porServico.get(k) || []
    const contagem = new Map<number, number>()
    for (const v of vals) contagem.set(v, (contagem.get(v) || 0) + 1)
    if (contagem.size <= 1) continue           // sempre cobrado igual: nada a dizer

    const ordenado = [...contagem.entries()].sort((x, y) => y[1] - x[1])
    const [precoComum, vezes] = ordenado[0]
    if (Number(a.valor) === precoComum) continue

    if (vezes < MINIMO_PARA_PADRAO) {
      add({ ...ctx(a), gravidade: 'nao_conferido', tipo: 'preco_sem_padrao', valorEmRisco: 0,
        texto: `Cobrado R$ ${rs(a.valor)}. Este serviço aparece com `
          + `${contagem.size} preços diferentes e nenhum se repete o bastante para ser o normal.` })
      continue
    }

    const dif = precoComum - Number(a.valor)
    add({ ...ctx(a), gravidade: 'atencao', tipo: 'preco_fora_do_normal',
      valorEmRisco: Math.max(dif, 0),
      texto: `Cobrado R$ ${rs(a.valor)}; o normal deste serviço é `
        + `R$ ${rs(precoComum)} (${vezes} vezes). `
        + (dif > 0 ? `Diferença de R$ ${rs(dif)} a menos.` : `Diferença de R$ ${rs((-dif))} a mais.`) })
  }

  // ── 4. Regras de composição do salão ──────────────────────────────────────
  // Ex.: toda COLORAÇÃO exige COMPLEMENTO na mesma comanda.
  const porComanda = new Map<string, Atendimento[]>()
  for (const a of atendimentos) {
    const k = String(a.num_comanda ?? '')
    porComanda.set(k, [...(porComanda.get(k) || []), a])
  }

  // A regra casa tanto pelo NOME do serviço quanto pela CATEGORIA dele.
  //
  // É o que torna a regra utilizável: com mil serviços cadastrados, exigir que
  // o dono liste um a um todos os que são coloração é pedir para a regra nunca
  // ser criada. Escrevendo "Coloração" — que é a categoria — uma linha cobre a
  // categoria inteira, e serviço novo que nascer nela já entra coberto.
  const bate = (i: Atendimento, alvo: string) =>
    contemPalavra(i.servico, alvo) || contemPalavra(i.categoria, alvo)

  for (const [comanda, itens] of porComanda) {
    for (const r of regras) {
      if (!r.ativa) continue
      const gatilho = norm(r.quando)
      const alvos = alvosDaRegra(r)
      if (!gatilho || !alvos.length) continue

      // A exceção vale POR ITEM, não pela comanda: se a comanda tem uma
      // coloração comum e uma pigmentação de sobrancelhas, a primeira continua
      // exigindo complemento. Tirar a comanda inteira faria a exceção virar
      // uma porta de saída para a regra toda.
      const excecoes = excecoesDaRegra(r)
      const disparou = itens.find(i =>
        bate(i, gatilho) && !excecoes.some(e => bate(i, norm(e))))
      if (!disparou) continue

      // Quais dos alvos a comanda realmente tem. É a contagem que permite
      // distinguir "nenhum", "um" e "mais de um" numa regra só.
      const presentes = alvos.filter(alvo => itens.some(i => bate(i, norm(alvo))))
      const lista = alvos.map(a => `"${a}"`).join(' ou ')
      const modo = r.tipo || 'exige'

      if (modo === 'proibe') {
        if (!presentes.length) continue
        add({ ...ctx(disparou), comanda, gravidade: 'problema', tipo: 'regra_conflito', valorEmRisco: 0,
          texto: `A comanda tem "${r.quando}" e ${presentes.map(a => `"${a}"`).join(' e ')} `
            + `— e não podem ir na mesma comanda.` })
        continue
      }

      if (modo === 'um_so') {
        if (presentes.length === 1) continue
        add({ ...ctx(disparou), comanda, gravidade: 'problema', tipo: 'regra_um_so', valorEmRisco: 0,
          texto: presentes.length === 0
            ? `A comanda tem "${r.quando}" e não tem nenhum de: ${lista}. Precisa ter um.`
            : `A comanda tem "${r.quando}" e ${presentes.map(a => `"${a}"`).join(' e ')} `
              + `— só pode ter um deles.` })
        continue
      }

      if (presentes.length) continue
      add({ ...ctx(disparou), comanda, gravidade: 'problema', tipo: 'regra_composicao', valorEmRisco: 0,
        texto: alvos.length === 1
          ? `A comanda tem "${r.quando}" e não tem "${alvos[0]}".`
          : `A comanda tem "${r.quando}" e não tem nenhum de: ${lista}.` })
    }
  }

  // ── 5. Serviço sem profissional ───────────────────────────────────────────
  //
  // Vira PROBLEMA, e não atenção: serviço sem profissional não entra em
  // comissão nenhuma e, até hoje, sumia do NODRI inteiro — o robô descartava a
  // linha na importação. Um COMPLEMENTO de R$ 70 lançado assim ficava
  // invisível no faturamento E fazia a conferência acusar a comanda de não ter
  // complemento. O item existia; quem não existia era o profissional.
  for (const a of atendimentos) {
    if (String(a.profissional || '').trim()) continue
    add({ ...ctx(a), gravidade: 'problema', tipo: 'sem_profissional', valorEmRisco: 0,
      texto: `Serviço lançado sem profissional: ${a.servico || 'sem nome'} `
        + `(R$ ${rs(a.total)}). Não entra na comissão de ninguém, e some dos `
        + `relatórios por profissional.` })
  }

  // ── 5a. Comanda paga sem passar por caixa ─────────────────────────────────
  //
  // O Avec marca essas comandas como "Não utiliza um caixa.". Elas apareciam
  // só como um número no cartão do resumo — e um número não se resolve. Aqui
  // cada uma vira um apontamento COM O NÚMERO DA COMANDA, que é o que permite
  // ir ao Avec e acertar.
  for (const c of caixas) {
    if (norm(c.responsavel) !== norm(SEM_CAIXA)) continue
    for (const x of c.comandas || []) {
      const num = String(x.comanda || '').trim()
      if (!num) continue
      add({ comanda: num, cliente: '—', profissional: '—', servico: '—',
        gravidade: 'atencao', tipo: 'comanda_sem_caixa',
        valorEmRisco: 0,
        texto: `Comanda ${num} recebeu R$ ${rs(x.valor)} sem passar por caixa nenhum. `
          + `No Avec ela está como "não utiliza um caixa" — então esse valor não `
          + `entra no fechamento de nenhuma recepcionista.` })
    }
  }

  // ── 5b. Produto sem profissional ──────────────────────────────────────────
  // Mesma exigência que já vale para o serviço: venda sem dono não entra em
  // comissão de ninguém e não tem a quem perguntar depois.
  for (const pr of produtos) {
    if (String(pr.profissional || '').trim()) continue
    add({ comanda: numProd(pr.num_comanda), cliente: pr.cliente || '—',
      profissional: '—', servico: pr.produto || 'Produto',
      gravidade: 'problema', tipo: 'produto_sem_profissional',
      valorEmRisco: 0,
      texto: `Produto vendido sem profissional: ${pr.produto || 'sem nome'} `
        + `(R$ ${rs(pr.total)}). Venda sem dono não entra na comissão de ninguém.` })
  }

  // ── 6. Lançado × recebido ─────────────────────────────────────────────────
  //
  // A conferência de caixa de verdade: a soma dos itens da comanda contra o
  // dinheiro que entrou por ela. Sem o dado do caixa isso é impossível — e
  // então é dito, em vez de a tela deixar parecer que foi conferido.
  const totalPorComanda = new Map<string, Atendimento[]>()
  for (const a of atendimentos) {
    const k = String(a.num_comanda ?? '').trim()
    if (k) totalPorComanda.set(k, [...(totalPorComanda.get(k) || []), a])
  }

  // O que a comanda teve de PRODUTO. Sem isto o confronto compara serviços
  // contra serviços+produtos, e toda comanda com produto acusa diferença.
  const prodComanda = produtosPorComanda(produtos)

  // Comanda que só teve produto não existe na lista de atendimentos e sumiria
  // do confronto — justamente a que mais parece "dinheiro sem lançamento".
  for (const k of prodComanda.keys()) {
    if (!totalPorComanda.has(k)) totalPorComanda.set(k, [])
  }
  // E a que só existe no CAIXA também entra: compra de pacote não tem serviço
  // executado, então nunca aparece no relatório de serviços. Sem isto ela
  // sumia da conferência do papel — e é dinheiro que entrou sem contrapartida
  // em serviço, das que mais precisam ser conferidas.
  for (const k of recebido.keys()) {
    if (!totalPorComanda.has(k)) totalPorComanda.set(k, [])
  }

  if (!temCaixa) {
    if (totalPorComanda.size > 0) {
      add({ comanda: '—', cliente: '—', profissional: '—', servico: '—',
        gravidade: 'nao_conferido', tipo: 'sem_dado_de_caixa', valorEmRisco: 0,
        texto: `O valor recebido não foi conferido: o dado do caixa não chegou. `
          + `${totalPorComanda.size} comanda(s) sem confronto entre o que foi lançado e o que entrou.` })
    }
  } else {
    for (const [comanda, itens] of totalPorComanda) {
      const emServico = itens.reduce((s, a) => s + (Number(a.total) || 0), 0)
      const emProduto = prodComanda.get(comanda) || 0
      const lancado = emServico + emProduto
      const pago = recebido.get(comanda)

      if (pago === undefined) {
        // Comanda lançada que não apareceu em caixa nenhum: pode estar aberta
        // ainda, então é ATENÇÃO e não PROBLEMA.
        add({ ...(itens[0] ? ctx(itens[0]) : { cliente: '—', profissional: '—', servico: '—' }),
          comanda, gravidade: 'atencao', tipo: 'comanda_fora_do_caixa',
          valorEmRisco: 0,
          texto: `Comanda lançada (R$ ${rs(lancado)}) e não encontrada em nenhum caixa do dia. `
            + `Pode estar aberta.` })
        continue
      }

      const dif = lancado - pago
      if (Math.abs(dif) <= 0.02) continue

      // ── Faltou dinheiro: é problema, e é o que a conferência existe para
      //    achar. O serviço foi lançado e o valor não entrou.
      const detalhe = emProduto > 0
        ? ` (serviços R$ ${rs(emServico)} + produtos R$ ${rs(emProduto)})`
        : ''

      if (dif > 0) {
        add({ ...(itens[0] ? ctx(itens[0]) : { cliente: '—', profissional: '—', servico: '—' }),
          comanda, gravidade: 'problema', tipo: 'lancado_diferente_do_recebido',
          valorEmRisco: dif,
          texto: `Lançado R$ ${rs(lancado)}${detalhe}, recebido R$ ${rs(pago)} no caixa. `
            + `Faltam R$ ${rs(dif)}.` })
        continue
      }

      // ── Entrou MAIS do que o lançado: quase sempre é PRODUTO ────────────
      //
      // O relatório que alimenta o NODRI é o de SERVIÇOS (0031) — conferi as
      // categorias importadas e nenhuma é de produto. Produto vendido na
      // comanda entra no caixa e não aparece aqui, então a conta fecha a menos
      // POR CONSTRUÇÃO, não por erro de ninguém.
      //
      // Acusar isso como problema encheria a conferência de alarme falso, e
      // conferência que grita todo dia deixa de ser lida. Fica em ATENÇÃO, com
      // a explicação provável, e sem valor em risco: não há dinheiro faltando
      // aqui — há dinheiro a mais, que é o produto.
      // A explicação tem de dizer o que É, não o que talvez seja. São três
      // situações diferentes, e chamar as três de "pode ser produto" faz o
      // dono conferir de novo o que já estava conferido.
      const porQue = produtos.length === 0
        // Nenhum produto importado no dia inteiro: a causa provável é essa, e
        // é uma frase só para o dia, não um palpite por comanda.
        ? ' Nenhum produto foi importado para este dia — importe a planilha e confira de novo.'
        : emProduto > 0
          // A comanda TEM produto importado e mesmo assim sobrou: aí não é
          // produto faltando, é diferença de verdade.
          ? ' Os produtos desta comanda já estão contados, então esta diferença não é produto.'
          : ' Há produtos importados neste dia, mas nenhum nesta comanda — confira a comanda no Avec.'

      add({ ...(itens[0] ? ctx(itens[0]) : { cliente: '—', profissional: '—', servico: '—' }),
        comanda, gravidade: 'atencao', tipo: 'recebido_a_mais',
        valorEmRisco: 0,
        texto: `Entraram R$ ${rs(-dif)} a mais do que o lançado`
          + `${detalhe || ` (R$ ${rs(lancado)})`}, caixa R$ ${rs(pago)}.` + porQue })
    }

    // Dinheiro que entrou por uma comanda que não existe nos lançamentos.
    for (const [comanda, pago] of recebido) {
      if (totalPorComanda.has(comanda)) continue
      // Sem nenhum serviço lançado: as duas explicações inocentes são comuns —
      // a comanda foi fechada depois da última importação, ou só teve produto.
      // Por isso ATENÇÃO: acusar aqui seria acusar o relógio.
      add({ comanda, cliente: '—', profissional: '—', servico: '—',
        gravidade: 'atencao', tipo: 'caixa_sem_lancamento', valorEmRisco: 0,
        texto: `Entraram R$ ${rs(pago)} no caixa por esta comanda, e ela não tem nenhum `
          + `serviço lançado no relatório. Pode ter sido fechada depois da última `
          + `importação, ou ter só produto.` })
    }
  }

  // ── 7. O papel × o sistema ────────────────────────────────────────────────
  //
  // A única comparação com fonte de fora. Tudo o mais confronta Avec com Avec:
  // se alguém digitou R$ 180 onde o papel dizia R$ 200, o lançamento e o caixa
  // concordam em 180 e o erro passa. Só o papel pega isso.
  //
  // Quem não foi digitado NÃO vira zero e NÃO vira problema: vira "não
  // conferido", junto com a contagem. Campo em branco quer dizer "não conferi",
  // e tratar isso como "foi zero" seria inventar uma divergência.
  const comandasComPapel = Object.keys(papel)
  if (comandasComPapel.length) {
    let conferidas = 0
    for (const [comanda, itens] of totalPorComanda) {
      const noPapel = papel[comanda]
      if (noPapel === undefined) continue
      conferidas++

      const emServico = itens.reduce((s, a) => s + (Number(a.total) || 0), 0)
      const lancado = emServico + (prodComanda.get(comanda) || 0)
      // Comanda sem serviço nem produto — compra de pacote é o caso — não tem
      // contra o que comparar a não ser o caixa. Medir contra zero acusaria a
      // comanda inteira, e o erro seria do sistema, não do salão.
      const noSistema = lancado > 0 ? lancado : (recebido.get(comanda) ?? 0)
      if (noSistema <= 0) continue
      const dif = noPapel - noSistema
      if (Math.abs(dif) <= 0.02) continue

      add({ ...(itens[0] ? ctx(itens[0]) : { cliente: '—', profissional: '—', servico: '—' }),
        comanda, gravidade: 'problema', tipo: 'papel_diferente_do_sistema',
        valorEmRisco: Math.max(dif, 0),
        texto: `Na comanda de papel está R$ ${rs(noPapel)}, e no sistema R$ ${rs(noSistema)}. `
          + (dif > 0
            ? `Foram lançados R$ ${rs(dif)} a menos do que o cliente pagou.`
            : `Foram lançados R$ ${rs(-dif)} a mais do que a comanda de papel.`) })
    }

    // Papel digitado para uma comanda que o sistema não conhece.
    for (const comanda of comandasComPapel) {
      if (totalPorComanda.has(comanda) || recebido.has(comanda)) continue
      add({ comanda, cliente: '—', profissional: '—', servico: '—',
        gravidade: 'atencao', tipo: 'papel_sem_comanda', valorEmRisco: 0,
        texto: `A comanda ${comanda} foi digitada na conferência de papel `
          + `(R$ ${rs(papel[comanda])}), e não existe nos lançamentos deste dia.` })
    }

    // O total de comandas inclui as que só existem no caixa: elas aparecem na
    // tela do papel e portanto contam como "faltando conferir".
    const universo = new Set([...totalPorComanda.keys(), ...recebido.keys()])
    const faltam = universo.size - conferidas
    if (faltam > 0) {
      add({ comanda: '—', cliente: '—', profissional: '—', servico: '—',
        gravidade: 'nao_conferido', tipo: 'papel_incompleto', valorEmRisco: 0,
        texto: `${faltam} comanda(s) sem o valor do papel digitado. `
          + `O que foi digitado está conferido; o resto não.` })
    }
  }

  const peso: Record<Gravidade, number> = { problema: 0, atencao: 1, nao_conferido: 2 }
  return achados.sort((a, b) =>
    peso[a.gravidade] - peso[b.gravidade] ||
    b.valorEmRisco - a.valorEmRisco ||
    String(a.comanda).localeCompare(String(b.comanda), 'pt-BR', { numeric: true }))
}

/**
 * Nenhuma regra vem ligada de fábrica.
 *
 * Nome de serviço e de categoria são de CADA salão. Uma regra padrão citando
 * "COLORAÇÃO" acertaria num salão e acusaria besteira em outro — e o dono novo
 * levaria a culpa por uma regra que ele não escreveu.
 */
export const REGRAS_PADRAO: RegraComposicao[] = []
