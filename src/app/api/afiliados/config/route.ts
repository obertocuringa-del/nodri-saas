import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { configAfiliado, EMAIL_AFILIADO_PADRAO } from '@/lib/afiliados'

export const dynamic = 'force-dynamic'

// GET — config do programa de afiliados
//
// Devolve tudo já com os padrões preenchidos (ver configAfiliado): assim a
// tela do painel abre com o texto que o afiliado recebe hoje, e não com
// campos vazios que fariam o dono achar que o e-mail está em branco.
export async function GET() {
  const cfg = await configAfiliado()
  return NextResponse.json({ ...cfg, email_padrao: EMAIL_AFILIADO_PADRAO })
}

// POST — atualiza config (Admin)
export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const e = body?.email || {}
  const passos = Array.isArray(e.passos)
    ? e.passos.map((x: any) => String(x || '').slice(0, 300)).filter(Boolean)
    : EMAIL_AFILIADO_PADRAO.passos

  const valor = {
    percentual: Math.max(0, Math.min(100, Number(body?.percentual) || 0)),
    apenas_primeira: !!body?.apenas_primeira,
    // Comissão padrão dos afiliados. Vale para as vendas seguintes; comissão
    // já gerada guarda o percentual do dia e não é recalculada.
    comissao: Math.max(0, Math.min(100, Number(body?.comissao) || 0)),
    email: {
      assunto: String(e.assunto || EMAIL_AFILIADO_PADRAO.assunto).slice(0, 200),
      titulo: String(e.titulo || EMAIL_AFILIADO_PADRAO.titulo).slice(0, 200),
      intro: String(e.intro || EMAIL_AFILIADO_PADRAO.intro).slice(0, 1000),
      passos: passos.length ? passos : EMAIL_AFILIADO_PADRAO.passos,
      rodape: String(e.rodape || EMAIL_AFILIADO_PADRAO.rodape).slice(0, 200),
    },
  }

  await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: 'afiliado_desconto_cliente', valor }, { onConflict: 'chave' })

  return NextResponse.json({ ok: true })
}
