import { NextRequest, NextResponse } from 'next/server'
import { salaoIdSe, escritaBloqueadaSub } from '@/lib/apiAuth'
import { getSegmentos, salvarSegmentos } from '@/lib/lojistasConfig'
import { registrarAuditoria } from '@/lib/audit'

export async function GET() {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const lista = await getSegmentos(salaoId)
  return NextResponse.json(lista)
}

// Substitui a lista inteira de segmentos (exceto "Outro", que é sempre implícito).
export async function PUT(req: NextRequest) {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const lista = await req.json()
  if (!Array.isArray(lista)) return NextResponse.json({ error: 'Lista inválida' }, { status: 400 })
  await salvarSegmentos(salaoId, lista)
  registrarAuditoria('Editou', 'Lojistas - Segmentos', '')
  return NextResponse.json({ ok: true })
}
