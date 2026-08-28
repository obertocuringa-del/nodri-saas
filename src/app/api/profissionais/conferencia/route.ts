import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/apiAuth'
import { conferirProfissionais, habilitarServicos, ignorarPar } from '@/lib/conferenciaProfissionais'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Quem fez o serviço na planilha mas não está habilitado nele aqui.
//
// Só o dono habilita: mexer no que alguém pode fazer muda a comissão e quem
// aparece para a cliente escolher.

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  try {
    return NextResponse.json({ pendentes: await conferirProfissionais(sess.salaoId) })
  } catch {
    // Sem planilha importada ainda: o cartão simplesmente não aparece.
    return NextResponse.json({ pendentes: [] })
  }
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const profissionalId = String(body?.profissionalId || '')
  const servicoIds: string[] = Array.isArray(body?.servicoIds) ? body.servicoIds.map(String) : []
  const acao = String(body?.acao || 'habilitar')
  if (!profissionalId || !servicoIds.length) {
    return NextResponse.json({ error: 'Informe o profissional e os serviços' }, { status: 400 })
  }

  // Dispensar não habilita nada: só cala o aviso daquele par. É o caso de quem
  // cobriu uma colega um dia e não deve ficar habilitada naquilo.
  if (acao === 'ignorar') {
    for (const id of servicoIds.slice(0, 200)) await ignorarPar(sess.salaoId, profissionalId, id)
    return NextResponse.json({ pendentes: await conferirProfissionais(sess.salaoId) })
  }

  const ok = await habilitarServicos(sess.salaoId, profissionalId, servicoIds)
  if (!ok) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

  await registrarAuditoria('editar', 'Profissional',
    `Habilitado em ${servicoIds.length} servico(s) pela conferencia da planilha`)

  return NextResponse.json({ pendentes: await conferirProfissionais(sess.salaoId) })
}
