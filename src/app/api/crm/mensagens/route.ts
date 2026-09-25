import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, crmBloqueado } from '@/lib/apiAuth'
import { MINUTOS_DONO, proximaAcaoPadrao, tipoDaMensagemDoSalao, ESTADO_DO_TIPO } from '@/lib/crm'

export const dynamic = 'force-dynamic'

// ── As mensagens de uma conversa ────────────────────────────────────────────
//
// Enviar aqui NÃO fala com o WhatsApp. Grava a mensagem como `na_fila` e a
// ponte — o serviço que segura a sessão — vem buscar. Isso é de propósito:
// se a conexão cair no meio de um envio, a mensagem continua na fila e sai
// quando voltar, em vez de sumir sem ninguém perceber.

async function sessaoDoSalao() {
  const sess = await getSessao()
  if (!sess) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  if (sess.role === 'profissional') {
    return { erro: NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 }) }
  }
  return { sess }
}

export async function GET(req: NextRequest) {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro

  const conversaId = new URL(req.url).searchParams.get('conversa') || ''
  if (!conversaId) return NextResponse.json({ error: 'Conversa não informada' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('crm_mensagens')
    .select('*')
    .eq('salao_id', sess!.salaoId)
    .eq('conversa_id', conversaId)
    .order('criado_em', { ascending: true })
    .limit(400)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Abrir a conversa zera o não lidas — a lista precisa refletir o que a
  // pessoa realmente viu, senão o contador vira enfeite.
  //
  // `?ler=0` existe para a releitura automática da tela aberta: ela roda a
  // cada cinco segundos e, sem isso, desfaria em cinco segundos o "marcar
  // como não lida" que a pessoa acabou de clicar.
  if (new URL(req.url).searchParams.get('ler') !== '0') {
    await supabaseAdmin.from('crm_conversas')
      .update({ nao_lidas: 0 }).eq('id', conversaId).eq('salao_id', sess!.salaoId)
  }

  return NextResponse.json({ mensagens: data || [] })
}

export async function POST(req: NextRequest) {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro
  if (await crmBloqueado()) {
    return NextResponse.json({ error: 'Este acesso não tem o CRM liberado. Peça ao dono em Usuários e Permissões.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const conversaId = String(body?.conversa || '')
  const texto = String(body?.texto || '').trim()
  const midiaUrl = String(body?.midia_url || '').trim() || null
  const tipo = String(body?.tipo || 'texto')
  const respondeA = String(body?.responde_a || '').trim() || null
  // Anexo sem legenda é mensagem legítima; texto vazio sem anexo não é.
  if (!conversaId || (!texto && !midiaUrl)) {
    return NextResponse.json({ error: 'Escreva algo ou anexe um arquivo' }, { status: 400 })
  }

  const { data: conversa } = await supabaseAdmin
    .from('crm_conversas').select('id, estado').eq('id', conversaId).eq('salao_id', sess!.salaoId).maybeSingle()
  if (!conversa) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const agora = new Date().toISOString()
  const quem = sess!.nome || 'Salão'

  const { error: erroMsg } = await supabaseAdmin.from('crm_mensagens').insert({
    salao_id: sess!.salaoId,
    conversa_id: conversaId,
    direcao: 'saida',
    texto,
    tipo,
    midia_url: midiaUrl,
    responde_a: respondeA,
    situacao: 'na_fila',
    autor_id: sess!.usuarioId || null,
    autor_nome: quem,
  })
  if (erroMsg) return NextResponse.json({ error: erroMsg.message }, { status: 500 })

  // O salão respondeu: a bola passa para a cliente e o relógio para. Se o
  // que saiu foi o feedback, a confirmação ou uma lista, a conversa vai para
  // a pasta do tipo -- quem mandou estava olhando para ela, então aqui não
  // há pasta protegida.
  //
  // EXCEÇÃO -- pasta de PROFISSIONAIS (pedido do dono, 25/09/2026): conversa
  // com profissional não é atendimento de cliente; responder não "passa a
  // bola". Antes ela ia para Aguardando, e a mensagem seguinte do profissional
  // caía em "Preciso agir" em vez de voltar para a pasta dele. Agora fica.
  // Só essa pasta: Conversa Finalizada e as demais seguem a regra de sempre.
  // A chave nasce do nome ("Profissionais" -> extra_profissionais_xxx), então
  // o começo vale para qualquer salão que tenha criado essa pasta.
  const pastaDeProfissional = /^extra_profissiona/.test(String(conversa.estado || ''))
  const tipoSaida = tipoDaMensagemDoSalao(texto)
  const novoEstado = pastaDeProfissional
    ? conversa.estado
    : (tipoSaida ? ESTADO_DO_TIPO[tipoSaida] : 'aguardando')
  await supabaseAdmin.from('crm_conversas').update({
    estado: novoEstado,
    proxima_acao: proximaAcaoPadrao(novoEstado),
    aguardando_desde: null,
    ultima_em: agora,
    ultima_de: 'salao',
    ultima_previa: (texto || `[${tipo}]`).slice(0, 120),
    nao_lidas: 0,
    dono_id: sess!.usuarioId || null,
    dono_nome: quem,
    dono_ate: new Date(Date.now() + MINUTOS_DONO * 60000).toISOString(),
    atualizado_em: agora,
  }).eq('id', conversaId)

  await supabaseAdmin.from('crm_eventos').insert({
    salao_id: sess!.salaoId,
    conversa_id: conversaId,
    tipo: 'respondeu',
    de_estado: conversa.estado,
    para_estado: novoEstado,
    autor_id: sess!.usuarioId || null,
    autor_nome: quem,
  })

  return NextResponse.json({ ok: true })
}

// ── Editar, apagar e reagir: o que o WhatsApp faz, o CRM também ─────────────
//
// Pedido do dono (18/09/2026): "tudo que tem no WhatsApp eu quero no CRM,
// para o colaborador ter as mesmas ferramentas". Cada ação vira uma linha na
// fila de saída com tipo `acao_*` apontando (responde_a) para a mensagem
// original; a ponte executa e, ao confirmar, o NODRI aplica o efeito na
// mensagem original. A linha da ação nunca aparece na conversa.
//
// Regras do próprio WhatsApp que valem aqui: só se edita mensagem NOSSA, de
// texto, com até 15 minutos; só se apaga mensagem nossa; reagir pode em
// qualquer uma.
const MINUTOS_PARA_EDITAR = 15

export async function PATCH(req: NextRequest) {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro
  if (await crmBloqueado()) {
    return NextResponse.json({ error: 'Este acesso não tem o CRM liberado. Peça ao dono em Usuários e Permissões.' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || '')
  const acao = String(body?.acao || '')
  if (!id || !['editar', 'apagar', 'reagir'].includes(acao)) {
    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
  }

  const { data: alvo } = await supabaseAdmin
    .from('crm_mensagens').select('id, conversa_id, direcao, tipo, texto, id_whatsapp, criado_em, situacao')
    .eq('id', id).eq('salao_id', sess!.salaoId).maybeSingle()
  if (!alvo) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
  if (!alvo.id_whatsapp) return NextResponse.json({ error: 'Essa mensagem ainda não saiu pelo WhatsApp' }, { status: 400 })
  if (String(alvo.tipo || '').startsWith('acao_') || alvo.tipo === 'reacao' || alvo.tipo === 'apagada') {
    return NextResponse.json({ error: 'Essa mensagem não aceita essa ação' }, { status: 400 })
  }

  let texto = ''
  if (acao === 'editar') {
    if (alvo.direcao !== 'saida') return NextResponse.json({ error: 'Só dá para editar mensagem do salão' }, { status: 400 })
    if (alvo.tipo !== 'texto') return NextResponse.json({ error: 'Só dá para editar mensagem de texto' }, { status: 400 })
    const idade = (Date.now() - new Date(alvo.criado_em).getTime()) / 60000
    if (idade > MINUTOS_PARA_EDITAR) {
      return NextResponse.json({ error: `O WhatsApp só deixa editar até ${MINUTOS_PARA_EDITAR} minutos depois de enviar` }, { status: 400 })
    }
    texto = String(body?.texto || '').trim()
    if (!texto) return NextResponse.json({ error: 'Escreva o texto novo' }, { status: 400 })
    if (texto === String(alvo.texto || '').trim()) return NextResponse.json({ ok: true, igual: true })
  }
  if (acao === 'apagar') {
    if (alvo.direcao !== 'saida') return NextResponse.json({ error: 'Só dá para apagar mensagem do salão' }, { status: 400 })
    texto = '(apagar)'
  }
  if (acao === 'reagir') {
    texto = String(body?.emoji || '').trim().slice(0, 8)
    if (!texto) return NextResponse.json({ error: 'Escolha uma reação' }, { status: 400 })
  }

  const { error: erroFila } = await supabaseAdmin.from('crm_mensagens').insert({
    salao_id: sess!.salaoId,
    conversa_id: alvo.conversa_id,
    direcao: 'saida',
    texto,
    tipo: `acao_${acao}`,
    responde_a: alvo.id,
    situacao: 'na_fila',
    autor_id: sess!.usuarioId || null,
    autor_nome: sess!.nome || 'Salão',
  })
  if (erroFila) return NextResponse.json({ error: erroFila.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
