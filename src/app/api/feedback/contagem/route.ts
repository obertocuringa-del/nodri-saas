import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Contagem leve de respostas de feedback de clientes do salão (para o KPI do início)
export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !payload.salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { count } = await supabaseAdmin
    .from('feedback_respostas')
    .select('id', { count: 'exact', head: true })
    .eq('salao_id', payload.salaoId)

  return NextResponse.json({ total: count || 0 })
}
