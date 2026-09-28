import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyJWT } from '@/lib/auth'
import RoboRelatorioPainel from '@/components/admin/RoboRelatorioPainel'

export const dynamic = 'force-dynamic'

export default async function AdminRoboPage() {
  const token = cookies().get('nodri_token')?.value
  if (!token) redirect('/login')
  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'master') redirect('/login')

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', padding: '20px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Link href="/admin" style={{ fontSize: 13, color: '#5b4fcf', fontWeight: 700, textDecoration: 'none' }}>← Painel</Link>
          <span style={{ width: 1, height: 14, background: '#e0ddd8' }} />
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#1a1a2e' }}>Robô do relatório</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b6860', margin: '0 0 20px' }}>
          Coleta do mês atual no sistema de agenda de cada salão, pela conexão em nuvem. Cada coleta leva cerca de 15 minutos
          e roda uma de cada vez. Antes de aplicar, o sistema confere com o que já existe; o que parecer errado fica
          aguardando a sua aprovação.
        </p>
        <RoboRelatorioPainel />
      </div>
    </div>
  )
}
