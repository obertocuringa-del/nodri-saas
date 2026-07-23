import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'

const CHAVE = 'acesso_oculto_global'

// Padrão do salão para o que os profissionais NÃO veem no portal.
// Só o dono (role 'salon') lê e grava. Guardado em salao_config.valor como
// um mapa { chave: true } das áreas ocultas para TODOS os profissionais.

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', sess.salaoId).eq('chave', CHAVE).maybeSingle()
  const v = (data as any)?.valor
  return NextResponse.json({ oculto: v && typeof v === 'object' ? v : {} })
}

export async function PUT(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const oculto = body?.oculto
  if (!oculto || typeof oculto !== 'object') return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  // Normaliza: só guarda as chaves marcadas como true.
  const limpo: Record<string, boolean> = {}
  for (const [k, val] of Object.entries(oculto)) if (val) limpo[k] = true
  const { error } = await supabaseAdmin.from('salao_config').upsert(
    { salao_id: sess.salaoId, chave: CHAVE, valor: limpo, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Editou', 'Acesso global dos profissionais', `${Object.keys(limpo).length} oculto(s)`)
  return NextResponse.json({ ok: true })
}
