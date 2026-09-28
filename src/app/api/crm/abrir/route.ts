import { NextRequest, NextResponse } from 'next/server'
import { getSessao, crmBloqueado } from '@/lib/apiAuth'
import { acharOuCriarContato } from '@/lib/crmContatos'
import { normalizarTelefone } from '@/lib/crm'
import { conversaDoContato } from '@/lib/crmDisparos'

export const dynamic = 'force-dynamic'

// Botão verde das listas (Em Risco, Perdidos): em vez de abrir o WhatsApp
// Web, acha (ou cria) a conversa da cliente no CRM e devolve o id, para a
// tela abrir o CRM já nela, com a mensagem escrita na caixa.
export async function POST(req: NextRequest) {
  const s = await getSessao()
  if (!s || s.role === 'profissional') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await crmBloqueado()) return NextResponse.json({ error: 'Este acesso não tem o CRM liberado.' }, { status: 403 })
  const b = await req.json().catch(() => ({} as any))
  const tel = normalizarTelefone(b.telefone)
  if (tel.length < 12) return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
  const contato = await acharOuCriarContato(s.salaoId, tel, String(b.nome || '').trim() || undefined)
  if (!contato) return NextResponse.json({ error: 'Não consegui achar o contato' }, { status: 500 })
  const { conversa } = await conversaDoContato(s.salaoId, contato.id, 'aguardando')
  if (!conversa) return NextResponse.json({ error: 'Não consegui abrir a conversa' }, { status: 500 })
  return NextResponse.json({ ok: true, conversa_id: conversa.id })
}
