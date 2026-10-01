import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyJWT } from '@/lib/auth'
import RoboRelatorioPainel from '@/components/admin/RoboRelatorioPainel'
import CentralServidor from '@/components/admin/CentralServidor'

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
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#1a1a2e' }}>Central do servidor</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b6860', margin: '0 0 20px' }}>
          Tudo o que roda no servidor, em todos os salões: coleta dos relatórios, extensão, CRM, ponte do WhatsApp e
          vigias. Verde é tudo certo; vermelho mostra o salão com problema e o motivo. Cada coleta leva cerca de 15 minutos
          e roda uma de cada vez; o que parecer errado fica aguardando a sua aprovação.
        </p>
        <div style={{ display: 'grid', gap: 18 }}>
          <CentralServidor />
          <RoboRelatorioPainel />
        </div>
      </div>
    </div>
  )
}
