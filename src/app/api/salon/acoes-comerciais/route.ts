import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'
import type { Campanha } from '@/lib/acoesComerciais'

const CHAVE = 'acoes_comerciais'

async function ler(salaoId: string): Promise<Campanha[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE).maybeSingle()
  const v = (data as any)?.valor
  return Array.isArray(v) ? v : []
}
async function gravar(salaoId: string, lista: Campanha[]) {
  return supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE, valor: lista, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}

// GET — dono/sub veem tudo; profissional só as campanhas publicadas (ativa).
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const lista = await ler(sess.salaoId)
  if (sess.role === 'profissional') {
    return NextResponse.json({ campanhas: lista.filter(c => c.ativa) })
  }
  return NextResponse.json({ campanhas: lista })
}

// PUT — só o dono grava a lista inteira (criar/editar/excluir/reordenar).
export async function PUT(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.campanhas)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { error } = await gravar(sess.salaoId, body.campanhas)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Editou', 'Ações Comerciais', `${body.campanhas.length} campanha(s)`)
  return NextResponse.json({ ok: true })
}

// PATCH — incrementa métrica (view/share) de uma campanha. Qualquer usuário
// logado do salão pode contar (o profissional que abre/compartilha).
export async function PATCH(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const id = String(body?.id || '')
  const metrica = body?.metrica === 'shares' ? 'shares' : 'views'
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const lista = await ler(sess.salaoId)
  const i = lista.findIndex(c => c.id === id)
  if (i < 0) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
  lista[i] = { ...lista[i], [metrica]: (Number(lista[i][metrica]) || 0) + 1 }
  const { error } = await gravar(sess.salaoId, lista)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, [metrica]: lista[i][metrica] })
}
