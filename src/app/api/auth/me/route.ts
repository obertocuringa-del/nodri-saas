import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const payload = await verifyJWT(token)
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  // Sub-usuário: devolve permissões AO VIVO (dono = permissoes null = vê tudo)
  if (payload.role === 'sub') {
    const { data: su } = await supabaseAdmin
      .from('salao_usuarios')
      .select('permissoes, nome, ativo')
      .eq('id', payload.userId)
      .maybeSingle()
    return NextResponse.json({ role: 'sub', nome: su?.nome || payload.nome, ativo: su?.ativo !== false, permissoes: Array.isArray(su?.permissoes) ? su!.permissoes : [] })
  }
  return NextResponse.json({ role: payload.role, permissoes: null })
}
