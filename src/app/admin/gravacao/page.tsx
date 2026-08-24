import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import SalaoGravacaoPainel from '@/components/admin/SalaoGravacaoPainel'

export const dynamic = 'force-dynamic'

export default async function AdminGravacaoPage() {
  const token = cookies().get('nodri_token')?.value
  if (!token) redirect('/login')
  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'master') redirect('/login')

  const { data: saloes } = await supabaseAdmin
    .from('saloes').select('id, nome').order('nome')

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', padding: '20px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Link href="/admin" style={{ fontSize: 13, color: '#5b4fcf', fontWeight: 700, textDecoration: 'none' }}>← Painel</Link>
          <span style={{ width: 1, height: 14, background: '#e0ddd8' }} />
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#1a1a2e' }}>Salão de gravação</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b6860', margin: '0 0 20px', maxWidth: 720 }}>
          Copia os dados de um salão real para um salão de demonstração, trocando os nomes e
          alterando os valores. Serve para gravar vídeo das ferramentas com as telas cheias,
          sem que apareça cliente nenhum. O salão de origem não é alterado.
        </p>
        <SalaoGravacaoPainel saloes={saloes || []} />
      </div>
    </div>
  )
}
