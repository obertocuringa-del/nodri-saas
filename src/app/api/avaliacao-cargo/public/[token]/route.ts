import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { lerFicha, NOTA_MIN, NOTA_MAX, NOTA_QUE_PEDE_MOTIVO, type TipoAvaliador } from '@/lib/avaliacaoCargoModelo'

export const dynamic = 'force-dynamic'

// ── O lado de fora da avaliação ───────────────────────────────────────────
//
// Quem avalia não precisa ter conta no NODRI: recebe um link e responde.
// Por isso esta rota não pede sessão -- e por isso ela devolve só o que a
// pessoa precisa ver (os pontos a avaliar) e nunca o que já foi respondido
// por outros. Nota de colega é coisa que, vazando, estraga a avaliação.

/**
 * Quem o link diz que esta respondendo.
 *
 * O papel NAO vem do formulario. Cada rodada tem tres links sorteados, um
 * por papel, e e o link usado que diz de onde a resposta vem -- se fosse uma
 * escolha na tela, ou um `?como=` no endereco, bastava trocar a palavra na
 * barra do navegador para o gerente responder em nome da equipe e puxar a
 * media do grupo para onde quisesse.
 */
const COLUNAS: Array<{ col: string; tipo: TipoAvaliador }> = [
  { col: 'token_auto', tipo: 'auto' },
  { col: 'token_gerente', tipo: 'gerente' },
  { col: 'token_equipe', tipo: 'equipe' },
]

async function acharPeloLink(token: string) {
  const { data } = await supabaseAdmin
    .from('avaliacao_cargo_rodada')
    .select('id, salao_id, cargo, titulo, avaliado, aberta, ficha, token_auto, token_gerente, token_equipe')
    .or(COLUNAS.map(c => `${c.col}.eq.${token}`).join(','))
    .maybeSingle()
  if (!data) return null
  const achada = COLUNAS.find(c => (data as any)[c.col] === token)
  if (!achada) return null
  return { rodada: data, tipo: achada.tipo }
}

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const achado = await acharPeloLink(params.token)
  if (!achado) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  const { rodada, tipo } = achado

  // O nome que a pessoa conhece, nao a razao social. A tela publica do cupom
  // ja tinha mostrado "OLIVEIRA E SCHNEIDER INTITUTO DE BELEZA LTDA" para a
  // cliente: o nome de vitrine manda, e `saloes.nome` e o que sobra. A logo
  // mora na chave com prefixo `grid_`, gravada pela rota /api/salon/grid.
  const [{ data: salao }, { data: cfgRow }, { data: logoRow }] = await Promise.all([
    supabaseAdmin.from('saloes').select('nome').eq('id', rodada.salao_id).maybeSingle(),
    supabaseAdmin.from('salao_config').select('valor')
      .eq('salao_id', rodada.salao_id).eq('chave', 'vitrine_config').maybeSingle(),
    supabaseAdmin.from('salao_config').select('valor')
      .eq('salao_id', rodada.salao_id).eq('chave', 'grid_logo_salao').maybeSingle(),
  ])

  return NextResponse.json({
    cargo: rodada.cargo,
    titulo: rodada.titulo,
    avaliado: rodada.avaliado,
    aberta: rodada.aberta,
    // Fixo, vindo do link. A tela mostra de onde a pessoa avalia; nao pergunta.
    tipo,
    salao_nome: String((cfgRow as any)?.valor?.nomePublico || '').trim() || salao?.nome || '',
    salao_logo: (logoRow as any)?.valor?.logo || null,
    ficha: lerFicha(rodada.ficha, rodada.cargo || ''),
  })
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Envio inválido' }, { status: 400 })

  const achado = await acharPeloLink(params.token)
  if (!achado) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  const { rodada, tipo } = achado
  if (!rodada.aberta) return NextResponse.json({ error: 'Esta avaliação já foi encerrada.' }, { status: 409 })

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

  // ── Nota baixa exige exemplo, aqui também ───────────────────────────────
  //
  // A tela já barra, mas tela se contorna. Esta avaliação pode pesar na vida
  // de alguém: um 2 sem uma linha dizendo o que aconteceu não é avaliação, é
  // opinião -- e não deve entrar no banco como se fosse prova.
  const semMotivo = Object.entries(notas)
    .filter(([k, n]) => n <= NOTA_QUE_PEDE_MOTIVO && !observacoes[k])
  if (semMotivo.length) {
    return NextResponse.json({
      error: semMotivo.length === 1
        ? 'Há uma nota baixa sem exemplo. Escreva o que aconteceu naquele ponto.'
        : `Há ${semMotivo.length} notas baixas sem exemplo. Escreva o que aconteceu em cada uma.`,
    }, { status: 400 })
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
