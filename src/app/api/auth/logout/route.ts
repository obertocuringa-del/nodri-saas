import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const host = request.headers.get('host') || ''
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const response = NextResponse.redirect(`${protocol}://${host}/login`)
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
