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
  if (!['master', 'salon', 'sub'].includes(payload.role)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('nodri_token', '', { maxAge: 0, path: '/' })
    return response
  }

  // /admin é só do master
  if (pathname.startsWith('/admin') && payload.role !== 'master') {
    return NextResponse.redirect(new URL('/salon', request.url))
  }
  // /salon é do dono (salon) e dos sub-usuários (sub); master vai pro /admin
  if (pathname.startsWith('/salon') && payload.role === 'master') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Sub-usuário: bloqueia páginas NÃO liberadas (mesmo digitando o link direto)
  if (payload.role === 'sub' && pathname.startsWith('/salon')) {
    const ROTAS: [string, string][] = [
      ['/salon/feedback-profissional', 'feedback_prof'],
      ['/salon/feedback', 'feedback_cliente'],
      ['/salon/administrativo', 'administrativo'],
      ['/salon/checklist', 'checklist'],
      ['/salon/calendario-mkt', 'calendario_mkt'],
      ['/salon/calendario', 'calendario'],
      ['/salon/usuarios', 'cfg_usuarios'],
      ['/salon/profissionais', 'profissionais'],
      ['/salon/relatorios', 'relatorios'],
      ['/salon/servicos', 'servicos'],
      ['/salon/lista-espera', 'lista_espera'],
      ['/salon/aniversariantes', 'aniversariantes'],
      ['/salon/pendencias', 'pendencias'],
      ['/salon/calculadora-custo', 'calculadora'],
      ['/salon/academia', 'academia'],
      ['/salon/perfil', 'cfg_salao'],
      ['/salon/ia-config', 'cfg_ia'],
    ]
    const hit = ROTAS.find(([pre]) => pathname.startsWith(pre))
    if (hit) {
      // Lê permissões AO VIVO do banco (fallback p/ as do token se falhar)
      let perms = Array.isArray((payload as any).permissoes) ? (payload as any).permissoes as string[] : []
      try {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        const r = await fetch(`${base}/rest/v1/salao_usuarios?id=eq.${payload.userId}&select=permissoes,ativo`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' })
        if (r.ok) { const rows = await r.json(); if (rows?.[0]) perms = Array.isArray(rows[0].permissoes) ? rows[0].permissoes : [] }
      } catch { /* mantém as do token */ }
      if (!perms.includes(hit[1])) return NextResponse.redirect(new URL('/salon', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}
