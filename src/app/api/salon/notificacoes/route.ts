import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, escritaBloqueadaSub } from '@/lib/apiAuth'

const CHAVE = 'notificacoes_prof'

async function lerLista(salaoId: string): Promise<any[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE).maybeSingle()
  const v = (data as any)?.valor
  return Array.isArray(v) ? v : []
}

// GET — notificações visíveis para quem chama
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const lista = await lerLista(sess.salaoId)
  let visiveis = lista
  if (sess.role === 'profissional') {
    visiveis = lista.filter(n => n.alvo === 'todos' || n.alvo === sess.profissionalId)
  }
  // mais recentes primeiro, no máximo 30
  visiveis = visiveis.sort((a, b) => (b.em || 0) - (a.em || 0)).slice(0, 30)
  return NextResponse.json({ notificacoes: visiveis })
}

// POST — salão envia uma notificação (para todos ou um profissional). Sub/profissional não podem.
export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const body = await req.json()
  const texto = String(body?.texto || '').trim()
  const alvo = String(body?.alvo || 'todos').trim() || 'todos' // 'todos' ou id do profissional
  if (!texto) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })

  const lista = await lerLista(sess.salaoId)
  const nova = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, texto, alvo, em: Date.now(), de: (sess as any).nome || 'Salão' }
  const atualizada = [nova, ...lista].slice(0, 100)

  const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: sess.salaoId, chave: CHAVE, valor: atualizada, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, notificacao: nova })
}

// DELETE — remove uma notificação por id (somente salão)
export async function DELETE(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id') || ''
  const lista = await lerLista(sess.salaoId)
  const atualizada = lista.filter(n => n.id !== id)
  const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: sess.salaoId, chave: CHAVE, valor: atualizada, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
