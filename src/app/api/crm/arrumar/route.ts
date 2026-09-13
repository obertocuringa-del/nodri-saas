import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { proximaAcaoPadrao, tipoDaMensagemDoSalao, ESTADO_DO_TIPO, PASSIVAS_DO_DISPARO } from '@/lib/crm'
import { nomeNaMensagem } from '@/lib/crmNomes'
import { paginar } from '@/lib/paginar'

export const dynamic = 'force-dynamic'

// ── Arrumar o que ficou para trás ───────────────────────────────────────────
//
// Toda regra nova vale da hora em que entrou no ar para a frente. O que já
// estava gravado continua como estava, e o salão fica olhando para uma tela
// que diz uma coisa enquanto o sistema já pensa outra. Esta rota acerta o
// passado, uma vez, com a pessoa olhando.
//
// Duas arrumações, as duas medidas em 12/09/2026:
//
//   PASTA  -- disparo que caiu em "Aguardando cliente" antes de a regra de
//             ritmo existir. Eram 205 conversas, e é o que fazia a recepção
//             parar de abrir a pasta.
//   NOME   -- 276 de 300 conversas apareciam como "Contato 315487". O nome
//             está escrito na mensagem que o próprio salão mandou.
//
// Nada aqui é automático: roda quando alguém pede, e sem `aplicar=1` só conta
// o que faria. Mexer em centenas de linhas por conta própria, calado, é o
// tipo de ajuda que ninguém pediu.

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Só o dono do salão.' }, { status: 403 })

  const aplicar = new URL(req.url).searchParams.get('aplicar') === '1'
  const salaoId = sess.salaoId

  // ── 1. Disparo que ficou em "Aguardando cliente" ─────────────────────────
  //
  // O critério é o mesmo do ao vivo, só que olhando para trás: mensagem do
  // salão que saiu para VÁRIAS pessoas no mesmo minuto. Só mexe em conversa
  // que está em 'aguardando' -- Preciso agir, Follow-up, Pausadas, Agendadas
  // e Confirmou não se tocam, pela mesma razão de sempre.
  // Em páginas: o `.limit(4000)` daqui devolvia 1000, e a recuperação de nomes
  // só olhava as mil mensagens mais recentes. Ver src/lib/paginar.ts.
  const { dados: saidas } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_mensagens')
    .select('conversa_id, texto, criado_em')
    .eq('salao_id', salaoId).eq('direcao', 'saida')
    .order('criado_em', { ascending: false })
    .range(de, ate), 40000)

  // Agrupa por minuto: disparo sai em rajada, resposta de gente não.
  const porMinuto = new Map<string, Set<string>>()
  const minutoDaMensagem = new Map<string, string>()
  for (const m of saidas || []) {
    if (!m.conversa_id) continue
    const minuto = String(m.criado_em).slice(0, 16)   // AAAA-MM-DDTHH:MM
    if (!porMinuto.has(minuto)) porMinuto.set(minuto, new Set())
    porMinuto.get(minuto)!.add(m.conversa_id)
    // A última (mais recente) de cada conversa manda, e a lista já vem
    // ordenada do mais novo para o mais velho.
    if (!minutoDaMensagem.has(m.conversa_id)) minutoDaMensagem.set(m.conversa_id, minuto)
  }

  const deRajada = new Set<string>()
  for (const [conversaId, minuto] of minutoDaMensagem) {
    const juntas = porMinuto.get(minuto)
    if (juntas && juntas.size >= 3) deRajada.add(conversaId)
  }

  const { data: emAguardando } = await supabaseAdmin
    .from('crm_conversas').select('id')
    .eq('salao_id', salaoId).eq('estado', 'aguardando')
    .limit(1000)

  const paraPromo = (emAguardando || []).map(c => c.id).filter(id => deRajada.has(id))

  // ── 2. Histórico varrido para dentro do Follow-up ────────────────────────
  //
  // O relógio levava conversa importada para o Follow-up junto com as de
  // verdade. Resultado medido: 475 de 476 eram importadas e UMA era do salão.
  // O relógio já foi corrigido; estas aqui ficaram e voltam para "Aguardando",
  // que é de onde nunca deviam ter saído.
  const { data: fuImportadas } = await supabaseAdmin
    .from('crm_conversas').select('id')
    .eq('salao_id', salaoId).eq('estado', 'follow_up').eq('importada', true)
    .limit(3000)
  const paraAguardando = (fuImportadas || []).map(c => c.id)

  // ── 3. Presa em "Preciso agir" depois de respondida ──────────────────────
  //
  // Enquanto a regra de disparo olhava o TEXTO, resposta de verdade era
  // marcada como campanha -- e campanha não tira ninguém de "Preciso agir",
  // que é a proteção certa para o caso errado. Resultado: a RENATA perguntou
  // "A Daiane estará aí?", a recepção respondeu dois minutos depois, e a
  // conversa continuou na fila como se ninguém tivesse falado com ela.
  //
  // A regra já foi corrigida (vale quem falou nas últimas 48h, não o texto).
  // Estas aqui ficaram para trás: a última mensagem é do SALÃO e mesmo assim
  // elas estão em "Preciso agir". Quem já foi respondida sai da fila.
  const { data: naFila } = await supabaseAdmin
    .from('crm_conversas').select('id, ultima_de, ultima_em')
    .eq('salao_id', salaoId).eq('estado', 'acao_necessaria')
    .limit(1000)

  const respondidas: string[] = []
  for (const c of naFila || []) {
    // A última mensagem REAL da conversa, não o resumo -- o resumo não é
    // atualizado justamente quando a mensagem entra como campanha.
    const { data: ult } = await supabaseAdmin
      .from('crm_mensagens').select('direcao, criado_em')
      .eq('conversa_id', c.id).order('criado_em', { ascending: false }).limit(1)
    if (ult?.[0]?.direcao === 'saida') respondidas.push(c.id)
  }

  // ── 4. Contato sem nome ──────────────────────────────────────────────────
  const { data: semNome } = await supabaseAdmin
    .from('crm_contatos').select('id')
    .eq('salao_id', salaoId).is('nome', null)
    .limit(2000)

  const idsSemNome = new Set((semNome || []).map(c => c.id))
  const nomesAchados = new Map<string, string>()

  if (idsSemNome.size) {
    // De qual contato é cada conversa -- a mensagem guarda a conversa, não o
    // contato.
    const { data: conversas } = await supabaseAdmin
      .from('crm_conversas').select('id, contato_id')
      .eq('salao_id', salaoId).limit(3000)
    const contatoDaConversa = new Map<string, string>()
    for (const c of conversas || []) contatoDaConversa.set(c.id, c.contato_id)

    // Da mais nova para a mais velha: o nome mais recente é o que vale.
    for (const m of saidas || []) {
      const contatoId = m.conversa_id ? contatoDaConversa.get(m.conversa_id) : null
      if (!contatoId || !idsSemNome.has(contatoId) || nomesAchados.has(contatoId)) continue
      const nome = nomeNaMensagem(m.texto || '')
      if (nome) nomesAchados.set(contatoId, nome)
    }
  }

  // ── 5. Conversa duplicada depois de decidida ─────────────────────────────
  //
  // Antes de 13/09/2026, conversa fechada ("Agendou", "Nao fechou") nunca
  // recebia mensagem: qualquer coisa que chegasse depois abria uma conversa
  // nova. Maria Jose agendou, a recepcao clicou em Agendou, e o "Ok.Obrigada"
  // dela virou uma segunda Maria Jose na lista. Catorze casos num dia so.
  //
  // A regra mudou (mensagem na mesma semana vai para a conversa que ja
  // existe -- ver /api/crm/ponte), mas as duplicadas ja gravadas ficaram.
  // Aqui elas voltam para dentro da conversa original: mensagens e eventos
  // mudam de conversa, a decisao mais recente vale, e a duplicada some.
  //
  // So mexe no que nasceu nos ultimos 7 dias: e o periodo em que a regra
  // antiga fez estrago com a recepcao usando a tela. Antes disso nao havia
  // ninguem clicando em Agendou, entao nao ha duplicada para fundir.
  const FECHADOS = ['agendado', 'confirmado', 'sem_conversao', 'desmarcou']
  const semanaAtras = Date.now() - 7 * 864e5
  const { dados: todasConversas } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_conversas')
    .select('id, contato_id, estado, criado_em, fechada_em, ultima_em, ultima_de, ultima_previa, nao_lidas, motivo_perda')
    .eq('salao_id', salaoId)
    .order('criado_em', { ascending: true })
    .range(de, ate))
  const porContato = new Map<string, any[]>()
  for (const c of todasConversas || []) {
    if (!c.contato_id) continue
    if (!porContato.has(c.contato_id)) porContato.set(c.contato_id, [])
    porContato.get(c.contato_id)!.push(c)
  }
  // Pares (duplicada -> original). A original e a fechada MAIS ANTIGA cuja
  // decisao veio ate 7 dias antes de a duplicada nascer: numa cadeia de tres
  // (agendou, confirmou, agradeceu) tudo cai na primeira.
  const fusoes: { nova: any; alvo: any }[] = []
  for (const lista of porContato.values()) {
    for (const n of lista) {
      const nasceu = new Date(n.criado_em).getTime()
      if (nasceu < semanaAtras) continue
      const alvo = lista.find(f => f.id !== n.id && FECHADOS.includes(f.estado) && f.fechada_em
        && new Date(f.fechada_em).getTime() < nasceu
        && nasceu < new Date(f.fechada_em).getTime() + 7 * 864e5)
      if (alvo) fusoes.push({ nova: n, alvo })
    }
  }

  if (!aplicar) {
    return NextResponse.json({
      simulacao: true,
      conversas_duplicadas_para_fundir: fusoes.length,
      conversas_para_promocao: paraPromo.length,
      follow_up_que_volta_para_aguardando: paraAguardando.length,
      presas_em_preciso_agir: respondidas.length,
      contatos_que_ganham_nome: nomesAchados.size,
      exemplos_de_nome: [...nomesAchados.values()].slice(0, 12),
    })
  }

  const agora = new Date().toISOString()
  let mudadas = 0
  // Em lotes de 100: um `in` com mil ids estoura o tamanho da URL do PostgREST.
  for (let i = 0; i < paraPromo.length; i += 100) {
    const lote = paraPromo.slice(i, i + 100)
    const { error } = await supabaseAdmin.from('crm_conversas').update({
      estado: 'aguardando_promo',
      proxima_acao: proximaAcaoPadrao('aguardando_promo'),
      atualizado_em: agora,
    }).in('id', lote)
    if (!error) mudadas += lote.length
  }

  // Histórico de volta para Aguardando.
  let devolvidas = 0
  for (let i = 0; i < paraAguardando.length; i += 100) {
    const lote = paraAguardando.slice(i, i + 100)
    const { error } = await supabaseAdmin.from('crm_conversas').update({
      estado: 'aguardando',
      proxima_acao: proximaAcaoPadrao('aguardando'),
      atualizado_em: agora,
    }).in('id', lote)
    if (!error) devolvidas += lote.length
  }

  // Ja respondidas, presas em "Preciso agir": saem para Aguardando.
  let destravadas = 0
  for (let i = 0; i < respondidas.length; i += 100) {
    const lote = respondidas.slice(i, i + 100)
    const { error } = await supabaseAdmin.from('crm_conversas').update({
      estado: 'aguardando',
      proxima_acao: proximaAcaoPadrao('aguardando'),
      aguardando_desde: null,
      ultima_de: 'salao',
      atualizado_em: agora,
    }).in('id', lote)
    if (!error) destravadas += lote.length
  }

  let nomeados = 0
  for (const [contatoId, nome] of nomesAchados) {
    const { error } = await supabaseAdmin.from('crm_contatos')
      .update({ nome }).eq('id', contatoId)
    if (!error) nomeados++
  }

  // Duplicadas de volta para a conversa original.
  let fundidas = 0
  const apagadas = new Set<string>()
  for (const { nova, alvo } of fusoes) {
    if (apagadas.has(nova.id) || apagadas.has(alvo.id)) continue
    const { error: e1 } = await supabaseAdmin.from('crm_mensagens')
      .update({ conversa_id: alvo.id }).eq('conversa_id', nova.id)
    if (e1) continue
    await supabaseAdmin.from('crm_eventos')
      .update({ conversa_id: alvo.id }).eq('conversa_id', nova.id)
    const decidida = FECHADOS.includes(nova.estado)
    const patch: any = {
      ultima_em: nova.ultima_em && (!alvo.ultima_em || nova.ultima_em > alvo.ultima_em) ? nova.ultima_em : alvo.ultima_em,
      ultima_de: nova.ultima_de,
      ultima_previa: nova.ultima_previa,
      // Aberta com a cliente falando por ultimo: fica com nao lida para
      // aparecer em "Preciso agir" ate alguem abrir -- e o que a regra nova
      // faria.
      nao_lidas: (!decidida && nova.ultima_de === 'cliente')
        ? Math.max(Number(nova.nao_lidas || 0), 1) : Number(nova.nao_lidas || 0),
      atualizado_em: agora,
    }
    if (decidida) {
      patch.estado = nova.estado
      patch.fechada_em = nova.fechada_em
      patch.motivo_perda = nova.motivo_perda
      patch.proxima_acao = proximaAcaoPadrao(nova.estado)
    }
    const { error: e2 } = await supabaseAdmin.from('crm_conversas').update(patch).eq('id', alvo.id)
    if (e2) continue
    const { error: e3 } = await supabaseAdmin.from('crm_conversas').delete().eq('id', nova.id)
    if (!e3) { apagadas.add(nova.id); fundidas++; Object.assign(alvo, patch) }
  }

  // ── 6. Feedback, confirmação e lista, cada um na sua pasta ────────────────
  //
  // As três pastas nasceram em 13/09/2026. O que já estava em "Aguardando" e
  // em "Listas" foi classificado pela mesma frase que vale ao vivo: a última
  // mensagem do salão diz se é feedback, confirmação ou lista. Só mexe em
  // conversa cuja última fala é do salão e que está numa pasta passiva.
  let classificadas = 0
  const { dados: passivas } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_conversas').select('id, estado, ultima_de')
    .eq('salao_id', salaoId).in('estado', PASSIVAS_DO_DISPARO)
    .eq('ultima_de', 'salao').range(de, ate))
  for (const c of passivas || []) {
    const { data: ult } = await supabaseAdmin
      .from('crm_mensagens').select('texto')
      .eq('conversa_id', c.id).eq('direcao', 'saida')
      .order('criado_em', { ascending: false }).limit(1)
    const tipo = tipoDaMensagemDoSalao((ult || [])[0]?.texto)
    if (!tipo) continue
    const destino = ESTADO_DO_TIPO[tipo]
    if (destino === c.estado) continue
    classificadas++
    if (!aplicar) continue
    await supabaseAdmin.from('crm_conversas').update({
      estado: destino, proxima_acao: proximaAcaoPadrao(destino), atualizado_em: agora,
    }).eq('id', c.id)
    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: c.id, tipo: 'mudou_estado',
      de_estado: c.estado, para_estado: destino,
      autor_nome: 'Arrumação', detalhe: 'Classificada pela frase da mensagem',
    })
  }

  return NextResponse.json({
    ok: true,
    classificadas_por_tipo: classificadas,
    conversas_duplicadas_fundidas: fundidas,
    conversas_para_promocao: mudadas,
    follow_up_que_voltou_para_aguardando: devolvidas,
    presas_destravadas: destravadas,
    contatos_que_ganharam_nome: nomeados,
  })
}
