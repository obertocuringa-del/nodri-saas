import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, crmBloqueado } from '@/lib/apiAuth'
import { carregarConfig, carregarFila, enfileirar, dataNoTexto } from '@/lib/crmConfirmacao'
import { datasDoSalao } from '@/lib/crmCampanhas'

export const dynamic = 'force-dynamic'

// "Confirmar no sistema agora" (CRM).
//
// A conversa vira "Confirmou" de dois jeitos que a tela mostrava IGUAL:
//   - automático: a cliente diz "Sim", a extensão marca o agendamento no Avec
//     (fica azul) e só então sai o "Combinado" e a conversa vira "Confirmou";
//   - na mão: alguém clica em "Definir status > Confirmou". Isso só muda a
//     etiqueta do CRM: não marca o Avec e não manda o "Combinado".
// Caso real (22/10/2026, Rafaela): a automação não conseguiu marcar, a
// recepção clicou "Confirmou", e a tela passou a dizer "já confirmou" com o
// Avec ainda em "Agendado".
//
// GET diz se a confirmação foi só no CRM. POST põe o pedido na MESMA fila que
// a ponte usa quando a cliente responde "Sim"; a extensão marca o Avec e manda
// o "Combinado" (ver concluirConfirmacao).

const AUTOMATICO = 'Confirmação automática'

async function sessaoDoSalao() {
  const sess = await getSessao()
  if (!sess) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  if (sess.role === 'profissional' || await crmBloqueado()) {
    return { erro: NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 }) }
  }
  return { sess }
}

const brParaIso = (br: string) => br.split('/').reverse().join('-')

/** O que a conversa diz sobre o agendamento: a data escrita na última mensagem do salão. */
async function dataDaConfirmacao(conversaId: string): Promise<string> {
  const { data } = await supabaseAdmin.from('crm_mensagens').select('texto')
    .eq('conversa_id', conversaId).eq('direcao', 'saida')
    .order('criado_em', { ascending: false }).limit(5)
  for (const m of data || []) {
    const d = dataNoTexto(String(m.texto || ''))
    if (d) return d
  }
  return ''
}

/** A confirmação mais recente foi de gente (e não da automação)? E quando foi. */
async function ultimaConfirmacao(conversaId: string) {
  const { data } = await supabaseAdmin.from('crm_eventos').select('autor_nome, criado_em')
    .eq('conversa_id', conversaId).eq('para_estado', 'confirmado').in('tipo', ['fechou', 'mudou_estado'])
    .order('criado_em', { ascending: false }).limit(1)
  const e: any = data?.[0]
  return e ? { porGente: e.autor_nome !== AUTOMATICO, quando: new Date(e.criado_em).getTime() } : null
}

async function conversaDoSalao(id: string, salaoId: string) {
  const { data } = await supabaseAdmin.from('crm_conversas').select('id, estado, contato_id')
    .eq('id', id).eq('salao_id', salaoId).maybeSingle()
  return data as any
}

export async function GET(req: NextRequest) {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro
  const id = new URL(req.url).searchParams.get('conversa') || ''
  const c = id ? await conversaDoSalao(id, sess!.salaoId) : null
  if (!c) return NextResponse.json({ so_crm: false, na_fila: false })

  const fila = await carregarFila(sess!.salaoId)
  const naFila = fila.some(p => p.conversa_id === c.id)
  if (c.estado !== 'confirmado') return NextResponse.json({ so_crm: false, na_fila: naFila })

  const ultima = await ultimaConfirmacao(c.id)
  let soCrm = !!ultima?.porGente
  if (soCrm) {
    // Só interessa enquanto o agendamento ainda não passou. Sem data na
    // mensagem, só vale para uma confirmação recente: conversa antiga não
    // pode acender aviso.
    const data = await dataDaConfirmacao(c.id)
    if (data) soCrm = brParaIso(data) >= datasDoSalao().hoje.iso
    else soCrm = !!ultima && Date.now() - ultima.quando < 36 * 3600e3
  }
  return NextResponse.json({ so_crm: soCrm, na_fila: naFila })
}

export async function POST(req: NextRequest) {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro
  const b = await req.json().catch(() => ({} as any))
  const salaoId = sess!.salaoId
  const c = await conversaDoSalao(String(b?.conversa_id || ''), salaoId)
  if (!c) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })
  if (c.estado !== 'confirmado') return NextResponse.json({ error: 'Esta conversa não está como "Confirmou".' }, { status: 400 })

  const conf = await carregarConfig(salaoId)
  if (!conf.ligada) return NextResponse.json({ error: 'A confirmação automática está desligada em CRM > Configurar.' }, { status: 400 })

  const { data: ct } = await supabaseAdmin.from('crm_contatos').select('id, telefone, nome, cliente_nome')
    .eq('id', c.contato_id).maybeSingle()
  if (!ct?.telefone) return NextResponse.json({ error: 'A conversa não tem telefone para localizar a cliente no sistema.' }, { status: 400 })

  // Se a recepção já respondeu depois da última fala da cliente, o "Combinado"
  // automático seria uma resposta repetida: marca o Avec e não manda.
  const { data: dela } = await supabaseAdmin.from('crm_mensagens').select('criado_em')
    .eq('conversa_id', c.id).eq('direcao', 'entrada').order('criado_em', { ascending: false }).limit(1)
  let semCombinado = false
  if (dela?.[0]) {
    const { data: depois } = await supabaseAdmin.from('crm_mensagens').select('autor_nome')
      .eq('conversa_id', c.id).eq('direcao', 'saida').gt('criado_em', dela[0].criado_em)
      .neq('autor_nome', AUTOMATICO).neq('autor_nome', 'Boas-vindas automáticas').limit(1)
    semCombinado = !!depois?.length
  }

  const data = (await dataDaConfirmacao(c.id)) || datasDoSalao().amanha.br
  const entrou = await enfileirar(salaoId, {
    conversa_id: c.id, contato_id: c.contato_id,
    telefone: ct.telefone, nome: ct.cliente_nome || ct.nome || '', data,
    ...(semCombinado ? { sem_combinado: true } : {}),
  })
  if (!entrou) return NextResponse.json({ ok: true, ja_na_fila: true })

  await supabaseAdmin.from('crm_eventos').insert({
    salao_id: salaoId, conversa_id: c.id, tipo: 'mudou_estado',
    de_estado: 'confirmado', para_estado: 'confirmado',
    autor_id: (sess as any).usuarioId || null, autor_nome: (sess as any).nome || 'Salão',
    detalhe: 'Pediu a confirmação no sistema' + (semCombinado ? ' (sem mandar o Combinado: já houve resposta)' : ''),
  })
  return NextResponse.json({ ok: true, sem_combinado: semCombinado, data })
}
