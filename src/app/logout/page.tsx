import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function LogoutPage() {
  const cookieStore = cookies()
  cookieStore.delete('nodri_token')
  redirect('/login')
}
