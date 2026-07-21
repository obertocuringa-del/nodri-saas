import { NextRequest, NextResponse } from 'next/server'
import { salaoIdSe } from '@/lib/apiAuth'
import { getCurriculosDoc, salvarCurriculosDoc } from '@/lib/curriculos'

// GET: lista de currículos + link público + contagem de novos (desde visto_em)
export async function GET(req: NextRequest) {
  const salaoId = await salaoIdSe('curriculos')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const doc = await getCurriculosDoc(salaoId, true)
  const visto = doc.visto_em ? new Date(doc.visto_em).getTime() : 0
  const novos = (doc.itens || []).filter(c => new Date(c.criado_em).getTime() > visto).length

  const url = new URL(req.url)
  const soCount = url.searchParams.get('count') === '1'
  if (soCount) return NextResponse.json({ novos })

  // Sempre usa o domínio oficial do salão (não o preview da Vercel)
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nodri.com.br'
  return NextResponse.json({
    token: doc.token,
    link: `${base}/curriculo/${doc.token}`,
    itens: doc.itens || [],
    novos,
  })
}

// POST: marca todos como vistos (zera o badge)
export async function POST(req: NextRequest) {
  const salaoId = await salaoIdSe('curriculos')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const doc = await getCurriculosDoc(salaoId, true)
  doc.visto_em = new Date().toISOString()
  await salvarCurriculosDoc(salaoId, doc)
  return NextResponse.json({ ok: true })
}

// DELETE: remove um currículo por id (?id=...)
export async function DELETE(req: NextRequest) {
  const salaoId = await salaoIdSe('curriculos')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id') || ''
  const doc = await getCurriculosDoc(salaoId, true)
  doc.itens = (doc.itens || []).filter(c => c.id !== id)
  await salvarCurriculosDoc(salaoId, doc)
  return NextResponse.json({ ok: true })
}
