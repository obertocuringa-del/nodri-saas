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
  const ehEmprestimo = body?.tipo === 'emprestimo'

  // Quem está solicitando
  let solicitanteId = ''
  if (sess.role === 'profissional') {
    solicitanteId = sess.profissionalId || ''
  } else {
    solicitanteId = String(body?.solicitante_id || '').trim()
  }
  if (!solicitanteId) return NextResponse.json({ error: 'Informe quem está solicitando' }, { status: 400 })
  if (!departamentoId) return NextResponse.json({ error: 'Escolha o departamento' }, { status: 400 })

  // Monta a solicitação (comum) ou o pedido de empréstimo (urgente, com valor + motivo obrigatório)
  let mensagem = String(body?.mensagem || '').trim()
  let prioridade = body?.prioridade === 'urgente' ? 'urgente' : 'normal'
  let tipo: string | null = null
  let emprestimo: any = null

  if (ehEmprestimo) {
    const valor = Number(body?.valor) || 0
    const motivo = String(body?.motivo || '').trim()
    if (valor <= 0) return NextResponse.json({ error: 'Informe o valor do empréstimo' }, { status: 400 })
    if (!motivo) return NextResponse.json({ error: 'A observação (motivo) é obrigatória' }, { status: 400 })
    tipo = 'emprestimo'
    prioridade = 'urgente'
    emprestimo = { valor, motivo, status: 'pendente' }
    mensagem = `Pedido de empréstimo: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — Motivo: ${motivo}`
  } else {
    if (!mensagem) return NextResponse.json({ error: 'Escreva a solicitação' }, { status: 400 })
  }

  const solicitanteNome = await nomeDe(sess.salaoId, solicitanteId)

  // Só inclui tipo/emprestimo quando for empréstimo — assim uma solicitação
  // normal continua funcionando mesmo se as colunas novas ainda não existirem.
  const registro: Record<string, any> = {
    salao_id: sess.salaoId,
    profissional_id: departamentoId,
    mensagem,
    resolvido: false,
    solicitante_id: solicitanteId,
    solicitante_nome: solicitanteNome,
    prioridade,
    origem: 'solicitacao',
  }
  if (ehEmprestimo) { registro.tipo = tipo; registro.emprestimo = emprestimo }

  const { data, error } = await supabaseAdmin
    .from('pendencias_profissionais')
    .insert(registro)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, solicitacao: data }, { status: 201 })
}
