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
  const tipoSaida = tipoDaMensagemDoSalao(texto)
  const novoEstado = tipoSaida ? ESTADO_DO_TIPO[tipoSaida] : 'aguardando'
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
