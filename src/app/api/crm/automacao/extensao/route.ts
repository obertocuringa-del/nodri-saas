import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { proximaAcaoPadrao } from '@/lib/crm'
import {
  salaoPelaChave, carregarConfig, carregarEstado, gravarEstado, processarRelatorio, hojeNoFuso,
  type LinhaRelatorio,
} from '@/lib/crmAutomacao'
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
  const cfg = await carregarConfig(salaoId)
  const est = await carregarEstado(salaoId)
  // "Vista há X" na tela do dono: é o único jeito de saber que a extensão
  // continua viva no computador da recepção.
  est.visto_em = new Date().toISOString()
  await gravarEstado(salaoId, est)
  // ── A tarefa da vez ───────────────────────────────────────────────────────
  //
  // A extensão não tem relógio: ela pergunta e o NODRI responde o que fazer
  // agora. Assim horário e intervalo se mudam na tela, sem tocar no computador
  // da recepção. Uma tarefa por vez, porque as três dividem a mesma aba do
  // Avec -- duas juntas trocariam a data uma da outra.
  const d = datasDoSalao(cfg.fuso)
  let tarefa: any = null

  // 1ª prioridade: marcar Confirmado no Avec. A cliente já respondeu e está
  // esperando o "Combinado".
  const conf = await cfgConfirmacao(salaoId)
  if (conf.ligada) {
    const fila = await carregarFila(salaoId)
    const p = fila[0]
    if (p) {
      tarefa = {
        tipo: 'confirmar_avec', pedido_id: p.id,
        url_relatorio: conf.url_relatorio,
        telefone: p.telefone, nome: p.nome, data: p.data || d.amanha.br,
      }
    }
  }

  // 2ª: as campanhas que estão na hora.
  //
  // ── Revezamento com o feedback ────────────────────────────────────────────
  //
  // Uma tarefa por ciclo, e o feedback não é "tarefa": ele roda quando NÃO há
  // tarefa. Com o aviso ao profissional a cada 15 s e a extensão perguntando a
  // cada 30 s, o aviso estava SEMPRE na hora -- e o feedback nunca rodava
  // (18/09/2026: aviso falhando a cada ciclo, feedback parado o dia todo).
  // Então: se o ciclo anterior levou uma campanha de intervalo, este ciclo é
  // do feedback. Horário fixo (17:00) e a confirmação no Avec não entram no
  // revezamento -- uma acontece duas vezes por dia, a outra tem cliente
  // esperando.
  const anterior = est.ultima_tarefa || null
  if (!tarefa) {
    const campanhas = await carregarCampanhas(salaoId)
    const estados = await carregarEstados(salaoId)
    for (const c of campanhas) {
      const q = estaNaHora(c, estados[c.id], cfg.fuso)
      if (!q.sim) continue
      if (c.quando.tipo === 'intervalo' && cfg.ligada && anterior === 'campanha') continue
      tarefa = {
        tipo: 'campanha', campanha_id: c.id, nome: c.nome,
        url_relatorio: cfg.url_relatorio,
        data: c.dia === 'amanha' ? d.amanha.br : d.hoje.br,
        statuses: c.statuses,
        horario_cumprido: q.horario || null,
      }
      break
    }
  }
  est.ultima_tarefa = tarefa?.tipo === 'campanha' ? 'campanha' : 'feedback'
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
  for (const c of await carregarCampanhas(salaoId)) {
    if (!c.ligada) continue
    // Horário fixo não pede pressa: basta a extensão passar por ali no minuto.
    ritmos.push(c.quando.tipo === 'intervalo' ? (c.quando.segundos || 60) : 60)
  }
  // Confirmação é a que a cliente sente: ela mandou "confirmo" e espera.
  if (conf.ligada) ritmos.push(30)
  const batimento = ritmos.length ? Math.max(30, Math.min(...ritmos)) : 60

  return NextResponse.json({
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
    })
    return NextResponse.json({ ...r, ok: true })
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
    p.tentativas = (p.tentativas || 0) + 1
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
  const texto = String(conf.resposta || '')
    .replace(/\{cliente\}/g, primeiro)
    .replace(/\{data\}/g, String(body?.data || p.data || ''))
    .replace(/\{hora\}/g, String(body?.hora || ''))
    .replace(/\{profissional\}/g, String(body?.profissional || ''))
    .trim()

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
