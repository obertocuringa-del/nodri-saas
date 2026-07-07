import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { getSalaoPorToken, getServicos, getSegmentos } from '@/lib/lojistasConfig'

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const achado = await getSalaoPorToken(params.token)
  if (!achado) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

  const { data: salao } = await supabaseAdmin.from('saloes').select('nome').eq('id', achado.salaoId).maybeSingle()
  const servicos = await getServicos(achado.salaoId)
  const segmentos = await getSegmentos(achado.salaoId)

  // Se o dono do próprio salão estiver logado vendo este link público, mostramos
  // um atalho discreto para as Configurações do módulo.
  const cookieToken = cookies().get('nodri_token')?.value
  const payload = cookieToken ? await verifyJWT(cookieToken) : null
  const donoLogado = !!payload && payload.role === 'salon' && payload.salaoId === achado.salaoId

  return NextResponse.json({
    salao_nome: salao?.nome || '',
    whatsapp_link: achado.config.whatsapp_link || '',
    mensagem: achado.config.mensagem || '',
    servicos: servicos.filter(s => s.ativo).sort((a, b) => a.ordem - b.ordem).map(s => ({ id: s.id, nome: s.nome })),
    segmentos: [...segmentos, 'Outro'],
    dono_logado: donoLogado,
  })
}
