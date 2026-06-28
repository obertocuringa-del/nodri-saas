import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const CHAVE = 'mural_avisos'

async function sess() {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  if (!p?.salaoId) return null
  const userKey = p.role === 'sub' ? `sub:${(p as any).userId}` : 'dono'
  return { salaoId: p.salaoId as string, role: p.role as string, userKey, nome: (p as any).nome || (p.role === 'sub' ? 'Usuário' : 'Dono') }
}
async function load(salaoId: string): Promise<{ avisos: any[] }> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE).maybeSingle()
  return (data?.valor && Array.isArray(data.valor.avisos)) ? data.valor : { avisos: [] }
}
async function save(salaoId: string, doc: any) {
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: CHAVE, valor: doc, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
}

export async function GET() {
  const s = await sess(); if (!s) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const doc = await load(s.salaoId)
  return NextResponse.json({ avisos: doc.avisos, me: { role: s.role, userKey: s.userKey, dono: s.role !== 'sub' } })
}

// Dono cria/edita/exclui (salva a lista inteira)
export async function PUT(req: NextRequest) {
  const s = await sess(); if (!s) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (s.role === 'sub') return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const { avisos } = await req.json()
  await save(s.salaoId, { avisos: Array.isArray(avisos) ? avisos : [] })
  return NextResponse.json({ ok: true })
}

// Qualquer usuário marca como lido
export async function POST(req: NextRequest) {
  const s = await sess(); if (!s) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await req.json()
  const doc = await load(s.salaoId)
  const av = doc.avisos.find((a: any) => a.id === id)
  if (av) {
    if (!Array.isArray(av.lidos)) av.lidos = []
    if (!av.lidos.some((l: any) => l.k === s.userKey)) { av.lidos.push({ k: s.userKey, nome: s.nome, em: new Date().toISOString() }); await save(s.salaoId, doc) }
  }
  return NextResponse.json({ ok: true })
}
