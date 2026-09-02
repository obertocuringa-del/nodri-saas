import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'
import { CHAVE_VOTOS } from '@/lib/vitrineConfig'

export const dynamic = 'force-dynamic'

// Zerar a enquete "Mais pedidos" da página do cliente.
//
// Existe porque a enquete só sabia SOMAR: cada envio do cliente incrementa, e
// não havia como recomeçar. Depois de testar o link, o salão fica com votos de
// mentira no ranking e sem jeito de tirá-los.
//
// Duas travas de propósito:
//   - só o dono (nem sub-usuário nem profissional apagam resultado de enquete);
//   - a exclusão é presa em `chave = CHAVE_VOTOS` E `salao_id` da sessão. Não
//     recebe nome de chave por parâmetro: uma rota que apaga a chave que
//     mandarem é uma rota que apaga qualquer configuração do salão.

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess.salaoId).eq('chave', CHAVE_VOTOS).maybeSingle()
  const v = (data as any)?.valor
  const servicos = v?.servicos && typeof v.servicos === 'object' ? v.servicos : {}
  const total = Object.values(servicos).reduce((s: number, n: any) => s + (Number(n) || 0), 0)
  return NextResponse.json({
    itens: Object.keys(servicos).length,
    votos: total,
    sugestoes: Array.isArray(v?.livres) ? v.livres.length : 0,
  })
}

export async function DELETE() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('salao_config')
    .delete()
    .eq('salao_id', sess.salaoId)
    .eq('chave', CHAVE_VOTOS)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  registrarAuditoria('Excluiu', 'Página do cliente', 'zerou a enquete "Mais pedidos"')
  return NextResponse.json({ ok: true })
}
