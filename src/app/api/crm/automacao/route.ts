import { NextRequest, NextResponse } from 'next/server'
import { getSessao, crmBloqueado } from '@/lib/apiAuth'
import {
  carregarConfig, gravarConfig, carregarEstado, lerConfig, gerarChave, hojeNoFuso,
} from '@/lib/crmAutomacao'

export const dynamic = 'force-dynamic'

// ── Automação de feedback: o que a tela de configuração lê e grava ──────────
//
// Ligar/desligar, intervalo, endereços do Avec, as duas mensagens e a chave
// que a extensão usa. A senha do Avec não passa por aqui de propósito: fica
// na extensão, no computador do salão.

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'profissional' || await crmBloqueado()) {
    return NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 })
  }
  const [cfg, est] = await Promise.all([carregarConfig(sess.salaoId), carregarEstado(sess.salaoId)])
  const hoje = hojeNoFuso(cfg.fuso)
  return NextResponse.json({
    config: cfg,
    estado: { visto_em: est.visto_em, ultimo: est.ultimo, enviados_hoje: (est.enviados[hoje.iso] || []).length },
    hoje: hoje.br,
    dono: sess.role === 'salon',
  })
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  // Mandar mensagem sozinho é decisão do dono, não da recepção.
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Só o dono do salão liga ou muda a automação.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const atual = await carregarConfig(sess.salaoId)

  if (body?.acao === 'nova_chave') {
    const cfg = { ...atual, chave: gerarChave() }
    await gravarConfig(sess.salaoId, cfg)
    return NextResponse.json({ ok: true, config: cfg })
  }

  const cfg = lerConfig({ ...atual, ...(body?.config || {}) })
  // A chave só nasce aqui e só muda por "nova_chave": a tela nunca a reescreve.
  cfg.chave = atual.chave || gerarChave()
  await gravarConfig(sess.salaoId, cfg)
  return NextResponse.json({ ok: true, config: cfg })
}
