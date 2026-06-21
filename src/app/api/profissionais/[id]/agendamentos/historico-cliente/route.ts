import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const nomeCliente = url.searchParams.get('cliente') || ''
  const celular = url.searchParams.get('celular') || ''

  if (!nomeCliente) return NextResponse.json({ error: 'cliente obrigatório' }, { status: 400 })

  // Busca histórico de atendimentos do cliente no salão inteiro
  let query = supabaseAdmin
    .from('atendimentos_raw')
    .select('servico, data_comanda, profissional, qtd')
    .eq('salao_id', salaoId)

  // Busca por nome ou celular
  if (celular && celular.length >= 8) {
    query = query.or(`cliente.ilike.%${nomeCliente}%,celular.ilike.%${celular.replace(/\D/g,'')}%`)
  } else {
    query = query.ilike('cliente', `%${nomeCliente}%`)
  }

  const { data: atendimentos } = await query.order('data_comanda', { ascending: false })

  if (!atendimentos || atendimentos.length === 0) {
    return NextResponse.json({
      servicos: {},
      ultima_visita: null,
      servicos_ultima: [],
      profissionais_ultima: [],
      primeira_visita: true,
    })
  }

  // Conta serviços totais
  const servicos: Record<string, number> = {}
  for (const a of atendimentos) {
    const s = a.servico || 'Não informado'
    servicos[s] = (servicos[s] || 0) + (Number(a.qtd) || 1)
  }

  // Última visita (data mais recente)
  const datasUnicas = [...new Set(atendimentos.map(a => a.data_comanda).filter(Boolean))].sort().reverse()
  const ultima_visita = datasUnicas[0] || null

  // Serviços e profissionais da última visita
  const atendUltima = ultima_visita ? atendimentos.filter(a => a.data_comanda === ultima_visita) : []
  const servicos_ultima = [...new Set(atendUltima.map(a => a.servico).filter(Boolean))]
  const profissionais_ultima = [...new Set(atendUltima.map(a => a.profissional).filter(Boolean))]

  return NextResponse.json({
    servicos,
    ultima_visita,
    servicos_ultima,
    profissionais_ultima,
    primeira_visita: atendimentos.length === 0,
  })
}
