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

  // FIX: guarda módulos atuais para restaurar se insert falhar
  const { data: modulosAtuais } = await supabaseAdmin
    .from('salao_modulos')
    .select('modulo_id, ativo, habilitado_por')
    .eq('salao_id', params.id)

  // Deleta módulos existentes
  const { error: deleteError } = await supabaseAdmin
    .from('salao_modulos')
    .delete()
    .eq('salao_id', params.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Erro ao remover módulos: ' + deleteError.message }, { status: 500 })
  }

  // Insere novos módulos
  if (habilitados.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('salao_modulos')
      .insert(
        habilitados.map((moduloId: string) => ({
          salao_id: params.id,
          modulo_id: moduloId,
          ativo: true,
          habilitado_por: payload.userId,
        }))
      )

    if (insertError) {
      // FIX: insert falhou → restaura módulos anteriores para não deixar salão sem módulos
      if (modulosAtuais && modulosAtuais.length > 0) {
        await supabaseAdmin.from('salao_modulos').insert(
          modulosAtuais.map((m: any) => ({ ...m, salao_id: params.id }))
        )
      }
      return NextResponse.json({ error: 'Erro ao salvar módulos: ' + insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
