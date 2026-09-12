import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, crmBloqueado } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// ── O que o salão sabe da cliente e o sistema não tem como saber ────────────
//
// "Alérgica a amônia." "Não gosta que mexam na franja." "Sempre atrasa 20
// minutos." Isso hoje mora na cabeça de quem atende e some quando a pessoa
// sai de férias. Nome e observação ficam no CONTATO, não na conversa: valem
// para sempre, não para uma oportunidade.

export async function PATCH(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'profissional') {
    return NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 })
  }
  if (await crmBloqueado()) {
    return NextResponse.json({ error: 'Este acesso não tem o CRM liberado. Peça ao dono em Usuários e Permissões.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || '')
  if (!id) return NextResponse.json({ error: 'Contato não informado' }, { status: 400 })

  const patch: any = { atualizado_em: new Date().toISOString() }
  if (body?.nome !== undefined) {
    patch.nome = String(body.nome || '').trim().slice(0, 120) || null
    // ── Digitou o nome? O relógio tem que olhar de novo ──────────────────────
    //
    // O casamento com o histórico do salão é por telefone e, quem não tem
    // telefone, por NOME. Um contato que chegou sem nenhum dos dois já foi
    // conferido, não achou nada, e só voltaria à fila doze horas depois.
    //
    // Então a recepção digitava "Rosilda Prates" na ficha e a tela continuava
    // dizendo que não havia histórico -- com as oito visitas dela guardadas no
    // sistema o tempo todo. Zerar a conferência põe o contato na próxima volta
    // do minuto.
    patch.conferido_em = null
  }
  if (body?.observacao !== undefined) {
    patch.observacao = String(body.observacao || '').trim().slice(0, 2000) || null
  }
  // O nome no sistema é o que liga a conversa ao histórico de atendimento.
  // Editável à mão porque o casamento automático pelo telefone não pega todo
  // mundo, e o que não casa não pode ficar mudo para sempre.
  if (body?.cliente_nome !== undefined) {
    patch.cliente_nome = String(body.cliente_nome || '').trim().slice(0, 160) || null
  }

  // ── Tirar uma etiqueta na mão ─────────────────────────────────────────────
  //
  // "CLIENTE NOVA" é posto pelo relógio quando o telefone não aparece no
  // histórico de atendimento. Para quem nunca foi atendido isso está certo --
  // mas profissional, fornecedor e parceiro caem na mesma peneira, e a fila
  // fica cheia de gente marcada como cliente nova que não é cliente nenhuma.
  //
  // O relógio não tem como saber disso sozinho. Quem sabe é quem lê a
  // conversa. Então dá para tirar -- e uma vez tirada, ela não volta: o
  // `conferido_em` fica marcado como conferido e o relógio respeita a decisão
  // de quem estava olhando.
  if (Array.isArray(body?.etiquetas)) {
    patch.etiquetas = body.etiquetas
      .map((e: any) => String(e || '').trim())
      .filter(Boolean)
      .slice(0, 20)
    patch.conferido_em = new Date().toISOString()
  }

  const { error } = await supabaseAdmin
    .from('crm_contatos').update(patch).eq('id', id).eq('salao_id', sess.salaoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
