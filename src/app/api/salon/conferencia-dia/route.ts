import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { conferirDia, REGRAS_PADRAO, type Atendimento, type RegraComposicao } from '@/lib/conferenciaDia'

export const dynamic = 'force-dynamic'

const CHAVE_REGRAS = 'conferencia_regras'

// Conferência automática de um dia, sobre os atendimentos já importados.
//
// Não busca nada em sistema de fora: lê `atendimentos_raw`, que entra pela
// importação do relatório. É a parte da conferência que funciona hoje, sem
// extensão e sem câmera.
//
// O histórico serve de régua para o preço "normal" de cada serviço. Uso 90
// dias: menos que isso e um serviço pouco vendido nunca junta ocorrências
// suficientes para ter padrão; muito mais e uma tabela de preço antiga passa a
// contar como se fosse a de hoje.
const DIAS_DE_HISTORICO = 90

function paraISO(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || '').trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const data = String(new URL(req.url).searchParams.get('data') || '').trim()   // DD/MM/AAAA
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    return NextResponse.json({ error: 'Informe a data como DD/MM/AAAA' }, { status: 400 })
  }

  const iso = paraISO(data)
  const inicio = new Date(iso)
  inicio.setDate(inicio.getDate() - DIAS_DE_HISTORICO)

  const campos = 'num_comanda, data_comanda, profissional, cliente, servico, categoria, qtd, valor, desconto, total, pacote, ano, mes'

  const [diaN, mesN, anoN] = data.split('/').map(Number)

  // ── O DIA: buscado direto pela data ───────────────────────────────────────
  //
  // Antes eu trazia 4 meses de atendimento e filtrava o dia na memória. Duas
  // coisas davam errado: o PostgREST corta em 1000 linhas quando não se pede
  // limite, e os 4 meses incluíam junho — que sozinho encheu as 1000 vagas.
  // Setembro existia no banco e nunca chegava aqui. Pedir o dia ao banco é
  // exato, e é uma fração do volume.
  const { data: linhasDia, error: erroDia } = await supabaseAdmin
    .from('atendimentos_raw')
    .select(campos)
    .eq('salao_id', sess.salaoId)
    .eq('ano', anoN).eq('mes', mesN)
    .eq('data_comanda', data)
    .limit(5000)
  if (erroDia) return NextResponse.json({ error: erroDia.message }, { status: 500 })

  // ── O HISTÓRICO: régua do preço normal de cada serviço ────────────────────
  // Só o mês do dia e os dois anteriores, e com limite explícito.
  const meses: Array<{ ano: number; mes: number }> = []
  const d = new Date(iso)
  for (let i = 0; i < 3; i++) {
    meses.push({ ano: d.getFullYear(), mes: d.getMonth() + 1 })
    d.setMonth(d.getMonth() - 1)
  }
  const { data: linhasHist, error: erroHist } = await supabaseAdmin
    .from('atendimentos_raw')
    .select(campos)
    .eq('salao_id', sess.salaoId)
    .in('ano', Array.from(new Set(meses.map(m => m.ano))))
    .in('mes', Array.from(new Set(meses.map(m => m.mes))))
    .limit(20000)
  if (erroHist) return NextResponse.json({ error: erroHist.message }, { status: 500 })

  const doDia = (linhasDia || []) as unknown as Atendimento[]
  const todos = (linhasHist || []) as unknown as Atendimento[]
  const historico = todos.filter(a => String(a.data_comanda).trim() !== data)

  const { data: cfg } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', sess.salaoId).eq('chave', CHAVE_REGRAS).maybeSingle()
  const regras: RegraComposicao[] = Array.isArray((cfg as any)?.valor)
    ? (cfg as any).valor : REGRAS_PADRAO

  const achados = conferirDia(doDia, regras, historico)

  const comandas = new Set(doDia.map(a => String(a.num_comanda)))
  const faturado = doDia.reduce((s, a) => s + (Number(a.total) || 0), 0)

  // Quando o dia vem vazio, dizer só "não tem" deixa o dono no escuro: ele não
  // sabe se esqueceu de importar, se importou outro mês, ou se a data está
  // gravada em outro formato. Então a resposta leva o que existe de fato.
  const doMes = todos.filter(a => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(a.data_comanda).trim())
    return m && `${m[2]}/${m[3]}` === data.slice(3)
  })
  const diasComDado = Array.from(new Set(doMes.map(a => String(a.data_comanda).trim())))
    .sort((x, y) => x.slice(0, 2).localeCompare(y.slice(0, 2)))

  return NextResponse.json({
    data,
    itens: doDia.length,
    comandas: comandas.size,
    faturado,
    baseDoHistorico: historico.length,
    achados,
    emRisco: achados.reduce((s, a) => s + (a.valorEmRisco || 0), 0),
    // Sem atendimento no dia não existe "conferido sem problema": existe
    // "não há o que conferir". A tela precisa saber a diferença.
    semDados: doDia.length === 0,
    // Pistas para quando não há dado no dia.
    totalNoBanco: todos.length,
    limiteAtingido: todos.length >= 20000,
    totalNoMes: doMes.length,
    diasComDado,
    // Uma amostra do que está gravado, para o caso de a data vir em outro
    // formato e o filtro por texto nunca casar.
    amostraDatas: Array.from(new Set(todos.slice(0, 200).map(a => String(a.data_comanda)))).slice(0, 6),
  })
}

// Regras de composição — o dono edita no painel, sem depender de deploy.
export async function PUT(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.regras)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { error } = await supabaseAdmin.from('salao_config').upsert(
    { salao_id: sess.salaoId, chave: CHAVE_REGRAS, valor: body.regras, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
