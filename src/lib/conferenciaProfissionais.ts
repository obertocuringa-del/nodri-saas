import { supabaseAdmin } from './supabase'
import { normalizar } from './conferenciaServicos'

// Confere quem fez o quê contra o que cada profissional tem habilitado.
//
// Lê `relatorio_periodos.prof_servicos`, e NÃO `atendimentos_raw`. A primeira
// versão disto usou a tabela crua e creditou a uma manicure coloracao,
// nutricao e terapia capilar: lá a coluna do profissional é de quem lançou a
// comanda, não de quem executou. `prof_servicos` já vem atribuído por
// profissional — é a fonte que o perfil usa, e a que estava certa. O aviso do
// profServicosMatch.ts dizia isso e foi ignorado.
//
// Serviço não habilitado não é detalhe de cadastro: o profissional some da
// lista de "quem faz" no agendamento da página do cliente, e a comissão dele
// naquele serviço não entra na conta. A planilha prova que ele fez — então o
// cadastro é que está atrasado.

export interface ServicoNaoHabilitado {
  servicoId: string
  nome: string
  atendimentos: number
}

export interface ProfissionalPendente {
  profissionalId: string
  nome: string
  servicos: ServicoNaoHabilitado[]
}

const STOPWORDS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

function tokens(nome: string): string[] {
  return (nome || '').toLowerCase().split(/\s+/).filter(t => t && !STOPWORDS.has(t))
}

/**
 * O texto da planilha é esta pessoa?
 *
 * Mesmo critério já usado no ranking e nas métricas: a planilha traz o nome
 * completo em caixa alta ("DANIEL DA ROCHA DOS SANTOS") e o cadastro pode ter
 * só o apelido ("Daniel"). Exigir igualdade não casaria quase ninguém.
 */
function mesmaPessoa(texto: string, nomeCompleto: string, apelido: string): boolean {
  const n = (texto || '').toLowerCase().trim()
  if (!n) return false
  if (nomeCompleto && n === nomeCompleto.toLowerCase().trim()) return true
  const ap = (apelido || '').toLowerCase().trim()
  if (ap && (n === ap || n.includes(ap) || ap.includes(n))) return true

  const alvo = tokens(nomeCompleto).slice(0, 2)
  const veio = tokens(n)
  if (!alvo.length || !veio.length) return false
  // Dois primeiros nomes batendo já é o suficiente — e é o que separa
  // "Daniel da Rocha" de "Daniela Souza".
  const acertos = alvo.filter(t => veio.some(v => v.startsWith(t) || t.startsWith(v))).length
  return acertos >= Math.min(alvo.length, 2)
}

// Mesma razão da conferência de serviços: o contador do menu pergunta o tempo
// todo, e varrer a planilha a cada pergunta deixaria o sistema arrastado.
//
// Aqui a assinatura sozinha não basta: habilitar alguém muda o resultado sem
// tocar na planilha. Por isso `limparMemoProfissionais` é chamada ao habilitar.
// Não guarda nada.
//
// A versão anterior varria dezenas de milhares de linhas e precisava de cache
// em dois níveis para não travar a página. `prof_servicos` é uma linha por mês,
// com os serviços já somados: a conta inteira cabe em três consultas. Trocar a
// fonte deixou o cache sem propósito — e cache que sobra e ninguém limpa é o
// jeito mais comum de mostrar número velho.
export function limparMemoProfissionais(_salaoId: string) {
  // Guardado por compatibilidade: nada mais a limpar.
}

export async function conferirProfissionais(salaoId: string): Promise<ProfissionalPendente[]> {
  return calcularProfissionais(salaoId)
}
async function calcularProfissionais(salaoId: string): Promise<ProfissionalPendente[]> {
  const [{ data: profs }, { data: servicos }, { data: periodos }] = await Promise.all([
    supabaseAdmin.from('profissionais')
      .select('id, nome_completo, apelido, servicos_habilitados, ativo, is_departamento, vinculo')
      .eq('salao_id', salaoId),
    supabaseAdmin.from('salao_servicos').select('id, nome').eq('salao_id', salaoId),
    supabaseAdmin.from('relatorio_periodos').select('prof_servicos').eq('salao_id', salaoId),
  ])

  // Só CNPJ.
  //
  // Serviço habilitado governa comissão e quem a cliente vê no agendamento —
  // as duas coisas são de quem atende na cadeira. CLT e administrativo
  // apareciam na lista sem ter o que fazer com isso.
  //
  // Quem está sem vínculo preenchido também fica de fora: o campo é o único
  // jeito de saber, e adivinhar traria de volta justamente quem se quis tirar.
  const pessoas = (profs || []).filter((p: any) =>
    p.ativo !== false
    && !p.is_departamento
    && String(p.vinculo || '').toUpperCase().trim() === 'CNPJ')
  if (!pessoas.length) return []

  const servicoPorNome = new Map<string, { id: string; nome: string }>()
  for (const s of servicos || []) servicoPorNome.set(normalizar(s.nome), { id: s.id, nome: s.nome })

  // Quem fez o quê, agrupado pelo TEXTO do profissional como vem na planilha.
  const feitos = new Map<string, Map<string, number>>()
  for (const linha of (periodos || []) as any[]) {
    const itens = Array.isArray(linha.prof_servicos) ? linha.prof_servicos : []
    for (const it of itens) {
      const quem = String(it.profissional || it.profissional_original || '').trim()
      const oque = normalizar(String(it.servico || ''))
      if (!quem || !oque) continue
      if (!feitos.has(quem)) feitos.set(quem, new Map())
      const m = feitos.get(quem)!
      m.set(oque, (m.get(oque) || 0) + (Number(it.quantidade) || 1))
    }
  }

  // De quem é cada texto da planilha — e só quando NÃO há dúvida.
  //
  // Um texto que casa com duas pessoas é descartado inteiro em vez de ser
  // creditado às duas. Creditar errado aqui faz o sistema pedir para habilitar
  // uma manicure em coloracao — e quem vê isso deixa de confiar no aviso.
  const donoDoTexto = new Map<string, any>()
  for (const texto of feitos.keys()) {
    const candidatos = pessoas.filter((p: any) =>
      mesmaPessoa(texto, p.nome_completo || p.apelido || '', p.apelido || ''))
    if (candidatos.length === 1) donoDoTexto.set(texto, candidatos[0])
  }

  const saida: ProfissionalPendente[] = []

  for (const p of pessoas) {
    const habilitados = new Set<string>(Array.isArray(p.servicos_habilitados) ? p.servicos_habilitados : [])

    // Junta os textos que são desta pessoa: o mesmo profissional aparece
    // escrito de formas diferentes entre importações.
    const conta = new Map<string, number>()
    for (const [texto, servicosFeitos] of feitos) {
      if (donoDoTexto.get(texto)?.id !== p.id) continue
      for (const [chave, n] of servicosFeitos) conta.set(chave, (conta.get(chave) || 0) + n)
    }

    const faltando: ServicoNaoHabilitado[] = []
    for (const [chave, n] of conta) {
      const s = servicoPorNome.get(chave)
      // Serviço que nem existe no cadastro é assunto do outro aviso, o da
      // página de Serviços. Aqui só entra o que dá para habilitar.
      if (!s) continue
      if (habilitados.has(s.id)) continue
      faltando.push({ servicoId: s.id, nome: s.nome, atendimentos: n })
    }

    if (!faltando.length) continue
    faltando.sort((a, b) => b.atendimentos - a.atendimentos)
    saida.push({ profissionalId: p.id, nome: p.apelido || p.nome_completo || '', servicos: faltando })
  }

  saida.sort((a, b) => b.servicos.length - a.servicos.length)
  return saida
}
/** Acrescenta serviços ao que a pessoa já tem — nunca substitui a lista. */
export async function habilitarServicos(
  salaoId: string, profissionalId: string, servicoIds: string[],
): Promise<boolean> {
  const { data: prof } = await supabaseAdmin
    .from('profissionais').select('id, servicos_habilitados')
    .eq('id', profissionalId).eq('salao_id', salaoId).maybeSingle()
  if (!prof) return false

  const atuais: string[] = Array.isArray((prof as any).servicos_habilitados)
    ? (prof as any).servicos_habilitados : []

  // Só ids que são mesmo serviço deste salão: sem esta conferência, um id
  // qualquer no corpo do pedido entraria na lista da pessoa.
  const { data: validos } = await supabaseAdmin
    .from('salao_servicos').select('id').eq('salao_id', salaoId).in('id', servicoIds.slice(0, 200))

  const novos = new Set(atuais)
  for (const s of validos || []) novos.add(s.id)

  await supabaseAdmin.from('profissionais')
    .update({ servicos_habilitados: [...novos] })
    .eq('id', profissionalId).eq('salao_id', salaoId)
  limparMemoProfissionais(salaoId)
  return true
}
