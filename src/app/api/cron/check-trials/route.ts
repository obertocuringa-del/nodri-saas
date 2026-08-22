import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - 7)

    const { data: trialsVencidos, error } = await supabaseAdmin
      .from('saloes')
      .select('id, nome, email, criado_em')
      .eq('status', 'trial')
      .lt('criado_em', dataLimite.toISOString())

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!trialsVencidos || trialsVencidos.length === 0) {
      return NextResponse.json({ message: 'Nenhum trial vencido', bloqueados: 0 })
    }

    const ids = trialsVencidos.map((s: any) => s.id)
    await supabaseAdmin.from('saloes').update({ status: 'vencido' }).in('id', ids)

    for (const salao of trialsVencidos) {
      await supabaseAdmin.from('notificacoes').insert({
        salao_id: salao.id,
        mensagem: 'Seu período de trial de 7 dias expirou. Entre em contato para continuar.',
        tipo: 'danger',
        para_todos: false,
      })
    }

    return NextResponse.json({ message: `${trialsVencidos.length} trial(s) bloqueado(s)` })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
