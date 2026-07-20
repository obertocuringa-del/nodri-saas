import { supabaseAdmin } from '@/lib/supabase'
import type { Curriculo, CurriculosDoc } from '@/lib/curriculosShared'

// Reexporta as constantes/tipos client-safe para as rotas de API usarem daqui.
export { ESTADOS_BR, VAGAS, EXPERIENCIAS, whatsappLink } from '@/lib/curriculosShared'
export type { Curriculo, CurriculosDoc } from '@/lib/curriculosShared'

const CHAVE = 'curriculos'

function novoToken(): string {
  return 'cur-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

export async function getCurriculosDoc(salaoId: string, criarSeVazio = false): Promise<CurriculosDoc> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE).maybeSingle()
  if (data?.valor) return data.valor as CurriculosDoc
  const doc: CurriculosDoc = { token: novoToken(), itens: [] }
  if (criarSeVazio) {
    await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: CHAVE, valor: doc, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  }
  return doc
}

export async function salvarCurriculosDoc(salaoId: string, doc: CurriculosDoc): Promise<void> {
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: CHAVE, valor: doc, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
}

export async function getSalaoPorTokenCurriculo(token: string): Promise<{ salaoId: string; doc: CurriculosDoc } | null> {
  const chave = (token || '').replace(/[,()]/g, '')
  const { data } = await supabaseAdmin
    .from('salao_config')
    .select('salao_id, valor')
    .eq('chave', CHAVE)
    .eq('valor->>token', chave)
    .maybeSingle()
  if (!data) return null
  return { salaoId: data.salao_id, doc: data.valor as CurriculosDoc }
}
