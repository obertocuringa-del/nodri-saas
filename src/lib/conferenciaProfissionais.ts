import { supabaseAdmin } from './supabase'
import { getAtendimentosRaw, assinaturaAtendimentos } from './atendimentosCache'
import { normalizar } from './conferenciaServicos'

// Confere quem fez o quê na planilha contra o que cada profissional tem
// habilitado no NODRI.
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
// Guardado também no banco, e não só em memória: na nuvem o servidor troca o
// tempo todo, e a cada troca a página voltava a esperar a leitura de dezenas de
// milhares de linhas. Quem chega depois só confere a assinatura e lê uma linha.
const CHAVE_CACHE = 'profissionais_conferencia_cache'
const memo = new Map<string, { chave: string; valor: ProfissionalPendente[] }>()

export function limparMemoProfissionais(salaoId: string) {
  memo.delete(salaoId)
  // O guardado no banco também sai: habilitar alguém muda o resultado sem
  // tocar na planilha, então a assinatura sozinha não denunciaria a mudança.
  supabaseAdmin.from('salao_config').delete()
    .eq('salao_id', salaoId).eq('chave', CHAVE_CACHE)
    .then(() => undefined, () => undefined)
}

export async function conferirProfissionais(salaoId: string): Promise<ProfissionalPendente[]> {
  const chave = await assinaturaAtendimentos(salaoId)

  const daMemoria = memo.get(salaoId)
  if (daMemoria && daMemoria.chave === chave) return daMemoria.valor

  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_CACHE).maybeSingle()
  const v = (data as any)?.valor
  if (v && v.chave === chave && Array.isArray(v.pendentes)) {
    memo.set(salaoId, { chave, valor: v.pendentes })
    return v.pendentes
  }

  const valor = await calcularProfissionais(salaoId)
  memo.set(salaoId, { chave, valor })
  await supabaseAdmin.from('salao_config').upsert(
    {
      salao_id: salaoId, chave: CHAVE_CACHE,
      valor: { chave, pendentes: valor },
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'salao_id,chave' },
  ).then(() => undefined, () => undefined)
  return valor
}

async function calcularProfissionais(salaoId: string): Promise<ProfissionalPendente[]> {
  const [{ data: profs }, { data: servicos }, linhas] = await Promise.all([
    supabaseAdmin.from('profissionais')
      .select('id, nome_completo, apelido, servicos_habilitados, ativo, is_departamento')
      .eq('salao_id', salaoId),
    supabaseAdmin.from('salao_servicos').select('id, nome').eq('salao_id', salaoId),
    getAtendimentosRaw(salaoId),
  ])

  // Setor não atende cliente: cobrar habilitação de RH ou Comercial seria
  // ruído puro.
  const pessoas = (profs || []).filter((p: any) => p.ativo !== false && !p.is_departamento)
  if (!pessoas.length) return []

  const servicoPorNome = new Map<string, { id: string; nome: string }>()
  for (const s of servicos || []) servicoPorNome.set(normalizar(s.nome), { id: s.id, nome: s.nome })

  // Quem fez o quê, e quantas vezes.
  const feitos = new Map<string, Map<string, number>>()
  for (const l of linhas || []) {
    const quem = String((l as any).profissional || '').trim()
    const oque = normalizar(String((l as any).servico || ''))
    if (!quem || !oque) continue
    if (!feitos.has(quem)) feitos.set(quem, new Map())
    const m = feitos.get(quem)!
    m.set(oque, (m.get(oque) || 0) + 1)
  }

  const saida: ProfissionalPendente[] = []

  for (const p of pessoas) {
    const nome = p.nome_completo || p.apelido || ''
    const habilitados = new Set<string>(Array.isArray(p.servicos_habilitados) ? p.servicos_habilitados : [])

    // Junta todos os textos da planilha que são esta pessoa: o mesmo
    // profissional aparece escrito de formas diferentes entre importações.
    const conta = new Map<string, number>()
    for (const [texto, servicosFeitos] of feitos) {
      if (!mesmaPessoa(texto, nome, p.apelido || '')) continue
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
    saida.push({ profissionalId: p.id, nome: p.apelido || nome, servicos: faltando })
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
