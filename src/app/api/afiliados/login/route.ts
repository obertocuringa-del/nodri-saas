import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email, cpf } = await req.json()
  if (!email || !cpf) return NextResponse.json({ error: 'Email e CPF são obrigatórios' }, { status: 400 })

  const cpfLimpo = cpf.replace(/\D/g, '')

  const { data: afiliado } = await supabaseAdmin
    .from('afiliados')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (!afiliado || afiliado.cpf.replace(/\D/g, '') !== cpfLimpo) {
    return NextResponse.json({ error: 'Email ou CPF inválido. Verifique seus dados.' }, { status: 401 })
  }

  // Ranking geral
  const { data: ranking } = await supabaseAdmin
    .from('afiliados')
    .select('id, nome, total_vendas, valor_acumulado, valor_pago')
    .eq('ativo', true)
    .order('total_vendas', { ascending: false })
    .limit(20)

  // Incrementa clique (rastreamento)
  await supabaseAdmin.from('afiliados').update({
    total_cliques: (afiliado.total_cliques || 0)
  }).eq('id', afiliado.id)

  return NextResponse.json({ afiliado, ranking: ranking || [] })
}
