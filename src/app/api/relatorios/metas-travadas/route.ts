import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/apiAuth'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { travaDoMes, travarMes, comMetaManual } from '@/lib/metasTravadas'

export const dynamic = 'force-dynamic'

// ── A chavinha que trava as metas do mês ───────────────────────────────────
//
// Pedido do dono (03/10/2026), para a corrida da equipe: depois que as metas
// estão como ele quer -- umas automáticas da redistribuição, outras que ele
// trocou à mão --, ele liga a trava e o número vira o combinado. Ninguém mexe
// até ele destravar.
//
// Só o DONO do salão (ou o master) liga e desliga. Sub-usuário e profissional
// nem veem a chave: quem compete não decide o próprio alvo.
//
//   GET  ?ano=2026&mes=10  -> { travada, em, por }
//   POST { ano, mes, travar }

async function quemE() {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  return p
}

export async function GET(req: NextRequest) {
  const sess = await getSessao()
  const p: any = await quemE()
  const salaoId = sess?.salaoId || p?.salaoId
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const hoje = new Date()
  const ano = parseInt(searchParams.get('ano') || '') || hoje.getFullYear()
  const mes = parseInt(searchParams.get('mes') || '') || hoje.getMonth() + 1

  const t = await travaDoMes(salaoId, ano, mes)
  // Quantos SERIAM travados (os que têm meta manual agora) -- a tela precisa
  // disso para dizer, antes de ligar, quem a chave vai alcançar. Travada, o
  // que vale é a lista congelada no momento em que foi ligada.
  const manuaisAgora = await comMetaManual(salaoId, ano, mes)
  return NextResponse.json({
    ano, mes,
    travada: !!t, em: t?.em || null, por: t?.por || null,
    quantos: t ? t.profissionais.length : manuaisAgora.length,
    com_meta_manual: manuaisAgora.length,
    // A tela mostra a chave só para quem pode usar.
    pode_mudar: sess?.role !== 'sub' && sess?.role !== 'profissional',
  })
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  const p: any = await quemE()
  const salaoId = sess?.salaoId || p?.salaoId
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  // Quem compete não tranca nem destranca o próprio alvo.
  if (sess?.role === 'sub' || sess?.role === 'profissional') {
    return NextResponse.json({ error: 'Só o dono do salão pode travar ou destravar as metas' }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))
  const hoje = new Date()
  const ano = parseInt(b.ano) || hoje.getFullYear()
  const mes = parseInt(b.mes) || hoje.getMonth() + 1
  if (mes < 1 || mes > 12) return NextResponse.json({ error: 'Mês inválido' }, { status: 400 })
  const travar = b.travar === true

  await travarMes(salaoId, ano, mes, travar, String(p?.email || 'o dono'))
  const t = await travaDoMes(salaoId, ano, mes)
  return NextResponse.json({
    ok: true, travada: !!t, em: t?.em || null, por: t?.por || null,
    quantos: t ? t.profissionais.length : 0,
    texto: travar
      ? `${t?.profissionais.length || 0} profissional(is) com meta manual estão travados. Quem ficou na meta automática continua podendo definir a própria.`
      : 'Metas destravadas: a meta manual volta a poder ser editada.',
  })
}
