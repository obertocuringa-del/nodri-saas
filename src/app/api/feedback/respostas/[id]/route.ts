import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('feedback_respostas')
    .delete()
    .eq('id', params.id)
    .eq('salao_id', payload.salaoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
