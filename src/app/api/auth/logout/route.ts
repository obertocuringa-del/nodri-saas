import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'https://nodri-saas-jsx4.vercel.app'))
  response.cookies.set('nodri_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    expires: new Date(0),
  })
  return response
}
