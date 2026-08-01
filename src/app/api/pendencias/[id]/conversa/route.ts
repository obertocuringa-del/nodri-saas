import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'

// ── Conversa da pendência ───────────────────────────────────────────────────
// Antes a pendência era de mão única: quem recebia só podia "concluir com
// resposta". Não existia o meio do caminho — "recebi, mas falta X" ou "só
// consigo dia 10". Agora cada pendência tem uma CONVERSA (mensagens com autor
// e data) e uma SITUAÇÃO, que diz de quem é a bola.
//
// Escrevem só os dois lados: quem PEDIU (profissional, pelo portal) e o lado
// que RECEBEU (o salão/setor). Ninguém de fora entra na conversa.

export const SITUACOES = ['aberta', 'andamento', 'aguardando', 'agendada', 'resolvida', 'recusada'] as const

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const texto = String(body?.texto || '').trim()
  const situacao = String(body?.situacao || '').trim()
  const prazo = String(body?.prazo || '').trim()   // 'YYYY-MM-DD', só faz sentido em 'agendada'
  if (!texto && !situacao) return NextResponse.json({ error: 'Escreva uma mensagem ou escolha a situação.' }, { status: 400 })
  if (situacao && !(SITUACOES as readonly string[]).includes(situacao)) {
    return NextResponse.json({ error: 'Situação inválida' }, { status: 400 })
  }

  const { data: pend } = await supabaseAdmin
    .from('pendencias_profissionais').select('*')
    .eq('id', params.id).eq('salao_id', sess.salaoId).maybeSingle()
  if (!pend) return NextResponse.json({ error: 'Pendência não encontrada' }, { status: 404 })

  // Quem pode falar: o solicitante (a própria profissional) ou o lado do salão.
  const ehSolicitante = sess.role === 'profissional' && !!sess.profissionalId && (pend as any).solicitante_id === sess.profissionalId
  const ehDonoDaDemanda = sess.role === 'profissional' && !!sess.profissionalId && (pend as any).profissional_id === sess.profissionalId
  if (sess.role === 'profissional' && !ehSolicitante && !ehDonoDaDemanda) {
    return NextResponse.json({ error: 'Esta conversa não é sua.' }, { status: 403 })
  }

  // Nome de quem está escrevendo
  let autor = 'Salão'
  if (sess.role === 'profissional' && sess.profissionalId) {
    const { data: p } = await supabaseAdmin.from('profissionais').select('nome_completo, apelido').eq('id', sess.profissionalId).maybeSingle()
    autor = (p as any)?.apelido || (p as any)?.nome_completo || 'Profissional'
  }
  const ladoSolicitante = ehSolicitante && !ehDonoDaDemanda

  const anterior = Array.isArray((pend as any).conversa) ? (pend as any).conversa : []
  const msg = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    em: Date.now(),
    autor,
    lado: ladoSolicitante ? 'solicitante' : 'setor',
    texto,
    situacao: situacao || null,
    prazo: situacao === 'agendada' ? (prazo || null) : null,
  }

  const updates: Record<string, any> = { conversa: [...anterior, msg] }
  if (situacao) {
    updates.situacao = situacao
    updates.prazo = situacao === 'agendada' ? (prazo || null) : null
    // Resolvida/recusada encerram a pendência; qualquer outra situação reabre
    if (situacao === 'resolvida' || situacao === 'recusada') {
      updates.resolvido = true
      updates.resolvido_em = new Date().toISOString()
    } else {
      updates.resolvido = false
      updates.resolvido_em = null
    }
  }

  const { data: atualizada, error } = await supabaseAdmin
    .from('pendencias_profissionais')
    .update(updates).eq('id', params.id).eq('salao_id', sess.salaoId)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Avisa o outro lado. Se quem falou foi o setor, o aviso vai pra profissional
  // que pediu; se foi ela, o setor vê na própria tela (não tem portal pra notificar).
  const alvo = (pend as any).solicitante_id
  if (!ladoSolicitante && alvo) {
    try {
      const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', sess.salaoId).eq('chave', 'notificacoes_prof').maybeSingle()
      const lista = Array.isArray((data as any)?.valor) ? (data as any).valor : []
      const resumo = texto ? `: ${texto.slice(0, 90)}` : ''
      const nova = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        texto: `💬 Resposta na sua solicitação${resumo}`,
        alvo, em: Date.now(), de: 'Departamentos',
      }
      await supabaseAdmin.from('salao_config').upsert(
        { salao_id: sess.salaoId, chave: 'notificacoes_prof', valor: [nova, ...lista].slice(0, 100), atualizado_em: new Date().toISOString() },
        { onConflict: 'salao_id,chave' },
      )
    } catch { /* notificação é acessório: não derruba a conversa */ }
  }

  return NextResponse.json(atualizada)
}
