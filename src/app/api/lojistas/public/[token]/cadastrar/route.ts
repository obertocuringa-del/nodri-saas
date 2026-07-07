import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSalaoPorToken, getServicos } from '@/lib/lojistasConfig'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const achado = await getSalaoPorToken(params.token)
  if (!achado) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

  const b = await req.json()
  const nome = String(b.nome || '').trim()
  const celular = String(b.celular || '').trim()
  const nome_loja = String(b.nome_loja || '').trim()
  if (!nome || !celular || !nome_loja) {
    return NextResponse.json({ error: 'Nome, celular e nome da loja são obrigatórios.' }, { status: 400 })
  }

  const servicosSelecionadosIds: string[] = Array.isArray(b.servicos_interesse) ? b.servicos_interesse : []
  const catalogo = await getServicos(achado.salaoId)
  const servicos_interesse = catalogo.filter(s => servicosSelecionadosIds.includes(s.id)).map(s => s.nome)

  const { data, error } = await supabaseAdmin.from('lojistas').insert({
    salao_id: achado.salaoId,
    nome,
    celular,
    data_aniversario: b.data_aniversario || null,
    email: b.email || null,
    instagram: b.instagram || null,
    nome_loja,
    segmento: b.segmento || null,
    bloco: b.bloco || null,
    numero_loja: b.numero_loja || null,
    servicos_interesse,
    observacoes: b.observacoes || null,
  }).select('id').single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Esse celular já está cadastrado como lojista parceiro.' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id, whatsapp_link: achado.config.whatsapp_link || '' }, { status: 201 })
}
