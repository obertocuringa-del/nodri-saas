import { NextRequest, NextResponse } from 'next/server'
import { salaoIdSe } from '@/lib/apiAuth'
import {
  getCurriculosDoc, salvarCurriculosDoc, getVistoEm, marcarVisto,
  vagasDoDoc, vagasParaExibir, criarVaga, renomearVaga, excluirVaga,
} from '@/lib/curriculos'

// Currículos são um banco ÚNICO do NODRI: todo salão vê os mesmos candidatos e
// a mesma lista de vagas. O que é individual é só o "novos desde a última vez".

// GET: currículos + vagas + link público + contagem de novos deste salão
export async function GET(req: NextRequest) {
  const salaoId = await salaoIdSe('curriculos')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const doc = await getCurriculosDoc(true)
  const visto = await getVistoEm(salaoId)
  const itens = doc.itens || []
  const novos = itens.filter(c => new Date(c.criado_em).getTime() > visto).length

  const url = new URL(req.url)
  if (url.searchParams.get('count') === '1') return NextResponse.json({ novos })

  const vagas = vagasDoDoc(doc)
  // Domínio oficial fixo (mesmo do link público de lojistas), nunca o preview da Vercel
  return NextResponse.json({
    token: doc.token,
    link: `https://www.nodri.com.br/curriculo/${doc.token}`,
    itens,
    vagas,
    vagasExibir: vagasParaExibir(vagas, itens),
    novos,
  })
}

// POST: marca todos como vistos (zera o badge) — só para este salão
export async function POST() {
  const salaoId = await salaoIdSe('curriculos')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  await marcarVisto(salaoId)
  return NextResponse.json({ ok: true })
}

// PUT: gerencia a lista de vagas (vale para todos os salões)
export async function PUT(req: NextRequest) {
  const salaoId = await salaoIdSe('curriculos')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const b = await req.json().catch(() => ({} as any))
  const acao = String(b?.acao || '')
  const nome = String(b?.nome || '')

  const r = acao === 'criar'    ? await criarVaga(nome)
          : acao === 'renomear' ? await renomearVaga(nome, String(b?.novo || ''))
          : acao === 'excluir'  ? await excluirVaga(nome)
          : null
  if (!r) return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400 })

  const vagas = vagasDoDoc(r.doc)
  return NextResponse.json({ ok: true, vagas, vagasExibir: vagasParaExibir(vagas, r.doc.itens || []), itens: r.doc.itens || [] })
}

// DELETE: remove um currículo por id (?id=...) — some para todos os salões
export async function DELETE(req: NextRequest) {
  const salaoId = await salaoIdSe('curriculos')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id') || ''
  const doc = await getCurriculosDoc(true)
  doc.itens = (doc.itens || []).filter(c => c.id !== id)
  await salvarCurriculosDoc(doc)
  return NextResponse.json({ ok: true })
}
