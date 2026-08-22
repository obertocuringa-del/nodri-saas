import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

// ── Contatos da vitrine ─────────────────────────────────────────────────────
//
// POST é público: quem preenche o formulário ainda não tem conta.
// GET e PUT são do master — a lista de quem procurou o NODRI e a liberação do
// acesso aos planos.

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null)

  const nome = String(b?.nome || '').trim()
  const email = String(b?.email || '').trim().toLowerCase()
  const sistema = String(b?.sistema_atual || '').trim()

  // Nome, e-mail e sistema atual são o mínimo para a conversa valer a pena:
  // sem eles você não sabe com quem falar nem o que oferecer.
  if (!nome || !email || !sistema) {
    return NextResponse.json({ erro: 'Preencha nome, e-mail e o sistema que você usa hoje.' }, { status: 400 })
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ erro: 'E-mail inválido.' }, { status: 400 })
  }

  const token = randomBytes(9).toString('base64url')

  const { error } = await supabaseAdmin.from('leads').insert({
    nome,
    sobrenome: String(b?.sobrenome || '').trim() || null,
    email,
    celular: String(b?.celular || '').replace(/\D/g, '') || null,
    estado: String(b?.estado || '').trim() || null,
    cidade: String(b?.cidade || '').trim() || null,
    tipo_estabelecimento: String(b?.tipo_estabelecimento || '').trim() || null,
    sistema_atual: sistema,
    objetivo: String(b?.objetivo || '').trim() || null,
    token,
  })
  if (error) return NextResponse.json({ erro: 'Não foi possível enviar. Tente novamente.' }, { status: 500 })

  // Aviso no painel master. É o ponto do fluxo: você não descobre o contato
  // olhando uma lista de vez em quando — ele chega até você.
  await supabaseAdmin.from('notificacoes').insert({
    titulo: 'Novo contato pela vitrine',
    mensagem: `${nome} (${email}${b?.celular ? ' · ' + b.celular : ''}) — usa hoje: ${sistema}.`
      + `${b?.tipo_estabelecimento ? ' Tipo: ' + b.tipo_estabelecimento + '.' : ''}`
      + `${b?.objetivo ? ' Quer: ' + b.objetivo + '.' : ''}`,
    tipo: 'info',
    para_todos: false,
    lida: false,
  })

  return NextResponse.json({ ok: true })
}

async function ehMaster() {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  return p?.role === 'master' ? p : null
}

export async function GET() {
  if (!await ehMaster()) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('leads').select('*').order('criado_em', { ascending: false }).limit(200)
  return NextResponse.json(data || [])
}

/** Libera (ou revoga) o acesso à página de planos deste contato. */
export async function PUT(req: NextRequest) {
  const master = await ehMaster()
  if (!master) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id, liberar } = await req.json().catch(() => ({} as any))
  if (!id) return NextResponse.json({ erro: 'Contato não informado' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(liberar
      ? { liberado_em: new Date().toISOString(), liberado_por: master.userId }
      // Revogar limpa a data: o link continua existindo mas para de valer.
      // Serve para quem sumiu depois de receber, sem apagar o histórico.
      : { liberado_em: null, liberado_por: null })
    .eq('id', id)
    .select('token, liberado_em').single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    liberado: !!data?.liberado_em,
    url: data?.liberado_em ? `https://www.nodri.com.br/planos?c=${data.token}` : null,
  })
}
