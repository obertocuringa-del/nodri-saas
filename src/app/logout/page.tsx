'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function LogoutPage() {
  const cookieStore = cookies()
  cookieStore.set('nodri_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    expires: new Date(0),
  })
  redirect('/login')
}
