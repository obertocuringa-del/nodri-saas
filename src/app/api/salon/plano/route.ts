import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { trocarPlanoDoSalao } from '@/lib/planoDoSalao'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// ── O cliente troca o próprio plano ─────────────────────────────────────────
//
// Só o DONO do salão (role 'salon'). Sub-usuário e profissional não entram
// nem para ver: isto mexe no valor que cai no cartão do dono, e quem libera
// tarefa para um sub não está liberando a conta a pagar dele.

async function donoDoSalao() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) return null
  return payload
}

export async function GET() {
  const payload = await donoDoSalao()
  if (!payload) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('plano_id, asaas_subscription_id, asaas_status, licenca_vencimento')
    .eq('id', payload.salaoId).maybeSingle()

  const { data: planos } = await supabaseAdmin
    .from('planos').select('id, nome, slug, preco, ativo')
    .eq('ativo', true).order('preco', { ascending: true })

  return NextResponse.json({
    planoAtualId: salao?.plano_id || null,
    temAssinatura: !!salao?.asaas_subscription_id,
    statusAssinatura: salao?.asaas_status || null,
    planos: planos || [],
  })
}

export async function POST(req: NextRequest) {
  const payload = await donoDoSalao()
  if (!payload) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const plano = String(body?.plano || '').trim()
  if (!plano) return NextResponse.json({ erro: 'Escolha um plano' }, { status: 400 })

  // O salaoId vem do cookie, nunca do corpo: senão o dono de um salão trocaria
  // o plano de outro.
  const r = await trocarPlanoDoSalao(payload.salaoId!, plano)
  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 400 })

  await registrarAuditoria(
    'trocar', 'Plano da assinatura',
    `Plano alterado para ${r.planoNome} (R$ ${r.valor}/mês) pelo próprio cliente`,
  )

  return NextResponse.json(r)
}
