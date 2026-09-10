import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizarTelefone, chaveTelefone, proximaAcaoPadrao } from '@/lib/crm'

export const dynamic = 'force-dynamic'

// ════════════════════════════════════════════════════════════════════════════
// A PONTE — a única porta entre o WhatsApp e o NODRI
//
// O NODRI roda na Vercel, que trabalha por função efêmera: o código acorda,
// responde e morre. Isso é ótimo para uma tela e impossível para uma sessão de
// WhatsApp, que precisa de uma conexão viva 24 horas esperando mensagem.
//
// Por isso a sessão mora num serviço à parte, sempre ligado — a ponte. Ela
// não tem tela nem regra de negócio: só carrega mensagem de um lado para o
// outro. Toda a inteligência (estado, dono, prazo, SLA) fica aqui, no NODRI,
// onde pode ser corrigida sem mexer em servidor.
//
// Autenticação: cabeçalho `x-crm-chave`, comparado com CRM_PONTE_CHAVE do
// ambiente. Não usa cookie porque quem chama é serviço, não navegador.
//
// Verbos:
//   POST ?acao=entrada     mensagem que chegou da cliente
//   POST ?acao=situacao    a ponte informa conexão, QR, queda
//   POST ?acao=confirmar   a ponte avisa que enviou (ou que falhou)
//   GET  ?salao=<id>       a ponte busca o que está na fila para enviar
// ════════════════════════════════════════════════════════════════════════════

function autorizado(req: NextRequest): boolean {
  const esperada = process.env.CRM_PONTE_CHAVE || ''
  if (!esperada) return false          // sem chave configurada, a porta fica fechada
  return req.headers.get('x-crm-chave') === esperada
}

/** Acha o contato pelo telefone, ou cria. É aqui que a cliente deixa de duplicar. */
async function acharOuCriarContato(salaoId: string, telefoneBruto: string, nomeAgenda?: string) {
  const telefone = normalizarTelefone(telefoneBruto)
  if (!telefone) return null

  const { data: existentes } = await supabaseAdmin
    .from('crm_contatos').select('*').eq('salao_id', salaoId)

  // Compara pela chave sem o nono dígito: 61 9 9999 e 61 9999 são a mesma pessoa.
  const alvo = chaveTelefone(telefone)
  const achado = (existentes || []).find((c: any) => chaveTelefone(c.telefone) === alvo)
  if (achado) return achado

  const { data: novo } = await supabaseAdmin.from('crm_contatos').insert({
    salao_id: salaoId,
    telefone,
    telefone_bruto: telefoneBruto,
    nome: nomeAgenda || null,
    nome_agenda: nomeAgenda || null,
  }).select().maybeSingle()
  return novo
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const acao = new URL(req.url).searchParams.get('acao') || 'entrada'
  const body = await req.json().catch(() => ({}))
  const salaoId = String(body?.salao_id || '')
  if (!salaoId) return NextResponse.json({ error: 'salao_id é obrigatório' }, { status: 400 })

  const agora = new Date().toISOString()

  // ── A ponte informa como está a conexão ───────────────────────────────────
  if (acao === 'situacao') {
    const patch: any = { visto_em: agora, atualizado_em: agora }
    if (body?.situacao) patch.situacao = String(body.situacao)
    if (body?.qr !== undefined) {
      patch.qr = body.qr || null
      // QR do WhatsApp vira em torno de um minuto; guardar o prazo evita a
      // tela mostrar um código morto e a pessoa achar que a leitura falhou.
      patch.qr_expira_em = body.qr ? new Date(Date.now() + 60000).toISOString() : null
    }
    if (body?.numero !== undefined) patch.numero = body.numero || null
    if (body?.nome_exibicao !== undefined) patch.nome_exibicao = body.nome_exibicao || null
    if (body?.erro !== undefined) patch.erro = body.erro || null
    if (body?.sessao !== undefined) patch.sessao = body.sessao || null

    const { data: existe } = await supabaseAdmin
      .from('crm_canais').select('id').eq('salao_id', salaoId).maybeSingle()
    if (existe) await supabaseAdmin.from('crm_canais').update(patch).eq('id', existe.id)
    else await supabaseAdmin.from('crm_canais').insert({ salao_id: salaoId, ...patch })

    return NextResponse.json({ ok: true })
  }

  // ── A ponte confirma o envio (ou avisa que falhou) ────────────────────────
  if (acao === 'confirmar') {
    const id = String(body?.mensagem_id || '')
    if (!id) return NextResponse.json({ error: 'mensagem_id é obrigatório' }, { status: 400 })
    const ok = body?.enviada !== false
    await supabaseAdmin.from('crm_mensagens').update({
      situacao: ok ? 'enviada' : 'falhou',
      id_whatsapp: body?.id_whatsapp || null,
      erro: ok ? null : String(body?.erro || 'falha no envio'),
      enviado_em: ok ? agora : null,
    }).eq('id', id).eq('salao_id', salaoId)
    return NextResponse.json({ ok: true })
  }

  // ── Mensagem que chegou da cliente ────────────────────────────────────────
  const telefone = String(body?.telefone || '')
  const texto = String(body?.texto || '')
  if (!telefone) return NextResponse.json({ error: 'telefone é obrigatório' }, { status: 400 })

  const contato = await acharOuCriarContato(salaoId, telefone, body?.nome)
  if (!contato) return NextResponse.json({ error: 'telefone inválido' }, { status: 400 })

  // Uma conversa ABERTA por contato. Conversa fechada (agendada ou perdida)
  // não é reaberta: a cliente que volta depois inicia uma oportunidade nova,
  // e é isso que faz a conta de conversão parar de pé.
  const { data: abertas } = await supabaseAdmin
    .from('crm_conversas').select('*')
    .eq('salao_id', salaoId).eq('contato_id', contato.id)
    .not('estado', 'in', '("agendado","sem_conversao")')
    .order('ultima_em', { ascending: false }).limit(1)

  let conversa = (abertas || [])[0]
  if (!conversa) {
    const { data: nova } = await supabaseAdmin.from('crm_conversas').insert({
      salao_id: salaoId,
      contato_id: contato.id,
      estado: 'acao_necessaria',
      proxima_acao: proximaAcaoPadrao('acao_necessaria'),
      aguardando_desde: agora,
      ultima_em: agora,
      ultima_de: 'cliente',
      ultima_previa: texto.slice(0, 120),
      nao_lidas: 1,
    }).select().maybeSingle()
    conversa = nova
  } else {
    // A cliente respondeu: volta para a fila e o relógio recomeça. Só marca o
    // início da espera se ela ainda não estava esperando, senão um cliente que
    // manda cinco mensagens seguidas zeraria o próprio atraso a cada uma.
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'acao_necessaria',
      proxima_acao: proximaAcaoPadrao('acao_necessaria'),
      aguardando_desde: conversa.aguardando_desde || agora,
      ultima_em: agora,
      ultima_de: 'cliente',
      ultima_previa: texto.slice(0, 120),
      nao_lidas: (conversa.nao_lidas || 0) + 1,
      atualizado_em: agora,
    }).eq('id', conversa.id)
  }

  if (!conversa) return NextResponse.json({ error: 'falha ao abrir a conversa' }, { status: 500 })

  // A mesma mensagem pode chegar duas vezes se a ponte reenviar. O índice
  // único em id_whatsapp barra a repetida sem derrubar o resto.
  const { error: erroMsg } = await supabaseAdmin.from('crm_mensagens').insert({
    salao_id: salaoId,
    conversa_id: conversa.id,
    direcao: 'entrada',
    texto,
    tipo: body?.tipo || 'texto',
    midia_url: body?.midia_url || null,
    situacao: 'entregue',
    id_whatsapp: body?.id_whatsapp || null,
  })
  if (erroMsg && !String(erroMsg.message).includes('duplicate')) {
    return NextResponse.json({ error: erroMsg.message }, { status: 500 })
  }

  await supabaseAdmin.from('crm_eventos').insert({
    salao_id: salaoId, conversa_id: conversa.id, tipo: 'entrou',
    para_estado: 'acao_necessaria', autor_nome: contato.nome || 'Cliente',
  })

  return NextResponse.json({ ok: true, conversa_id: conversa.id })
}

// ── A ponte pergunta o que fazer, e busca o que precisa sair ────────────────
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const params = new URL(req.url).searchParams

  // Quais salões querem estar conectados. A ponte não tem lista fixa: ela
  // pergunta ao NODRI a cada volta, e por isso um salão novo que clica em
  // "Gerar o QR code" é atendido sem ninguém reiniciar serviço nenhum.
  if (params.get('acao') === 'canais') {
    const { data } = await supabaseAdmin
      .from('crm_canais').select('salao_id, situacao')
      .neq('situacao', 'desconectado')
    return NextResponse.json({ canais: data || [] })
  }

  const salaoId = params.get('salao') || ''
  if (!salaoId) return NextResponse.json({ error: 'salao é obrigatório' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('crm_mensagens')
    .select('id, texto, conversa:crm_conversas(contato:crm_contatos(telefone))')
    .eq('salao_id', salaoId).eq('situacao', 'na_fila')
    .order('criado_em', { ascending: true }).limit(20)

  const fila = (data || []).map((m: any) => ({
    id: m.id,
    texto: m.texto,
    telefone: m.conversa?.contato?.telefone || null,
  })).filter(m => m.telefone)

  // Marca como 'enviando' para a ponte não pegar a mesma mensagem duas vezes
  // se demorar a confirmar.
  if (fila.length) {
    await supabaseAdmin.from('crm_mensagens')
      .update({ situacao: 'enviando' })
      .in('id', fila.map(m => m.id))
  }

  return NextResponse.json({ fila })
}
