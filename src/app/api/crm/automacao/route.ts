import { NextRequest, NextResponse } from 'next/server'
import { getSessao, crmBloqueado } from '@/lib/apiAuth'
import {
  carregarConfig, gravarConfig, carregarEstado, lerConfig, gerarChave, hojeNoFuso,
  pedirLimpezaDeAbas, limpezaPendente,
} from '@/lib/crmAutomacao'
import { carregarRobo, gravarRobo, cifrar, roboParaTela } from '@/lib/crmRoboAvec'

export const dynamic = 'force-dynamic'

// ── Automação de feedback: o que a tela de configuração lê e grava ──────────
//
// Ligar/desligar, intervalo, endereços do Avec, as duas mensagens e a chave
// que a extensão usa. A senha do Avec só passa por aqui para o robô do
// servidor (acao 'robo'), e é gravada cifrada -- ver lib/crmRoboAvec.ts.

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'profissional' || await crmBloqueado()) {
    return NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 })
  }
  const [cfg, est, limpar, robo] = await Promise.all([
    carregarConfig(sess.salaoId), carregarEstado(sess.salaoId), limpezaPendente(sess.salaoId),
    carregarRobo(sess.salaoId),
  ])
  const hoje = hojeNoFuso(cfg.fuso)
  return NextResponse.json({
    config: cfg,
    estado: {
      visto_em: est.visto_em, ultimo: est.ultimo, enviados_hoje: (est.enviados[hoje.iso] || []).length,
      abas_avec: est.abas_avec ?? null, versao_ext: est.versao_ext || null,
      limpar_pedido_em: limpar,
      origem: est.origem || null,
    },
    robo: roboParaTela(robo),
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

  if (body?.acao === 'limpar_abas') {
    await pedirLimpezaDeAbas(sess.salaoId)
    return NextResponse.json({ ok: true })
  }

  // Robô do servidor: login do Avec e a chave da virada. A senha chega aqui
  // uma vez, é cifrada e nunca mais volta para a tela (em branco = mantém).
  if (body?.acao === 'robo') {
    const robo = await carregarRobo(sess.salaoId)
    if (typeof body.email === 'string') robo.email = body.email.trim()
    if (typeof body.senha === 'string' && body.senha) robo.senha_cifra = cifrar(body.senha)
    if (typeof body.no_servidor === 'boolean') {
      if (body.no_servidor && (!robo.email || !robo.senha_cifra)) {
        return NextResponse.json({ error: 'Salve o e-mail e a senha de acesso antes de ligar a nuvem.' }, { status: 400 })
      }
      robo.no_servidor = body.no_servidor
    }
    await gravarRobo(sess.salaoId, robo)
    return NextResponse.json({ ok: true, robo: roboParaTela(robo) })
  }

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
