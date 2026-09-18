import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// DETALHE DE UM CLIENTE — para expandir a linha nos relatórios Em Risco/Perdidos
//
// Os relatórios trazem o perfil resumido (LTV, visitas, dias ausente) e não
// sabem QUEM atendeu nem TODOS os serviços: a lista de serviços do relatório é
// um resumo cortado, que na tela virava três nomes embaralhados numa linha só.
//
// Esta rota olha o atendimentos_raw daquele cliente e devolve o que a tela do
// profissional já mostra: profissionais que atenderam, histórico de serviços
// com a contagem, e os dados da última visita.
//
// Existe rota parecida em /api/profissionais/[id]/agendamentos/historico-cliente,
// usada pelo portal do profissional. Preferi não mexer nela — está em uso e o
// que o relatório precisa é um subconjunto. Aqui não há alertas nem "dias sem
// fazer o serviço": só o necessário para o painel.
//
// Uso: /api/relatorios/cliente-detalhe?cliente=NOME&celular=61999999999
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  if (!p?.salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const cliente = (url.searchParams.get('cliente') || '').trim()
  const celular = (url.searchParams.get('celular') || '').replace(/\D/g, '')
  // O NOME so serve de rotulo agora; quem identifica e o telefone.
  if (!cliente && !celular) return NextResponse.json({ error: 'informe cliente ou celular' }, { status: 400 })

  // ── O TELEFONE MANDA. Sempre ─────────────────────────────────────────────
  //
  // Aqui a busca era por NOME, e o celular só entrava se o nome não achasse
  // nada. Com isso o painel somava TODAS as Vanessas do salão numa pessoa só:
  // 37 visitas, ticket médio de outra, e "última visita 08/09" quando a
  // Vanessa daquela conversa tinha vindo em 29/08.
  //
  // Isso não é um número feio na tela -- é a recepção dizendo à cliente uma
  // data que não é dela, com o histórico de outra pessoa do lado.
  //
  // Nome se repete e se escreve de dez jeitos; telefone é único. Então: tendo
  // telefone, é SÓ por telefone. O nome vira reserva para quem não tem número.
  // ── Tudo no banco, casando por DÍGITOS ──────────────────────────────────
  //
  // Duas coisas quebravam aqui. O `ilike` com o número cru não casava com o
  // celular gravado formatado na planilha -- "(61) 9822-15272", 2.914 linhas
  // só no Rouge -- e a cliente com 48 visitas aparecia "sem histórico". E o
  // `limit(4000)` que o banco corta em MIL calado: cliente antiga perdia as
  // visitas mais velhas e a "primeira visita" saía errada.
  //
  // Agora é uma função no banco (crm_historico_cliente): compara os dígitos
  // dos dois lados, usa o índice por dígitos, e devolve o resumo já pronto --
  // inclusive a ÚLTIMA DATA de cada serviço, que é o que a recepção precisa
  // para puxar assunto ("a última manicure foi dia 5").
  if (celular.length < 8) {
    return NextResponse.json({
      encontrado: false, total_visitas: 0, servicos: [], profissionais_atendidos: [],
      servicos_ultima: [], profissionais_ultima: [],
    })
  }

  const so = celular.replace(/\D+/g, '')
  const sem55 = so.startsWith('55') ? so.slice(2) : so
  const formas = new Set<string>([sem55, '55' + sem55])
  if (sem55.length === 11 && sem55[2] === '9') {
    const curto = sem55.slice(0, 2) + sem55.slice(3)
    formas.add(curto); formas.add('55' + curto)
  }
  if (sem55.length === 10) {
    const longo = sem55.slice(0, 2) + '9' + sem55.slice(2)
    formas.add(longo); formas.add('55' + longo)
  }

  const { data: r, error } = await supabaseAdmin
    .rpc('crm_historico_cliente', { p_salao: p.salaoId, p_celulares: [...formas] })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total_visitas = Number(r?.total_visitas || 0)
  if (!Number(r?.linhas || 0) || !total_visitas) {
    return NextResponse.json({
      encontrado: false, total_visitas: 0, servicos: [], profissionais_atendidos: [],
      servicos_ultima: [], profissionais_ultima: [],
    })
  }

  const faturamento = Number(r.faturamento || 0)
  const servicos = (Array.isArray(r.servicos) ? r.servicos : [])
    .map((s: any) => ({ nome: String(s.nome || ''), vezes: Number(s.vezes || 0), ultima: s.ultima || null }))
  const ultima_visita = r.ultima_visita || null
  const casouPor: 'telefone' = 'telefone'
  const freq_media_dias = r.freq_media_dias != null ? Number(r.freq_media_dias) : null
  const datas = [r.primeira_visita || null]
  const linhas = { profissionais_atendidos: r.profissionais_atendidos, servicos_ultima: r.servicos_ultima, profissionais_ultima: r.profissionais_ultima }

  return NextResponse.json({
    encontrado: true,
    // Como esta pessoa foi encontrada. Só por telefone: casar por nome saiu por
    // decisão do dono em 12/09/2026 (mostrar o histórico de outra pessoa é
    // pior do que não mostrar nada).
    casou_por: casouPor,
    total_visitas,
    primeira_visita: datas[0] || null,
    ultima_visita,
    faturamento_acumulado: faturamento,
    ticket_medio: total_visitas > 0 ? faturamento / total_visitas : 0,
    freq_media_dias,
    cliente_fiel: total_visitas >= 5,
    // Cada serviço com quantas vezes e a ÚLTIMA data em que foi feito.
    servicos,
    profissionais_atendidos: Array.isArray(linhas.profissionais_atendidos) ? linhas.profissionais_atendidos : [],
    servicos_ultima: Array.isArray(linhas.servicos_ultima) ? linhas.servicos_ultima : [],
    profissionais_ultima: Array.isArray(linhas.profissionais_ultima) ? linhas.profissionais_ultima : [],
  })
}
