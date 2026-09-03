// A tabela de preços do salão, como o Avec a publica no relatório 0033.
//
// Antes desta tabela, a conferência só sabia o preço "habitual": o que mais se
// repete no histórico. Isso responde "o que costuma acontecer", não "o que
// deveria acontecer" — e por isso um preço errado cobrado várias vezes virava
// o padrão, e o certo é que virava a exceção apontada.
//
// Com o 0033 a régua passa a ser a oficial, e a diferença deixa de ser palpite:
// é o que falta entrar no caixa.

export interface PrecoDeTabela {
  servico: string
  categoria?: string
  preco: number
  /** Duração em minutos, quando o relatório trouxer. */
  duracao?: number
}

/**
 * Normalização de reserva, usada só na leitura da planilha (nomes de coluna).
 *
 * Para CASAR SERVIÇO com o lançamento, quem manda é o normalizador do motor de
 * conferência, recebido em `indicePorServico`. As duas funções já nasceram
 * diferentes — esta devolve minúscula, a do motor devolve maiúscula — e o
 * índice inteiro deixava de casar em silêncio: a tabela existia, e a régua
 * nunca era aplicada. Uma régua que não acusa nada parece uma régua que
 * aprovou tudo.
 */
export function norm(s: string): string {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Índice serviço → preço, pronto para consulta.
 *
 * Serviço repetido na tabela com preços diferentes é DESCARTADO de propósito:
 * se a própria tabela não sabe qual é o preço, ela não pode ser régua para
 * acusar ninguém. Esses caem de volta na régua do histórico.
 */
export function indicePorServico(
  tabela: PrecoDeTabela[],
  normalizar: (s: string) => string,
): Map<string, number> {
  const vistos = new Map<string, Set<number>>()
  for (const p of tabela || []) {
    const k = normalizar(p.servico)
    const v = Number(p.preco)
    if (!k || !Number.isFinite(v) || v <= 0) continue
    if (!vistos.has(k)) vistos.set(k, new Set())
    vistos.get(k)!.add(Number(v.toFixed(2)))
  }
  const indice = new Map<string, number>()
  for (const [k, precos] of vistos) {
    if (precos.size === 1) indice.set(k, [...precos][0])
  }
  return indice
}

/**
 * Lê as linhas da aba TABELA_PRECOS da planilha do robô.
 *
 * Os nomes das colunas chegam como o Avec escreve, então aceito sinônimos —
 * digitar o nome exato aqui e errar por um acento faria a tabela inteira ser
 * ignorada em silêncio, que é a pior falha possível numa régua.
 */
export function lerLinhas(linhas: any[]): PrecoDeTabela[] {
  const pega = (linha: any, ...nomes: string[]) => {
    for (const n of nomes) {
      for (const chave of Object.keys(linha || {})) {
        if (norm(chave) === norm(n)) return linha[chave]
      }
    }
    return undefined
  }
  const dinheiro = (v: any) => {
    if (typeof v === 'number') return v
    const t = String(v ?? '').replace(/[^\d,.-]/g, '')
    if (!t) return NaN
    return Number(t.replace(/\./g, '').replace(',', '.'))
  }

  const saida: PrecoDeTabela[] = []
  for (const l of linhas || []) {
    const servico = String(pega(l, 'servico', 'serviço', 'nome', 'descricao', 'descrição') ?? '').trim()
    const preco = dinheiro(pega(l, 'preco', 'preço', 'valor', 'preco venda', 'valor venda'))
    if (!servico || !Number.isFinite(preco) || preco <= 0) continue
    const duracao = Number(pega(l, 'duracao', 'duração', 'tempo', 'minutos'))
    saida.push({
      servico,
      categoria: String(pega(l, 'categoria', 'grupo', 'setor') ?? '').trim() || undefined,
      preco: Number(preco.toFixed(2)),
      duracao: Number.isFinite(duracao) && duracao > 0 ? duracao : undefined,
    })
  }
  return saida
}
