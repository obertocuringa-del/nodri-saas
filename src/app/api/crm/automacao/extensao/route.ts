import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { proximaAcaoPadrao } from '@/lib/crm'
import {
  salaoPelaChave, carregarConfig, carregarEstado, gravarEstado, processarRelatorio, hojeNoFuso,
  consumirLimpezaDeAbas,
  type LinhaRelatorio,
} from '@/lib/crmAutomacao'
import { carregarRobo } from '@/lib/crmRoboAvec'
import {
  carregarCampanhas, carregarEstados, estaNaHora, datasDoSalao, processarCampanha,
  type LinhaRel,
} from '@/lib/crmCampanhas'
import {
  carregarConfig as cfgConfirmacao, carregarFila, gravarFila,
} from '@/lib/crmConfirmacao'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── A porta da extensão ─────────────────────────────────────────────────────
//
// A extensão do Chrome se apresenta com a chave do salão (cabeçalho
// x-nodri-chave). GET diz o que fazer -- ligada?, de quanto em quanto tempo,
// que endereço abrir, que dia é hoje. POST entrega as linhas do relatório e
// recebe de volta o que foi enfileirado.

async function salaoDaRequisicao(req: NextRequest) {
  return salaoPelaChave(req.headers.get('x-nodri-chave') || '')
}

export async function GET(req: NextRequest) {
  const salaoId = await salaoDaRequisicao(req)
  if (!salaoId) return NextResponse.json({ error: 'Chave inválida' }, { status: 401 })

  // ── A virada servidor x salão ─────────────────────────────────────────────
  //
  // Só UM Chrome lê o Avec de cada salão. Com "rodar no servidor" ligado, a
  // extensão do computador do salão recebe "nada a fazer" (e não mexe no
  // Avec); desligado, quem recebe "nada a fazer" é o robô do servidor. A
  // extensão do servidor se apresenta com x-nodri-origem: servidor (o robô
  // grava isso nela ao abrir o Chrome).
  const origem = req.headers.get('x-nodri-origem') === 'servidor' ? 'servidor' : 'salao'
  const robo = await carregarRobo(salaoId)
  const vez = robo.no_servidor ? 'servidor' : 'salao'
  if (origem !== vez) {
    return NextResponse.json({
      // 15 minutos, não 1: quem está parada não tem o que fazer, e perguntar
      // de minuto em minuto são ~1.400 chamadas por dia por extensão à toa.
      // Em 01/10/2026 esse barulho encheu o registro do servidor e fez o
      // diagnóstico de um dia inteiro parado apontar para o lugar errado --
      // o que parecia a extensão do servidor perguntando sem parar era a de
      // um computador de fora, parada, perguntando sem parar.
      // Virar o interruptor continua acordando a outra em até 15 minutos.
      ligada: false, tarefa: null, limpar_abas: false, intervalo_seg: 900,
      parada: vez === 'servidor'
        ? 'Este salão roda no servidor NODRI: esta extensão fica parada.'
        : 'Este salão roda no computador do salão: o robô do servidor fica parado.',
    })
  }

  const cfg = await carregarConfig(salaoId)
  const est = await carregarEstado(salaoId)
  est.origem = origem
  // "Vista há X" na tela do dono: é o único jeito de saber que a extensão
  // continua viva no computador da recepção.
  est.visto_em = new Date().toISOString()
  // A partir da 1.4.0 a extensão conta as abas do Avec abertas e diz a versão:
  // com vários salões, é daqui que se vê um Chrome acumulando abas sem
  // precisar entrar no computador de cada um.
  const abas = Number(req.headers.get('x-nodri-abas'))
  if (req.headers.get('x-nodri-abas') !== null && Number.isFinite(abas) && abas >= 0) est.abas_avec = abas
  const versao = String(req.headers.get('x-nodri-versao') || '').slice(0, 20)
  if (versao) est.versao_ext = versao
  await gravarEstado(salaoId, est)
  // ── A ORDEM DAS TAREFAS ───────────────────────────────────────────────────
  //
  // A extensão não tem relógio: ela pergunta e o NODRI responde o que fazer
  // agora. Assim horário e intervalo se mudam na tela, sem tocar no computador
  // da recepção. Uma tarefa por vez, porque todas dividem a mesma aba do Avec
  // -- duas juntas trocariam a data uma da outra.
  //
  // A ordem é a de quem está ESPERANDO (ordem do dono, 02/10/2026):
  //
  //   1º  o profissional, que está com a cliente parada na frente dele;
  //   2º  a cliente que respondeu "confirmo" e espera o "Combinado";
  //   3º  o feedback, que pode sair a qualquer hora do dia.
  //
  // Só que o que dissolveu a disputa não foi uma fila de prioridade: foi uma
  // descoberta. A extensão lê o 0051 INTEIRO e devolve todas as linhas -- o
  // filtro de status é feito aqui dentro (ver o POST). Aviso ao profissional
  // (Aguardando/Em Atendimento) e feedback (Pago/Finalizado) são o MESMO
  // relatório, do MESMO dia. Então saem da MESMA leitura: o POST da campanha
  // de hoje processa os dois. O feedback deixou de custar uma volta e, com
  // isso, deixou de disputar lugar com quem tem gente esperando.
  //
  // O revezamento que existia aqui (uma volta para a campanha, uma para o
  // feedback) foi embora junto: não há mais o que revezar.
  const d = datasDoSalao(cfg.fuso)
  let tarefa: any = null
  const anterior = est.ultima_tarefa || null
  const campanhas = await carregarCampanhas(salaoId)
  const estados = await carregarEstados(salaoId)
  const naHora = campanhas
    .map(c => ({ c, q: estaNaHora(c, estados[c.id], cfg.fuso) }))
    .filter(x => x.q.sim)

  const tarefaDeCampanha = (c: (typeof campanhas)[number], q: { horario?: string | null }) => ({
    tipo: 'campanha', campanha_id: c.id, nome: c.nome,
    url_relatorio: cfg.url_relatorio,
    data: c.dia === 'amanha' ? d.amanha.br : d.hoje.br,
    statuses: c.statuses,
    horario_cumprido: q.horario || null,
  })

  const porHorario = naHora.find(x => x.c.quando.tipo === 'horarios')
  const porIntervalo = naHora.find(x => x.c.quando.tipo === 'intervalo')

  // ── A REGRA QUE MANDA EM TODAS AS OUTRAS ──────────────────────────────────
  //
  // Nunca duas voltas seguidas sem olhar o dia de HOJE.
  //
  // Ordem do dono, 02/10/2026: quem tem alguém esperando do outro lado é o
  // aviso ao profissional -- a cliente já está sentada na cadeira e ele ainda
  // não sabe. A confirmação do dia seguinte é automática e tem a noite inteira;
  // a marcação no Avec tem minutos. O profissional tem segundos.
  //
  // Então toda tarefa que não seja o dia de hoje cede a vez na volta seguinte.
  // O pior caso para o profissional passa a ser uma volta de atraso, e a
  // confirmação das 17:00 sai no máximo uma volta depois do horário -- o que,
  // para ela, não muda nada.
  //
  // É isto que impede o que já aconteceu: a fila de confirmação segurando o
  // salão inteiro (01/10, 15 pedidos, meia hora sem aviso nenhum).
  const olhouHoje = anterior === 'campanha' || anterior === 'feedback'
  if (!olhouHoje && porIntervalo) tarefa = tarefaDeCampanha(porIntervalo.c, porIntervalo.q)

  // 2ª: a campanha de HORÁRIO que venceu -- a confirmação do dia seguinte, às
  // 17:00 e 20:50. Acontece duas vezes por dia e a cliente conta com ela: meia
  // hora atrasada é o mesmo que não ter mandado. Fura a fila de marcação.
  if (!tarefa && porHorario) tarefa = tarefaDeCampanha(porHorario.c, porHorario.q)

  // 3ª: marcar Confirmado no Avec, em LOTE.
  //
  // 01/10/2026, 21h: 15 pedidos na fila, entregues de um em um, e enquanto
  // houvesse pedido esta era a ÚNICA tarefa que saía daqui. Meia hora de salão
  // sem avisar profissional nenhum. O lote resolve o represamento; quem garante
  // a vez do profissional é a regra do dia de hoje, logo acima.
  //
  // LOTE -- a extensão já abriu a aba, já logou e já leu o 0051; casar cinco
  // telefones contra as linhas que ela tem na mão custa quase o mesmo que casar
  // um. O caro é a volta, não o pedido.
  //
  // ── O pedido que a extensão pega e nunca devolve ──────────────────────────
  //
  // 01/10/2026: o robô ficou um dia inteiro sem mandar NADA. As três
  // tentativas de concluirConfirmacao só contam quando a extensão RESPONDE --
  // e ela pode não responder: a tarefa abre aba, lê o relatório, vai à agenda
  // e marca; se o Chrome travar no meio, o service worker morre sem chegar nem
  // no catch. O pedido ficava com "tentativas: 0" e era reentregue a cada 30
  // segundos, para sempre. Então o relógio corre aqui também: entregue sem
  // resposta em 10 minutos conta como uma tentativa falha, e na terceira a
  // conversa vai para "Preciso agir" com o motivo, para a recepção marcar na
  // mão. O que não pode é a fila segurar o salão inteiro em silêncio.
  const conf = await cfgConfirmacao(salaoId)
  const LOTE = 5
  if (!tarefa && conf.ligada) {
    const fila = await carregarFila(salaoId)
    const ESPERA_MS = 10 * 60_000
    const agoraMs = Date.now()
    const vencidos = fila.filter(p => {
      const e = (p as any).entregue_em
      return e && agoraMs - new Date(e).getTime() > ESPERA_MS
    })
    for (const p of vencidos) {
      await concluirConfirmacao(
        salaoId, p.id, false,
        'A extensão pegou a tarefa e não respondeu em 10 minutos', {},
      )
    }
    // Quem venceu saiu da fila (ou voltou para ela com uma tentativa a mais):
    // reler é mais simples, e mais seguro, do que remendar a lista na mão.
    const atual = vencidos.length ? await carregarFila(salaoId) : fila
    // Lote só para quem sabe marcar vários. A 1.6.0 e anteriores pegam o
    // primeiro e ignoram o resto -- mandar cinco para elas carimbaria
    // `entregue_em` nos quatro que ninguém ia tocar, e em 10 minutos cada um
    // ganharia uma tentativa falha de graça.
    const sabeLote = !!versao && versao.localeCompare('1.7.0', undefined, { numeric: true }) >= 0
    const lote = atual.filter(p => !(p as any).entregue_em).slice(0, sabeLote ? LOTE : 1)
    if (lote.length) {
      const marca = new Date().toISOString()
      for (const p of lote) (p as any).entregue_em = marca
      await gravarFila(salaoId, atual)
      tarefa = {
        tipo: 'confirmar_avec',
        // `pedido_id` e companhia continuam aqui para a extensão antiga, que
        // não conhece `pedidos`.
        pedido_id: lote[0].id,
        telefone: lote[0].telefone, nome: lote[0].nome, data: lote[0].data || d.amanha.br,
        pedidos: lote.map(p => ({
          pedido_id: p.id, telefone: p.telefone, nome: p.nome, data: p.data || d.amanha.br,
        })),
        url_relatorio: conf.url_relatorio,
      }
    }
  }

  // 4ª: a volta do dia de hoje -- o aviso ao profissional. É a volta padrão: o
  // feedback vem de carona no POST desta mesma leitura, sem vez própria.
  if (!tarefa && porIntervalo) tarefa = tarefaDeCampanha(porIntervalo.c, porIntervalo.q)

  // Sem tarefa nenhuma, a volta é do feedback sozinho: é o caso de quem
  // desligou o aviso ao profissional e só usa o feedback.
  //
  // 'horario' é separado de 'campanha' de propósito: a regra lá em cima quer
  // saber se a última volta olhou o dia de HOJE, e a confirmação do dia
  // seguinte lê AMANHÃ. Juntar os dois faria a campanha das 17:00 passar por
  // "já olhei hoje" e roubar a vez do profissional.
  est.ultima_tarefa = tarefa?.tipo === 'confirmar_avec' ? 'confirmacao'
    : tarefa?.tipo === 'campanha' ? (tarefa.horario_cumprido ? 'horario' : 'campanha')
    : 'feedback'
  await gravarEstado(salaoId, est)

  // ── O batimento é o MENOR intervalo entre o que está ligado ───────────────
  //
  // Estava amarrado só ao Feedback: quem punha o aviso ao profissional em 30s
  // levava 60, porque a extensão só perguntava de minuto em minuto. A tela
  // prometia 30 e entregava 60. Agora o ritmo da pergunta acompanha a
  // automação mais apressada que estiver ligada.
  //
  // O piso é 30s porque é o mínimo do alarme do Chrome. Prometer 20 seria a
  // mesma mentira de antes, só que menor.
  const ritmos: number[] = []
  if (cfg.ligada) ritmos.push(cfg.intervalo_seg)
  for (const c of campanhas) {
    if (!c.ligada) continue
    // Horário fixo não pede pressa: basta a extensão passar por ali no minuto.
    ritmos.push(c.quando.tipo === 'intervalo' ? (c.quando.segundos || 60) : 60)
  }
  // Confirmação é a que a cliente sente: ela mandou "confirmo" e espera.
  if (conf.ligada) ritmos.push(30)
  const batimento = ritmos.length ? Math.max(30, Math.min(...ritmos)) : 60

  // "Fechar abas extras" clicado na tela: só a 1.4.0+ sabe fazer. Versão
  // antiga não consome o pedido, que fica esperando a atualização.
  const sabeLimpar = !!versao && versao.localeCompare('1.4.0', undefined, { numeric: true }) >= 0
  const limpar_abas = sabeLimpar ? !!(await consumirLimpezaDeAbas(salaoId)) : false

  return NextResponse.json({
    limpar_abas,
    ligada: cfg.ligada,
    intervalo_seg: batimento,
    // O intervalo do feedback em si, para a tela não se confundir com o ritmo.
    feedback_intervalo_seg: cfg.intervalo_seg,
    url_relatorio: cfg.url_relatorio,
    url_login: cfg.url_login,
    statuses: cfg.statuses,
    hoje: d.hoje.br,
    amanha: d.amanha.br,
    tarefa,
  })
}

/**
 * A campanha é do dia de HOJE? Só nessas o feedback pega carona: a confirmação
 * do dia seguinte lê o 0051 de AMANHÃ, e quem fechou a comanda amanhã ainda
 * não existe.
 */
function campanhaDeHoje(campanhas: Awaited<ReturnType<typeof carregarCampanhas>>, id: string) {
  const c = campanhas.find(x => x.id === id)
  return c && c.dia !== 'amanha' ? c : null
}

export async function POST(req: NextRequest) {
  const salaoId = await salaoDaRequisicao(req)
  if (!salaoId) return NextResponse.json({ error: 'Chave inválida' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const linhas: LinhaRelatorio[] = Array.isArray(body?.linhas) ? body.linhas
    .map((l: any) => ({
      data: String(l?.data || '').trim(),
      hora: String(l?.hora || '').trim(),
      cliente: String(l?.cliente || '').trim(),
      celular: String(l?.celular || '').trim(),
      status: String(l?.status || '').trim(),
      numero: String(l?.numero || '').trim(),
      // Profissional e serviço vinham da extensão e morriam AQUI: o mapa só
      // copiava seis campos, e o aviso ao profissional achava 20 elegíveis e
      // não mandava para ninguém (18/09/2026). É o que a campanha usa para
      // saber para QUEM avisar e o que pôr em {servicos}.
      profissional: String(l?.profissional || '').trim(),
      servico: String(l?.servico || '').trim(),
    }))
    .slice(0, 2000) : []
  const erroExt = body?.erro ? String(body.erro).slice(0, 300) : null

  // Resultado de uma CAMPANHA (feedback, confirmação diária, aviso ao profissional)
  if (body?.campanha_id) {
    const r = await processarCampanha(salaoId, String(body.campanha_id), linhas as LinhaRel[], {
      erro: erroExt,
      horarioCumprido: body?.horario_cumprido ? String(body.horario_cumprido) : undefined,
      // `simular` faz a conta e mostra quem receberia, sem mandar nem marcar.
      simular: body?.simular === true,
      tempos: body?.tempos && typeof body.tempos === 'object' ? body.tempos : null,
    })

    // ── O feedback de carona ────────────────────────────────────────────────
    //
    // Estas linhas são o 0051 INTEIRO de um dia: a extensão não filtra nada, o
    // filtro de status é daqui. Então, quando a campanha é de HOJE, as mesmas
    // linhas que trouxeram quem chegou (Aguardando, Em Atendimento) trazem
    // também quem fechou a comanda (Pago, Finalizado) -- é o mesmo relatório.
    //
    // Processar o feedback aqui custa ZERO volta. É isto que tira o feedback
    // da disputa por prioridade sem deixar de mandá-lo: ele deixa de ser uma
    // tarefa que pede vez e passa a ser consequência da volta do profissional.
    // Quem decide se manda, para quem e quantas vezes continua sendo o
    // processarRelatorio -- inclusive a regra de um por telefone por dia.
    let feedback: Awaited<ReturnType<typeof processarRelatorio>> | null = null
    if (!body?.simular && linhas.length) {
      const c = campanhaDeHoje(await carregarCampanhas(salaoId), String(body.campanha_id))
      if (c) feedback = await processarRelatorio(salaoId, linhas, erroExt)
    }
    return NextResponse.json({ ...r, feedback, ok: true })
  }

  // Resultado da MARCAÇÃO no Avec
  if (body?.pedido_id) {
    const r = await concluirConfirmacao(salaoId, String(body.pedido_id), body?.marcado === true, erroExt, body)
    return NextResponse.json({ ok: true, ...r })
  }

  const r = await processarRelatorio(salaoId, linhas, erroExt)
  return NextResponse.json({ ok: true, ...r })
}

// ── Depois que a extensão mexeu (ou tentou mexer) no Avec ───────────────────
//
// A ORDEM é a regra: o "Combinado" só sai se o Avec foi mesmo marcado. Se a
// marcação falhou, a conversa vai para "Preciso agir" com o motivo e a cliente
// não recebe nada -- dizer "confirmado" sem ter confirmado é o pior erro
// possível aqui.
async function concluirConfirmacao(
  salaoId: string, pedidoId: string, marcado: boolean, erro: string | null, body: any,
) {
  const fila = await carregarFila(salaoId)
  const p = fila.find(x => x.id === pedidoId)
  if (!p) return { erro: 'Pedido não está mais na fila' }

  const agora = new Date().toISOString()

  if (!marcado) {
    // Três tentativas e desiste: fica para a recepção, com o motivo à vista.
    // O motivo de CADA tentativa fica no pedido: sem isso só se sabia por que
    // falhou na terceira, e as duas primeiras eram um mistério (18/09/2026).
    p.tentativas = (p.tentativas || 0) + 1
    ;(p as any).ultimo_erro = String(erro || 'motivo desconhecido').slice(0, 200)
    ;(p as any).ultima_tentativa_em = agora
    // A extensão respondeu: o relógio de "entregue e não voltou" (ver o GET)
    // recomeça do zero, senão a 2ª tentativa já nasceria com o prazo vencido.
    ;(p as any).entregue_em = null
    if (p.tentativas < 3) {
      await gravarFila(salaoId, fila)
      return { marcado: false, tentativas: p.tentativas, erro }
    }
    await gravarFila(salaoId, fila.filter(x => x.id !== pedidoId))
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'acao_necessaria',
      proxima_acao: proximaAcaoPadrao('acao_necessaria'),
      nao_lidas: 1, atualizado_em: agora,
    }).eq('id', p.conversa_id).eq('salao_id', salaoId)
    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: p.conversa_id, tipo: 'mudou_estado',
      para_estado: 'acao_necessaria', autor_nome: 'Confirmação automática',
      detalhe: ('Não consegui marcar no Avec: ' + (erro || 'motivo desconhecido')).slice(0, 200),
    })
    return { marcado: false, desistiu: true, erro }
  }

  // Marcou. Agora sim a cliente recebe o retorno.
  await gravarFila(salaoId, fila.filter(x => x.id !== pedidoId))
  const conf = await cfgConfirmacao(salaoId)
  const primeiro = String(p.nome || '').trim().split(/\s+/)[0] || ''

  // A hora do "Combinado" é a que estava ESCRITA na mensagem que ela confirmou,
  // não a do agendamento que a extensão marcou: cliente com dois horários no
  // dia recebia a hora do outro serviço (Ana, 24/09/2026: pediu-se 14:00,
  // voltou "confirmado às 15:00"). A do Avec só entra se a mensagem não trouxer
  // hora nenhuma.
  // A data segue a mesma regra: a que estava escrita, depois a do Avec.
  let horaEnviada = ''
  let dataEnviada = ''
  try {
    const { horaNoTexto, dataNoTexto } = await import('@/lib/crmConfirmacao')
    const { data: enviadas } = await supabaseAdmin
      .from('crm_mensagens').select('texto')
      .eq('conversa_id', p.conversa_id).eq('direcao', 'saida').neq('autor_nome', 'Confirmação automática')
      .order('criado_em', { ascending: false }).limit(5)
    // Data e hora saem da MESMA mensagem -- a primeira, de trás para frente,
    // que tenha hora escrita (a própria mensagem de confirmação).
    for (const m of enviadas || []) {
      horaEnviada = horaNoTexto(m.texto)
      if (horaEnviada) { dataEnviada = dataNoTexto(m.texto); break }
    }
  } catch { /* sem a mensagem, ficam data e hora do Avec, como antes */ }

  const texto = String(conf.resposta || '')
    .replace(/\{cliente\}/g, primeiro)
    .replace(/\{data\}/g, dataEnviada || String(body?.data || p.data || ''))
    .replace(/\{hora\}/g, horaEnviada || String(body?.hora || ''))
    .replace(/\{profissional\}/g, String(body?.profissional || ''))
    .trim()

  // ── Ela confirmou E perguntou alguma coisa? ───────────────────────────────
  //
  // MARIA GORETE, 18/09/2026: "Confirmado" e, na mensagem seguinte, "A
  // Cleide tem horário para escova?". Mandar o "Combinado... qualquer coisa
  // é só me chamar. Até lá!" em cima de uma pergunta soa como encerrar a
  // conversa ignorando o que ela perguntou -- foi a leitura do dono, e está
  // certa. Então, quando há mais do que a confirmação:
  //
  //   - o Avec É marcado (é fato, e é o que a cliente pediu);
  //   - o "Combinado" automático NÃO sai;
  //   - a conversa fica em "Preciso agir", não lida, e quem responder fala
  //     das duas coisas numa mensagem só ("confirmado, e sobre a escova...").
  //
  // "Obrigada", "ok", figurinha de coração não contam como pergunta.
  let temPergunta = false
  try {
    const { data: ultSaida } = await supabaseAdmin
      .from('crm_mensagens').select('criado_em')
      .eq('conversa_id', p.conversa_id).eq('direcao', 'saida').neq('autor_nome', 'Confirmação automática')
      .order('criado_em', { ascending: false }).limit(1)
    const desde = (ultSaida || [])[0]?.criado_em
    if (desde) {
      const { data: dela } = await supabaseAdmin
        .from('crm_mensagens').select('texto, tipo')
        .eq('conversa_id', p.conversa_id).eq('direcao', 'entrada').gt('criado_em', desde).limit(20)
      const { ehConfirmacao } = await import('@/lib/crmConfirmacao')
      temPergunta = (dela || []).some((m: any) => {
        const t = String(m.texto || '').trim()
        if (!t || m.tipo === 'figurinha') return false
        if (ehConfirmacao(t, conf.palavras)) return false
        return !/^(obrigad[ao]?s?|valeu|ok+|blz|beleza|perfeito|tks|thanks|[\p{Emoji}\s]+)[.!\s]*$/iu.test(t)
      })
    }
  } catch { /* na dúvida, fecha como sempre fechou */ }

  if (temPergunta) {
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'acao_necessaria',
      proxima_acao: 'Responder: ela confirmou (já está no Avec) e perguntou algo',
      nao_lidas: 1, atualizado_em: agora,
    }).eq('id', p.conversa_id).eq('salao_id', salaoId)
    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: p.conversa_id, tipo: 'mudou_estado',
      para_estado: 'acao_necessaria', autor_nome: 'Confirmação automática',
      detalhe: 'Marcado como Confirmado no Avec. Ela também perguntou algo, então o "Combinado" automático não foi mandado: responda as duas coisas.',
    })
    return { marcado: true, pergunta: true }
  }

  if (texto) {
    await supabaseAdmin.from('crm_mensagens').insert({
      salao_id: salaoId, conversa_id: p.conversa_id,
      direcao: 'saida', texto, tipo: 'texto', situacao: 'na_fila',
      autor_nome: 'Confirmação automática', em_massa: false, criado_em: agora,
    })
  }

  await supabaseAdmin.from('crm_conversas').update({
    estado: 'confirmado',
    proxima_acao: proximaAcaoPadrao('confirmado'),
    fechada_em: agora, nao_lidas: 0,
    ultima_em: agora, ultima_de: 'salao',
    ultima_previa: texto.slice(0, 120), atualizado_em: agora,
  }).eq('id', p.conversa_id).eq('salao_id', salaoId)

  await supabaseAdmin.from('crm_eventos').insert({
    salao_id: salaoId, conversa_id: p.conversa_id, tipo: 'fechou',
    para_estado: 'confirmado', autor_nome: 'Confirmação automática',
    detalhe: 'Marcado como Confirmado no Avec',
  })

  return { marcado: true }
}
