import { NextRequest, NextResponse } from 'next/server'
import { salaoIdSe, escritaBloqueadaSub } from '@/lib/apiAuth'
import { getOuCriarConfig, salvarConfig } from '@/lib/lojistasConfig'
import { registrarAuditoria } from '@/lib/audit'

export async function GET() {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const config = await getOuCriarConfig(salaoId)
  return NextResponse.json({ ...config, link_publico: `https://www.nodri.com.br/lojista/${config.slug}` })
}

export async function PUT(req: NextRequest) {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const b = await req.json()
  const patch: { whatsapp_link?: string; mensagem?: string } = {}
  if (b.whatsapp_link !== undefined) patch.whatsapp_link = String(b.whatsapp_link || '').trim()
  if (b.mensagem !== undefined) patch.mensagem = String(b.mensagem || '')

  const config = await salvarConfig(salaoId, patch)
  registrarAuditoria('Editou', 'Lojistas - Configurações', '')
  return NextResponse.json({ ...config, link_publico: `https://www.nodri.com.br/lojista/${config.slug}` })
}
