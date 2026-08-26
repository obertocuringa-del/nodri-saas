import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { emailConfigurado, remetenteEhDeTeste, remetenteAtual, enviarEmailTeste } from '@/lib/email'

export const dynamic = 'force-dynamic'

// ── Saúde do envio de e-mail ────────────────────────────────────────────────
//
// Quando um cliente compra, o sistema manda a senha por e-mail. Se esse envio
// falha, ninguém percebe: a venda entra, o salão é criado e o cliente fica sem
// conseguir entrar. O erro só existia no log da Vercel.
//
// Aqui o dono vê o estado em uma tela e dispara um envio de verdade para o
// endereço que quiser — o erro do provedor volta com o texto original, que é o
// que diz se falta verificar o domínio, se a chave está errada ou se o
// remetente de teste está limitando a entrega.

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  return NextResponse.json({
    configurado: emailConfigurado(),
    remetenteDeTeste: remetenteEhDeTeste(),
    remetente: remetenteAtual(),
  })
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { para } = await req.json().catch(() => ({ para: '' }))
  if (!para || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para))
    return NextResponse.json({ error: 'Informe um e-mail válido para o teste.' }, { status: 400 })

  try {
    await enviarEmailTeste(para)
    return NextResponse.json({ ok: true, para, remetente: remetenteAtual() })
  } catch (e: any) {
    // O texto do provedor vai inteiro para a tela: é ele que nomeia a causa.
    return NextResponse.json(
      { error: String(e?.message || e).slice(0, 400), remetente: remetenteAtual() },
      { status: 502 })
  }
}
