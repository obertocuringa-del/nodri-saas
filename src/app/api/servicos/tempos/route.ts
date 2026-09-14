import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { escritaBloqueadaSub } from '@/lib/apiAuth'
import { carregarTempos, gravarTempos, lerTempo, temTempo } from '@/lib/servicosTempo'

export const dynamic = 'force-dynamic'

// ── O tempo de cada procedimento ────────────────────────────────────────────
//
// Fica separado da rota de serviços de propósito: a tabela `salao_servicos` não
// tem coluna de tempo (mudança de esquema aqui exige SQL à mão no Supabase), e
// misturar as duas gravações faria um erro no tempo derrubar o salvamento do
// preço -- que é o que ninguém pode perder.

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload?.salaoId || null
}

export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  return NextResponse.json({ tempos: await carregarTempos(salaoId) })
}

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await escritaBloqueadaSub()) {
    return NextResponse.json({ error: 'Este acesso é somente leitura.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const id = String(body?.servico_id || '').trim()
  if (!id) return NextResponse.json({ error: 'Serviço não informado' }, { status: 400 })

  const mapa = await carregarTempos(salaoId)
  const t = lerTempo(body?.tempo)
  // Zerar o tempo APAGA a entrada em vez de guardar um monte de zero: assim
  // "não configurado" continua sendo a ausência da chave, e não um registro
  // que parece configurado e vale nada.
  if (temTempo(t)) mapa[id] = t
  else delete mapa[id]

  await gravarTempos(salaoId, mapa)
  return NextResponse.json({ ok: true, tempos: mapa })
}
