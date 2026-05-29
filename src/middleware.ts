import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('nodri_token')?.value

  // TRATAMENTO ESPECIAL PARA LOGOUT - sempre limpa o cookie e redireciona
  if (pathname === '/logout') {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('nodri_token', '', { 
      maxAge: 0, 
      path: '/',
      expires: new Date(0)
    })
    return response
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    if (pathname.startsWith('/login') && token) {
      const payload = await verifyJWT(token)
      if (payload) {
        return NextResponse.redirect(new URL(payload.role === 'master' ? '/admin' : '/salon', request.url))
      }
    }
    return NextResponse.next()
  }

  if (!token) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('nodri_token', '', { maxAge: 0, path: '/' })
    return response
  }

  const payload = await verifyJWT(token)
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('nodri_token', '', { maxAge: 0, path: '/' })
    return response
  }

  if (pathname.startsWith('/salon') && payload.role !== 'salon') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (pathname.startsWith('/admin') && payload.role !== 'master') {
    return NextResponse.redirect(new URL('/salon', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}
