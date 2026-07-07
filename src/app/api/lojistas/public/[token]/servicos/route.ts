import { NextRequest, NextResponse } from 'next/server'
import { getSalaoPorToken, adicionarServicoManual } from '@/lib/lojistasConfig'

// Lojista adiciona um serviço que não está na lista (fica disponível para novos cadastros).
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const achado = await getSalaoPorToken(params.token)
  if (!achado) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  const { nome } = await req.json()
  if (!String(nome || '').trim()) return NextResponse.json({ error: 'Nome do serviço é obrigatório' }, { status: 400 })
  const criado = await adicionarServicoManual(achado.salaoId, String(nome).slice(0, 120))
  return NextResponse.json(criado, { status: 201 })
}
