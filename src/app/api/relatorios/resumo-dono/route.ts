import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/apiAuth'
import {
  ITENS_RESUMO, lerConfig, carregarConfig, gravarConfig, carregarEstado, montarResumo, enviarResumo,
} from '@/lib/resumoDono'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// "Notificar donos" (Relatórios). Só o DONO: o resumo traz faturamento e meta,
// e o sub-usuário (recepção) não pode nem ver a configuração, nem a prévia.
// A máquina que manda mora em src/lib/resumoDono.ts e roda pelo cron do
// servidor, junto com o Envio automático.

async function dono() {
  const s = await getSessao()
  if (!s || s.role === 'sub' || s.role === 'profissional') return null
  return s
}

export async function GET() {
  const s = await dono()
  if (!s) return NextResponse.json({ error: 'Somente o dono acessa isto.' }, { status: 403 })
  const [config, estado] = await Promise.all([carregarConfig(s.salaoId), carregarEstado(s.salaoId)])
  return NextResponse.json({ config, estado, itens: ITENS_RESUMO })
}

export async function POST(req: NextRequest) {
  const s = await dono()
  if (!s) return NextResponse.json({ error: 'Somente o dono acessa isto.' }, { status: 403 })
  const b = await req.json().catch(() => ({} as any))

  // Prévia: a mensagem com os números de agora, sem mandar nada.
  if (b.acao === 'previa') {
    const c = lerConfig({ ...b.config, ligado: false })
    if (!c.itens.length) return NextResponse.json({ error: 'Marque pelo menos um item.' }, { status: 400 })
    return NextResponse.json({ texto: await montarResumo(s.salaoId, c.itens) })
  }

  if (b.acao === 'salvar') {
    const c = lerConfig(b.config)
    if (c.ligado && !c.telefones.length) return NextResponse.json({ error: 'Informe pelo menos um telefone.' }, { status: 400 })
    if (c.ligado && !c.itens.length) return NextResponse.json({ error: 'Marque pelo menos um item.' }, { status: 400 })
    if (c.ligado && !c.dias.length) return NextResponse.json({ error: 'Escolha pelo menos um dia da semana.' }, { status: 400 })
    await gravarConfig(s.salaoId, c)
    return NextResponse.json({ ok: true, config: c })
  }

  // Teste: manda agora, para os telefones da tela. Não conta como o envio do dia.
  if (b.acao === 'teste') {
    const c = lerConfig({ ...b.config, ligado: false })
    if (!c.telefones.length) return NextResponse.json({ error: 'Informe pelo menos um telefone válido (com DDD).' }, { status: 400 })
    if (!c.itens.length) return NextResponse.json({ error: 'Marque pelo menos um item.' }, { status: 400 })
    const texto = await montarResumo(s.salaoId, c.itens)
    const r = await enviarResumo(s.salaoId, texto, c.telefones)
    if (!r.enviados) return NextResponse.json({ error: 'Não consegui enfileirar a mensagem.' }, { status: 500 })
    return NextResponse.json({ ok: true, ...r })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
