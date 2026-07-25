import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Telefone de WhatsApp do salão logado — só o número, para o botão flutuante.
// Aberto a qualquer usuário do salão (dono, sub, profissional), pois só expõe
// o telefone público de contato. Normaliza para o formato do wa.me (com 55).
export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload?.salaoId) return NextResponse.json({ telefone: '' })

  const { data } = await supabaseAdmin.from('saloes').select('telefone').eq('id', payload.salaoId).maybeSingle()
  let tel = String((data as any)?.telefone || '').replace(/\D/g, '')
  // Se veio sem o código do país (10–11 dígitos = DDD + número), adiciona 55.
  if (tel && tel.length >= 10 && tel.length <= 11) tel = '55' + tel
  return NextResponse.json({ telefone: tel })
}
