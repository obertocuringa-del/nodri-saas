import { NextRequest, NextResponse } from 'next/server'
import { getSessao, escritaBloqueadaSub } from '@/lib/apiAuth'
import { detectarProfissionaisNovos, juntarPendente } from '@/lib/profissionaisNovos'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Profissionais novas vindas dos relatórios da Avec (ver lib/profissionaisNovos).
//   { acao: 'detectar' }                         procura e cria as pendentes
//   { acao: 'juntar', pendente, destino }        "é a mesma pessoa que..."
export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess || sess.role === 'profissional') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (body?.acao === 'juntar') {
    const erro = await juntarPendente(sess.salaoId, String(body.pendente || ''), String(body.destino || ''))
    if (erro) return NextResponse.json({ error: erro }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  try {
    const r = await detectarProfissionaisNovos(sess.salaoId, { forcar: body?.forcar === true })
    return NextResponse.json({ ok: true, criados: r.criados || [] })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
