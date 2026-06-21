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

// Status que NÃO devem aparecer
const STATUS_EXCLUIDOS = ['cancelado', 'faltou', 'falta', 'nao compareceu', 'não compareceu']

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const data = url.searchParams.get('data') // formato: DD/MM/YYYY ou YYYY-MM-DD

  // Busca profissional para pegar nome
  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('nome_completo, apelido')
    .eq('id', params.id)
    .eq('salao_id', salaoId)
    .single()

  if (!prof) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

  const nomeBase = prof.apelido || prof.nome_completo?.split(' ')[0] || ''

  let query = supabaseAdmin
    .from('agendamentos_raw')
    .select('*')
    .eq('salao_id', salaoId)
    .ilike('profissional', `%${nomeBase}%`)

  if (data) {
    // Aceita DD/MM/YYYY ou YYYY-MM-DD
    let dataFmt = data
    if (data.includes('-') && data.length === 10) {
      const [y, m, d] = data.split('-')
      dataFmt = `${d}/${m}/${y}`
    }
    query = query.ilike('data_reserva', `%${dataFmt}%`)
  }

  const { data: rows, error } = await query.order('hora', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtra status cancelado/faltou
  const filtrados = (rows || []).filter(r => {
    const st = (r.status || '').toLowerCase().trim()
    return !STATUS_EXCLUIDOS.some(ex => st.includes(ex))
  })

  // Datas disponíveis (para o calendário)
  const { data: todasDatas } = await supabaseAdmin
    .from('agendamentos_raw')
    .select('data_reserva, status')
    .eq('salao_id', salaoId)
    .ilike('profissional', `%${nomeBase}%`)

  const datasComAgendamentos = [...new Set(
    (todasDatas || [])
      .filter(r => !STATUS_EXCLUIDOS.some(ex => (r.status || '').toLowerCase().includes(ex)))
      .map(r => r.data_reserva)
      .filter(Boolean)
  )]

  return NextResponse.json({ agendamentos: filtrados, datas_disponiveis: datasComAgendamentos })
}
