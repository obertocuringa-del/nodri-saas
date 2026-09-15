import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/apiAuth'
import {
  carregarCampanhas, gravarCampanhas, carregarEstados, lerCampanha,
  campanhasPadrao, datasDoSalao, type Campanha,
} from '@/lib/crmCampanhas'
import { carregarConfig as carregarConfirmacao, gravarConfig as gravarConfirmacao, lerConfig as lerConfirmacao, carregarFila } from '@/lib/crmConfirmacao'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── A tela de configuração das automações do Avec ───────────────────────────
//
// Campanhas (feedback / confirmação / aviso ao profissional) e o
// reconhecimento da resposta da cliente. Tudo que o dono pode querer trocar
// mora aqui -- nada de editar código para mudar uma palavra ou um horário.

async function dono() {
  const sess = await getSessao()
  if (!sess) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  if (sess.role !== 'salon') {
    return { erro: NextResponse.json({ error: 'Só o dono do salão configura as automações.' }, { status: 403 }) }
  }
  return { sess }
}

export async function GET() {
  const { sess, erro } = await dono()
  if (erro) return erro

  let campanhas = await carregarCampanhas(sess!.salaoId)
  // Primeira vez: semeia as de fábrica, todas DESLIGADAS.
  if (!campanhas.length) {
    campanhas = campanhasPadrao()
    await gravarCampanhas(sess!.salaoId, campanhas)
  }
  const [estados, confirmacao, fila] = await Promise.all([
    carregarEstados(sess!.salaoId),
    carregarConfirmacao(sess!.salaoId),
    carregarFila(sess!.salaoId),
  ])
  const d = datasDoSalao()
  return NextResponse.json({
    campanhas, estados, confirmacao,
    fila_confirmacao: fila.length,
    hoje: d.hoje.br, amanha: d.amanha.br,
  })
}

export async function POST(req: NextRequest) {
  const { sess, erro } = await dono()
  if (erro) return erro
  const body = await req.json().catch(() => ({}))

  if (body?.confirmacao) {
    const cfg = lerConfirmacao({ ...(await carregarConfirmacao(sess!.salaoId)), ...body.confirmacao })
    await gravarConfirmacao(sess!.salaoId, cfg)
    return NextResponse.json({ ok: true, confirmacao: cfg })
  }

  const lista = Array.isArray(body?.campanhas) ? body.campanhas : null
  if (!lista) return NextResponse.json({ error: 'Nada para salvar' }, { status: 400 })

  const limpas = lista.map(lerCampanha).filter(Boolean) as Campanha[]
  await gravarCampanhas(sess!.salaoId, limpas)
  return NextResponse.json({ ok: true, campanhas: limpas })
}
