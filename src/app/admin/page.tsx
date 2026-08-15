import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import AdminDashboard from '@/components/admin/AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('nodri_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyJWT(token)
  // Com token na mão o destino é /logout, não /login: o middleware devolve
  // quem tem token para o painel, e /login aqui viraria laço (ver salon/page).
  if (!payload || payload.role !== 'master') redirect('/logout')

  const [{ data: saloes }, { data: modulos }, { data: notificacoes }, { data: planos }] = await Promise.all([
    // salao_modulos entra no select para a coluna "Módulos" da lista mostrar a
    // contagem real. Ela exibia "—/8" fixo para todo salão: com o módulo
    // valendo acesso de verdade, essa é a coluna onde você confere quem tem o
    // quê, e um traço não confere nada.
    supabaseAdmin.from('saloes').select('*, plano:planos(*), salao_modulos(modulo_id, ativo)').order('criado_em', { ascending: false }),
    supabaseAdmin.from('modulos').select('*').order('ordem'),
    supabaseAdmin.from('notificacoes').select('*').order('criado_em', { ascending: false }).limit(20),
    supabaseAdmin.from('planos').select('*').eq('ativo', true),
  ])

  return (
    <AdminDashboard
      saloes={saloes || []}
      modulos={modulos || []}
      notificacoes={notificacoes || []}
      planos={planos || []}
    />
  )
}
