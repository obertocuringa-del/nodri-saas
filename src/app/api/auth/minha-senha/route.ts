// Trocar a PRÓPRIA senha, estando logado.
//
// Antes disto só existiam dois caminhos, e nenhum servia para quem esqueceu:
//
//  - "Esqueci a senha" por e-mail, que só funciona para o DONO do salão
//    (a tabela `usuarios`). Sub-usuário e profissional entram com um LOGIN
//    escolhido pelo salão, não com e-mail: não há para onde mandar o link.
//  - O dono redefinir a senha do profissional no perfil dele, e o master
//    redefinir a do dono no /admin. Os dois existem, mas dependem de outra
//    pessoa.
//
// Faltava o óbvio: eu, logado, trocar a minha. É isto (pedido do dono em
// 13/10/2026, depois de o e-mail de recuperação não chegar).
//
// Cada papel mora numa tabela diferente, e é por isso que a rota é uma só
// com três ramos -- espalhar isso por três endpoints seria três lugares para
// esquecer de conferir a senha atual.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT, hashPassword, verifyPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { limitar, registrarFalha, ipDaRequisicao } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

/** Onde mora a senha de cada papel. */
const ONDE: Record<string, { tabela: string; campo: string }> = {
  master:       { tabela: 'usuarios',       campo: 'senha_hash' },
  salon:        { tabela: 'usuarios',       campo: 'senha_hash' },
  sub:          { tabela: 'salao_usuarios', campo: 'senha_hash' },
  profissional: { tabela: 'profissionais',  campo: 'acesso_senha_hash' },
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const onde = ONDE[String(payload.role)]
  if (!onde) return NextResponse.json({ error: 'Este acesso não tem senha para trocar.' }, { status: 400 })

  const { atual, nova } = await req.json().catch(() => ({ atual: '', nova: '' }))
  if (!atual || !nova) return NextResponse.json({ error: 'Informe a senha atual e a nova.' }, { status: 400 })
  if (String(nova).length < 6) return NextResponse.json({ error: 'A senha nova precisa de pelo menos 6 caracteres.' }, { status: 400 })
  if (String(nova) === String(atual)) return NextResponse.json({ error: 'A senha nova tem de ser diferente da atual.' }, { status: 400 })

  // Errar a senha atual muitas vezes é tentativa de adivinhar a senha de quem
  // deixou a tela aberta. Mesmo limite do login.
  const ip = ipDaRequisicao(req)
  const chave = String(payload.userId)
  const lim = await limitar('trocar_senha', chave, 8, 30)
  if (!lim.permitido) {
    return NextResponse.json({ error: 'Muitas tentativas. Espere alguns minutos.' }, { status: 429 })
  }

  // O id do profissional vem do token do portal, que guarda profissionalId.
  const meuId = payload.role === 'profissional'
    ? ((payload as any).profissionalId || payload.userId)
    : payload.userId

  const { data: linha } = await supabaseAdmin
    .from(onde.tabela)
    .select(`id, ${onde.campo}`)
    .eq('id', meuId)
    .maybeSingle()

  const hashAtual = (linha as any)?.[onde.campo]
  if (!linha || !hashAtual) {
    return NextResponse.json({ error: 'Não encontrei o seu acesso. Entre de novo e tente mais uma vez.' }, { status: 404 })
  }

  if (!(await verifyPassword(String(atual), hashAtual))) {
    await registrarFalha('trocar_senha', chave, ip)
    return NextResponse.json({ error: 'A senha atual está errada.' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from(onde.tabela)
    .update({ [onde.campo]: await hashPassword(String(nova)) })
    .eq('id', meuId)

  if (error) return NextResponse.json({ error: 'Não consegui salvar a senha nova.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
