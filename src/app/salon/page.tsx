import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import SalonDashboard from '@/components/salon/SalonDashboard'

export const dynamic = 'force-dynamic'

export default async function SalonPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('nodri_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyJWT(token)
  // ATENCAO: quando existe token, o destino e /logout e NUNCA /login.
  //
  // O middleware manda quem tem token de /login de volta para /salon. Se esta
  // pagina responde com /login, os dois ficam se empurrando: /salon -> /login
  // -> /salon, ate o navegador desistir com ERR_TOO_MANY_REDIRECTS. E o que
  // acontecia com token valido apontando para um salao que nao existe mais:
  // a pessoa ficava trancada do lado de fora, sem conseguir nem abrir a tela
  // de login para entrar com outra conta.
  //
  // /logout apaga o cookie e so entao vai para /login, quebrando o laco.
  if (!payload || (payload.role !== 'salon' && payload.role !== 'sub')) redirect('/logout')

  // FIX: salaoId explicitamente validado antes de usar
  if (!payload.salaoId) redirect('/logout')

  // Sub-usuário: lê permissões AO VIVO do banco (assim mudanças aplicam só recarregando)
  let permsSub: string[] | null = null
  let nomeSub: string | null = null
  if (payload.role === 'sub') {
    const { data: su } = await supabaseAdmin
      .from('salao_usuarios')
      .select('permissoes, nome, ativo')
      .eq('id', payload.userId)
      .maybeSingle()
    if (!su || su.ativo === false) redirect('/logout')
    permsSub = Array.isArray(su.permissoes) ? su.permissoes : []
    nomeSub = su.nome || 'Usuário'
  }

  // Verifica status do salão
  const { data: salaoStatus } = await supabaseAdmin
    .from('saloes')
    .select('status, licenca_vencimento, nome')
    .eq('id', payload.salaoId)
    .maybeSingle()

  // FIX: se salão não existe no DB, encerra a sessão (ver nota acima)
  if (!salaoStatus) redirect('/logout')

  if (salaoStatus.status === 'vencido' || salaoStatus.status === 'bloqueado') {
    redirect('/renovar-licenca')
  }

  // Busca módulos do salão com status
  const { data: todosModulos } = await supabaseAdmin
    .from('modulos')
    .select('*')
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
      permissoes={permsSub}
      nomeUsuario={nomeSub}
    />
  )
}
