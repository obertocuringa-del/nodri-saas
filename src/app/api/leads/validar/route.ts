import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Confere se o link de acesso aos planos é válido. Público de propósito: quem
// clica no link ainda não tem conta.
//
// Devolve só sim/não e o primeiro nome. Nada mais do contato sai daqui — o
// token está numa URL que pode ser encaminhada, e o resto dos dados (celular,
// e-mail, cidade) não precisa viajar junto.
export async function GET(req: NextRequest) {
  const c = new URL(req.url).searchParams.get('c') || ''
  if (!c) return NextResponse.json({ valido: false })

  const { data } = await supabaseAdmin
    .from('leads')
    .select('nome, email, liberado_em')
    .eq('token', c)
    .maybeSingle()

  // Sem `liberado_em` o link não vale. O token nasce junto com o contato, mas
  // só passa a funcionar quando você libera — assim ninguém entra adivinhando
  // endereço, e liberar não exige gerar nada na hora.
  if (!data?.liberado_em) return NextResponse.json({ valido: false })

  return NextResponse.json({
    valido: true,
    nome: String(data.nome || '').split(' ')[0],
    email: data.email,
  })
}
