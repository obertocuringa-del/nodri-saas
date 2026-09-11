import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, escritaBloqueadaSub } from '@/lib/apiAuth'
import { MINUTOS_DONO, proximaAcaoPadrao, type EstadoConversa } from '@/lib/crm'

export const dynamic = 'force-dynamic'

// ── A fila de trabalho da recepção ──────────────────────────────────────────
//
// Devolve conversa + contato numa consulta só. A tela não pode ficar fazendo
// uma busca por linha da lista: com 200 conversas viram 200 idas ao banco e a
// tela demora segundos para abrir.
//
// PROFISSIONAL NÃO ENTRA. Conversa de cliente é do salão, não da cadeira —
// a mesma regra que já vale no portal, aplicada aqui no servidor e não só na
// tela, porque tela se contorna.

async function bloqueado() {
  const sess = await getSessao()
  if (!sess) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  if (sess.role === 'profissional') {
    return { erro: NextResponse.json({ error: 'O CRM é do salão. Este acesso não inclui conversas de clientes.' }, { status: 403 }) }
  }
  return { sess }
}

export async function GET(req: NextRequest) {
  const { sess, erro } = await bloqueado()
  if (erro) return erro

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado') || ''
  const busca = (searchParams.get('busca') || '').trim().toLowerCase()

  let q = supabaseAdmin
    .from('crm_conversas')
    .select('*, contato:crm_contatos(id, nome, nome_agenda, telefone, telefone_bruto, cliente_nome, etiquetas, lid, observacao)')
    .eq('salao_id', sess!.salaoId)
    .order('ultima_em', { ascending: false, nullsFirst: false })
    .limit(300)

  if (estado) q = q.eq('estado', estado)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let lista = data || []
  if (busca) {
    lista = lista.filter((c: any) => {
      const ct = c.contato || {}
      return [ct.nome, ct.nome_agenda, ct.cliente_nome, ct.telefone, c.assunto, c.ultima_previa]
        .some(v => String(v || '').toLowerCase().includes(busca))
    })
  }

  return NextResponse.json({ conversas: lista })
}

// ── Mudar o estado, assumir, fechar ─────────────────────────────────────────
//
// Toda mudança grava um evento. Sem esse rastro não dá para medir tempo de
// resposta nem saber quem fez o quê — e um CRM que não mede é só uma tela.
export async function PATCH(req: NextRequest) {
  const { sess, erro } = await bloqueado()
  if (erro) return erro
  if (await escritaBloqueadaSub()) {
    return NextResponse.json({ error: 'Este acesso é somente leitura.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || '')
  if (!id) return NextResponse.json({ error: 'Conversa não informada' }, { status: 400 })

  const { data: atual } = await supabaseAdmin
    .from('crm_conversas').select('*').eq('id', id).eq('salao_id', sess!.salaoId).maybeSingle()
  if (!atual) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const quem = (sess as any).nome || 'Salão'
  const patch: any = { atualizado_em: new Date().toISOString() }
  let tipoEvento = 'mudou_estado'

  // Assumir: reserva a conversa por alguns minutos, para duas pessoas não
  // responderem a mesma cliente com informação diferente.
  if (body?.acao === 'assumir') {
    patch.dono_id = (sess as any).usuarioId || null
    patch.dono_nome = quem
    patch.dono_ate = new Date(Date.now() + MINUTOS_DONO * 60000).toISOString()
    patch.nao_lidas = 0
    tipoEvento = 'assumiu'
  }

  // Marcar como nao lida. Parece detalhe e nao e: abrir a conversa para "so
  // dar uma olhada" zera o contador, e o que estava na fila some da vista de
  // quem ia responder depois. Devolver ao estado de nao lida tambem solta a
  // trava de dono -- senao a conversa fica reservada para quem desistiu dela.
  if (body?.acao === 'nao_lida') {
    patch.nao_lidas = Math.max(1, Number(atual.nao_lidas || 0))
    patch.dono_id = null; patch.dono_nome = null; patch.dono_ate = null
    tipoEvento = 'mudou_estado'
  }

  if (body?.acao === 'soltar') {
    patch.dono_id = null; patch.dono_nome = null; patch.dono_ate = null
  }

  if (body?.estado) {
    const novo = String(body.estado) as EstadoConversa
    // Fechar sem motivo é o que transforma "perdemos 40" em informação inútil.
    if (novo === 'sem_conversao' && !String(body?.motivo_perda || '').trim()) {
      return NextResponse.json({ error: 'Informe o motivo para fechar sem conversão.' }, { status: 400 })
    }
    patch.estado = novo
    patch.proxima_acao = String(body?.proxima_acao || '').trim() || proximaAcaoPadrao(novo)
    if (novo === 'sem_conversao') {
      patch.motivo_perda = String(body.motivo_perda).trim()
      patch.fechada_em = new Date().toISOString()
    }
    if (novo === 'agendado') patch.fechada_em = new Date().toISOString()
    // Sair da fila para o relógio: só 'acao_necessaria' conta tempo.
    if (novo !== 'acao_necessaria') patch.aguardando_desde = null
  }

  // De onde a pessoa veio. Guardado na conversa, nao no contato: a mesma
  // cliente pode voltar por um anuncio hoje e por indicacao daqui a um ano, e
  // sao duas oportunidades com origens diferentes.
  if (body?.origem !== undefined) patch.origem = String(body.origem || '').trim() || null
  if (body?.prazo !== undefined) patch.prazo = body.prazo || null
  if (body?.assunto !== undefined) patch.assunto = String(body.assunto || '').trim() || null
  if (body?.proxima_acao !== undefined && !patch.proxima_acao) {
    patch.proxima_acao = String(body.proxima_acao || '').trim() || null
  }
  if (body?.valor_estimado !== undefined) patch.valor_estimado = body.valor_estimado || null

  const { error } = await supabaseAdmin.from('crm_conversas').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('crm_eventos').insert({
    salao_id: sess!.salaoId,
    conversa_id: id,
    tipo: tipoEvento,
    de_estado: atual.estado,
    para_estado: patch.estado || atual.estado,
    autor_id: (sess as any).usuarioId || null,
    autor_nome: quem,
    detalhe: patch.motivo_perda || null,
  })

  return NextResponse.json({ ok: true })
}
