import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Comissões a pagar ───────────────────────────────────────────────────────
//
// Quem paga o afiliado é a NODRI, por Pix, na mão. Esta rota existe para essa
// rotina: listar o que está pendente, com a chave Pix de cada um do lado, e
// registrar o que já foi pago — comissão por comissão, não um total solto.
//
// O botão antigo do painel mandava `valor_pago` no PATCH de /api/afiliados,
// que rejeita campos financeiros (e fazia bem: dava para zerar dívida pelo
// navegador). Resultado: o botão dizia "pagamento registrado" e não registrava
// nada. Agora o pagamento marca as LINHAS, e o total do afiliado é recalculado
// a partir delas.

async function souMaster() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return !!payload && payload.role === 'master'
}

/** Recalcula os totais do afiliado a partir das comissões — a fonte da verdade. */
async function recalcularTotais(afiliadoId: string) {
  const { data } = await supabaseAdmin
    .from('afiliado_comissoes')
    .select('valor_comissao, status')
    .eq('afiliado_id', afiliadoId)

  const linhas = data || []
  const soma = (st: string) => linhas
    .filter((c: any) => c.status === st)
    .reduce((t: number, c: any) => t + Number(c.valor_comissao || 0), 0)

  await supabaseAdmin.from('afiliados').update({
    valor_acumulado: Math.round(soma('pendente') * 100) / 100,
    valor_pago: Math.round(soma('pago') * 100) / 100,
    total_vendas: linhas.filter((c: any) => c.status !== 'cancelado').length,
  }).eq('id', afiliadoId)
}

// GET — lista comissões. ?status=pendente|pago  ?afiliado=<id>
export async function GET(req: NextRequest) {
  if (!await souMaster()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const afiliado = searchParams.get('afiliado')

  let q = supabaseAdmin
    .from('afiliado_comissoes')
    .select('*, afiliados(nome, email, cupom, chave_pix)')
    .order('criado_em', { ascending: false })
    .limit(500)

  if (status) q = q.eq('status', status)
  if (afiliado) q = q.eq('afiliado_id', afiliado)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST — marca comissões como pagas (ou volta para pendente / cancela).
// body: { ids: string[], status?: 'pago'|'pendente'|'cancelado', obs?: string }
//       { afiliado_id, status: 'pago' }  → paga tudo o que estiver pendente dele
export async function POST(req: NextRequest) {
  if (!await souMaster()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const status = body?.status || 'pago'
  if (!['pago', 'pendente', 'cancelado'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const marca = {
    status,
    pago_em: status === 'pago' ? new Date().toISOString() : null,
    pago_obs: body?.obs || null,
  }

  let afiliadosTocados: string[] = []

  if (Array.isArray(body?.ids) && body.ids.length) {
    const { data, error } = await supabaseAdmin
      .from('afiliado_comissoes').update(marca).in('id', body.ids).select('afiliado_id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    afiliadosTocados = [...new Set((data || []).map((c: any) => c.afiliado_id))]
  } else if (body?.afiliado_id) {
    const { data, error } = await supabaseAdmin
      .from('afiliado_comissoes').update(marca)
      .eq('afiliado_id', body.afiliado_id).eq('status', 'pendente')
      .select('afiliado_id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    afiliadosTocados = [body.afiliado_id]
    if (!data?.length) return NextResponse.json({ ok: true, quantidade: 0, aviso: 'Não havia comissão pendente' })
  } else {
    return NextResponse.json({ error: 'Informe ids ou afiliado_id' }, { status: 400 })
  }

  for (const id of afiliadosTocados) await recalcularTotais(id)
  return NextResponse.json({ ok: true, quantidade: afiliadosTocados.length })
}
