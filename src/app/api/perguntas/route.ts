import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Pergunta enviada pelo site ──────────────────────────────────────────────
//
// Rota pública: quem pergunta não tem conta.
//
// Por que NÃO é um fórum aberto. Fórum de verdade publica na hora, e isso traz
// três coisas juntas: spam em endereço da NODRI, moderação diária que alguém
// tem que fazer, e responsabilidade sobre o que estranhos escrevem no seu
// domínio. Em site pequeno, o spam chega antes da primeira pergunta real.
//
// O desenho aqui entrega a interação sem nenhum desses custos: a pergunta cai
// no painel master como notificação, e a resposta é publicada no FAQ pela mão
// de vocês. Quem perguntou vê a dúvida virar conteúdo; ninguém publica no site
// sem passar por você.

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null)

  const nome = String(b?.nome || '').trim()
  const contato = String(b?.contato || '').trim()
  const pergunta = String(b?.pergunta || '').trim()

  if (pergunta.length < 12) {
    return NextResponse.json({ erro: 'Escreva a pergunta com um pouco mais de detalhe.' }, { status: 400 })
  }
  // Teto para não virar porta de entrada de texto colado em massa.
  if (pergunta.length > 1200) {
    return NextResponse.json({ erro: 'Pergunta muito longa. Resuma em poucas linhas.' }, { status: 400 })
  }

  const quem = nome || 'Sem identificação'
  const onde = contato ? ` · contato: ${contato}` : ''

  const { error } = await supabaseAdmin.from('notificacoes').insert({
    titulo: 'Pergunta enviada pelo site',
    mensagem: `${quem}${onde}\n\n${pergunta}`,
    tipo: 'info',
    para_todos: false,
    lida: false,
  })

  if (error) {
    return NextResponse.json({ erro: 'Não foi possível enviar. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
