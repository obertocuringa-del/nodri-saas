import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('nodri_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'master') redirect('/login')

  const [{ data: saloes }, { data: modulos }, { data: notificacoes }, { data: planos }] = await Promise.all([
    supabaseAdmin.from('saloes').select('*, plano:planos(*)').order('criado_em', { ascending: false }),
    supabaseAdmin.from('modulos').select('*').eq('ativo', true).order('ordem'),
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
