import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { bloquearEdicao } from '@/lib/apiAuth'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

const DESPESAS_PADRAO = [
  {nome:'Aluguel',categoria:'indireta'},{nome:'Água',categoria:'indireta'},
  {nome:'Contabilidade',categoria:'indireta'},{nome:'Condomínio',categoria:'indireta'},
  {nome:'Despesas Bancárias',categoria:'indireta'},{nome:'Devolução Cliente',categoria:'indireta'},
  {nome:'Energia Elétrica',categoria:'indireta'},{nome:'Estacionamento',categoria:'indireta'},
  {nome:'Decoração/Manutenção',categoria:'indireta'},{nome:'Internet/Telefone',categoria:'indireta'},
  {nome:'Sistema/Software',categoria:'indireta'},{nome:'Limpeza e Higiene',categoria:'indireta'},
  {nome:'IPTU',categoria:'indireta'},{nome:'Marketing e Publicidade',categoria:'indireta'},
  {nome:'Material de Escritório',categoria:'indireta'},{nome:'Mimos para Clientes',categoria:'indireta'},
  {nome:'Mimos para Profissionais',categoria:'indireta'},{nome:'Uniformes',categoria:'indireta'},
  {nome:'Pró-labore',categoria:'indireta'},{nome:'Salários',categoria:'indireta'},
  {nome:'FGTS',categoria:'indireta'},{nome:'Taxa Certificado Digital',categoria:'indireta'},
  {nome:'Seguro',categoria:'indireta'},
  {nome:'Imposto',categoria:'direta'},{nome:'Produto/Insumo',categoria:'direta'},
  {nome:'Rateio/Comissão',categoria:'direta'},{nome:'Taxa de Cartão',categoria:'direta'},
  {nome:'Aquisição de Equipamento',categoria:'outras'},{nome:'Distribuição de Sócios',categoria:'outras'},
]

export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('despesas_catalogo')
    .select('*')
    .eq('salao_id', salaoId)
    .order('nome', { ascending: true })

  // Se não tem nenhuma, retorna as padrão como sugestão
  if (!data || data.length === 0) {
    return NextResponse.json({ despesas: [], sugestoes: DESPESAS_PADRAO })
  }

  return NextResponse.json({ despesas: data, sugestoes: [] })
}

export async function POST(req: NextRequest) {
    if (await bloquearEdicao('POST')) return NextResponse.json({ error: 'Modo Caixa: você pode adicionar, mas não editar nem excluir.' }, { status: 403 })
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  // Seed: popular com padrões
  if (body.seed) {
    const registros = DESPESAS_PADRAO.map(d => ({ ...d, salao_id: salaoId }))
    const { data, error } = await supabaseAdmin
      .from('despesas_catalogo')
      .insert(registros)
      .select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ despesas: data })
  }

  const { nome, categoria, observacao } = body
  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('despesas_catalogo')
    .insert({ salao_id: salaoId, nome, categoria: categoria || 'indireta', observacao })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ despesa: data })
}
