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

const tsData = (s: string) => {
  if (!s) return 0
  if (s.includes('/')) { const [d, m, y] = s.split('/'); return new Date(`${y}-${m}-${d}`).getTime() || 0 }
  return new Date(s).getTime() || 0
}

export async function GET(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  if (!p?.salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const cliente = (url.searchParams.get('cliente') || '').trim()
  const celular = (url.searchParams.get('celular') || '').replace(/\D/g, '')
  if (!cliente) return NextResponse.json({ error: 'cliente obrigatório' }, { status: 400 })

  // Nome EXATO (ilike sem curinga = exato sem diferenciar maiúscula). Com
  // curinga, "ANA" traria também "ANA BEATRIZ" e o painel misturaria clientes.
  let { data: atend } = await supabaseAdmin
    .from('atendimentos_raw')
    .select('servico, data_comanda, profissional, qtd, valor, total')
    .eq('salao_id', p.salaoId)
    .ilike('cliente', cliente)
    .limit(4000)

  // Sem resultado pelo nome, tenta pelo celular: o mesmo cliente às vezes está
  // grafado diferente entre importações.
  if ((!atend || atend.length === 0) && celular.length >= 8) {
    const r = await supabaseAdmin
      .from('atendimentos_raw')
      .select('servico, data_comanda, profissional, qtd, valor, total')
      .eq('salao_id', p.salaoId)
      .ilike('celular', `%${celular}%`)
      .limit(4000)
    atend = r.data
  }

  const linhas = atend || []
  if (linhas.length === 0) {
    return NextResponse.json({
      encontrado: false, total_visitas: 0, servicos: [], profissionais_atendidos: [],
      servicos_ultima: [], profissionais_ultima: [],
    })
  }

  // Cada DATA distinta é uma visita (uma comanda pode ter vários serviços).
  const datas = [...new Set(linhas.map(a => a.data_comanda).filter(Boolean))].sort((a, b) => tsData(a) - tsData(b))
  const ultima_visita = datas[datas.length - 1] || null
  const total_visitas = datas.length

  const contagem: Record<string, number> = {}
  let faturamento = 0
  for (const a of linhas) {
    const s = a.servico || 'Não informado'
    contagem[s] = (contagem[s] || 0) + (Number(a.qtd) || 1)
    faturamento += Number(a.total) || Number(a.valor) || 0
  }
  const servicos = Object.entries(contagem)
    .map(([nome, vezes]) => ({ nome, vezes }))
    .sort((a, b) => b.vezes - a.vezes)

  const daUltima = ultima_visita ? linhas.filter(a => a.data_comanda === ultima_visita) : []

  let freq_media_dias: number | null = null
  if (datas.length >= 2) {
    const difs: number[] = []
    for (let i = 1; i < datas.length; i++) {
      const d = (tsData(datas[i]) - tsData(datas[i - 1])) / 86400000
      if (d > 0) difs.push(d)
    }
    if (difs.length) freq_media_dias = Math.round(difs.reduce((a, b) => a + b, 0) / difs.length)
  }

  return NextResponse.json({
    encontrado: true,
    total_visitas,
    primeira_visita: datas[0] || null,
    ultima_visita,
    faturamento_acumulado: faturamento,
    ticket_medio: total_visitas > 0 ? faturamento / total_visitas : 0,
    freq_media_dias,
    cliente_fiel: total_visitas >= 5,
    servicos,
    profissionais_atendidos: [...new Set(linhas.map(a => a.profissional).filter(Boolean))],
    servicos_ultima: [...new Set(daUltima.map(a => a.servico).filter(Boolean))],
    profissionais_ultima: [...new Set(daUltima.map(a => a.profissional).filter(Boolean))],
  })
}
