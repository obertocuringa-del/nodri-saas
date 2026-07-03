import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { PROGRAMAS_DEFAULTS } from '@/lib/programasDefaults'

export const dynamic = 'force-dynamic'

// ============================================================================
// Configuração remota dos PROGRAMAS DESKTOP (Suite NODRI)
// - GET  (público): devolve APENAS o que o admin salvou (config) + os padrões
//   de fábrica (defaults, usados pela tela do admin como referência).
//   Os programas aplicam somente as chaves presentes em `config` — painel
//   vazio = programas 100% no padrão de fábrica.
// - POST (só master): salva o objeto config na tabela configuracoes.
// ============================================================================


export async function GET() {
  const { data } = await supabaseAdmin
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'programas_config')
    .maybeSingle()

  return NextResponse.json({ config: data?.valor || {}, defaults: PROGRAMAS_DEFAULTS })
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const config = body?.config
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return NextResponse.json({ error: 'Config inválida' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: 'programas_config', valor: config }, { onConflict: 'chave' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
