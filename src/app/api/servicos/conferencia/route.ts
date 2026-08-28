import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/apiAuth'
import { conferir, ignorarNome } from '@/lib/conferenciaServicos'

export const dynamic = 'force-dynamic'

// Conferência da planilha contra os serviços cadastrados.
//
// Só leitura do que já está no banco — não importa nada, não grava nada no
// cadastro. Quem decide o que fazer com o achado é o dono, na tela.

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  try {
    return NextResponse.json(await conferir(sess.salaoId))
  } catch (e: any) {
    // Salão sem planilha importada ainda não é erro — é o caso normal de quem
    // acabou de entrar. A tela some sozinha quando não vem nada.
    return NextResponse.json({ ausentes: [], divergentes: [], linhasLidas: 0, aviso: String(e?.message || e) })
  }
}

// "Já tenho esse, com outro nome" — o nome para de aparecer na lista.
//
// Sem isso a conferência vira ruído: o serviço que existe nos dois com nome
// diferente voltaria a ser cobrado toda vez, o dono pararia de olhar, e o
// aviso que importa passaria batido junto.
export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const nome = String(body?.nome || '').trim()
  if (!nome) return NextResponse.json({ error: 'Informe o nome' }, { status: 400 })

  await ignorarNome(sess.salaoId, nome)
  return NextResponse.json(await conferir(sess.salaoId))
}
