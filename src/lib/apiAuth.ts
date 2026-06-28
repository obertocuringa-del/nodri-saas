import { cookies } from 'next/headers'
import { verifyJWT } from './auth'
import { supabaseAdmin } from './supabase'

export interface Sessao { salaoId: string; role: string; permissoes: string[] | null; profissionalId?: string }

// Sessão atual com permissões AO VIVO (dono → permissoes null = pode tudo)
export async function getSessao(): Promise<Sessao | null> {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const p = await verifyJWT(token)
  if (!p || !p.salaoId) return null
  if (p.role === 'sub') {
    const { data } = await supabaseAdmin.from('salao_usuarios').select('permissoes, ativo').eq('id', p.userId).maybeSingle()
    if (!data || data.ativo === false) return null
    return { salaoId: p.salaoId, role: 'sub', permissoes: Array.isArray(data.permissoes) ? data.permissoes : [] }
  }
  if (p.role === 'profissional') {
    // Profissional: somente leitura e escopo do próprio id
    return { salaoId: p.salaoId, role: 'profissional', permissoes: null, profissionalId: (p as any).profissionalId || p.userId }
  }
  return { salaoId: p.salaoId, role: p.role, permissoes: null }
}

// Sub-usuário (criado pelo salão) é SOMENTE LEITURA — não pode editar/excluir/alterar nada.
// Retorna true quando a escrita deve ser bloqueada (usuário é 'sub'). Dono/master nunca bloqueiam.
export async function escritaBloqueadaSub(): Promise<boolean> {
  const s = await getSessao()
  // Sub e profissional são somente leitura — nunca podem escrever/alterar/excluir nada
  return s?.role === 'sub' || s?.role === 'profissional'
}

// Retorna o salaoId se a sessão tem QUALQUER uma das chaves (dono sempre passa); senão null
export async function salaoIdSe(chaves: string | string[]): Promise<string | null> {
  const s = await getSessao()
  if (!s) return null
  if (s.permissoes === null) return s.salaoId
  const req = Array.isArray(chaves) ? chaves : [chaves]
  return req.some(c => s.permissoes!.includes(c)) ? s.salaoId : null
}

// Mapeia a chave de uma grade (salao_config) para a permissão necessária
export function permDaGrade(chave: string): string {
  const c = (chave || '').replace(/^grid_/, '')
  if (c === 'checklist') return 'checklist'
  if (c === 'materiais_trabalho') return 'prof_materiais'
  if (c.startsWith('pop')) return 'adm_pop'
  if (c === 'senhas') return 'adm_senhas'
  if (c === 'pacotes') return 'adm_pacotes'
  if (c === 'ata') return 'adm_ata'
  if (c === 'feriados') return 'adm_feriados'
  if (c.startsWith('escala')) return 'adm_escala'
  if (c === 'telefones') return 'adm_telefones'
  if (c === 'precos_servicos') return 'adm_servicos_valores'
  if (c === 'tratamentos_dosagem') return 'adm_tratamentos'
  if (c === 'cadastrar_produto') return 'adm_cadastrar_produto'
  if (c === 'desconto_profissional') return 'adm_desconto_profissional'
  if (c.startsWith('corrida_interna_')) return 'profissionais'
  if (c === 'corrida_interna') return 'adm_corrida_interna'
  if (c.startsWith('acoes_comerciais_')) return 'profissionais'
  if (c === 'acoes_comerciais') return 'adm_acoes_comerciais'
  if (c === 'correios') return 'adm_correios'
  if (c === 'agendamentos_grandes') return 'adm_agendamentos_grandes'
  if (c.startsWith('descricao_cargo')) return 'profissionais'
  if (c === 'tabela_precos_arquivos') return 'adm_tabela_precos'
  if (c === 'arquivos_envio_lista') return 'adm_arquivos_envio'
  if (c === 'exame_admissional') return 'clt_exame'
  if (c === 'processo_contratacao_clt') return 'profissionais'
  if (c.startsWith('processo_')) return 'profissionais'
  if (c === 'perfil_avaliacao') return 'profissionais'
  if (c === 'avaliacao_modelo') return 'profissionais'
  if (c.startsWith('calendario_mkt')) return 'calendario_mkt'
  if (c.startsWith('calendario')) return 'calendario'
  if (c === 'prof_categorias') return 'profissionais'
  // bebidas, alicates, produtos, servinterno → Listas
  return 'adm_listas'
}
