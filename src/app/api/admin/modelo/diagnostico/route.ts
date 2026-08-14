import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// DIAGNÓSTICO DO MODELO
//
// Compara, tabela por tabela, o que um salão de origem tem e o que o modelo
// tem. Serve para achar buraco na cópia sem depender de alguém esbarrar no
// problema usando o sistema.
//
// GET /api/admin/modelo/diagnostico?origem=<salaoId>

async function master() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload && payload.role === 'master' ? payload : null
}

// As 52 tabelas com salao_id, e o que se espera de cada uma.
const TABELAS: { nome: string; situacao: 'copia' | 'nao'; motivo?: string; filtro?: Record<string, any> }[] = [
  // ── moldes que a cópia leva ──
  { nome: 'salao_config', situacao: 'copia' },
  { nome: 'profissionais', situacao: 'copia', filtro: { is_departamento: true }, motivo: 'só os setores' },
  { nome: 'servicos', situacao: 'copia', motivo: 'sem os valores' },
  { nome: 'servicos_catalogo', situacao: 'copia' },
  { nome: 'produtos_catalogo', situacao: 'copia' },
  { nome: 'despesas_catalogo', situacao: 'copia' },
  { nome: 'salao_servicos', situacao: 'copia' },
  { nome: 'salao_modulos', situacao: 'copia' },
  { nome: 'ia_configuracao', situacao: 'copia' },
  { nome: 'ia_metas_salao', situacao: 'copia' },
  { nome: 'recepcionista_desafios', situacao: 'copia' },
  { nome: 'feedback_formularios', situacao: 'copia' },
  { nome: 'feedback_prof_formularios', situacao: 'copia' },
  { nome: 'feedback_prof_regras', situacao: 'copia' },
  { nome: 'feedback_prof_regras_custom', situacao: 'copia' },

  // ── não copiadas: motivo em cada uma ──
  { nome: 'usuarios', situacao: 'nao', motivo: 'login — e-mail é único, copiar quebraria o acesso' },
  { nome: 'salao_usuarios', situacao: 'nao', motivo: 'login dos sub-usuários' },
  { nome: 'saloes', situacao: 'nao', motivo: 'o registro do próprio salão' },
  { nome: 'clientes_contatos', situacao: 'nao', motivo: 'clientes de verdade' },
  { nome: 'lojistas', situacao: 'nao', motivo: 'parceiros cadastrados' },
  { nome: 'agendamentos_raw', situacao: 'nao', motivo: 'importação da agenda' },
  { nome: 'atendimentos_raw', situacao: 'nao', motivo: 'importação de atendimentos' },
  { nome: 'relatorio_periodos', situacao: 'nao', motivo: 'relatório do movimento' },
  { nome: 'relatorio_feedbacks', situacao: 'nao', motivo: 'relatório do movimento' },
  { nome: 'audit_log', situacao: 'nao', motivo: 'auditoria' },
  { nome: 'logs', situacao: 'nao', motivo: 'log do sistema' },
  { nome: 'notificacoes', situacao: 'nao', motivo: 'avisos já enviados' },
  { nome: 'pagamentos', situacao: 'nao', motivo: 'financeiro' },
  { nome: 'calculadora_historico', situacao: 'nao', motivo: 'histórico da calculadora' },
  { nome: 'prof_metricas_mensais', situacao: 'nao', motivo: 'desempenho de gente real' },
  { nome: 'prof_pagamentos', situacao: 'nao', motivo: 'pagamento de gente real' },
  { nome: 'salao_despesas_mensais', situacao: 'nao', motivo: 'despesa de cada mês' },
  { nome: 'pendencias_profissionais', situacao: 'nao', motivo: 'pendências em aberto' },
  { nome: 'alertas_profissional', situacao: 'nao', motivo: 'alertas de gente real' },
  { nome: 'lista_espera', situacao: 'nao', motivo: 'clientes esperando' },
  { nome: 'planejamentos_metas', situacao: 'nao', motivo: 'metas por profissional' },
  { nome: 'metas_profissionais', situacao: 'nao', motivo: 'metas por profissional' },
  { nome: 'feedback_perguntas', situacao: 'copia', motivo: 'vem junto do formulário' },
  { nome: 'feedback_respostas', situacao: 'nao', motivo: 'respostas de clientes' },
  { nome: 'feedback_prof_respostas', situacao: 'nao', motivo: 'respostas já dadas' },
  { nome: 'feedback_prof_ocorridos', situacao: 'nao', motivo: 'ocorridos de gente real' },
  { nome: 'feedback_prof_profissionais', situacao: 'nao', motivo: 'gente real' },
  { nome: 'feedback_prof_bloqueios', situacao: 'nao', motivo: 'bloqueios de gente real' },
  { nome: 'feedback_prof_bloqueios_historico', situacao: 'nao', motivo: 'histórico' },
  { nome: 'ia_analise_profissional', situacao: 'nao', motivo: 'análise sobre gente real' },
  { nome: 'ia_conversas', situacao: 'nao', motivo: 'conversas do salão' },
  { nome: 'ia_memoria_semantica', situacao: 'nao', motivo: 'memória da operação dele' },
  { nome: 'ia_memoria_usuario', situacao: 'nao', motivo: 'memória do usuário' },
  { nome: 'ia_resumos_semanais', situacao: 'nao', motivo: 'resumo do movimento' },
  { nome: 'recepcionista_movimentos', situacao: 'nao', motivo: 'movimento da recepção' },
]

/** Conta com prazo: tabela que não existe ou trava não pode segurar o resto. */
async function contar(tabela: string, salaoId: string, filtro?: Record<string, any>): Promise<number | null> {
  const consulta = (async () => {
    try {
      let q = supabaseAdmin.from(tabela).select('*', { count: 'exact', head: true }).eq('salao_id', salaoId)
      for (const [k, v] of Object.entries(filtro || {})) q = q.eq(k, v)
      const { count, error } = await q
      return error ? null : (count || 0)
    } catch { return null }
  })()
  const prazo = new Promise<null>(r => setTimeout(() => r(null), 6000))
  return Promise.race([consulta, prazo])
}

/** Roda em lotes: 100 consultas de uma vez afogam a conexão. */
async function emLotes<T, R>(itens: T[], tamanho: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < itens.length; i += tamanho) {
    out.push(...await Promise.all(itens.slice(i, i + tamanho).map(fn)))
  }
  return out
}

export async function GET(req: NextRequest) {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const origemId = new URL(req.url).searchParams.get('origem') || ''
  const { data: mod } = await supabaseAdmin.from('saloes').select('id, nome').eq('is_modelo', true).maybeSingle()
  if (!mod) return NextResponse.json({ error: 'Nenhum salão modelo definido' }, { status: 400 })
  if (!origemId) return NextResponse.json({ error: 'Informe ?origem=<salaoId>' }, { status: 400 })

  const { data: org } = await supabaseAdmin.from('saloes').select('nome').eq('id', origemId).maybeSingle()

  // Só as tabelas que DEVEM ser copiadas precisam de contagem — nas outras
  // o motivo de não virem já é conhecido, consultar seria desperdício.
  // Em lotes, porque cem consultas de uma vez afogam a conexão.
  const paraContar = TABELAS.filter(t => t.situacao === 'copia')
  const contadas = await emLotes(paraContar, 5, async t => {
    const [naOrigem, noModelo] = await Promise.all([
      contar(t.nome, origemId, t.filtro),
      contar(t.nome, (mod as any).id, t.filtro),
    ])
    return {
      tabela: t.nome,
      situacao: t.situacao,
      motivo: t.motivo || null,
      naOrigem, noModelo,
      // buraco = deveria copiar, a origem tem, e o modelo está sem
      buraco: (naOrigem || 0) > 0 && (noModelo || 0) === 0,
      inexistente: naOrigem === null && noModelo === null,
    }
  })
  const naoCopiadas = TABELAS.filter(t => t.situacao === 'nao')
    .map(t => ({ tabela: t.nome, situacao: t.situacao, motivo: t.motivo || null, naOrigem: null, noModelo: null, buraco: false, inexistente: false }))
  const linhas = [...contadas, ...naoCopiadas]

  const buracos = linhas.filter(l => l.buraco)
  return NextResponse.json({
    origem: (org as any)?.nome || origemId,
    modelo: (mod as any).nome,
    totalTabelas: linhas.length,
    buracos: buracos.map(b => ({ tabela: b.tabela, naOrigem: b.naOrigem })),
    tudoCopiado: buracos.length === 0,
    linhas,
  })
}
