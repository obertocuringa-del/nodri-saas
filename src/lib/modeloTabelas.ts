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
 * Leva para o salão novo todos os moldes que vivem fora de `salao_config`.
 * Nunca derruba a criação do salão: falhar aqui só significa começar sem
 * os moldes, e o salão pode importar depois pelo painel.
 */
export async function copiarMoldesDeTabelas(
  modeloId: string, destinoId: string, nomeDestino: string,
): Promise<ResultadoCopia[]> {
  const out: ResultadoCopia[] = []
  try { out.push(...await copiarFeedbackCliente(modeloId, destinoId, nomeDestino)) } catch { /* segue */ }
  try { out.push(...await copiarFeedbackProf(modeloId, destinoId)) } catch { /* segue */ }
  return out.filter(r => r.copiados > 0)
}
