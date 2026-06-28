import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { salaoIdSe, permDaGrade, getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'

// Grades editáveis genéricas (bebidas, alicates, produtos, senhas, pop...). Namespace 'grid_'.
export async function GET(req: NextRequest) {
  const chave = new URL(req.url).searchParams.get('chave') || ''
  if (!chave) return NextResponse.json(null)
  const salaoId = await salaoIdSe(permDaGrade(chave))
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  // Profissional só lê grades do PRÓPRIO perfil (chave termina com o id dele)
  const sessGet = await getSessao()
  if (sessGet?.role === 'profissional') {
    const pid = sessGet.profissionalId || ''
    if (!pid || !chave.includes(pid)) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  }
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', `grid_${chave}`).maybeSingle()
  return NextResponse.json(data?.valor ?? null)
}

export async function PUT(req: NextRequest) {
  const { chave, doc } = await req.json()
  if (!chave) return NextResponse.json({ error: 'Falta chave' }, { status: 400 })
  const salaoId = await salaoIdSe(permDaGrade(chave))
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  // Sub-usuário é somente leitura, EXCETO as Listas (bebidas, alicates, produtos, serviços internos)
  const ehListasGrid = /^bebidas/.test(chave) || ['alicates', 'produtos', 'servinterno'].includes(chave)
  const sess = await getSessao()
  if (sess?.role === 'profissional') return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  if (sess?.role === 'sub' && !ehListasGrid) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const { error } = await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: `grid_${chave}`, valor: doc, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Editou', 'Planilha/Lista', chave)
  return NextResponse.json({ ok: true })
}
