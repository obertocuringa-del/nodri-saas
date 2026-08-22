import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Roda diariamente — verificar licenças vencidas e bloquear acesso
export async function GET() {
  try {
    const hoje = new Date().toISOString().split('T')[0]

    // Busca salões ativos com licença vencida
    const { data: vencidos, error } = await supabaseAdmin
      .from('saloes')
      .select('id, nome, email')
      .eq('status', 'ativo')
      .lt('licenca_vencimento', hoje)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!vencidos || vencidos.length === 0) {
      return NextResponse.json({ message: 'Nenhuma licença vencida', bloqueados: 0 })
    }

    const ids = vencidos.map((s: any) => s.id)

    // Bloqueia todos automaticamente
    await supabaseAdmin.from('saloes').update({ status: 'vencido' }).in('id', ids)

    // Cria notificação no admin para cada salão bloqueado
    for (const salao of vencidos) {
      await supabaseAdmin.from('notificacoes').insert({
        titulo: 'Licença Vencida',
        mensagem: `Salão "${salao.nome}" (${salao.email}) teve a licença vencida e foi bloqueado automaticamente.`,
        tipo: 'danger',
        para_todos: false,
        salao_id: null, // notificação para o admin
      })
    }

    return NextResponse.json({
      message: `${vencidos.length} licença(s) bloqueada(s) automaticamente`,
      bloqueados: vencidos.length,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
