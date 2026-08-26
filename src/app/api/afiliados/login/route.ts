import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { configAfiliado } from '@/lib/afiliados'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nodri.com.br'

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

  // O link gravado pode ter congelado um dominio antigo no dia do cadastro.
  // Quem entra aqui copia esse link para divulgar, entao ele e montado na hora
  // a partir do cupom — e a linha no banco e acertada junto.
  const link = `${SITE_URL}/?ref=${afiliado.cupom}`
  if (afiliado.link !== link) {
    await supabaseAdmin.from('afiliados').update({ link }).eq('id', afiliado.id)
  }

  // Comissao efetiva: a propria do afiliado, ou o padrao do painel. A tela
  // mostrava 40% fixo, e continuaria mostrando 40% mesmo depois de o dono
  // mudar o padrao — prometendo ao afiliado um numero que nao vale mais.
  const cfg = await configAfiliado()
  const comissao_percentual = Number(afiliado.comissao_percentual) || cfg.comissao

  return NextResponse.json({
    afiliado: { ...afiliado, link, comissao_percentual },
    ranking: ranking || [],
  })
}
