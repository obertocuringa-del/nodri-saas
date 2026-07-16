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

// Bloqueia edição/exclusão para sub e profissional, mas o MODO CAIXA pode
// ADICIONAR (POST). Use nos catálogos e lançamentos: POST → bloquearEdicao('POST'),
// PUT/DELETE/PATCH → bloquearEdicao('PUT'). Dono (role 'salon') nunca é bloqueado.
export async function bloquearEdicao(metodo: 'POST' | 'PUT' | 'DELETE' | 'PATCH'): Promise<boolean> {
  const s = await getSessao()
  if (!s || (s.role !== 'sub' && s.role !== 'profissional')) return false // dono/master: livre
  if (s.role === 'profissional') return true                              // profissional: nunca escreve
  if (sessaoModoCaixa(s) && metodo === 'POST') return false               // Caixa: pode ADICIONAR
  return true                                                             // sub (ou Caixa em edição/exclusão): bloqueia
}

// ── MODO CAIXA ──────────────────────────────────────────────────────────────
// Sub-usuário marcado como "Modo Caixa" pode EXECUTAR e ADICIONAR, mas nunca
// editar ou excluir o que já existe. A flag vive no array de permissões.
export function sessaoModoCaixa(s: Sessao | null): boolean {
  return !!s && s.role === 'sub' && Array.isArray(s.permissoes) && s.permissoes.includes('modo_caixa')
}

// Campos "de execução" que o Modo Caixa PODE alterar livremente
// (marcar feito, somar atendimentos, resolver pendência...)
export const CAMPOS_LIVRES_CAIXA = new Set(['feito', 'feito_em', 'historico', 'cells', 'resolvido', 'atualizado_em', 'enviado', 'criado_em'])

// Valida "só acrescenta": aceita o documento novo apenas se NADA do antigo
// foi removido ou alterado — vazios podem ser preenchidos, arrays podem
// crescer no fim, chaves novas podem surgir. Campos livres mudam à vontade.
export function apenasAcrescenta(velho: any, novo: any, camposLivres: Set<string> = CAMPOS_LIVRES_CAIXA): boolean {
  // O que era vazio pode ser preenchido
  if (velho === null || velho === undefined || velho === '' || velho === 0 || velho === '0') return true
  if (typeof velho !== 'object') return velho === novo
  if (Array.isArray(velho)) {
    if (!Array.isArray(novo) || novo.length < velho.length) return false // removeu item
    for (let i = 0; i < velho.length; i++) if (!apenasAcrescenta(velho[i], novo[i], camposLivres)) return false
    return true
  }
  if (typeof novo !== 'object' || novo === null || Array.isArray(novo)) return false
  for (const k of Object.keys(velho)) {
    if (camposLivres.has(k)) continue
    if (!apenasAcrescenta((velho as any)[k], (novo as any)[k], camposLivres)) return false
  }
  return true
}

// Retorna o salaoId se a sessão tem QUALQUER uma das chaves (dono sempre passa); senão null
export async function salaoIdSe(chaves: string | string[]): Promise<string | null> {
  const s = await getSessao()
  if (!s) return null
  if (s.permissoes === null) return s.salaoId
  const req = Array.isArray(chaves) ? chaves : [chaves]
  return req.some(c => s.permissoes!.includes(c)) ? s.salaoId : null
}

// Leitura (GET) de uma área do salão: retorna o salaoId se a sessão pode VER.
// Dono sempre; sub só com a permissão liberada; profissional nunca (portal próprio).
// Corrige telas que exigiam role 'salon' e bloqueavam o sub de só visualizar.
export async function salaoIdSeVer(chave: string): Promise<string | null> {
  const s = await getSessao()
  if (!s) return null
  if (s.role === 'salon') return s.salaoId
  if (s.role === 'sub' && Array.isArray(s.permissoes) && s.permissoes.includes(chave)) return s.salaoId
  return null
}

// Mapeia a chave de uma grade (salao_config) para a permissão necessária
export function permDaGrade(chave: string): string {
  const c = (chave || '').replace(/^grid_/, '')
  if (c === 'checklist') return 'checklist'
  if (c === 'materiais_trabalho') return 'prof_materiais'
  if (c.startsWith('pop')) return 'adm_pop'
  if (c === 'senhas') return 'adm_senhas'
  if (c === 'pacotes') return 'adm_pacotes'
  if (c === 'pacotes_valores') return 'adm_valores_pacotes'
  if (c.startsWith('ata')) return 'adm_ata'
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
  if (c.startsWith('esterilizacao')) return 'adm_esterilizacao'
  if (c.startsWith('enxovais')) return 'adm_enxovais'
  if (c.startsWith('descricao_cargo')) return 'profissionais'
  if (c === 'tabela_precos_arquivos') return 'adm_tabela_precos'
  if (c === 'arquivos_envio_lista') return 'adm_arquivos_envio'
  if (c === 'exame_admissional') return 'clt_exame'
  if (c === 'processo_contratacao_clt') return 'profissionais'
  if (c.startsWith('processo_')) return 'profissionais'
  if (c === 'perfil_avaliacao') return 'profissionais'
  if (c === 'avaliacao_modelo') return 'profissionais'
  if (c === 'plano_carreira_pj') return 'profissionais'
  if (c.startsWith('plano_carreira_prof_')) return 'profissionais'
  if (c.startsWith('calendario_mkt')) return 'calendario_mkt'
  if (c.startsWith('calendario')) return 'calendario'
  if (c === 'prof_categorias') return 'profissionais'
  if (c === 'calc_servicos_global') return 'calc_abas_extras'
  // bebidas, alicates, produtos, servinterno → Listas
  return 'adm_listas'
}
