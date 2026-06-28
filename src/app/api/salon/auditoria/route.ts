import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Lista o log de auditoria do salão (somente o dono).
export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  if (!p?.salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (p.role === 'sub') return NextResponse.json({ error: 'Somente o dono' }, { status: 403 })
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_log')
      .select('usuario, acao, entidade, detalhe, criado_em')
      .eq('salao_id', p.salaoId)
      .order('criado_em', { ascending: false })
      .limit(300)
    if (error) return NextResponse.json({ logs: [], semTabela: true })
    return NextResponse.json({ logs: data || [] })
  } catch {
    return NextResponse.json({ logs: [], semTabela: true })
  }
}
