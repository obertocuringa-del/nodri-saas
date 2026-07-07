import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSalaoPorToken, getServicos, getSegmentos } from '@/lib/lojistasConfig'

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const achado = await getSalaoPorToken(params.token)
  if (!achado) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

  const { data: salao } = await supabaseAdmin.from('saloes').select('nome').eq('id', achado.salaoId).maybeSingle()
  const servicos = await getServicos(achado.salaoId)
  const segmentos = await getSegmentos(achado.salaoId)

  return NextResponse.json({
    salao_nome: salao?.nome || '',
    whatsapp_link: achado.config.whatsapp_link || '',
    mensagem: achado.config.mensagem || '',
    servicos: servicos.filter(s => s.ativo).sort((a, b) => a.ordem - b.ordem).map(s => ({ id: s.id, nome: s.nome })),
    segmentos: [...segmentos, 'Outro'],
  })
}
