import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const PERGUNTAS_PADRAO = [
  {
    titulo: 'De 0 a 10, quanto você avalia o salão?',
    tipo: 'escala',
    opcoes: [],
    obrigatoria: true,
    ordem: 0,
  },
  {
    titulo: 'O que mais gostou no salão?',
    tipo: 'multipla_escolha',
    opcoes: ['Atendimento', 'Qualidade do serviço', 'Tempo de espera', 'Ambiente', 'Custo/benefício', 'Não gostei de nada'],
    obrigatoria: false,
    ordem: 1,
  },
  {
    titulo: 'Selecione os procedimentos realizados e avalie (1=Ruim, 5=Ótimo)',
    tipo: 'grid',
    opcoes: ['Manicure e Pedicure', 'Corte', 'Higienização Capilar', 'Modelagem / Babyliss', 'Sobrancelha', 'Coloração', 'Nutrição / Terapia Capilar', 'Depilação', 'Massagem', 'Estética Facial', 'Maquiagem', 'Alisamento Capilar', 'Outros'],
    obrigatoria: false,
    ordem: 2,
  },
  {
    titulo: 'Como foi sua experiência com nossa recepção? (Marque Sim ou Não para cada item)',
    tipo: 'sim_nao',
    opcoes: ['Me atenderam bem', 'Agendamento foi fácil', 'Ofereceram bebida', 'Explicaram o tempo de espera', 'Foi oferecido um serviço complementar', 'Foi sugerido uma data de retorno'],
    obrigatoria: false,
    ordem: 3,
  },
  {
    titulo: 'Como você conheceu o salão?',
    tipo: 'multipla_escolha',
    opcoes: ['Instagram', 'Facebook', 'Google', 'Indicação de amigo(a)', 'Passou em frente ao salão', 'Já conhecia', 'Outro'],
    obrigatoria: false,
    ordem: 4,
  },
]

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('feedback_formularios')
    .select('*')
    .eq('salao_id', payload.salaoId)
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const titulo = body.titulo || `Avaliação - ${payload.salaoNome || 'Salão'}`
  const descricao = body.descricao || 'Sua opinião é muito importante para nós!'

  const { data: form, error } = await supabaseAdmin
    .from('feedback_formularios')
    .insert({ salao_id: payload.salaoId, titulo, descricao })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insere perguntas padrão
  const perguntas = PERGUNTAS_PADRAO.map(p => ({ ...p, formulario_id: form.id }))
  await supabaseAdmin.from('feedback_perguntas').insert(perguntas)

  return NextResponse.json(form, { status: 201 })
}
