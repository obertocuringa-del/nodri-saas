import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('nodri_token')?.value

  // Rotas públicas
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    if (token) {
      const payload = await verifyJWT(token)
      if (payload) {
        const dest = payload.role === 'master' ? '/admin' : '/salon'
        return NextResponse.redirect(new URL(dest, request.url))
      }
    }
    return NextResponse.next()
  }

  // Rotas protegidas — precisa de token
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyJWT(token)
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('nodri_token')
    return response
  }

  // Admin routes — só master
  if (pathname.startsWith('/admin') && payload.role !== 'master') {
    return NextResponse.redirect(new URL('/salon', request.url))
  }

  // Salon routes — só salon
  if (pathname.startsWith('/salon') && payload.role !== 'salon') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
