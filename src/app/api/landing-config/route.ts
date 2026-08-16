import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { LANDING_PADRAO } from '@/lib/landingDefaults'

// Os textos moravam aqui numa cópia própria, que desencontrou da página e
// passou a sobrescrever o site com texto de duas versões atrás. Agora vêm
// de src/lib/landingDefaults.ts, junto com a página e o editor.
const DEFAULT_CONFIG = LANDING_PADRAO

export async function GET() {
  const { data } = await supabaseAdmin
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'landing_config')
    .single()

  const saved = data?.valor || {}
  return NextResponse.json({ ...DEFAULT_CONFIG, ...saved })
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()

  // O erro do banco era descartado e a rota respondia ok mesmo falhando.
  // Quem salvava nao tinha como saber que nao salvou.
  const { error } = await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: 'landing_config', valor: body }, { onConflict: 'chave' })

  if (error) {
    return NextResponse.json({ error: error.message, detalhe: error.details || null }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
