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
  let atend: any[] | null = null
  let casouPor: 'telefone' | 'nome' | null = null

  if (celular.length >= 8) {
    // ── Todas as grafias do mesmo número ──────────────────────────────────
    //
    // Procurar só o número como veio do WhatsApp não acha quem está gravado
    // de outro jeito na planilha do salão. O Marcos é o caso: no WhatsApp ele
    // é 61 9358-7833 e na base está 61 9 9358-7833, com o nono dígito. Um
    // `ilike` com o número cru não casa -- e o painel dele, que sempre
    // apareceu, ficou zerado do nada.
    //
    // É a mesma lista de grafias que o relógio já usava para casar contato
    // com cliente. Ela precisava estar aqui também.
    const so = celular.replace(/\D+/g, '')
    const sem55 = so.startsWith('55') ? so.slice(2) : so
    const formas = new Set<string>([sem55])
    if (sem55.length === 11 && sem55[2] === '9') formas.add(sem55.slice(0, 2) + sem55.slice(3))
    if (sem55.length === 10) formas.add(sem55.slice(0, 2) + '9' + sem55.slice(2))

    const filtro = [...formas].map(f => `celular.ilike.%${f}%`).join(',')
    const r = await supabaseAdmin
      .from('atendimentos_raw')
      .select('servico, data_comanda, profissional, qtd, valor, total')
      .eq('salao_id', p.salaoId)
      .or(filtro)
      .limit(4000)
    if (r.data?.length) { atend = r.data; casouPor = 'telefone' }
  }

  // ── E SÓ. Sem telefone, não se mostra histórico ──────────────────────────
  //
  // Havia aqui uma busca por nome, como reserva. Ela saiu por decisão do dono
  // em 12/09/2026, e a razão dele é melhor que a minha:
  //
  //   "se eu tiver conversando com a cliente vou pegar aquelas informações
  //    para vender mais para ela. E aí falo: você fez o corte aqui um tempo
  //    atrás — e a cliente não fez corte. Eu estou mentindo."
  //
  // Nome não identifica ninguém: o salão tem duas Márcias, e a NOEMIA que
  // apareceu com 164 visitas e ticket de R$ 346,80 podia ser a soma de outra
  // pessoa. Um aviso em amarelo não conserta isso -- quem está atendendo lê o
  // número, não o aviso.
  //
  // Sem telefone a tela não mostra nada e diz por quê. É menos informação e
  // nenhuma mentira.
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
    // Como esta pessoa foi encontrada. A tela precisa saber: casar por nome é
    // um palpite, e um palpite não pode ser mostrado com a mesma cara de um
    // dado conferido pelo telefone.
    casou_por: casouPor,
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
