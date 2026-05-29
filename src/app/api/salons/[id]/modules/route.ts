import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('salao_modulos')
    .select('modulo_id')
    .eq('salao_id', params.id)
    .eq('ativo', true)

  return NextResponse.json({ habilitados: (data || []).map((m: any) => m.modulo_id) })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { habilitados } = await req.json()

  await supabaseAdmin.from('salao_modulos').delete().eq('salao_id', params.id)

  if (habilitados.length > 0) {
    await supabaseAdmin.from('salao_modulos').insert(
      habilitados.map((moduloId: string) => ({
        salao_id: params.id,
        modulo_id: moduloId,
        ativo: true,
        habilitado_por: payload.userId,
      }))
    )
  }

  return NextResponse.json({ ok: true })
}
