import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Cópia de segurança das páginas de um salão ──────────────────────────────
//
// O plano gratuito do Supabase não faz backup nenhum. Descobrimos isso do
// pior jeito: uma aplicação do modelo gravou páginas em branco por cima do
// conteúdo de um salão e não havia de onde tirar de volta.
//
// Aqui a cópia fica na mão do dono do sistema: baixa um arquivo antes de
// mexer, e restaura dele se algo der errado.
//
// GET  ?salao=<id>  → devolve o arquivo (JSON) com todas as páginas
// POST { salao_id, linhas }  → grava as páginas do arquivo de volta
//
// A restauração NUNCA APAGA: ela grava por cima das chaves que estão no
// arquivo e deixa em paz qualquer página criada depois. Quem perde conteúdo
// é quem restaura um arquivo velho por cima de trabalho novo — por isso a
// resposta sempre diz quantas páginas foram tocadas.

async function master() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload && payload.role === 'master' ? payload : null
}

export async function GET(req: NextRequest) {
  if (!await master()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const salao = new URL(req.url).searchParams.get('salao')
  if (!salao) return NextResponse.json({ error: 'Informe ?salao=<id>' }, { status: 400 })

  const [{ data: info }, { data: linhas, error }] = await Promise.all([
    supabaseAdmin.from('saloes').select('id, nome').eq('id', salao).maybeSingle(),
    supabaseAdmin.from('salao_config').select('chave, valor, atualizado_em').eq('salao_id', salao),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    formato: 'nodri-backup-1',
    salao_id: salao,
    salao_nome: (info as any)?.nome || null,
    gerado_em: new Date().toISOString(),
    total: (linhas || []).length,
    linhas: linhas || [],
  })
}

export async function POST(req: NextRequest) {
  if (!await master()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const salaoId = String(body?.salao_id || '')
  const linhas = Array.isArray(body?.linhas) ? body.linhas : null
  // `chaves` opcional: restaura só as páginas escolhidas, em vez do arquivo
  // inteiro. É o caso comum — devolver uma página que se perdeu sem desfazer
  // o que foi feito nas outras.
  const so: string[] | null = Array.isArray(body?.chaves) && body.chaves.length ? body.chaves.map(String) : null

  if (!salaoId || !linhas) {
    return NextResponse.json({ error: 'Envie salao_id e linhas (o arquivo baixado)' }, { status: 400 })
  }

  const { data: existe } = await supabaseAdmin.from('saloes').select('id').eq('id', salaoId).maybeSingle()
  if (!existe) return NextResponse.json({ error: 'Salão não encontrado' }, { status: 404 })

  const agora = new Date().toISOString()
  const paraGravar = linhas
    .filter((l: any) => l && typeof l.chave === 'string')
    .filter((l: any) => !so || so.includes(l.chave))
    .map((l: any) => ({ salao_id: salaoId, chave: l.chave, valor: l.valor ?? null, atualizado_em: agora }))

  if (!paraGravar.length) return NextResponse.json({ ok: true, restauradas: 0 })

  const { error } = await supabaseAdmin
    .from('salao_config').upsert(paraGravar, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, restauradas: paraGravar.length })
}
