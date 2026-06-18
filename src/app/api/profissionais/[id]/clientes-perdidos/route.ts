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

function parseDataBR(d: string): Date | null {
  if (!d) return null
  const p = d.split('/')
  if (p.length !== 3) return null
  const dt = new Date(`${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`)
  return isNaN(dt.getTime()) ? null : dt
}

function normNome(n: string): string {
  return (n || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// Verifica se nome do atendimento corresponde ao profissional
function isProfissional(nomeLinha: string, nomeCompleto: string, apelido: string): boolean {
  const nl = normNome(nomeLinha)
  const nc = normNome(nomeCompleto)
  const ap = normNome(apelido)
  if (!nl) return false
  if (nl === nc) return true
  if (ap && (nl === ap || nl.startsWith(ap) || ap.startsWith(nl))) return true
  const tokens = nc.split(' ').filter(t => t.length > 2)
  const matchCount = tokens.filter(t => nl.includes(t)).length
  return matchCount >= Math.min(2, tokens.length)
}

// Encontra cargo de um profissional pelo nome no atendimento
function resolverCargo(
  nomeLinha: string,
  profsCadastrados: Array<{ nome_completo: string; apelido: string; cargo: string }>
): string {
  const nl = normNome(nomeLinha)
  for (const p of profsCadastrados) {
    if (isProfissional(nl, p.nome_completo, p.apelido || '')) return p.cargo
  }
  return ''
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, cargo, servicos_habilitados')
    .eq('id', params.id)
    .eq('salao_id', salaoId)
    .single()

  if (!prof) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Todos os profissionais do salão para resolver cargo
  const { data: todosProfissionais } = await supabaseAdmin
    .from('profissionais')
    .select('nome_completo, apelido, cargo')
    .eq('salao_id', salaoId)

  const profsCadastrados = (todosProfissionais || []).map(p => ({
    nome_completo: p.nome_completo || '',
    apelido: p.apelido || '',
    cargo: p.cargo || '',
  }))

  const cargoPrincipal = (prof.cargo || '').toLowerCase()

  // Calcula ticket médio e comissão média do profissional
  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('prof_servicos')
    .eq('salao_id', salaoId)

  const nomeCompleto = (prof.nome_completo || '').toLowerCase()
  const apelido = (prof.apelido || '').toLowerCase()

  // Acumula serviços do profissional para ticket médio e mix
  const mixServicos: Record<string, { qtd: number; valor: number }> = {}
  for (const row of (periodos || [])) {
    for (const item of (row.prof_servicos || [])) {
      if (!isProfissional(item.profissional || '', nomeCompleto, apelido)) continue
      const s = (item.servico || '').trim().toUpperCase()
      if (!s) continue
      if (!mixServicos[s]) mixServicos[s] = { qtd: 0, valor: 0 }
      mixServicos[s].qtd += Number(item.quantidade || 0)
      mixServicos[s].valor += Number(item.valor || 0)
    }
  }

  const totalQtd = Object.values(mixServicos).reduce((s, v) => s + v.qtd, 0)
  const totalValor = Object.values(mixServicos).reduce((s, v) => s + v.valor, 0)
  const ticketMedio = totalQtd > 0 ? totalValor / totalQtd : 0

  // Ticket por visita/comanda: totalValor ÷ comandas únicas (calculado depois de carregar rows)

  // Comissão média ponderada pelos serviços mais vendidos
  const habilitadosIds: string[] = Array.isArray(prof.servicos_habilitados) ? prof.servicos_habilitados : []
  const { data: servicosSalao } = await supabaseAdmin
    .from('salao_servicos')
    .select('id, nome, comissao_valor, ciclo_retorno_dias')
    .eq('salao_id', salaoId)
    .eq('ativo', true)

  // Mapa nome → ciclo de retorno em dias
  const cicloPorServico: Record<string, number> = {}
  for (const s of (servicosSalao || [])) {
    if (s.ciclo_retorno_dias) cicloPorServico[s.nome.toUpperCase()] = s.ciclo_retorno_dias
  }

  let totalQtdComissao = 0, totalComissaoPonderada = 0
  const top10 = Object.entries(mixServicos).sort((a, b) => b[1].qtd - a[1].qtd).slice(0, 10)
  for (const [nome, v] of top10) {
    const serv = (servicosSalao || []).find((s: any) => s.nome.toUpperCase() === nome && habilitadosIds.includes(s.id))
    if (serv?.comissao_valor) {
      totalQtdComissao += v.qtd
      totalComissaoPonderada += serv.comissao_valor * v.qtd
    }
  }
  const comissaoMedia = totalQtdComissao > 0 ? totalComissaoPonderada / totalQtdComissao : 0

  // Busca todos os atendimentos do salão com paginação
  let rows: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw')
      .select('cliente, celular, profissional, data_comanda, servico, categoria')
      .eq('salao_id', salaoId)
      .order('data_comanda')
      .range(from, from + 999)
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  // Conta comandas únicas deste profissional para calcular ticket por visita
  const comandasUnicas = new Set<string>()
  for (const r of rows) {
    if (isProfissional(r.profissional || '', prof.nome_completo, prof.apelido || '') && r.data_comanda) {
      comandasUnicas.add(r.data_comanda)
    }
  }
  const ticketVisita = comandasUnicas.size > 0 ? totalValor / comandasUnicas.size : ticketMedio

  const hoje = new Date()
  const DIAS_SAIU = 90
  const DIAS_MINIMO_PADRAO = 7 // fallback quando serviço não tem ciclo cadastrado

  // Por cliente: histórico com ESTE profissional e com outros
  const clienteComProf: Record<string, {
    datas: Date[]; servicos: Set<string>; celular: string
  }> = {}

  const clienteGeral: Record<string, {
    ultimaData: Date | null; ultimaDataComProf: Date | null
    visitasDepois: Array<{ data: Date; profissional: string; cargo: string; servico: string }>
    celular: string
  }> = {}

  for (const r of rows) {
    const cli = (r.cliente || '').trim().toUpperCase()
    if (!cli || cli === 'NAN') continue

    const data = parseDataBR(r.data_comanda)
    if (!data) continue

    const celular = r.celular || ''
    const profNome = r.profissional || ''
    const servico = (r.servico || '').trim()
    const ehEsteProf = isProfissional(profNome, prof.nome_completo, prof.apelido || '')

    // Registra no histórico geral
    if (!clienteGeral[cli]) {
      clienteGeral[cli] = { ultimaData: null, ultimaDataComProf: null, visitasDepois: [], celular }
    }
    if (celular && !clienteGeral[cli].celular) clienteGeral[cli].celular = celular
    if (!clienteGeral[cli].ultimaData || data > clienteGeral[cli].ultimaData!) {
      clienteGeral[cli].ultimaData = data
    }

    if (ehEsteProf) {
      // Registra como visita com este profissional
      if (!clienteComProf[cli]) clienteComProf[cli] = { datas: [], servicos: new Set(), celular }
      clienteComProf[cli].datas.push(data)
      if (servico) clienteComProf[cli].servicos.add(servico)
      if (celular && !clienteComProf[cli].celular) clienteComProf[cli].celular = celular
      if (!clienteGeral[cli].ultimaDataComProf || data > clienteGeral[cli].ultimaDataComProf!) {
        clienteGeral[cli].ultimaDataComProf = data
      }
    }
  }

  // Segunda passagem: registra visitas DEPOIS da última com este profissional
  for (const r of rows) {
    const cli = (r.cliente || '').trim().toUpperCase()
    if (!cli || cli === 'NAN') continue
    if (!clienteComProf[cli]) continue // só interessa quem já foi atendido por este prof

    const data = parseDataBR(r.data_comanda)
    if (!data) continue

    const ultimaComProf = clienteGeral[cli].ultimaDataComProf
    if (!ultimaComProf || data <= ultimaComProf) continue

    const profNome = r.profissional || ''
    const ehEsteProf = isProfissional(profNome, prof.nome_completo, prof.apelido || '')
    if (ehEsteProf) continue // visita com este mesmo prof depois → não é perdido

    const cargo = resolverCargo(profNome, profsCadastrados)
    clienteGeral[cli].visitasDepois.push({
      data, profissional: profNome, cargo, servico: (r.servico || '').trim()
    })
  }

  // Classifica cada cliente
  const sub1: any[] = [] // foram para outro serviço
  const sub2: any[] = [] // saíram do salão
  const sub3: any[] = [] // migraram para mesmo cargo

  for (const [cli, hist] of Object.entries(clienteComProf)) {
    const geral = clienteGeral[cli]
    const ultimaComProf = geral.ultimaDataComProf
    const ultimaGeral = geral.ultimaData
    if (!ultimaComProf) continue
    if (!ultimaGeral) continue

    const ultimaGeralMs = ultimaGeral.getTime()
    const ultimaComProfMs = ultimaComProf.getTime()
    const diasAusente = Math.floor((hoje.getTime() - ultimaGeral.getTime()) / 86400000)
    const ultimosServicosComProf = Array.from(hist.servicos).slice(0, 3).join(', ')
    const dataUltima = ultimaComProf.toLocaleDateString('pt-BR')
    const dataUltimaGeral = ultimaGeral.toLocaleDateString('pt-BR')
    const celular = hist.celular || geral.celular || ''
    const visitasDepois = geral.visitasDepois

    // Caso A: última visita ao salão FOI com este profissional (nunca voltou depois)
    if (ultimaGeralMs <= ultimaComProfMs) {
      // Só classifica como "Saiu do salão" se ausente 90+ dias — senão pode ainda voltar
      if (diasAusente >= DIAS_SAIU) {
        sub2.push({
          cliente: cli,
          celular,
          ultimo_servico_com_prof: ultimosServicosComProf,
          ultima_visita_com_prof: dataUltima,
          ultima_visita_salao: dataUltimaGeral,
          dias_ausente: diasAusente,
        })
      }
      continue
    }

    // Caso B: voltou ao salão DEPOIS de sair deste profissional
    // Se não há visitas rastreáveis depois → dado inconsistente, ignora
    if (!visitasDepois.length) continue

    // Período mínimo baseado no ciclo do último serviço feito com este prof
    // Fallback: 7 dias se serviço não tiver ciclo cadastrado
    const ultimoServico = Array.from(hist.servicos).slice(-1)[0] || ''
    const cicloServico = cicloPorServico[ultimoServico.toUpperCase()] || DIAS_MINIMO_PADRAO
    const diasDesdeUltimaComProf = Math.floor((hoje.getTime() - ultimaComProfMs) / 86400000)
    if (diasDesdeUltimaComProf < cicloServico) continue

    // Profissionais únicos após a saída
    const profsDepoisMap: Record<string, { cargo: string; servicos: Set<string>; count: number }> = {}
    for (const v of visitasDepois) {
      const n = v.profissional
      if (!profsDepoisMap[n]) profsDepoisMap[n] = { cargo: v.cargo, servicos: new Set(), count: 0 }
      profsDepoisMap[n].count++
      if (v.servico) profsDepoisMap[n].servicos.add(v.servico)
    }

    // Ordena por quantidade de visitas
    const profsOrdenados = Object.entries(profsDepoisMap)
      .sort((a, b) => b[1].count - a[1].count)

    const nomesProfsDepois = profsOrdenados.map(([nome]) => nome).join(', ')
    const servicosAgora = profsOrdenados
      .flatMap(([, v]) => Array.from(v.servicos))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 3).join(', ')

    // Verifica se algum prof depois tem o mesmo cargo
    // Guard: só compara cargo se cargoPrincipal não for vazio
    function mesmoCargo(c: string): boolean {
      if (!cargoPrincipal || !c) return false
      if (c === cargoPrincipal) return true
      if (cargoPrincipal.includes('manicure') && c.includes('manicure')) return true
      if (cargoPrincipal.includes('pedicure') && c.includes('pedicure')) return true
      if (cargoPrincipal.includes('cabeleir') && c.includes('cabeleir')) return true
      if (cargoPrincipal.includes('colorist') && c.includes('colorist')) return true
      return false
    }

    const temMesmoCargo = profsOrdenados.some(([, v]) => mesmoCargo(v.cargo.toLowerCase()))

    const profMesmoCargo = profsOrdenados
      .filter(([, v]) => mesmoCargo(v.cargo.toLowerCase()))
      .map(([nome, v]) => `${nome} (${v.cargo})`)
      .join(', ')

    if (temMesmoCargo) {
      sub3.push({
        cliente: cli,
        celular,
        ultimo_servico_com_prof: ultimosServicosComProf,
        ultima_visita_com_prof: dataUltima,
        ultima_visita_salao: dataUltimaGeral,
        migrou_para: profMesmoCargo,
        faz_agora: servicosAgora,
      })
    } else {
      sub1.push({
        cliente: cli,
        celular,
        ultimo_servico_com_prof: ultimosServicosComProf,
        ultima_visita_com_prof: dataUltima,
        ultima_visita_salao: dataUltimaGeral,
        vai_agora_com: nomesProfsDepois,
        faz_agora: servicosAgora,
      })
    }
  }

  // Ordena por data mais recente primeiro
  const sortData = (a: any, b: any) => {
    const da = parseDataBR(a.ultima_visita_com_prof)
    const db = parseDataBR(b.ultima_visita_com_prof)
    return (db?.getTime() || 0) - (da?.getTime() || 0)
  }

  return NextResponse.json({
    outro_servico: sub1.sort(sortData),
    saiu_salao: sub2.sort((a, b) => b.dias_ausente - a.dias_ausente),
    outra_manicure: sub3.sort(sortData),
    total: sub1.length + sub2.length + sub3.length,
    ticket_medio: Math.round(ticketMedio * 100) / 100,
    ticket_visita: Math.round(ticketVisita * 100) / 100,
    comissao_media: Math.round(comissaoMedia * 100) / 100,
  })
}
