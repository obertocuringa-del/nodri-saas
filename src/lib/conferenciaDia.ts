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
  tipo?: 'exige' | 'proibe'
  quando: string      // nome do serviço OU categoria que dispara a regra
  exige: string       // o que precisa existir (exige) ou não pode existir (proibe)
  ativa: boolean
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
): Achado[] {
  const achados: Achado[] = []
  const add = (a: Omit<Achado, 'id'>) => achados.push({ ...a, id: rid() })

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
        texto: `Total lançado R$ ${Number(a.total).toFixed(2)}, mas ${a.qtd}× R$ ${Number(a.valor).toFixed(2)}`
          + (Number(a.desconto) ? ` menos R$ ${Number(a.desconto).toFixed(2)} de desconto` : '')
          + ` dá R$ ${esperado.toFixed(2)}.` })
    }
  }

  // ── 3. Preço fora do habitual ─────────────────────────────────────────────
  // O "habitual" sai do histórico do próprio salão, não de uma tabela externa.
  // Sem maioria clara, o serviço vai para NAO_CONFERIDO — nunca para PROBLEMA.
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
    const vals = porServico.get(k) || []
    const contagem = new Map<number, number>()
    for (const v of vals) contagem.set(v, (contagem.get(v) || 0) + 1)
    if (contagem.size <= 1) continue           // sempre cobrado igual: nada a dizer

    const ordenado = [...contagem.entries()].sort((x, y) => y[1] - x[1])
    const [precoComum, vezes] = ordenado[0]
    if (Number(a.valor) === precoComum) continue

    if (vezes < MINIMO_PARA_PADRAO) {
      add({ ...ctx(a), gravidade: 'nao_conferido', tipo: 'preco_sem_padrao', valorEmRisco: 0,
        texto: `Cobrado R$ ${Number(a.valor).toFixed(2)}. Este serviço aparece com `
          + `${contagem.size} preços diferentes e nenhum se repete o bastante para ser o normal.` })
      continue
    }

    const dif = precoComum - Number(a.valor)
    add({ ...ctx(a), gravidade: 'atencao', tipo: 'preco_fora_do_normal',
      valorEmRisco: Math.max(dif, 0),
      texto: `Cobrado R$ ${Number(a.valor).toFixed(2)}; o normal deste serviço é `
        + `R$ ${precoComum.toFixed(2)} (${vezes} vezes). `
        + (dif > 0 ? `Diferença de R$ ${dif.toFixed(2)} a menos.` : `Diferença de R$ ${(-dif).toFixed(2)} a mais.`) })
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
      const gatilho = norm(r.quando), exigido = norm(r.exige)
      if (!gatilho || !exigido) continue
      const disparou = itens.find(i => bate(i, gatilho))
      if (!disparou) continue

      const temOOutro = itens.find(i => bate(i, exigido))

      if ((r.tipo || 'exige') === 'proibe') {
        if (!temOOutro) continue
        add({ ...ctx(disparou), comanda, gravidade: 'problema', tipo: 'regra_conflito', valorEmRisco: 0,
          texto: `A comanda tem "${r.quando}" e "${r.exige}" juntos — e os dois não podem ir na mesma comanda.` })
        continue
      }

      if (temOOutro) continue
      add({ ...ctx(disparou), comanda, gravidade: 'problema', tipo: 'regra_composicao', valorEmRisco: 0,
        texto: `A comanda tem "${r.quando}" e não tem "${r.exige}".` })
    }
  }

  // ── 5. Comanda sem profissional ───────────────────────────────────────────
  for (const a of atendimentos) {
    if (!String(a.profissional || '').trim()) {
      add({ ...ctx(a), gravidade: 'atencao', tipo: 'sem_profissional', valorEmRisco: 0,
        texto: 'Item lançado sem profissional. A comissão deste serviço não tem dono.' })
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
