// ─────────────────────────────────────────────────────────────────────────────
// MOLDES QUE NÃO MORAM EM salao_config
//
// Parte do sistema guarda os modelos em TABELAS PRÓPRIAS — o feedback de
// cliente (formulários + perguntas) e o de profissional (formulários + regras).
// A cópia do salão modelo lia só `salao_config`, então esses moldes ficavam
// de fora e o salão novo começava do zero.
//
// ── A regra é a mesma de sempre ─────────────────────────────────────────────
// Vem o MOLDE (o formulário e as perguntas), nunca o CONTEÚDO:
//   · nenhuma resposta de cliente ou de profissional é copiada;
//   · o link público é REGERADO — cada salão tem o seu, jamais o do modelo.
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

/**
 * Copia os moldes de FEEDBACK DE CLIENTE (formulários + perguntas).
 * O token/slug NÃO é copiado: o banco gera um novo por linha e o slug é
 * remontado com o nome do salão de destino.
 */
async function copiarFeedbackCliente(modeloId: string, destinoId: string, nomeDestino: string): Promise<ResultadoCopia[]> {
  // Idempotente: se o destino já tem formulário, não duplica.
  const { count } = await supabaseAdmin
    .from('feedback_formularios').select('id', { count: 'exact', head: true }).eq('salao_id', destinoId)
  if ((count || 0) > 0) return []

  const { data: forms } = await supabaseAdmin
    .from('feedback_formularios').select('id, titulo, descricao').eq('salao_id', modeloId)
  const lista = (forms || []) as any[]
  if (!lista.length) return []

  let perguntasCopiadas = 0
  for (const f of lista) {
    // Cria o formulário no destino — token novo vem do default da tabela
    const { data: novo } = await supabaseAdmin
      .from('feedback_formularios')
      .insert({ salao_id: destinoId, titulo: f.titulo, descricao: f.descricao })
      .select().single()
    if (!novo) continue

    // Link público próprio do salão de destino
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
    { tabela: 'feedback_formularios', copiados: lista.length },
    { tabela: 'feedback_perguntas', copiados: perguntasCopiadas },
  ]
}

/**
 * Copia os moldes de FEEDBACK DE PROFISSIONAL (formulários + regras).
 * Ocorridos, respostas, bloqueios e a lista de profissionais NUNCA vêm —
 * são movimento e gente real do salão de origem.
 */
async function copiarFeedbackProf(modeloId: string, destinoId: string): Promise<ResultadoCopia[]> {
  const out: ResultadoCopia[] = []

  // Idempotente: se o destino já tem formulário, não duplica.
  const { count } = await supabaseAdmin
    .from('feedback_prof_formularios').select('id', { count: 'exact', head: true }).eq('salao_id', destinoId)
  if ((count || 0) > 0) return []

  const { data: forms } = await supabaseAdmin
    .from('feedback_prof_formularios').select('titulo').eq('salao_id', modeloId)
  const fs = (forms || []) as any[]
  if (fs.length) {
    const { error } = await supabaseAdmin.from('feedback_prof_formularios')
      .insert(fs.map(f => ({ salao_id: destinoId, titulo: f.titulo })))
    if (!error) out.push({ tabela: 'feedback_prof_formularios', copiados: fs.length })
  }

  // Regras personalizadas do salão (o catálogo padrão já vem do código)
  const { data: regras } = await supabaseAdmin
    .from('feedback_prof_regras_custom').select('*').eq('salao_id', modeloId)
  const rs = (regras || []) as any[]
  if (rs.length) {
    const linhas = rs.map(r => {
      const { id, salao_id, criado_em, atualizado_em, ...resto } = r
      return { ...resto, salao_id: destinoId }
    })
    const { error } = await supabaseAdmin.from('feedback_prof_regras_custom').insert(linhas)
    if (!error) out.push({ tabela: 'feedback_prof_regras_custom', copiados: linhas.length })
  }

  return out
}

/**
 * Copia os SETORES (departamentos).
 *
 * Eles não são uma tabela à parte: são linhas de `profissionais` com
 * `is_departamento = true`. Sem isso o salão novo abre a página de setores
 * vazia — o organograma vem, mas não há setor nenhum para clicar.
 *
 * Gente de verdade (is_departamento = false) NUNCA é copiada.
 */
async function copiarSetores(modeloId: string, destinoId: string): Promise<ResultadoCopia[]> {
  // Idempotente: se o destino já tem setores, não duplica.
  const { count } = await supabaseAdmin
    .from('profissionais').select('id', { count: 'exact', head: true })
    .eq('salao_id', destinoId).eq('is_departamento', true)
  if ((count || 0) > 0) return []

  const { data } = await supabaseAdmin
    .from('profissionais')
    .select('nome_completo, departamento_cor, cargo')
    .eq('salao_id', modeloId).eq('is_departamento', true)
  const deps = (data || []) as any[]
  if (!deps.length) return []

  const linhas = deps.map(d => ({
    salao_id: destinoId,
    nome_completo: d.nome_completo,
    departamento_cor: d.departamento_cor ?? null,
    cargo: d.cargo ?? null,
    is_departamento: true,
    ativo: true,
  }))
  const { error } = await supabaseAdmin.from('profissionais').insert(linhas)
  if (error) return []
  return [{ tabela: 'setores', copiados: linhas.length }]
}

/**
 * Copia o CATÁLOGO DE SERVIÇOS — o nome e a categoria de cada serviço.
 * Os VALORES não vêm: preço, comissão e observação ficam em branco, para
 * cada salão pôr o seu. É o molde da lista, não a tabela de preços do Rouge.
 */
async function copiarServicos(modeloId: string, destinoId: string): Promise<ResultadoCopia[]> {
  // Idempotente: se o destino já tem serviços, não duplica.
  const { count } = await supabaseAdmin
    .from('servicos').select('id', { count: 'exact', head: true }).eq('salao_id', destinoId)
  if ((count || 0) > 0) return []

  const { data } = await supabaseAdmin
    .from('servicos').select('categoria, nome, ciclo_retorno_dias').eq('salao_id', modeloId)
  const servs = (data || []) as any[]
  if (!servs.length) return []

  const linhas = servs.map(s => ({
    salao_id: destinoId,
    categoria: s.categoria ?? null,
    nome: s.nome,
    ciclo_retorno_dias: s.ciclo_retorno_dias ?? null,
    preco_fixo: null, preco_min: null, comissao_valor: null, observacao: null,
  }))
  const { error } = await supabaseAdmin.from('servicos').insert(linhas)
  if (error) return []
  return [{ tabela: 'servicos (sem valores)', copiados: linhas.length }]
}

// ── CATÁLOGOS E CONFIGURAÇÃO ────────────────────────────────────────────────
// Varredura das 52 tabelas com salao_id: estas são catálogo/configuração —
// o molde do salão. Copiadas inteiras, com o id e as datas descartados.
//
// Ficam de fora, por natureza e não por escolha:
//  · logins (usuarios, salao_usuarios) — e-mail é único, copiar quebraria o acesso;
//  · pessoas reais (clientes_contatos, lojistas, profissionais que não são setor);
//  · movimento e histórico (agendamentos/atendimentos importados, relatórios,
//    caixas, pagamentos, comissões, auditoria, notificações, pendências);
//  · respostas e avaliações já dadas;
//  · memória e análises da IA — são sobre a operação de um salão específico.
const TABELAS_CATALOGO = [
  'servicos_catalogo',      // catálogo de serviços
  'produtos_catalogo',      // catálogo de produtos
  'despesas_catalogo',      // catálogo de despesas
  'salao_servicos',         // serviços do cadastro público
  'salao_modulos',          // quais módulos o salão tem
  'ia_configuracao',        // ajustes da IA
  'ia_metas_salao',         // metas do salão
  'recepcionista_desafios', // desafios da recepção
  'feedback_prof_regras',   // regras de feedback do profissional
]

// Colunas de controle: nunca copiadas (o destino gera as suas).
const COLUNAS_IGNORADAS = ['id', 'salao_id', 'criado_em', 'atualizado_em', 'created_at', 'updated_at']

/**
 * Cópia genérica de uma tabela de catálogo. Não precisa conhecer as colunas:
 * lê o que existe, descarta as de controle e regrava no salão de destino.
 * Idempotente — se o destino já tem linhas, não faz nada.
 */
async function copiarCatalogo(tabela: string, modeloId: string, destinoId: string): Promise<ResultadoCopia[]> {
  const { count } = await supabaseAdmin
    .from(tabela).select('id', { count: 'exact', head: true }).eq('salao_id', destinoId)
  if ((count || 0) > 0) return []

  const { data, error: erroLeitura } = await supabaseAdmin.from(tabela).select('*').eq('salao_id', modeloId)
  if (erroLeitura) return []
  const linhas = (data || []) as any[]
  if (!linhas.length) return []

  const novas = linhas.map(l => {
    const copia: any = { ...l }
    for (const c of COLUNAS_IGNORADAS) delete copia[c]
    return { ...copia, salao_id: destinoId }
  })
  const { error } = await supabaseAdmin.from(tabela).insert(novas)
  if (error) return []
  return [{ tabela, copiados: novas.length }]
}

/**
 * Leva para o salão novo todos os moldes que vivem fora de `salao_config`.
 * Nunca derruba a criação do salão: falhar aqui só significa começar sem
 * os moldes, e o salão pode importar depois pelo painel.
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
