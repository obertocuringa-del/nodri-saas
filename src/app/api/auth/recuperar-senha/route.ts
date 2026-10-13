import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { enviarEmailRecuperacaoSenha } from '@/lib/email'
import crypto from 'crypto'
import { limitar, registrarFalha, ipDaRequisicao } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({ email: '' }))
  if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

  // Limite (auditoria, 30/09/2026): 3 pedidos por e-mail por hora e 10 por
  // aparelho -- sem isso, dava para encher a caixa de alguém de e-mails de
  // "redefinir senha". Conta todo pedido; a resposta é a mesma de sempre
  // para não revelar se o e-mail existe.
  const ip = ipDaRequisicao(req)
  const [porEmail, porIp] = await Promise.all([
    limitar('recuperar_senha', String(email), 3, 60),
    ip ? limitar('recuperar_senha_ip', ip, 10, 60) : Promise.resolve({ permitido: true, restantes: 10, esperarSegundos: 0 }),
  ])
  if (!porEmail.permitido || !porIp.permitido) {
    return NextResponse.json({ error: 'Muitos pedidos. Tente de novo em 1 hora.' }, { status: 429 })
  }
  await Promise.all([registrarFalha('recuperar_senha', String(email), ip), ip ? registrarFalha('recuperar_senha_ip', ip, ip) : null])

  const alvo = email.toLowerCase().trim()

  // Quem pode recuperar por e-mail, em ordem:
  //
  //  1) o DONO do salão, pelo e-mail do cadastro do salão (tabela usuarios);
  //  2) o PROFISSIONAL, pelo e-mail do cadastro DELE, e só se o acesso ao
  //     portal estiver liberado;
  //  3) o USUÁRIO EXTRA (recepção), pelo e-mail do cadastro dele -- campo que
  //     passou a ser obrigatório em 13/10/2026, justamente para isto.
  //
  // O link vai SEMPRE para o endereço que está no cadastro -- é o próprio
  // cadastro que é consultado. Não há como digitar um e-mail qualquer e
  // receber o link de outra pessoa, que é o furto que isto evita (reforçado
  // pelo dono em 13/10/2026).
  //
  // Usuário extra criado ANTES dessa data pode estar sem e-mail; nesse caso
  // ele continua dependendo do dono, e a tela de Usuários avisa isso na lista.
  //
  // A ordem importa só para evitar ambiguidade, e o cadastro já impede que o
  // mesmo endereço sirva a dois acessos (conferência cruzada ao salvar, mais
  // índice único no banco).
  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome, email')
    .eq('email', alvo)
    .eq('ativo', true)
    .maybeSingle()

  let prof: { id: string; nome: string; email: string } | null = null
  if (!usuario) {
    const { data: p } = await supabaseAdmin
      .from('profissionais')
      .select('id, nome_completo, apelido, email, acesso_liberado, ativo')
      .eq('email', alvo)
      .eq('ativo', true)
      .eq('acesso_liberado', true)
      .maybeSingle()
    if (p?.email) prof = { id: p.id, nome: p.apelido || p.nome_completo || 'Profissional', email: p.email }
  }

  let sub: { id: string; nome: string; email: string } | null = null
  if (!usuario && !prof) {
    const { data: u } = await supabaseAdmin
      .from('salao_usuarios')
      .select('id, nome, usuario, email, ativo')
      .ilike('email', alvo)
      .eq('ativo', true)
      .maybeSingle()
    if (u?.email) sub = { id: u.id, nome: u.nome || u.usuario || 'Usuário', email: u.email }
  }

  // Responde sempre OK (não revelar se email existe)
  if (!usuario && !prof && !sub) {
    return NextResponse.json({ ok: true, message: 'Se o email existir, você receberá as instruções.' })
  }

  const quem = usuario
    ? { coluna: 'usuario_id' as const, id: usuario.id, nome: usuario.nome, email: usuario.email }
    : prof
      ? { coluna: 'profissional_id' as const, id: prof.id, nome: prof.nome, email: prof.email }
      : { coluna: 'salao_usuario_id' as const, id: sub!.id, nome: sub!.nome, email: sub!.email }

  // Gera token seguro
  const token = crypto.randomBytes(32).toString('hex')
  const expira_em = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 horas

  // Invalida tokens anteriores
  await supabaseAdmin.from('tokens_senha').update({ usado: true }).eq(quem.coluna, quem.id).eq('usado', false)

  // Salva novo token
  await supabaseAdmin.from('tokens_senha').insert({
    [quem.coluna]: quem.id,
    token,
    expira_em: expira_em.toISOString(),
  })

  // O envio pode falhar (sem RESEND_API_KEY, provedor fora do ar). A resposta
  // NÃO muda por causa disso: dizer "não consegui enviar" só para e-mails que
  // existem entregaria quais endereços estão cadastrados, que é justamente o
  // que a mensagem genérica evita. O erro fica no log.
  try {
    await enviarEmailRecuperacaoSenha(quem.email, quem.nome, token)
  } catch (e) {
    console.error('[recuperar-senha] e-mail não enviado:', e)
  }

  return NextResponse.json({ ok: true, message: 'Se o email existir, você receberá as instruções.' })
}
