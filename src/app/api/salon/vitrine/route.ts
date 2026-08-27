import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/apiAuth'
import { garantirConfig, getConfig, salvarConfig, gerarToken } from '@/lib/vitrineConfig'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Link da vitrine do cliente. Só o dono mexe: o link expõe preços e promoções
// do salão para qualquer um que o receba, e ligar ou trocar isso não é decisão
// de sub-usuário nem de profissional.

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const cfg = await getConfig(sess.salaoId)
  return NextResponse.json({ config: cfg })
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const { acao } = await req.json().catch(() => ({ acao: 'criar' }))

  if (acao === 'criar') {
    const cfg = await garantirConfig(sess.salaoId)
    await registrarAuditoria('criar', 'Link da vitrine', 'Link publico do cliente gerado')
    return NextResponse.json({ config: cfg })
  }

  const atual = await getConfig(sess.salaoId)
  if (!atual) return NextResponse.json({ error: 'Gere o link primeiro' }, { status: 400 })

  if (acao === 'ligar' || acao === 'desligar') {
    const cfg = { ...atual, ativo: acao === 'ligar' }
    await salvarConfig(sess.salaoId, cfg)
    await registrarAuditoria('editar', 'Link da vitrine', acao === 'ligar' ? 'Link religado' : 'Link tirado do ar')
    return NextResponse.json({ config: cfg })
  }

  // Trocar o endereço invalida o link antigo na hora — é o que se usa quando
  // o link vazou para quem não devia.
  if (acao === 'novo-endereco') {
    const cfg = { ...atual, token: gerarToken() }
    await salvarConfig(sess.salaoId, cfg)
    await registrarAuditoria('editar', 'Link da vitrine', 'Endereco trocado; o link antigo parou de funcionar')
    return NextResponse.json({ config: cfg })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
