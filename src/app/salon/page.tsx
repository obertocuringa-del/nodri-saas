import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import SalonDashboard from '@/components/salon/SalonDashboard'

export default async function SalonPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('nodri_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'salon') redirect('/login')

  // FIX: salaoId explicitamente validado antes de usar
  if (!payload.salaoId) redirect('/login')

  // Verifica status do salão
  const { data: salaoStatus } = await supabaseAdmin
    .from('saloes')
    .select('status, licenca_vencimento, nome')
    .eq('id', payload.salaoId)
    .maybeSingle()

  // FIX: se salão não existe no DB, redireciona
  if (!salaoStatus) redirect('/login')

  if (salaoStatus.status === 'vencido' || salaoStatus.status === 'bloqueado') {
    redirect('/renovar-licenca')
  }

  // Busca módulos do salão com status
  const { data: todosModulos } = await supabaseAdmin
    .from('modulos')
    .select('*')
    .eq('ativo', true)
    .order('ordem')

  const { data: modulosHabilitados } = await supabaseAdmin
    .from('salao_modulos')
    .select('modulo_id')
    .eq('salao_id', payload.salaoId)
    .eq('ativo', true)

  const habilitadosSet = new Set((modulosHabilitados || []).map((m: any) => m.modulo_id))

  const modulosComStatus = (todosModulos || []).map((m: any) => ({
    ...m,
    habilitado: habilitadosSet.has(m.id),
  }))

  // Busca notificações não lidas
  const { data: notificacoes } = await supabaseAdmin
    .from('notificacoes')
    .select('*')
    .or(`salao_id.eq.${payload.salaoId},para_todos.eq.true`)
    .eq('lida', false)
    .order('criado_em', { ascending: false })
    .limit(5)

  const totalAtivos = modulosComStatus.filter((m: any) => m.habilitado).length

  return (
    <SalonDashboard
      salaoNome={payload.salaoNome || salaoStatus.nome || 'Meu Salão'}
      plano={payload.plano || 'basico'}
      modulos={modulosComStatus}
      notificacoes={notificacoes || []}
      totalAtivos={totalAtivos}
      totalModulos={modulosComStatus.length}
    />
  )
}
