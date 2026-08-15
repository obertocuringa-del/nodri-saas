// ─────────────────────────────────────────────────────────────────────────────
// MOLDES QUE NÃO MORAM EM salao_config
//
// Parte do sistema guarda os modelos em TABELAS PRÓPRIAS: os setores, os
// catálogos (serviços, produtos, despesas) e os formulários de feedback. A
// cópia do salão modelo lia só `salao_config`, então isso ficava de fora e o
// salão novo começava vazio.
//
// MÓDULOS ATIVOS NÃO ENTRAM. Salão novo abre só com a base e contrata o resto
// — é o modelo comercial. Copiar `salao_modulos` do modelo entregaria o
// pacote inteiro de graça, já que o modelo nasceu do Rouge, que é Premium.
//
// ── Como a cópia se comporta ────────────────────────────────────────────────
// ACRESCENTA O QUE FALTA, item a item. Não é "semear uma vez": quando o
// modelo ganha um serviço novo, ele aparece em todos os salões; e o que cada
// salão criou por conta própria continua onde está, intocado. Nada é
// sobrescrito e nada é apagado.
//
// A comparação usa o NOME (o `id` é diferente em cada salão). Quando a tabela
// não tem um campo que sirva de nome, a cópia recua para o modo seguro: só
// semeia se o destino estiver vazio, para nunca duplicar.
//
// ── O que nunca viaja ───────────────────────────────────────────────────────
// Vem o MOLDE, nunca o conteúdo: nenhuma resposta de cliente ou profissional,
// e o link público é REGERADO — cada salão tem o seu, jamais o do modelo.
// ─────────────────────────────────────────────────────────────────────────────

import { supabaseAdmin } from '@/lib/supabase'

export interface ResultadoCopia { tabela: string; copiados: number }

/** Slug do link público: nome do salão + pedaço do token novo. */
function montarSlug(nomeSalao: string, token: string): string {
  const base = (nomeSalao || 'salao')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'salao'
  return `${base}-${String(token).slice(0, 4)}`
}

const norm = (v: any) => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Colunas de controle: nunca copiadas (o destino gera as suas).
const COLUNAS_IGNORADAS = ['id', 'salao_id', 'criado_em', 'atualizado_em', 'created_at', 'updated_at']

// Campos que servem para reconhecer "o mesmo item" entre dois salões.
const CHAVES_NATURAIS = ['nome', 'titulo', 'nome_completo', 'modulo_id', 'codigo', 'chave', 'slug', 'label']

/** Qual campo desta tabela serve de nome? Null = não dá para comparar. */
function campoChave(linha: any): string | null {
  for (const c of CHAVES_NATURAIS) {
    const v = linha?.[c]
    if (typeof v === 'string' && v.trim()) return c
    if (typeof v === 'number') return c
  }
  return null
}

/** Tira as colunas de controle e aponta a linha para o salão de destino. */
function paraDestino(linha: any, destinoId: string): any {
  const copia: any = { ...linha }
  for (const c of COLUNAS_IGNORADAS) delete copia[c]
  return { ...copia, salao_id: destinoId }
}

/**
 * O coração da sincronização: devolve as linhas do modelo que o destino
 * ainda não tem. Compara pelo nome; sem nome, só devolve algo se o destino
 * estiver vazio (para não duplicar às cegas).
 */
function faltantes(doModelo: any[], doDestino: any[]): any[] {
  if (!doModelo.length) return []
  const campo = campoChave(doModelo[0])
  if (!campo) return doDestino.length ? [] : doModelo
  const jaTem = new Set(doDestino.map(l => norm(l[campo])))
  return doModelo.filter(l => !jaTem.has(norm(l[campo])))
}

// ── Catálogos e configuração ────────────────────────────────────────────────
// Varredura das 52 tabelas com salao_id: estas são catálogo/configuração.
// Ficam de fora, por natureza e não por escolha: logins (e-mail é único,
// copiar quebraria o acesso), pessoas reais, movimento e histórico, respostas
// já dadas, e a memória da IA — que é sobre a operação de um salão específico.
// NAO entra aqui: `salao_modulos`. Modulo ativo e consequencia do PLANO
// contratado, nao estrutura a distribuir. O modelo foi alimentado a partir do
// Rouge, que e Premium com 8 modulos ligados - copiar isso faria todo salao
// novo nascer com o pacote inteiro, Suite NODRI inclusive, sem cobranca.
const TABELAS_CATALOGO = [
  'servicos_catalogo',      // catálogo de serviços
  'produtos_catalogo',      // catálogo de produtos
  'despesas_catalogo',      // catálogo de despesas
  'salao_servicos',         // serviços do cadastro público
  'ia_configuracao',        // ajustes da IA
  'ia_metas_salao',         // metas do salão
  'recepcionista_desafios', // desafios da recepção
  'feedback_prof_regras',   // regras de feedback do profissional
]

/**
 * Cópia genérica de uma tabela de catálogo. Não precisa conhecer as colunas:
 * lê o que existir, descarta as de controle e grava o que faltar no destino.
 */
async function copiarCatalogo(tabela: string, modeloId: string, destinoId: string): Promise<ResultadoCopia[]> {
  const [{ data: mod, error: e1 }, { data: dest }] = await Promise.all([
    supabaseAdmin.from(tabela).select('*').eq('salao_id', modeloId),
    supabaseAdmin.from(tabela).select('*').eq('salao_id', destinoId),
  ])
  if (e1) return []
  const novas = faltantes((mod || []) as any[], (dest || []) as any[]).map(l => paraDestino(l, destinoId))
  if (!novas.length) return []

  const { error } = await supabaseAdmin.from(tabela).insert(novas)
  if (error) return []
  return [{ tabela, copiados: novas.length }]
}

/**
 * SETORES. Não são tabela à parte: são linhas de `profissionais` com
 * `is_departamento = true`. Sem isso o salão abre a página de setores vazia —
 * o organograma vem, mas não há setor para clicar.
 * Gente de verdade (is_departamento = false) nunca é copiada.
 */
async function copiarSetores(modeloId: string, destinoId: string): Promise<ResultadoCopia[]> {
  const cols = 'nome_completo, departamento_cor, cargo'
  const [{ data: mod }, { data: dest }] = await Promise.all([
    supabaseAdmin.from('profissionais').select(cols).eq('salao_id', modeloId).eq('is_departamento', true),
    supabaseAdmin.from('profissionais').select(cols).eq('salao_id', destinoId).eq('is_departamento', true),
  ])
  const novas = faltantes((mod || []) as any[], (dest || []) as any[]).map((d: any) => ({
    salao_id: destinoId,
    nome_completo: d.nome_completo,
    departamento_cor: d.departamento_cor ?? null,
    cargo: d.cargo ?? null,
    is_departamento: true,
    ativo: true,
  }))
  if (!novas.length) return []

  const { error } = await supabaseAdmin.from('profissionais').insert(novas)
  if (error) return []
  return [{ tabela: 'setores', copiados: novas.length }]
}

/**
 * CATÁLOGO DE SERVIÇOS — nome e categoria de cada serviço.
 * Os VALORES não vêm: preço, comissão e observação ficam em branco, para
 * cada salão pôr o seu. É o molde da lista, não a tabela de preços de ninguém.
 */
async function copiarServicos(modeloId: string, destinoId: string): Promise<ResultadoCopia[]> {
  const [{ data: mod }, { data: dest }] = await Promise.all([
    supabaseAdmin.from('servicos').select('categoria, nome, ciclo_retorno_dias').eq('salao_id', modeloId),
    supabaseAdmin.from('servicos').select('nome').eq('salao_id', destinoId),
  ])
  const novas = faltantes((mod || []) as any[], (dest || []) as any[]).map((s: any) => ({
    salao_id: destinoId,
    categoria: s.categoria ?? null,
    nome: s.nome,
    ciclo_retorno_dias: s.ciclo_retorno_dias ?? null,
    preco_fixo: null, preco_min: null, comissao_valor: null, observacao: null,
  }))
  if (!novas.length) return []

  const { error } = await supabaseAdmin.from('servicos').insert(novas)
  if (error) return []
  return [{ tabela: 'servicos (sem valores)', copiados: novas.length }]
}

/**
 * FEEDBACK DE CLIENTE (formulários + perguntas).
 * O token/slug NÃO é copiado: o banco gera um novo e o slug é remontado com
 * o nome do salão de destino — o link público é sempre dele.
 */
async function copiarFeedbackCliente(modeloId: string, destinoId: string, nomeDestino: string): Promise<ResultadoCopia[]> {
  const [{ data: mod }, { data: dest }] = await Promise.all([
    supabaseAdmin.from('feedback_formularios').select('id, titulo, descricao').eq('salao_id', modeloId),
    supabaseAdmin.from('feedback_formularios').select('titulo').eq('salao_id', destinoId),
  ])
  const novos = faltantes((mod || []) as any[], (dest || []) as any[])
  if (!novos.length) return []

  let perguntasCopiadas = 0
  for (const f of novos) {
    const { data: novo } = await supabaseAdmin
      .from('feedback_formularios')
      .insert({ salao_id: destinoId, titulo: f.titulo, descricao: f.descricao })
      .select().single()
    if (!novo) continue

    if ((novo as any).token) {
      await supabaseAdmin.from('feedback_formularios')
        .update({ slug: montarSlug(nomeDestino, (novo as any).token) }).eq('id', (novo as any).id)
    }

    const { data: perguntas } = await supabaseAdmin
      .from('feedback_perguntas')
      .select('titulo, tipo, opcoes, obrigatoria, ordem')
      .eq('formulario_id', f.id).order('ordem')
    const ps = (perguntas || []) as any[]
    if (!ps.length) continue

    const { error } = await supabaseAdmin.from('feedback_perguntas')
      .insert(ps.map(p => ({ ...p, formulario_id: (novo as any).id })))
    if (!error) perguntasCopiadas += ps.length
  }
  return [
    { tabela: 'feedback_formularios', copiados: novos.length },
    { tabela: 'feedback_perguntas', copiados: perguntasCopiadas },
  ]
}

/**
 * FEEDBACK DE PROFISSIONAL (formulários + regras personalizadas).
 * Ocorridos, respostas, bloqueios e a lista de profissionais nunca vêm —
 * são movimento e gente real do salão de origem.
 */
async function copiarFeedbackProf(modeloId: string, destinoId: string): Promise<ResultadoCopia[]> {
  const out: ResultadoCopia[] = []

  const [{ data: mod }, { data: dest }] = await Promise.all([
    supabaseAdmin.from('feedback_prof_formularios').select('titulo').eq('salao_id', modeloId),
    supabaseAdmin.from('feedback_prof_formularios').select('titulo').eq('salao_id', destinoId),
  ])
  const novos = faltantes((mod || []) as any[], (dest || []) as any[])
  if (novos.length) {
    const { error } = await supabaseAdmin.from('feedback_prof_formularios')
      .insert(novos.map((f: any) => ({ salao_id: destinoId, titulo: f.titulo })))
    if (!error) out.push({ tabela: 'feedback_prof_formularios', copiados: novos.length })
  }

  out.push(...await copiarCatalogo('feedback_prof_regras_custom', modeloId, destinoId))
  return out
}

/**
 * Leva para o salão os moldes que vivem fora de `salao_config`, acrescentando
 * só o que falta. Nunca derruba a criação do salão: falhar aqui significa
 * apenas começar sem alguma parte, que a próxima atualização traz.
 */
export async function copiarMoldesDeTabelas(
  modeloId: string, destinoId: string, nomeDestino: string,
): Promise<ResultadoCopia[]> {
  const out: ResultadoCopia[] = []
  try { out.push(...await copiarSetores(modeloId, destinoId)) } catch { /* segue */ }
  try { out.push(...await copiarServicos(modeloId, destinoId)) } catch { /* segue */ }
  try { out.push(...await copiarFeedbackCliente(modeloId, destinoId, nomeDestino)) } catch { /* segue */ }
  try { out.push(...await copiarFeedbackProf(modeloId, destinoId)) } catch { /* segue */ }
  for (const t of TABELAS_CATALOGO) {
    try { out.push(...await copiarCatalogo(t, modeloId, destinoId)) } catch { /* segue */ }
  }
  return out.filter(r => r.copiados > 0)
}
