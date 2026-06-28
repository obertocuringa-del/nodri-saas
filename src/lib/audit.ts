import { cookies } from 'next/headers'
import { verifyJWT } from './auth'
import { supabaseAdmin } from './supabase'

// Registra uma ação de escrita no log de auditoria.
// Tolerante a falha: se a tabela audit_log ainda não existir, apenas ignora
// (nada quebra antes de o SQL ser rodado no Supabase).
export async function registrarAuditoria(acao: string, entidade: string, detalhe = '') {
  try {
    const token = cookies().get('nodri_token')?.value
    const p = token ? await verifyJWT(token) : null
    if (!p?.salaoId) return
    const usuario = p.role === 'sub' ? `Sub: ${(p as any).nome || (p as any).userId || 'usuário'}` : 'Dono'
    await supabaseAdmin.from('audit_log').insert({
      salao_id: p.salaoId, usuario, acao, entidade, detalhe: String(detalhe || '').slice(0, 300),
    })
  } catch { /* tabela pode não existir ainda — não quebra a operação */ }
}
