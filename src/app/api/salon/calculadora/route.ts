import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getSessao, sessaoModoCaixa, apenasAcrescenta } from '@/lib/apiAuth'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

// GET — carrega dados de um mês ou lista histórico
export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const ano = url.searchParams.get('ano')
  const mes = url.searchParams.get('mes')

  if (ano && mes) {
    // Carrega mês específico
    const { data } = await supabaseAdmin
      .from('calculadora_historico')
      .select('dados, atualizado_em')
      .eq('salao_id', salaoId)
      .eq('ano', Number(ano))
      .eq('mes', Number(mes))
      .maybeSingle()

    return NextResponse.json({ dados: data?.dados || null, atualizado_em: data?.atualizado_em || null })
  }

  // Lista todos os meses com dados
  const { data } = await supabaseAdmin
    .from('calculadora_historico')
    .select('ano, mes, atualizado_em, dados')
    .eq('salao_id', salaoId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })

  return NextResponse.json({ historico: data || [] })
}

// POST — salva dados do mês
export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { ano, mes, dados } = await req.json()
  if (!ano || !mes || !dados) return NextResponse.json({ error: 'ano, mes e dados são obrigatórios' }, { status: 400 })

  // Modo Caixa: pode LANÇAR/ADICIONAR despesas (inclusive a data), mas não pode
  // alterar nem apagar o que já foi lançado. Protegemos SÓ as listas de despesas
  // — o resto (faturamento, serviços globais, config, campos recalculados) é
  // livre, senão qualquer variação global travava até uma adição legítima.
  const sess = await getSessao()
  if (sess?.role === 'profissional') return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  if (sessaoModoCaixa(sess)) {
    const { data: atual } = await supabaseAdmin
      .from('calculadora_historico').select('dados')
      .eq('salao_id', salaoId).eq('ano', Number(ano)).eq('mes', Number(mes)).maybeSingle()
    const soDespesas = (d: any) => ({ despInd: d?.despInd, extrasDespInd: d?.extrasDespInd })
    if (atual?.dados && !apenasAcrescenta(soDespesas(atual.dados), soDespesas(dados))) {
      return NextResponse.json({ error: 'Modo Caixa: você pode lançar e ADICIONAR despesas, mas não pode alterar nem excluir valores já salvos.' }, { status: 403 })
    }
  }

  const { error } = await supabaseAdmin
    .from('calculadora_historico')
    .upsert({
      salao_id: salaoId,
      ano: Number(ano),
      mes: Number(mes),
      dados,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'salao_id,ano,mes' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
