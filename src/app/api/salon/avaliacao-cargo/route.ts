import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { salaoIdSe, getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'
import { lerFicha, novoToken, type RespostaAval } from '@/lib/avaliacaoCargoModelo'

export const dynamic = 'force-dynamic'

// ── Avaliação 360 do cargo: o lado de dentro ───────────────────────────────
//
// A FICHA (quais pontos se avalia) mora em salao_config, pela rota /grid.
// Aqui ficam as RODADAS -- cada vez que se abre uma avaliação -- e o que
// voltou pelo link público.
//
// A ficha é copiada para dentro da rodada no momento da abertura. Sem isso,
// apagar um critério meses depois apagaria junto as notas que já tinham sido
// dadas nele, e a média do semestre passado mudaria sozinha.

const PERM = 'profissionais'

/** Rodadas de um setor, com as respostas. */
export async function GET(req: NextRequest) {
  const setorId = new URL(req.url).searchParams.get('setor') || ''
  if (!setorId) return NextResponse.json({ error: 'Falta o setor' }, { status: 400 })
  const salaoId = await salaoIdSe(PERM)
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const { data: rodadas } = await supabaseAdmin
    .from('avaliacao_cargo_rodada')
    .select('id, cargo, titulo, avaliado, token_auto, token_gerente, token_equipe, aberta, ficha, criado_em')
    .eq('salao_id', salaoId).eq('setor_id', setorId)
    .order('criado_em', { ascending: false })

  const ids = (rodadas || []).map(r => r.id)
  let respostas: any[] = []
  if (ids.length) {
    const { data } = await supabaseAdmin
      .from('avaliacao_cargo_resposta')
      .select('id, rodada_id, tipo, avaliador, notas, observacoes, comentario, criado_em')
      .in('rodada_id', ids)
      .order('criado_em', { ascending: true })
    respostas = data || []
  }

  return NextResponse.json({
    rodadas: (rodadas || []).map(r => ({
      ...r,
      ficha: lerFicha(r.ficha, r.cargo || ''),
      respostas: respostas.filter(x => x.rodada_id === r.id) as RespostaAval[],
    })),
  })
}

/** Abre uma rodada: congela a ficha e gera o link público. */
export async function POST(req: NextRequest) {
  const { setorId, cargo, titulo, avaliado, ficha } = await req.json()
  if (!setorId) return NextResponse.json({ error: 'Falta o setor' }, { status: 400 })
  const salaoId = await salaoIdSe(PERM)
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const sess = await getSessao()
  if (sess?.role === 'profissional') return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const limpa = lerFicha(ficha, cargo || '')
  if (!limpa.criterios.length) {
    return NextResponse.json({ error: 'A ficha está sem nenhum ponto para avaliar.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('avaliacao_cargo_rodada').insert({
    salao_id: salaoId,
    setor_id: setorId,
    cargo: String(cargo || '').slice(0, 120),
    titulo: String(titulo || '').slice(0, 160),
    avaliado: avaliado ? String(avaliado).slice(0, 120) : null,
    // Um link por papel, sorteados em separado: saber o link do gerente nao
    // pode ensinar o link da equipe.
    token: novoToken(),
    token_auto: novoToken(),
    token_gerente: novoToken(),
    token_equipe: novoToken(),
    ficha: limpa,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Abriu', 'Avaliação de cargo', `${cargo || setorId} — ${titulo || ''}`)
  return NextResponse.json({ ok: true, id: data.id })
}

/** Fecha ou reabre uma rodada. Fechada, o link público deixa de aceitar. */
export async function PATCH(req: NextRequest) {
  const { id, aberta } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta a rodada' }, { status: 400 })
  const salaoId = await salaoIdSe(PERM)
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const sess = await getSessao()
  if (sess?.role === 'profissional') return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const { error } = await supabaseAdmin.from('avaliacao_cargo_rodada')
    .update({ aberta: !!aberta }).eq('id', id).eq('salao_id', salaoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** Apaga a rodada inteira, com as respostas (o CASCADE do banco cuida). */
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'Falta a rodada' }, { status: 400 })
  const salaoId = await salaoIdSe(PERM)
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const sess = await getSessao()
  if (sess?.role !== 'salon') return NextResponse.json({ error: 'Só o dono apaga uma avaliação' }, { status: 403 })

  const { error } = await supabaseAdmin.from('avaliacao_cargo_rodada')
    .delete().eq('id', id).eq('salao_id', salaoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Excluiu', 'Avaliação de cargo', id)
  return NextResponse.json({ ok: true })
}
