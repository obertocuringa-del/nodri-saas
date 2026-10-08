import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { lerFicha, NOTA_MIN, NOTA_MAX, type TipoAvaliador } from '@/lib/avaliacaoCargoModelo'

export const dynamic = 'force-dynamic'

// ── O lado de fora da avaliação ───────────────────────────────────────────
//
// Quem avalia não precisa ter conta no NODRI: recebe um link e responde.
// Por isso esta rota não pede sessão -- e por isso ela devolve só o que a
// pessoa precisa ver (os pontos a avaliar) e nunca o que já foi respondido
// por outros. Nota de colega é coisa que, vazando, estraga a avaliação.

const TIPOS: TipoAvaliador[] = ['auto', 'gerente', 'equipe']

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const { data: rodada } = await supabaseAdmin
    .from('avaliacao_cargo_rodada')
    .select('id, salao_id, cargo, titulo, avaliado, aberta, ficha')
    .eq('token', params.token).maybeSingle()

  if (!rodada) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

  const { data: salao } = await supabaseAdmin
    .from('saloes').select('nome').eq('id', rodada.salao_id).maybeSingle()

  return NextResponse.json({
    cargo: rodada.cargo,
    titulo: rodada.titulo,
    avaliado: rodada.avaliado,
    aberta: rodada.aberta,
    salao_nome: salao?.nome || '',
    ficha: lerFicha(rodada.ficha, rodada.cargo || ''),
  })
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Envio inválido' }, { status: 400 })

  const { data: rodada } = await supabaseAdmin
    .from('avaliacao_cargo_rodada')
    .select('id, aberta, ficha, cargo')
    .eq('token', params.token).maybeSingle()

  if (!rodada) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  if (!rodada.aberta) return NextResponse.json({ error: 'Esta avaliação já foi encerrada.' }, { status: 409 })

  const tipo = TIPOS.includes(body.tipo) ? (body.tipo as TipoAvaliador) : null
  if (!tipo) return NextResponse.json({ error: 'Diga de onde você está avaliando.' }, { status: 400 })

  // Só entram notas de critérios que existem NESTA rodada, dentro da faixa, e
  // destinados a este tipo de avaliador. O que vier de fora disso é descartado
  // em silêncio: o formulário nunca manda, e o que manda não é o formulário.
  const ficha = lerFicha(rodada.ficha, rodada.cargo || '')
  const validos = new Map(ficha.criterios.map(c => [c.id, c]))

  const notas: Record<string, number> = {}
  for (const [k, v] of Object.entries(body.notas || {})) {
    const c = validos.get(k)
    if (!c || !c.para.includes(tipo)) continue
    const n = Number(v)
    if (!isFinite(n) || n < NOTA_MIN || n > NOTA_MAX) continue
    notas[k] = Math.round(n * 10) / 10
  }
  if (!Object.keys(notas).length) {
    return NextResponse.json({ error: 'Nenhuma nota foi dada.' }, { status: 400 })
  }

  const observacoes: Record<string, string> = {}
  for (const [k, v] of Object.entries(body.observacoes || {})) {
    if (!validos.has(k)) continue
    const t = String(v ?? '').trim().slice(0, 1200)
    if (t) observacoes[k] = t
  }

  const { error } = await supabaseAdmin.from('avaliacao_cargo_resposta').insert({
    rodada_id: rodada.id,
    tipo,
    avaliador: body.avaliador ? String(body.avaliador).trim().slice(0, 120) : null,
    notas,
    observacoes,
    comentario: body.comentario ? String(body.comentario).trim().slice(0, 4000) : null,
  })
  if (error) return NextResponse.json({ error: 'Não deu para registrar.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
