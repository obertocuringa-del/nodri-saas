import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getSessao, sessaoModoCaixa } from '@/lib/apiAuth'

// Nome de um profissional/departamento pelo id (para textos de notificação)
async function nomeDe(salaoId: string, id: string | null): Promise<string> {
  if (!id) return 'Salão'
  const { data } = await supabaseAdmin.from('profissionais').select('nome_completo, apelido').eq('salao_id', salaoId).eq('id', id).maybeSingle()
  return (data as any)?.apelido || (data as any)?.nome_completo || 'Salão'
}

// Envia notificação para o solicitante (mesmo mecanismo dos kits: salao_config['notificacoes_prof'])
async function notificarSolicitante(salaoId: string, alvo: string, texto: string) {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'notificacoes_prof').maybeSingle()
  const lista = Array.isArray((data as any)?.valor) ? (data as any).valor : []
  const nova = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, texto, alvo, em: Date.now(), de: 'Departamentos' }
  const atualizada = [nova, ...lista].slice(0, 100)
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'notificacoes_prof', valor: atualizada, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const ehTransferencia = body.profissional_id !== undefined

    // Sub-usuário: comum não altera nada; Modo Caixa só pode RESOLVER (executar), nunca transferir
    const sess = await getSessao()
    if (sess?.role === 'sub' || sess?.role === 'profissional') {
      const soResolver = sessaoModoCaixa(sess) && body.resolvido === true && body.mensagem === undefined && body.data_limite === undefined && !ehTransferencia
      if (!soResolver) return NextResponse.json({ error: 'Modo Caixa: você pode marcar como resolvida, mas não editar, transferir ou excluir.' }, { status: 403 })
    }

    // Estado atual (para saber o solicitante e registrar histórico de transferência)
    const { data: atual } = await supabaseAdmin
      .from('pendencias_profissionais')
      .select('*')
      .eq('id', params.id).eq('salao_id', salaoId).maybeSingle()
    if (!atual) return NextResponse.json({ error: 'Pendência não encontrada' }, { status: 404 })

    const updates: Record<string, any> = {}

    if (body.resolvido === true) {
      updates.resolvido = true
      updates.resolvido_em = new Date().toISOString()
    } else if (body.resolvido === false) {
      updates.resolvido = false
      updates.resolvido_em = null
    }
    if (body.mensagem !== undefined) updates.mensagem = body.mensagem
    if (body.data_limite !== undefined) updates.data_limite = body.data_limite
    if (body.resposta !== undefined) updates.resposta = body.resposta
    if (body.prioridade !== undefined) updates.prioridade = body.prioridade

    // Transferência de setor/profissional — só dono/usuário completo (guard acima já barra sub/prof)
    if (ehTransferencia && body.profissional_id && body.profissional_id !== (atual as any).profissional_id) {
      const deNome = await nomeDe(salaoId, (atual as any).profissional_id)
      const paraNome = await nomeDe(salaoId, body.profissional_id)
      updates.profissional_id = body.profissional_id
      const hist = Array.isArray((atual as any).historico) ? (atual as any).historico : []
      updates.historico = [...hist, { tipo: 'transferencia', de: deNome, para: paraNome, em: new Date().toISOString(), por: (sess as any)?.nome || 'Salão' }]
    }

    const { data, error } = await supabaseAdmin
      .from('pendencias_profissionais')
      .update(updates)
      .eq('id', params.id)
      .eq('salao_id', salaoId)
      .select('*')
      .single()

    if (error) throw error

    // Notifica o solicitante quando a demanda é resolvida ou respondida
    const solicitante = (atual as any).solicitante_id as string | null
    if (solicitante) {
      const setor = await nomeDe(salaoId, (data as any).profissional_id)
      const resp = (typeof body.resposta === 'string' && body.resposta.trim()) ? ` — "${body.resposta.trim()}"` : ''
      if (body.resolvido === true && !(atual as any).resolvido) {
        await notificarSolicitante(salaoId, solicitante, `✅ Sua solicitação para ${setor} foi RESOLVIDA${resp}`)
      } else if (body.resposta !== undefined && body.resolvido !== true && (body.resposta || '').trim()) {
        await notificarSolicitante(salaoId, solicitante, `💬 ${setor} respondeu sua solicitação${resp}`)
      }
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Excluir é só para o dono/usuários completos — sub e profissional nunca
    const sess = await getSessao()
    if (sess?.role === 'sub' || sess?.role === 'profissional') return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('pendencias_profissionais')
      .delete()
      .eq('id', params.id)
      .eq('salao_id', salaoId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
