import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { salaoIdSe, escritaBloqueadaSub } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'

const CHAVE = 'checkprocon_estado'

export async function GET() {
  const salaoId = await salaoIdSe('checkprocon')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE).maybeSingle()
  return NextResponse.json(data?.valor ?? {})
}

export async function PUT(req: NextRequest) {
  const salaoId = await salaoIdSe('checkprocon')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const estado = await req.json()
  if (!estado || typeof estado !== 'object') return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { error } = await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE, valor: estado, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Editou', 'Check Procon', '')
  return NextResponse.json({ ok: true })
}
