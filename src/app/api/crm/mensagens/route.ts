import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, escritaBloqueadaSub } from '@/lib/apiAuth'
import { MINUTOS_DONO, proximaAcaoPadrao } from '@/lib/crm'

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
  await supabaseAdmin.from('crm_conversas')
    .update({ nao_lidas: 0 }).eq('id', conversaId).eq('salao_id', sess!.salaoId)

  return NextResponse.json({ mensagens: data || [] })
}

export async function POST(req: NextRequest) {
  const { sess, erro } = await sessaoDoSalao()
  if (erro) return erro
  if (await escritaBloqueadaSub()) {
    return NextResponse.json({ error: 'Este acesso é somente leitura.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const conversaId = String(body?.conversa || '')
  const texto = String(body?.texto || '').trim()
  const midiaUrl = String(body?.midia_url || '').trim() || null
  const tipo = String(body?.tipo || 'texto')
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
    situacao: 'na_fila',
    autor_id: sess!.usuarioId || null,
    autor_nome: quem,
  })
  if (erroMsg) return NextResponse.json({ error: erroMsg.message }, { status: 500 })

  // O salão respondeu: a bola passa para a cliente e o relógio para.
  await supabaseAdmin.from('crm_conversas').update({
    estado: 'aguardando',
    proxima_acao: proximaAcaoPadrao('aguardando'),
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
    para_estado: 'aguardando',
    autor_id: sess!.usuarioId || null,
    autor_nome: quem,
  })

  return NextResponse.json({ ok: true })
}
