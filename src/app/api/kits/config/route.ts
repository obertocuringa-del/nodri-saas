import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, salaoIdSe, bloquearEdicao } from '@/lib/apiAuth'
import type { KitsConfig } from '@/lib/kitsShared'

const CHAVE = 'kits_config'

// Preço do Kit Mão / Kit Pé — qualquer sessão do salão pode LER (a profissional
// precisa disso pra ver quanto vai pagar antes de pedir); só o dono/sub com
// permissão pode EDITAR.
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', sess.salaoId).eq('chave', CHAVE).maybeSingle()
  const v = (data as any)?.valor
  const cfg: KitsConfig = { precoMao: Number(v?.precoMao) || 0, precoPe: Number(v?.precoPe) || 0 }
  return NextResponse.json(cfg)
}

export async function PUT(req: NextRequest) {
    if (await bloquearEdicao('PUT')) return NextResponse.json({ error: 'Modo Caixa: você pode adicionar, mas não editar nem excluir.' }, { status: 403 })
  const salaoId = await salaoIdSe('adm_kits')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const body = await req.json()
  const cfg: KitsConfig = { precoMao: Number(body?.precoMao) || 0, precoPe: Number(body?.precoPe) || 0 }
  const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: CHAVE, valor: cfg, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
