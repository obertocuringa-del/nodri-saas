import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { paginar } from '@/lib/paginar'
import { escritaBloqueadaSub, getSessao, sessaoModoCaixa } from '@/lib/apiAuth'

/**
 * Quem pode mexer na lista de espera, e até onde.
 *
 * A rota usava o bloqueio geral (`escritaBloqueadaSub`), que barra o MODO CAIXA
 * em tudo. Só que a recepção nasce em Modo Caixa — está em RECEPCAO_PADRAO — e
 * Modo Caixa existe justamente para "executar e adicionar". Resultado: quem usa
 * a lista de espera o dia inteiro era exatamente quem não conseguia salvar.
 *
 * A régua passa a ser por operação:
 *   ADICIONAR   — pode. É o trabalho dela: chegou cliente, entra na fila.
 *   EXECUTAR    — pode. Marcar atendida/desistiu e anotar é andar com a fila.
 *   REESCREVER  — não. Nome, telefone e serviço são a ficha de outra pessoa.
 *   EXCLUIR     — não. Sumir com a fila de alguém não se desfaz.
 */
const CAMPOS_DE_EXECUCAO = new Set(['status', 'observacao'])

async function quemEscreve() {
  const s = await getSessao()
  if (!s || s.role === 'profissional') return { pode: false, soExecucao: false }
  return { pode: true, soExecucao: sessaoModoCaixa(s) }
}

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload?.salaoId || null
}

function norm(s: string): string {
  return (s || '').toUpperCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')
}
function parseBR(s: string): number {
  if (!s) return 0
  if (s.includes('/')) { const [d, m, y] = s.split('/'); return new Date(`${y}-${m}-${d}`).getTime() || 0 }
  return new Date(s).getTime() || 0
}

// GET — lista + baixa automática de quem já foi atendida (cruza com atendimentos_raw)
export async function GET() {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: lista } = await supabaseAdmin
    .from('lista_espera').select('*').eq('salao_id', salaoId).order('criado_em', { ascending: true })
  const itens: any[] = lista || []

  // Auto-baixa: se a cliente da fila aparece nos atendimentos no dia em que entrou (ou depois),
  // marca como atendida — cobre o caso da recepção esquecer de atualizar.
  const ativos = itens.filter(i => i.status === 'aguardando' || i.status === 'contatada' || i.status === 'remarcada')
  if (ativos.length) {
    try {
      // ── Só os atendimentos que PODEM dar baixa ──────────────────────────
      //
      // Aqui se lia a tabela INTEIRA de atendimentos (getAtendimentosRaw).
      // Medido em 11/10/2026 no Rouge: 132.094 linhas, 64 MB, para decidir a
      // situação de DUAS pessoas na fila. Pior: a conferência de frescor são
      // duas consultas (uma delas conta as 132 mil) em TODA abertura, e o robô
      // do Avec importa várias vezes por dia -- então a releitura caía com
      // frequência: 133 idas ao banco de mil em mil, a ~100 ms cada daqui até
      // São Paulo. A tela de quem está no telefone com a cliente levava
      // dezenas de segundos para abrir.
      //
      // A baixa só olha atendimento a partir de (entrada na fila − 12 h). Tudo
      // antes disso é incapaz de mudar o resultado: a conta pega o MAIOR
      // carimbo de cada cliente, e um carimbo mais velho que o corte nunca
      // vira baixa nem derruba um mais novo. Então a janela é exatamente
      // equivalente -- só não lê o que não serve.
      //
      // O corte é por `ano`/`mes` (conferido no banco: 100% preenchidos e
      // batendo com data_comanda), com UM MÊS A MAIS de folga, porque
      // `criado_em` é UTC e `data_comanda` é a data do salão -- na virada do
      // mês as duas não coincidem.
      const maisAntigo = Math.min(...ativos.map(i => new Date(i.criado_em).getTime())) - 12 * 3600000
      const de = new Date(maisAntigo)
      de.setUTCMonth(de.getUTCMonth() - 1)
      const anoDe = de.getUTCFullYear()
      const mesDe = de.getUTCMonth() + 1

      const { dados: atend } = await paginar((ini, fim) =>
        supabaseAdmin.from('atendimentos_raw')
          .select('cliente, data_comanda')
          .eq('salao_id', salaoId)
          .or(`ano.gt.${anoDe},and(ano.eq.${anoDe},mes.gte.${mesDe})`)
          .order('ano').order('mes').order('cliente')
          .range(ini, fim))

      const ultimoPorCliente: Record<string, number> = {}
      for (const r of atend) {
        const nome = norm(r.cliente || '')
        if (!nome) continue
        const ts = parseBR(r.data_comanda || '')
        if (ts && ts > (ultimoPorCliente[nome] || 0)) ultimoPorCliente[nome] = ts
      }
      const baixar: string[] = []
      const agora = new Date().toISOString()
      for (const i of ativos) {
        const ts = ultimoPorCliente[norm(i.cliente_nome)]
        const criadoTs = new Date(i.criado_em).getTime()
        if (ts && ts >= criadoTs - 12 * 3600000) baixar.push(i.id)
      }
      if (baixar.length) {
        await supabaseAdmin.from('lista_espera')
          .update({ status: 'atendida', atendida_em: agora, atualizado_em: agora })
          .in('id', baixar).eq('salao_id', salaoId)
        for (const i of itens) if (baixar.includes(i.id)) { i.status = 'atendida'; i.atendida_em = agora }
      }
    } catch { /* sem dados de atendimento ainda */ }
  }

  // Move para "não agendada" quem passou da data desejada e ainda está aguardando
  const hojeStr = new Date().toISOString().slice(0, 10)
  const mover = itens.filter(i => (i.status === 'aguardando' || i.status === 'contatada' || i.status === 'remarcada') && i.categoria === 'espera' && i.data_desejada && String(i.data_desejada).slice(0, 10) < hojeStr).map(i => i.id)
  if (mover.length) {
    await supabaseAdmin.from('lista_espera').update({ categoria: 'nao_agendada', atualizado_em: new Date().toISOString() }).in('id', mover).eq('salao_id', salaoId)
    for (const i of itens) if (mover.includes(i.id)) i.categoria = 'nao_agendada'
  }

  // O salao vai junto: o atalho do navegador guarda isso e assim a fila de um
  // salao nao aparece na tela de outro (ver a tela).
  return NextResponse.json({ lista: itens, salao: salaoId })
}

export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  // Adicionar é o trabalho da recepção — Modo Caixa entra aqui.
  if (!(await quemEscreve()).pode) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const b = await req.json()
  if (!b.cliente_nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('lista_espera').insert({
    salao_id: salaoId,
    cliente_nome: String(b.cliente_nome).trim(),
    telefone: b.telefone || null,
    servicos: Array.isArray(b.servicos) ? b.servicos : [],
    data_desejada: b.data_desejada || null,
    horario_desejado: b.horario_desejado || null,
    categoria: b.categoria || 'espera',
    status: 'aguardando',
    observacao: b.observacao || null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const quem = await quemEscreve()
  if (!quem.pode) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const b = await req.json()
  if (!b.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const patch: any = { atualizado_em: new Date().toISOString() }
  for (const k of ['cliente_nome', 'telefone', 'servicos', 'data_desejada', 'horario_desejado', 'categoria', 'status', 'observacao']) {
    if (b[k] === undefined) continue
    // Modo Caixa anda com a fila, mas não reescreve a ficha de ninguém. O campo
    // é ignorado em silêncio de propósito: recusar a gravação inteira faria o
    // "marcar como atendida" falhar por causa de um campo que a tela mandou
    // junto sem que ninguém tenha editado.
    if (quem.soExecucao && !CAMPOS_DE_EXECUCAO.has(k)) continue
    patch[k] = b[k]
  }
  if (b.status === 'atendida') patch.atendida_em = new Date().toISOString()
  const { data, error } = await supabaseAdmin.from('lista_espera').update(patch).eq('id', b.id).eq('salao_id', salaoId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  // Excluir continua fora do alcance do Modo Caixa: some com a fila de alguém
  // e não se desfaz. O caminho dela é marcar como atendida ou desistiu.
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id não informado' }, { status: 400 })
  const { error } = await supabaseAdmin.from('lista_espera').delete().eq('id', id).eq('salao_id', salaoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
