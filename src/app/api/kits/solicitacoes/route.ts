import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, salaoIdSe } from '@/lib/apiAuth'
import { calcularValor, hojeBRKits, type KitsConfig, type KitsSolicitacao } from '@/lib/kitsShared'

const chaveMes = (mes: string) => `kits_solicitacoes_${mes}` // mes = 'YYYY-MM'

async function lerLista(salaoId: string, mes: string): Promise<KitsSolicitacao[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', chaveMes(mes)).maybeSingle()
  const v = (data as any)?.valor
  return Array.isArray(v) ? v : []
}
async function gravarLista(salaoId: string, mes: string, lista: KitsSolicitacao[]) {
  return supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: chaveMes(mes), valor: lista, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
}
async function lerConfig(salaoId: string): Promise<KitsConfig> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'kits_config').maybeSingle()
  const v = (data as any)?.valor
  return { precoMao: Number(v?.precoMao) || 0, precoPe: Number(v?.precoPe) || 0 }
}

// GET ?mes=YYYY-MM — dono/sub (com permissão) vê todas as solicitações do mês;
// profissional vê só as próprias.
export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const mes = new URL(req.url).searchParams.get('mes') || ''
  if (!/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ error: 'mes inválido (YYYY-MM)' }, { status: 400 })

  if (sess.role === 'profissional') {
    if (!sess.profissionalId) return NextResponse.json({ solicitacoes: [] })
    const lista = await lerLista(sess.salaoId, mes)
    return NextResponse.json({ solicitacoes: lista.filter(s => s.profissionalId === sess.profissionalId) })
  }

  const salaoId = await salaoIdSe('adm_kits')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const lista = await lerLista(salaoId, mes)
  return NextResponse.json({ solicitacoes: lista })
}

// POST — a profissional solicita kits (mão e/ou pé). O valor é calculado no
// servidor a partir do preço configurado — nunca confia em valor vindo do cliente.
export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const permitido = sess.role === 'profissional' || sess.permissoes === null || (sess.permissoes || []).includes('adm_kits')
  if (!permitido) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json()
  const kitsMao = Math.max(0, Math.round(Number(body?.kitsMao) || 0))
  const kitsPe = Math.max(0, Math.round(Number(body?.kitsPe) || 0))
  if (kitsMao === 0 && kitsPe === 0) return NextResponse.json({ error: 'Informe ao menos 1 kit' }, { status: 400 })

  let profissionalId = sess.profissionalId || ''
  let profissionalNome = String(body?.profissionalNome || '').trim()
  if (sess.role === 'profissional') {
    // Sessão da própria profissional: nome vem do cadastro, nunca do corpo da requisição.
    const { data: p } = await supabaseAdmin.from('profissionais').select('apelido, nome_completo').eq('id', profissionalId).maybeSingle()
    profissionalNome = (p as any)?.apelido || (p as any)?.nome_completo || profissionalNome || 'Profissional'
  } else {
    profissionalId = String(body?.profissionalId || '').trim()
    if (!profissionalId || !profissionalNome) return NextResponse.json({ error: 'Informe a profissional' }, { status: 400 })
  }

  const agora = new Date()
  const mes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  const cfg = await lerConfig(sess.salaoId)
  const nova: KitsSolicitacao = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    profissionalId, profissionalNome,
    kitsMao, kitsPe,
    valor: calcularValor(kitsMao, kitsPe, cfg),
    data: hojeBRKits(), em: Date.now(), status: 'pendente',
  }
  const lista = await lerLista(sess.salaoId, mes)
  const { error } = await gravarLista(sess.salaoId, mes, [nova, ...lista])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, solicitacao: nova })
}

// PATCH — dono/sub marca uma solicitação como "separado" e avisa a
// profissional pela Central de Notificações dela.
export async function PATCH(req: NextRequest) {
  const salaoId = await salaoIdSe('adm_kits')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const body = await req.json()
  const id = String(body?.id || '')
  const mes = String(body?.mes || '')
  if (!id || !/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const lista = await lerLista(salaoId, mes)
  const alvo = lista.find(s => s.id === id)
  if (!alvo) return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
  const atualizada = lista.map(s => s.id === id ? { ...s, status: 'separado' as const, dataSeparado: hojeBRKits() } : s)
  const { error } = await gravarLista(salaoId, mes, atualizada)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica a profissional (mesma Central de Notificações da tela dela)
  try {
    const { data: nd } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'notificacoes_prof').maybeSingle()
    const notifs = Array.isArray((nd as any)?.valor) ? (nd as any).valor : []
    const partes = [alvo.kitsMao ? `${alvo.kitsMao} kit(s) de mão` : '', alvo.kitsPe ? `${alvo.kitsPe} kit(s) de pé` : ''].filter(Boolean).join(' + ')
    const texto = `✅ Seus kits estão separados! ${partes} — R$ ${alvo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    const nova = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, texto, alvo: alvo.profissionalId, em: Date.now(), de: 'Salão' }
    await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'notificacoes_prof', valor: [nova, ...notifs].slice(0, 100), atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
  } catch { /* notificação é um plus — não falha a separação por causa dela */ }

  return NextResponse.json({ ok: true })
}

// DELETE ?id=&mes=YYYY-MM — dono/sub remove uma solicitação (ex: pedido em duplicidade ou por engano).
export async function DELETE(req: NextRequest) {
  const salaoId = await salaoIdSe('adm_kits')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const url = new URL(req.url)
  const id = url.searchParams.get('id') || ''
  const mes = url.searchParams.get('mes') || ''
  if (!id || !/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const lista = await lerLista(salaoId, mes)
  const { error } = await gravarLista(salaoId, mes, lista.filter(s => s.id !== id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
