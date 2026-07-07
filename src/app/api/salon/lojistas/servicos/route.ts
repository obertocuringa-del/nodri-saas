import { NextRequest, NextResponse } from 'next/server'
import { salaoIdSe, escritaBloqueadaSub } from '@/lib/apiAuth'
import { getServicos, salvarServicos } from '@/lib/lojistasConfig'
import { registrarAuditoria } from '@/lib/audit'

export async function GET() {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const lista = await getServicos(salaoId)
  return NextResponse.json(lista.sort((a, b) => a.ordem - b.ordem))
}

// Substitui a lista inteira (add/editar/excluir/ativar/desativar/reordenar são feitos no client
// e enviados aqui como o array final, igual ao padrão de grades editáveis do projeto).
export async function PUT(req: NextRequest) {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const lista = await req.json()
  if (!Array.isArray(lista)) return NextResponse.json({ error: 'Lista inválida' }, { status: 400 })
  await salvarServicos(salaoId, lista)
  registrarAuditoria('Editou', 'Lojistas - Serviços', '')
  return NextResponse.json({ ok: true })
}
