import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'
import { normalizarTelefone } from '@/lib/crm'
import {
  getCfg, salvarCfg, CFG_PADRAO, campanhaVencida, hojeISO,
  acharCupomPorCodigo, acharCupomPorTelefone, conferirUso, registrarUso,
  saldoDoCupom, gastarCredito, sincronizar,
} from '@/lib/cuponsIndicacao'

export const dynamic = 'force-dynamic'

// ── Balcão: validar cupom e controlar o crédito ─────────────────────────────
//
// Fica atrás de login porque validar é ato de caixa. Na página pública,
// qualquer cliente validaria o próprio cupom no celular dela.
//
// O profissional não entra: ele vê a vitrine como qualquer um, mas quem dá
// desconto é a recepção.

async function sessaoDeCaixa() {
  const s = await getSessao()
  if (!s) return null
  if (s.role === 'profissional') return null
  return s
}

/** Tudo que a tela do cupom mostra: dono, saldo e quem já usou. */
async function painel(salaoId: string, cupomId: string) {
  const saldo = await saldoDoCupom(salaoId, cupomId)
  const { data: usos } = await supabaseAdmin
    .from('cupom_indicacao_usos')
    .select('indicada_nome, indicada_telefone, situacao, validado_em, atendida_em')
    .eq('salao_id', salaoId).eq('cupom_id', cupomId)
    .order('validado_em', { ascending: false }).limit(200)
  const { data: creditos } = await supabaseAdmin
    .from('cupom_indicacao_creditos').select('usado_em, origem')
    .eq('salao_id', salaoId).eq('cupom_id', cupomId)
    .order('usado_em', { ascending: false }).limit(200)
  return { saldo, usos: usos || [], creditos: creditos || [] }
}

export async function GET(req: NextRequest) {
  const sess = await sessaoDeCaixa()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const acao = url.searchParams.get('acao') || 'buscar'

  if (acao === 'cfg') {
    return NextResponse.json({ cfg: await getCfg(sess.salaoId) })
  }

  // Cruzar com o que o Avec já trouxe ANTES de responder. É o que faz a tela
  // mostrar "já usou em tal dia" mesmo quando a recepção esqueceu de marcar —
  // o pedido explícito do dono. Roda aqui, e não só no cron, porque cron que
  // não roda já custou caro neste sistema.
  await sincronizar(sess.salaoId).catch(() => null)

  const codigo = String(url.searchParams.get('codigo') || '').trim()
  const telefone = String(url.searchParams.get('telefone') || '').trim()

  const cupom = codigo
    ? await acharCupomPorCodigo(sess.salaoId, codigo)
    : telefone ? await acharCupomPorTelefone(sess.salaoId, telefone) : null

  if (!cupom) {
    return NextResponse.json({ achou: false, erro: codigo ? 'Cupom não encontrado.' : 'Esta cliente não tem cupom.' })
  }

  const cfg = await getCfg(sess.salaoId)
  return NextResponse.json({
    achou: true,
    cupom: { id: cupom.id, codigo: cupom.codigo, nome: cupom.dono_nome, telefone: cupom.dono_telefone },
    vencida: campanhaVencida(cfg),
    validoAte: cfg.validoAte,
    percentual: cfg.percentual,
    ...(await painel(sess.salaoId, cupom.id)),
  })
}

export async function POST(req: NextRequest) {
  const sess = await sessaoDeCaixa()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const acao = String(body?.acao || '')

  // ── Conferir antes de gravar ──
  //
  // A tela chama isto enquanto a recepção digita, para o "pode" ou "não pode"
  // aparecer antes do clique. Não grava nada.
  if (acao === 'conferir') {
    const cupom = await acharCupomPorCodigo(sess.salaoId, body?.codigo)
    if (!cupom) return NextResponse.json({ ok: false, motivo: 'Cupom não encontrado.' })
    const r = await conferirUso(sess.salaoId, cupom, normalizarTelefone(body?.telefone))
    return NextResponse.json(r)
  }

  // ── Validar: a indicada apresentou o cupom no balcão ──
  if (acao === 'validar') {
    const cfg = await getCfg(sess.salaoId)
    if (campanhaVencida(cfg)) {
      return NextResponse.json({ ok: false, motivo: `A campanha encerrou em ${cfg.validoAte}.` })
    }
    const cupom = await acharCupomPorCodigo(sess.salaoId, body?.codigo)
    if (!cupom) return NextResponse.json({ ok: false, motivo: 'Cupom não encontrado.' })

    const nome = String(body?.nome || '').trim()
    const telefone = normalizarTelefone(body?.telefone)
    if (nome.length < 3) return NextResponse.json({ ok: false, motivo: 'Digite o nome completo da cliente.' })
    if (telefone.length < 12) return NextResponse.json({ ok: false, motivo: 'Digite o celular da cliente, com DDD.' })

    const r = await registrarUso(sess.salaoId, cupom, nome, telefone, (sess as any).nome || 'Recepção')
    if (r.ok) {
      registrarAuditoria('Validou', 'Cupom de indicação', `${cupom.codigo} para ${nome}`)
    }
    return NextResponse.json({
      ...r,
      dono: cupom.dono_nome,
      ...(r.ok ? await painel(sess.salaoId, cupom.id) : {}),
    })
  }

  // ── A dona usou o desconto dela hoje ──
  if (acao === 'gastar') {
    const cupom = await acharCupomPorCodigo(sess.salaoId, body?.codigo)
      || await acharCupomPorTelefone(sess.salaoId, body?.telefone)
    if (!cupom) return NextResponse.json({ ok: false, motivo: 'Cupom não encontrado.' })
    const r = await gastarCredito(sess.salaoId, cupom.id)
    if (r.ok) {
      registrarAuditoria('Usou crédito', 'Cupom de indicação', `${cupom.codigo} em ${hojeISO()}`)
    }
    return NextResponse.json({ ...r, ...(await painel(sess.salaoId, cupom.id)) })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}

// ── Configuração: só o dono ──
export async function PUT(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const validoAte = String(body?.validoAte || '').slice(0, 10)
  const cfg = {
    ...CFG_PADRAO,
    ativo: body?.ativo === true,
    validoAte: /^\d{4}-\d{2}-\d{2}$/.test(validoAte) ? validoAte : null,
    percentual: Math.min(100, Math.max(1, Number(body?.percentual) || 10)),
  }
  const { error } = await salvarCfg(sess.salaoId, cfg)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Editou', 'Cupom de indicação', cfg.ativo ? `ligado até ${cfg.validoAte || 'sem prazo'}` : 'desligado')
  return NextResponse.json({ ok: true, cfg })
}
