import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const OCORRIDOS_PADRAO = [
  'FALTA','ATRASO','SAÍDA MAIS CEDO','ATENDIMENTO EM ATRASO','AUSÊNCIA DO SALÃO',
  'NEGOU ATENDIMENTO','PASSOU CLIENTE','CLIENTES FANTASMAS NA AGENDA',
  'DEMORA PARA DESCER DA COPA E ATENDER O CLIENTE','RECLAMAÇÃO DE CLIENTE',
  'ENCAIXE INDEVIDO','LOCAL DE ATENDIMENTO DESORGANIZADO','USO DE EPI',
  'UNIFORME INADEQUADO','PRODUTOS DE CARRINHO','IMAGEM PESSOAL','CORRIDA INTERNA',
  'CURSO DE CAPACITAÇÃO - FALTA','CURSO DE CAPACITAÇÃO - ATRASO',
  'TREINAMENTO EXTERNO - FALTA','TREINAMENTO INTERNO - ATRASO',
  'REUNIÃO GERAL','PRODUÇÃO','FEEDBACK COORDENADOR','FEEDBACK GERENTE',
  'FALTA - JUSTIFICADA PELO GERENTE','ATRASO - JUSTIFICADA PELO GERENTE',
]

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !['salon','sub'].includes(payload.role) || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('*')
    .eq('salao_id', payload.salaoId)
    .order('criado_em', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !['salon','sub'].includes(payload.role) || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: form, error } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .insert({ salao_id: payload.salaoId, titulo: `Feedback Profissional - ${payload.salaoNome || 'Salão'}` })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insere ocorridos padrão
  const ocorridos = OCORRIDOS_PADRAO.map(d => ({ salao_id: payload.salaoId, descricao: d }))
  await supabaseAdmin.from('feedback_prof_ocorridos').insert(ocorridos)

  return NextResponse.json(form, { status: 201 })
}
