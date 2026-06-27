import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Lista os módulos (id, nome) para o dono montar as permissões dos sub-usuários
export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !payload.salaoId || payload.role === 'sub') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const { data } = await supabaseAdmin.from('modulos').select('id, nome').order('ordem')
  return NextResponse.json(data || [])
}
