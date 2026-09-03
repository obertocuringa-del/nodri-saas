import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { servicosLojistaPadrao, LojistaServico, SEGMENTOS_LOJISTA } from '@/lib/lojistasServicosPadrao'

export interface LojistasConfig { token: string; slug: string; whatsapp_link: string; mensagem: string }

const MENSAGEM_PADRAO = 'Olá!\n\nObrigado por fazer parte das nossas parcerias.\n\nAtravés deste grupo você receberá promoções exclusivas, ações especiais e campanhas destinadas aos nossos parceiros.'

function gerarSlug(nomeSalao: string, token: string): string {
  const base = (nomeSalao || 'salao')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return `${base}-${token.slice(0, 6)}`
}

/**
 * De quem é, de direito, este link público.
 *
 * Existe porque salão novo já nasceu com o link de outro: a cópia do salão
 * modelo levava o token e o slug junto. Dois salões com o mesmo link fazem o
 * cadastro do lojista cair no salão errado — então quando há empate alguém
 * precisa devolver o link e gerar o seu.
 *
 * Quem fica com ele: o salão modelo, se for um dos dois; senão o mais antigo,
 * que é quem já divulgou o link por aí. Devolve null quando não há empate.
 *
 * Devolve também o whatsapp_link do dono, porque é ele que diz se o link de
 * grupo que este salão tem veio de carona ou foi ele que digitou.
 */
async function donoLegitimo(slug: string, token: string): Promise<{ id: string; whatsapp_link: string } | null> {
  // Filtro no banco, não em memória: trazer a tabela inteira esbarraria no
  // corte de 1000 linhas do PostgREST quando o número de salões crescer.
  const sl = String(slug || '').replace(/[,()]/g, '')
  const tk = String(token || '').replace(/[,()]/g, '')
  const { data } = await supabaseAdmin
    .from('salao_config').select('salao_id, valor')
    .eq('chave', 'lojistas_config')
    .or(`valor->>slug.eq.${sl},valor->>token.eq.${tk}`)
    .limit(50)
  const iguais = data || []
  if (iguais.length <= 1) return null

  const doDono = (id: string) =>
    String(((iguais.find(r => r.salao_id === id)?.valor || {}) as any).whatsapp_link || '')

  const { data: saloes } = await supabaseAdmin
    .from('saloes').select('id, is_modelo, criado_em')
    .in('id', iguais.map(r => r.salao_id))
  const lista = saloes || []
  const modelo = lista.find(x => x.is_modelo)
  if (modelo) return { id: modelo.id, whatsapp_link: doDono(modelo.id) }
  const maisAntigo = [...lista].sort((a, b) =>
    String(a.criado_em || '').localeCompare(String(b.criado_em || '')))[0]
  if (!maisAntigo) return null
  return { id: maisAntigo.id, whatsapp_link: doDono(maisAntigo.id) }
}

// Lê a config do módulo; gera token + slug na primeira vez (autocadastro lazy).
// Se já existir um token sem slug (config antiga), faz o upgrade automaticamente.
export async function getOuCriarConfig(salaoId: string): Promise<LojistasConfig> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'lojistas_config').maybeSingle()
  const atual = (data?.valor || {}) as Partial<LojistasConfig>

  if (atual.token && atual.slug) {
    // Só devolvo o link se ele for mesmo deste salão. Se veio de carona na
    // cópia do modelo, o salão gera o dele aqui — sem ninguém precisar pedir.
    const dono = await donoLegitimo(atual.slug, atual.token)
    if (!dono || dono.id === salaoId) {
      return { token: atual.token, slug: atual.slug, whatsapp_link: atual.whatsapp_link || '', mensagem: atual.mensagem || MENSAGEM_PADRAO }
    }
    const token = randomBytes(12).toString('hex')
    const { data: salao } = await supabaseAdmin.from('saloes').select('nome').eq('id', salaoId).maybeSingle()
    const novo: LojistasConfig = {
      token,
      slug: gerarSlug(salao?.nome || '', token),
      // O link do grupo só é apagado se for LITERALMENTE o do salão dono do
      // slug — aí sim veio de carona na cópia. Se o salão já trocou pelo grupo
      // dele, apagar aqui é jogar fora o que a pessoa digitou; foi o que
      // aconteceu com o Send Beauty, que salvou o link e viu sumir no
      // recarregar seguinte.
      whatsapp_link: atual.whatsapp_link && atual.whatsapp_link !== dono.whatsapp_link
        ? atual.whatsapp_link : '',
      mensagem: atual.mensagem || MENSAGEM_PADRAO,
    }
    await supabaseAdmin.from('salao_config').upsert(
      { salao_id: salaoId, chave: 'lojistas_config', valor: novo, atualizado_em: new Date().toISOString() },
      { onConflict: 'salao_id,chave' })
    return novo
  }

  const token = atual.token || randomBytes(12).toString('hex')
  let slug = atual.slug
  if (!slug) {
    const { data: salao } = await supabaseAdmin.from('saloes').select('nome').eq('id', salaoId).maybeSingle()
    slug = gerarSlug(salao?.nome || '', token)
  }
  const novo: LojistasConfig = { token, slug, whatsapp_link: atual.whatsapp_link || '', mensagem: atual.mensagem || MENSAGEM_PADRAO }
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_config', valor: novo, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  return novo
}

export async function salvarConfig(salaoId: string, patch: Partial<Pick<LojistasConfig, 'whatsapp_link' | 'mensagem'>>): Promise<LojistasConfig> {
  const atual = await getOuCriarConfig(salaoId)
  const novo: LojistasConfig = { ...atual, ...patch }
  // O erro do upsert era descartado: uma gravação que falhasse virava
  // "Configurações salvas!" na tela e nada no banco. Erro de gravar tem que
  // chegar em quem clicou.
  const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_config', valor: novo, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) throw new Error(error.message)
  return novo
}

// Acha o salão dono de um token OU slug público (usado nas rotas /lojista/[token]).
export async function getSalaoPorToken(tokenOuSlug: string): Promise<{ salaoId: string; config: LojistasConfig } | null> {
  const chave = tokenOuSlug.replace(/[,()]/g, '')
  // `limit(1)` e não `maybeSingle()`: enquanto ainda houver salão com link
  // duplicado do tempo da cópia, o maybeSingle devolvia erro e a página do
  // lojista simplesmente não abria. Assim ela abre, e o duplicado se resolve
  // sozinho na primeira vez que o dono entra nas configurações.
  const { data } = await supabaseAdmin
    .from('salao_config')
    .select('salao_id, valor')
    .eq('chave', 'lojistas_config')
    .or(`valor->>token.eq.${chave},valor->>slug.eq.${chave}`)
    .limit(1)
  const linha = (data || [])[0]
  if (!linha) return null
  return { salaoId: linha.salao_id, config: linha.valor as LojistasConfig }
}

export async function getServicos(salaoId: string): Promise<LojistaServico[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'lojistas_servicos').maybeSingle()
  if (Array.isArray(data?.valor) && data.valor.length > 0) return data.valor as LojistaServico[]
  const padrao = servicosLojistaPadrao()
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_servicos', valor: padrao, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  return padrao
}

export async function salvarServicos(salaoId: string, lista: LojistaServico[]): Promise<void> {
  const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_servicos', valor: lista, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) throw new Error(error.message)
}

// "Outro" nunca é armazenado na lista — é sempre acrescentado por quem exibe o
// select, garantindo que o autocadastro sempre tenha a opção de digitar livre.
export async function getSegmentos(salaoId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'lojistas_segmentos').maybeSingle()
  if (Array.isArray(data?.valor) && data.valor.length > 0) return data.valor as string[]
  const padrao = SEGMENTOS_LOJISTA.filter(s => s !== 'Outro')
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_segmentos', valor: padrao, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  return padrao
}

export async function salvarSegmentos(salaoId: string, lista: string[]): Promise<void> {
  const limpo = Array.from(new Set(lista.map(s => String(s || '').trim()).filter(s => s && s !== 'Outro')))
  const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'lojistas_segmentos', valor: limpo, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) throw new Error(error.message)
}

// Adiciona um serviço manual (dedupe case-insensitive), usado no autocadastro público.
export async function adicionarServicoManual(salaoId: string, nome: string): Promise<LojistaServico> {
  const lista = await getServicos(salaoId)
  const nomeNorm = nome.trim()
  const existente = lista.find(s => s.nome.toLowerCase() === nomeNorm.toLowerCase())
  if (existente) return existente
  const novo: LojistaServico = { id: `c${Date.now()}`, nome: nomeNorm, ativo: true, ordem: lista.length }
  await salvarServicos(salaoId, [...lista, novo])
  return novo
}
