import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'

async function nomeDe(salaoId: string, id: string): Promise<string> {
  const { data } = await supabaseAdmin.from('profissionais').select('nome_completo, apelido').eq('salao_id', salaoId).eq('id', id).maybeSingle()
  return (data as any)?.apelido || (data as any)?.nome_completo || 'Profissional'
}

// GET — lista as solicitações. Profissional vê só as que ELE enviou.
export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let q = supabaseAdmin
    .from('pendencias_profissionais')
    .select('*')
    .eq('salao_id', sess.salaoId)
    .eq('origem', 'solicitacao')
    .order('criado_em', { ascending: false })

  if (sess.role === 'profissional') {
    if (!sess.profissionalId) return NextResponse.json({ solicitacoes: [] })
    q = q.eq('solicitante_id', sess.profissionalId)
  }
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ solicitacoes: data || [] })
}

// POST — cria uma solicitação (vira pendência no departamento escolhido).
// Profissional: remetente é ele mesmo. Dono/sub: escolhe o remetente.
export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const departamentoId = String(body?.departamento_id || '').trim()
  const mensagem = String(body?.mensagem || '').trim()
  const prioridade = body?.prioridade === 'urgente' ? 'urgente' : 'normal'
  if (!departamentoId || !mensagem) return NextResponse.json({ error: 'Escolha o departamento e escreva a solicitação' }, { status: 400 })

  // Quem está solicitando
  let solicitanteId = ''
  if (sess.role === 'profissional') {
    solicitanteId = sess.profissionalId || ''
  } else {
    solicitanteId = String(body?.solicitante_id || '').trim()
  }
  if (!solicitanteId) return NextResponse.json({ error: 'Informe quem está solicitando' }, { status: 400 })

  const solicitanteNome = await nomeDe(sess.salaoId, solicitanteId)

  const { data, error } = await supabaseAdmin
    .from('pendencias_profissionais')
    .insert({
      salao_id: sess.salaoId,
      profissional_id: departamentoId,
      mensagem,
      resolvido: false,
      solicitante_id: solicitanteId,
      solicitante_nome: solicitanteNome,
      prioridade,
      origem: 'solicitacao',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, solicitacao: data }, { status: 201 })
}
