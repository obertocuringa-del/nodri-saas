import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, salaoIdSe } from '@/lib/apiAuth'
import { servicosPorProfissional } from '@/lib/profServicosMatch'
import { hojeBREster, ridEster, type PedidoEster } from '@/lib/esterilizacaoFluxo'

const CHAVE = 'esterilizacao_fluxo'

// Mesmos serviços que usam alicate/pinça (igual ao relatório de esterilização).
const SERVICOS_ALICATE = ['manicure', 'pedicure', 'sobrancelhas', 'pedicure e cuidados especiais dos pes']
const normAli = (s: string) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim()

// Atendimentos do mês (que usam alicate/pinça) de UMA profissional.
async function atendimentosDoMes(salaoId: string, profissionalId: string): Promise<number> {
  const d = new Date()
  try {
    const lista = await servicosPorProfissional(salaoId, d.getFullYear(), d.getMonth() + 1)
    const p = lista.find(x => x.profissionalId === profissionalId)
    if (!p) return 0
    return Object.entries(p.servicos).reduce((tot, [serv, qtd]) => tot + (SERVICOS_ALICATE.includes(normAli(serv)) ? Number(qtd || 0) : 0), 0)
  } catch { return 0 }
}

async function ler(salaoId: string): Promise<PedidoEster[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE).maybeSingle()
  const v = (data as any)?.valor
  return Array.isArray(v) ? v : []
}
async function gravar(salaoId: string, lista: PedidoEster[]) {
  return supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE, valor: lista, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}

// Notifica a profissional na mesma Central de avisos do portal dela.
// `ref` liga o aviso ao pedido — usado para remover ao confirmar.
async function notificar(salaoId: string, profissionalId: string, texto: string, ref?: string) {
  try {
    const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'notificacoes_prof').maybeSingle()
    const notifs = Array.isArray((data as any)?.valor) ? (data as any).valor : []
    const nova = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, texto, alvo: profissionalId, em: Date.now(), de: 'Salão', ref }
    await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'notificacoes_prof', valor: [nova, ...notifs].slice(0, 100), atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  } catch { /* aviso é um plus */ }
}
async function removerNotifsDoPedido(salaoId: string, ref: string) {
  try {
    const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'notificacoes_prof').maybeSingle()
    const notifs = Array.isArray((data as any)?.valor) ? (data as any).valor : []
    const filtradas = notifs.filter((n: any) => n?.ref !== ref)
    if (filtradas.length !== notifs.length)
      await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'notificacoes_prof', valor: filtradas, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  } catch { /* ok */ }
}

// GET — salão vê tudo; profissional vê só os próprios pedidos.
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const lista = await ler(sess.salaoId)
  if (sess.role === 'profissional') {
    const atendimentos = await atendimentosDoMes(sess.salaoId, sess.profissionalId!)
    return NextResponse.json({ pedidos: lista.filter(p => p.profissionalId === sess.profissionalId), atendimentos })
  }
  return NextResponse.json({ pedidos: lista })
}

// POST — cria um pedido.
//  · profissional: ENVIA alicates (informa a quantidade). status 'enviado'.
//  · salão: registro AVULSO (a profissional deixou sem solicitar). status 'recebido',
//    e a profissional recebe o aviso de que não informou a quantidade.
export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'sub') return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const lista = await ler(sess.salaoId)

  if (sess.role === 'profissional') {
    const qtd = Math.max(1, Math.round(Number(body?.qtdEnviada) || 0))
    if (!qtd) return NextResponse.json({ error: 'Informe a quantidade' }, { status: 400 })
    const { data: p } = await supabaseAdmin.from('profissionais').select('apelido, nome_completo').eq('id', sess.profissionalId).maybeSingle()
    const nome = (p as any)?.apelido || (p as any)?.nome_completo || 'Profissional'
    const novo: PedidoEster = {
      id: ridEster(), origem: 'profissional', profissionalId: sess.profissionalId!, profNome: nome,
      qtdEnviada: qtd, dataEnvio: hojeBREster(), status: 'enviado', em: Date.now(),
    }
    const { error } = await gravar(sess.salaoId, [novo, ...lista])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, pedido: novo })
  }

  // Dono (role 'salon') → registro avulso de quem não solicitou.
  const profissionalId = String(body?.profissionalId || '').trim()
  const qtd = Math.max(1, Math.round(Number(body?.qtdRecebida) || 0))
  if (!profissionalId || !qtd) return NextResponse.json({ error: 'Informe a profissional e a quantidade' }, { status: 400 })
  const { data: p } = await supabaseAdmin.from('profissionais').select('apelido, nome_completo').eq('id', profissionalId).maybeSingle()
  const nome = (p as any)?.apelido || (p as any)?.nome_completo || 'Profissional'
  const novo: PedidoEster = {
    id: ridEster(), origem: 'salao', profissionalId, profNome: nome,
    qtdRecebida: qtd, obsRecebimento: String(body?.obsRecebimento || '').trim() || undefined,
    dataRecebimento: hojeBREster(), status: 'recebido', em: Date.now(),
  }
  const { error } = await gravar(sess.salaoId, [novo, ...lista])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await notificar(sess.salaoId, profissionalId,
    `⚠️ ${nome}, você deixou ${qtd} alicate(s) para esterilizar, mas NÃO solicitou pelo sistema. Como a quantidade não foi informada por você, o salão não se responsabiliza pela quantidade recebida.`,
    novo.id)
  return NextResponse.json({ ok: true, pedido: novo })
}

// PATCH — ações sobre um pedido.
//  · salão: 'receber' (confere qtd + observação) | 'entregar' (marca esterilizado)
//  · profissional: 'confirmar' (confirma o recebimento — o aviso some)
export async function PATCH(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const id = String(body?.id || '')
  const acao = String(body?.acao || '')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const lista = await ler(sess.salaoId)
  const i = lista.findIndex(p => p.id === id)
  if (i < 0) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  const p = lista[i]

  if (acao === 'confirmar') {
    // Só a própria profissional confirma o recebimento dela.
    if (sess.role !== 'profissional' || sess.profissionalId !== p.profissionalId)
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    lista[i] = { ...p, status: 'concluido', confirmadoEm: Date.now() }
    const { error } = await gravar(sess.salaoId, lista)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await removerNotifsDoPedido(sess.salaoId, id)
    return NextResponse.json({ ok: true })
  }

  // 'receber' e 'entregar' são do lado do salão: dono OU sub-usuário com a
  // área de Esterilização liberada. Profissional nunca passa daqui.
  if (sess.role === 'profissional' || !(await salaoIdSe('adm_esterilizacao'))) {
    return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  }

  if (acao === 'receber') {
    const qtd = Math.max(0, Math.round(Number(body?.qtdRecebida) || 0))
    const obs = String(body?.obsRecebimento || '').trim()
    lista[i] = { ...p, status: 'recebido', qtdRecebida: qtd, obsRecebimento: obs || undefined, dataRecebimento: hojeBREster() }
    const { error } = await gravar(sess.salaoId, lista)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Avisa a profissional quando a quantidade DIVERGE do que ela informou
    // e/ou quando o salão escreve uma observação.
    const divergiu = typeof p.qtdEnviada === 'number' && qtd !== p.qtdEnviada
    if (divergiu || obs) {
      const base = divergiu
        ? `📋 Atenção: você informou ${p.qtdEnviada} alicate(s), mas o salão recebeu ${qtd}.`
        : `📋 Sobre seus alicates (${qtd} recebido(s)).`
      await notificar(sess.salaoId, p.profissionalId, obs ? `${base} Observação do salão: ${obs}` : base, id)
    }
    return NextResponse.json({ ok: true })
  }

  if (acao === 'entregar') {
    const qtd = Math.max(0, Math.round(Number(body?.qtdEntregue) || 0)) || (p.qtdRecebida || 0)
    lista[i] = { ...p, status: 'entregue', qtdEntregue: qtd, dataEntrega: hojeBREster() }
    const { error } = await gravar(sess.salaoId, lista)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await notificar(sess.salaoId, p.profissionalId, `✅ Entregue ${qtd} alicate(s) esterilizado(s). Você confirma o recebimento?`, id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}

// DELETE — o salão remove um pedido (limpeza).
export async function DELETE(req: NextRequest) {
  const sess = await getSessao()
  if (!sess || sess.role === 'profissional' || !(await salaoIdSe('adm_esterilizacao'))) {
    return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  }
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const lista = await ler(sess.salaoId)
  const { error } = await gravar(sess.salaoId, lista.filter(p => p.id !== id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await removerNotifsDoPedido(sess.salaoId, id)
  return NextResponse.json({ ok: true })
}
