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

  // formulário da resposta mais recente (ou o 1º formulário do salão) —
  // usado pelo card do início para abrir direto a página de resultados
  const { data: ultima } = await supabaseAdmin
    .from('feedback_respostas')
    .select('formulario_id')
    .eq('salao_id', payload.salaoId)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  let formularioId = ultima?.formulario_id || null
  if (!formularioId) {
    const { data: form } = await supabaseAdmin
      .from('feedback_formularios')
      .select('id')
      .eq('salao_id', payload.salaoId)
      .limit(1)
      .maybeSingle()
    formularioId = form?.id || null
  }

  return NextResponse.json({ total: count || 0, formulario_id: formularioId })
}
