import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'

export default async function HomePage() {
  const cookieStore = cookies()
  const token = cookieStore.get('nodri_token')?.value

  if (!token) redirect('/login')

  const payload = await verifyJWT(token)
  if (!payload) redirect('/login')

  if (payload.role === 'master') redirect('/admin')
  redirect('/salon')
}
