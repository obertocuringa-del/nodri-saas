import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'

const CHAVE = 'feedback_google'

// Link do perfil do Google do salão + o texto do convite mostrado ao cliente
// satisfeito. Fica em salao_config porque é um por salão, não por formulário:
// o salão pode ter vários formulários e o perfil do Google é sempre o mesmo.
// Guardado aqui também para o dia em que o link mudar — troca num lugar só.

const MENSAGEM_PADRAO =
  'Poderia avaliar seu atendimento no Google? Assim conseguimos crescer ainda mais e levar seu feedback, trazendo mais confiança para outros clientes.'

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('salao_config')
    .select('valor')
    .eq('salao_id', sess.salaoId)
    .eq('chave', CHAVE)
    .maybeSingle()

  const v = (data as any)?.valor
  return NextResponse.json({
    link: typeof v?.link === 'string' ? v.link : '',
    mensagem: typeof v?.mensagem === 'string' && v.mensagem ? v.mensagem : MENSAGEM_PADRAO,
  })
}

export async function PUT(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'profissional') return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const link = String(body?.link || '').trim()
  const mensagem = String(body?.mensagem || '').trim() || MENSAGEM_PADRAO

  // Link vazio é válido: é como o salão desliga o convite sem perder o texto.
  // Já um link preenchido tem que ser http(s) — o cliente clica nisso, e um
  // valor colado errado viraria um botão que não leva a lugar nenhum.
  if (link && !/^https?:\/\//i.test(link)) {
    return NextResponse.json({ error: 'O link precisa começar com http:// ou https://' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('salao_config').upsert(
    { salao_id: sess.salaoId, chave: CHAVE, valor: { link, mensagem }, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  registrarAuditoria('Editou', 'Convite do Google (feedback)', link ? 'link configurado' : 'link removido')
  return NextResponse.json({ ok: true })
}
