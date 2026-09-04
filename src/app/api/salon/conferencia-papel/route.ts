import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { chaveDoMes, lerValores, type FolhaPapel } from '@/lib/conferenciaPapel'

export const dynamic = 'force-dynamic'

// Os valores lidos da comanda de PAPEL, digitados na tela.
//
// Folha do mês (papel_AAAA-MM), como os caixas: é movimento de dinheiro de
// gente real e não pode viajar ao salão modelo.

const valida = (s: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(s || '').trim())

async function lerFolha(salaoId: string, chave: string): Promise<FolhaPapel> {
  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', chave).maybeSingle()
  const v = (data as any)?.valor
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as FolhaPapel) : {}
}

export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const data = String(new URL(req.url).searchParams.get('data') || '').trim()
  if (!valida(data)) return NextResponse.json({ error: 'Informe a data como DD/MM/AAAA' }, { status: 400 })

  const folha = await lerFolha(sess.salaoId, chaveDoMes(data))
  return NextResponse.json({ data, valores: folha[data] || {} })
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const data = String(body?.data || '').trim()
  if (!valida(data)) return NextResponse.json({ error: 'Informe a data como DD/MM/AAAA' }, { status: 400 })
  if (!body?.valores || typeof body.valores !== 'object') {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const valores = lerValores(body.valores)

  // O dia é reescrito inteiro, e é o certo: apagar um campo na tela precisa
  // apagar no banco. Somar por cima deixaria um valor corrigido convivendo com
  // o antigo, e a conferência apontaria o que já foi resolvido.
  const chave = chaveDoMes(data)
  const folha = await lerFolha(sess.salaoId, chave)
  if (Object.keys(valores).length) folha[data] = valores
  else delete folha[data]

  const { error } = await supabaseAdmin.from('salao_config').upsert(
    { salao_id: sess.salaoId, chave, valor: folha, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, data, conferidas: Object.keys(valores).length })
}
