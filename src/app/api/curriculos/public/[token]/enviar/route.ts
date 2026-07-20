import { NextRequest, NextResponse } from 'next/server'
import { getSalaoPorTokenCurriculo, salvarCurriculosDoc, VAGAS, EXPERIENCIAS, ESTADOS_BR, type Curriculo } from '@/lib/curriculos'

// POST público: recebe um currículo e adiciona à lista do salão
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const achado = await getSalaoPorTokenCurriculo(params.token)
  if (!achado) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

  const b = await req.json().catch(() => ({}))
  const nome = String(b.nome || '').trim()
  const estado = String(b.estado || '').trim().toUpperCase()
  const idade = parseInt(String(b.idade || ''), 10)
  const telefone = String(b.telefone || '').trim()
  const vaga = String(b.vaga || '').trim()
  const experiencia = String(b.experiencia || '').trim()

  if (!nome || nome.length < 2) return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 })
  if (!ESTADOS_BR.some(e => e.uf === estado)) return NextResponse.json({ error: 'Selecione um estado válido.' }, { status: 400 })
  if (!idade || idade < 14 || idade > 100) return NextResponse.json({ error: 'Informe uma idade válida.' }, { status: 400 })
  if (telefone.replace(/\D/g, '').length < 10) return NextResponse.json({ error: 'Informe um telefone com DDD válido.' }, { status: 400 })
  if (!(VAGAS as readonly string[]).includes(vaga)) return NextResponse.json({ error: 'Selecione uma vaga.' }, { status: 400 })
  if (!(EXPERIENCIAS as readonly string[]).includes(experiencia)) return NextResponse.json({ error: 'Selecione o tempo de experiência.' }, { status: 400 })

  const novo: Curriculo = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nome, estado, idade, telefone, vaga, experiencia,
    criado_em: new Date().toISOString(),
  }
  const doc = achado.doc
  doc.itens = [...(Array.isArray(doc.itens) ? doc.itens : []), novo]
  await salvarCurriculosDoc(achado.salaoId, doc)

  return NextResponse.json({ ok: true }, { status: 201 })
}
