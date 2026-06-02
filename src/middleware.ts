import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('nodri_token')?.value

  // Logout — limpa cookie e redireciona
  if (pathname === '/logout') {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('nodri_token', '', { maxAge: 0, path: '/', expires: new Date(0) })
    return response
  }

  // Rotas públicas
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/cadastro') ||
    pathname.startsWith('/landing') ||
    pathname.startsWith('/pagamento') ||
    // FIX: rotas auth permitidas explicitamente (não o prefixo inteiro /api/auth)
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/me' ||
    pathname === '/api/auth/recuperar-senha' ||
    pathname === '/api/auth/redefinir-senha' ||
    // APIs públicas de compra
    pathname.startsWith('/api/checkout') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/cupons/validar') ||
    pathname.startsWith('/api/afiliados') ||
    // Feedback público (cliente e profissional)
    pathname.startsWith('/feedback') ||
    pathname.startsWith('/feedback-profissional') ||
    pathname.startsWith('/api/feedback/public') ||
    pathname.startsWith('/api/feedback-prof/public') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'

  if (isPublic) {
    // Se logado tentando acessar /login, redireciona para o painel correto
    if (pathname.startsWith('/login') && token) {
      const payload = await verifyJWT(token)
      if (payload) {
        return NextResponse.redirect(new URL(payload.role === 'master' ? '/admin' : '/salon', request.url))
      }
    }
    return NextResponse.next()
  }

  // Sem token → login
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

  // FIX: role desconhecido → login (evita loop infinito entre /salon e /admin)
  if (!['master', 'salon'].includes(payload.role)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('nodri_token', '', { maxAge: 0, path: '/' })
    return response
  }

  // Proteção por role
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
