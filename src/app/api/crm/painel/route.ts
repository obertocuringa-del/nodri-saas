import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { minutosUteis } from '@/lib/crm'
import { paginar } from '@/lib/paginar'

export const dynamic = 'force-dynamic'

// ── O painel ────────────────────────────────────────────────────────────────
//
// Um CRM que não mede é só uma caixa de entrada com nome bonito. Este painel
// responde quatro perguntas que o salão hoje não consegue responder:
//
//   1. de cada dez pessoas que escreveram, quantas viraram horário?
//   2. quando a gente perde, perde por quê?
//   3. o anúncio que eu pago traz gente que fecha, ou só gente que pergunta?
//   4. quanto tempo a cliente espera até alguém responder?
//
// A quarta é a que mais dói e a que ninguém mede: o tempo é contado em minutos
// de EXPEDIENTE, não de relógio — mensagem que chega domingo à noite não conta
// como doze horas de atraso.

const ABERTOS = ['acao_necessaria', 'aguardando', 'aguardando_promo', 'follow_up', 'pausada']

export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'profissional') {
    return NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 })
  }

  const dias = Math.min(Math.max(Number(new URL(req.url).searchParams.get('dias') || 30), 1), 365)
  const desde = new Date(Date.now() - dias * 864e5).toISOString()

  // Em páginas: o limite de 5000 daqui devolvia 1000 calado, e o funil inteiro
  // saía calculado sobre uma fatia. Ver src/lib/paginar.ts.
  const { dados: conversas } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_conversas')
    .select('id, estado, origem, motivo_perda, criado_em, fechada_em, aguardando_desde, importada, contato:crm_contatos(etiquetas)')
    .eq('salao_id', sess.salaoId)
    .gte('criado_em', desde)
    .order('criado_em', { ascending: true })
    .range(de, ate))

  const lista = conversas || []

  // Conversa importada do celular não é oportunidade que o salão gerou. Contar
  // junto faria a conversão do mês nascer diluída por dois anos de histórico.
  const geradas = lista.filter((c: any) => !c.importada)

  const ehNova = (c: any) =>
    Array.isArray(c.contato?.etiquetas) && c.contato.etiquetas.includes('cliente nova')

  function funil(base: any[]) {
    // Confirmado e agendado sao a mesma vitoria vista em dois momentos; o
    // desmarque e uma perda com nome proprio -- houve horario e ele caiu.
    const agendadas = base.filter(c => c.estado === 'agendado' || c.estado === 'confirmado').length
    const desmarcadas = base.filter(c => c.estado === 'desmarcou').length
    const perdidas = base.filter(c => c.estado === 'sem_conversao').length + desmarcadas
    const abertas = base.filter(c => ABERTOS.includes(c.estado)).length
    const decididas = agendadas + perdidas
    return {
      total: base.length,
      agendadas,
      desmarcadas,
      perdidas,
      abertas,
      // Conversão sobre o que já foi DECIDIDO. Dividir pelo total faria a
      // conversão cair só porque há conversa em andamento — e o número serviria
      // para assustar, não para decidir.
      conversao: decididas ? Math.round((agendadas / decididas) * 100) : null,
    }
  }

  const contar = (campo: string, base: any[]) => {
    const m = new Map<string, { total: number; agendadas: number; perdidas: number }>()
    for (const c of base) {
      const k = String((c as any)[campo] || '').trim() || 'Não informado'
      if (!m.has(k)) m.set(k, { total: 0, agendadas: 0, perdidas: 0 })
      const l = m.get(k)!
      l.total++
      if (c.estado === 'agendado' || c.estado === 'confirmado') l.agendadas++
      if (c.estado === 'sem_conversao' || c.estado === 'desmarcou') l.perdidas++
    }
    return [...m.entries()]
      .map(([nome, v]) => ({
        nome, ...v,
        conversao: (v.agendadas + v.perdidas) ? Math.round((v.agendadas / (v.agendadas + v.perdidas)) * 100) : null,
      }))
      .sort((a, b) => b.total - a.total)
  }

  // ── Tempo de resposta ─────────────────────────────────────────────────────
  // Sai dos eventos: 'entrou' é a cliente falando, 'respondeu' é o salão. O par
  // mais próximo de cada conversa dá a espera real.
  // Em páginas. O limite de 12000 daqui devolvia 1000: o tempo de resposta e o
  // quadro de quem trabalhou a fila saíam calculados sobre uma fatia, e
  // pareciam certos.
  const { dados: eventos } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_eventos')
    .select('conversa_id, tipo, criado_em, autor_nome, para_estado')
    .eq('salao_id', sess.salaoId)
    .gte('criado_em', desde)
    .order('criado_em', { ascending: true })
    .range(de, ate), 60000)

  const esperas: number[] = []
  const pendente = new Map<string, string>()
  for (const e of eventos || []) {
    if (e.tipo === 'entrou') {
      if (!pendente.has(e.conversa_id)) pendente.set(e.conversa_id, e.criado_em)
    } else if (e.tipo === 'respondeu') {
      const inicio = pendente.get(e.conversa_id)
      if (!inicio) continue
      pendente.delete(e.conversa_id)
      esperas.push(minutosUteis(new Date(inicio), new Date(e.criado_em)))
    }
  }
  esperas.sort((a, b) => a - b)
  const mediana = esperas.length ? esperas[Math.floor(esperas.length / 2)] : null
  const ate15 = esperas.length
    ? Math.round((esperas.filter(m => m <= 15).length / esperas.length) * 100) : null

  // Quem está esperando AGORA. É o número que manda alguém levantar da cadeira.
  const agora = new Date()
  const esperandoAgora = lista
    .filter((c: any) => c.estado === 'acao_necessaria' && c.aguardando_desde)
    .map((c: any) => minutosUteis(new Date(c.aguardando_desde), agora))
  const piorEspera = esperandoAgora.length ? Math.max(...esperandoAgora) : 0

  // ── Quem trabalhou ────────────────────────────────────────────────────────
  //
  // Os eventos ja gravavam quem fez o que e ninguem lia. Nao e para vigiar
  // atendente: e para saber se o resultado ruim de um mes foi falta de
  // demanda ou falta de gente respondendo -- que sao dois problemas com
  // solucoes opostas, e hoje o salao chuta qual dos dois foi.
  //
  // O "Relogio" aparece na lista como qualquer outro: e honesto mostrar
  // quanto do trabalho o proprio sistema fez sozinho.
  const porPessoa = new Map<string, { respondeu: number; agendou: number; fechou: number; assumiu: number }>()
  for (const e of eventos || []) {
    const quem = String(e.autor_nome || '').trim()
    if (!quem || quem === 'Cliente') continue
    if (!porPessoa.has(quem)) porPessoa.set(quem, { respondeu: 0, agendou: 0, fechou: 0, assumiu: 0 })
    const l = porPessoa.get(quem)!
    if (e.tipo === 'respondeu') l.respondeu++
    else if (e.tipo === 'assumiu') l.assumiu++
    else if (e.para_estado === 'agendado') l.agendou++
    else if (e.para_estado === 'sem_conversao') l.fechou++
  }
  const pessoas = [...porPessoa.entries()]
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => (b.respondeu + b.agendou) - (a.respondeu + a.agendou))

  return NextResponse.json({
    dias,
    pessoas,
    geral: funil(geradas),
    novas: funil(geradas.filter(ehNova)),
    conhecidas: funil(geradas.filter(c => !ehNova(c))),
    motivos: contar('motivo_perda', geradas.filter(c => c.estado === 'sem_conversao')),
    desmarques: contar('motivo_perda', geradas.filter(c => c.estado === 'desmarcou')),
    origens: contar('origem', geradas),
    resposta: {
      amostra: esperas.length,
      mediana_min: mediana,
      ate_15_min: ate15,
      esperando_agora: esperandoAgora.length,
      pior_espera_min: piorEspera,
    },
    // Importadas ficam visíveis mas fora da conta, para ninguém achar que
    // sumiram — e para ninguém somá-las por engano.
    importadas: lista.length - geradas.length,
  })
}
