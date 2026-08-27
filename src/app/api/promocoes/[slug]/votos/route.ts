import { NextRequest, NextResponse } from 'next/server'
import { getSalaoPorToken, getVotos, salvarVotos } from '@/lib/vitrineConfig'

export const dynamic = 'force-dynamic'

// Enquete de promoção: o cliente marca os serviços que gostaria de ver em
// promoção e pode escrever um que não achou na lista.
//
// A trava de "um voto por aparelho" mora no navegador do cliente, não aqui.
// É trava de conveniência, não de segurança: quem quiser burlar, burla. O
// ranking serve para o salão sentir a preferência da clientela — não para
// decidir nada sozinho.

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const salao = await getSalaoPorToken(params.slug)
  if (!salao) return NextResponse.json({ error: 'Link indisponível' }, { status: 404 })

  const votos = await getVotos(salao.salaoId)
  const ranking = Object.entries(votos.servicos)
    .map(([nome, n]) => ({ nome, votos: Number(n) || 0 }))
    .sort((a, b) => b.votos - a.votos)

  return NextResponse.json({ ranking, total: ranking.reduce((s, r) => s + r.votos, 0) })
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const salao = await getSalaoPorToken(params.slug)
  if (!salao) return NextResponse.json({ error: 'Link indisponível' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const escolhidos: string[] = Array.isArray(body?.servicos) ? body.servicos : []
  const livre = String(body?.livre || '').trim()

  if (!escolhidos.length && !livre) {
    return NextResponse.json({ error: 'Escolha ao menos um serviço ou escreva sua sugestão.' }, { status: 400 })
  }

  const votos = await getVotos(salao.salaoId)

  // Limite por envio: sem ele, uma requisição forjada com mil itens engordaria
  // o ranking e o registro de configuração do salão de uma vez só.
  for (const nome of escolhidos.slice(0, 30)) {
    const chave = String(nome).trim().slice(0, 120)
    if (!chave) continue
    votos.servicos[chave] = (votos.servicos[chave] || 0) + 1
  }

  if (livre) {
    votos.livres.unshift({ texto: livre.slice(0, 300), em: Date.now() })
    votos.livres = votos.livres.slice(0, 300)
  }

  await salvarVotos(salao.salaoId, votos)

  const ranking = Object.entries(votos.servicos)
    .map(([nome, n]) => ({ nome, votos: Number(n) || 0 }))
    .sort((a, b) => b.votos - a.votos)

  return NextResponse.json({ ok: true, ranking })
}
