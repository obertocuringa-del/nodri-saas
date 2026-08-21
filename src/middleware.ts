import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { chaveDoModulo, moduloExigidoPelaRota } from '@/lib/planosModulos'

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
    // Planos: pagina por convite. Quem valida o convite e a propria pagina
    // (via /api/leads/validar); o middleware so precisa deixar chegar.
    pathname.startsWith('/planos') ||
    // Formulario de contato da vitrine — quem preenche ainda nao tem conta.
    pathname === '/api/leads' ||
    pathname.startsWith('/api/leads/validar') ||
    pathname.startsWith('/pagamento') ||
    // FIX: rotas auth permitidas explicitamente (não o prefixo inteiro /api/auth)
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/me' ||
    pathname === '/api/auth/recuperar-senha' ||
    pathname === '/api/auth/redefinir-senha' ||
    // APIs públicas de compra
    // Planos da vitrine: quem lê é visitante que ainda não tem conta
    pathname.startsWith('/api/planos-publicos') ||
    // Funcionalidades: alimentam o menu e as paginas da vitrine
    pathname === '/api/funcionalidades' ||
    pathname.startsWith('/funcionalidade/') ||
    // Textos da vitrine. Estava FORA da lista: a pagina publica pedia a
    // config, o middleware devolvia o HTML do login, e o fetch morria em
    // silencio (nao havia catch). Resultado: tudo que voce editava no Editor
    // Landing Page ficava salvo e nunca aparecia no site.
    pathname === '/api/landing-config' ||
    // Assinatura: SÓ a criação é pública — quem assina ainda não tem conta.
    // /api/assinatura/gerenciar (cancelar, trocar plano, gerar link) fica de
    // fora de propósito: ela mexe na cobrança de salão que já existe, e a
    // rota conferir master por dentro não é motivo para deixar a porta aberta.
    pathname === '/api/assinatura/criar' ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/cupons/validar') ||
    pathname.startsWith('/api/afiliados') ||
    // Feedback público (cliente e profissional)
    pathname.startsWith('/feedback') ||
    pathname.startsWith('/feedback-profissional') ||
    // Link de avaliação que vai pro CLIENTE (/avaliacao/<slug>). A API já era
    // pública, mas a PÁGINA não estava aqui — o cliente caía no login e não
    // tinha como responder.
    pathname.startsWith('/avaliacao') ||
    pathname.startsWith('/api/feedback/public') ||
    pathname.startsWith('/api/feedback-prof/public') ||
    // Recuperação de senha: as APIs já eram públicas, mas as telas não —
    // quem esquecia a senha (justamente quem NÃO está logado) caía no login.
    pathname.startsWith('/recuperar-senha') ||
    pathname.startsWith('/redefinir-senha') ||
    // Cadastro e login de afiliados (não expõem dados de salão)
    pathname.startsWith('/trabalhe-conosco') ||
    pathname.startsWith('/afiliado') ||
    // Autocadastro público de lojistas parceiros
    pathname.startsWith('/lojista/') ||
    pathname.startsWith('/api/lojistas/public') ||
    // Formulário público de currículos (candidatos ainda sem login)
    pathname.startsWith('/curriculo/') ||
    pathname.startsWith('/api/curriculos/public') ||
    // Autocadastro público de profissionais (a pessoa que vai entrar ainda
    // não tem login). A API valida o token e escopa pelo salão dono do link.
    pathname.startsWith('/api/cadastro-publico') ||
    // Config remota dos programas desktop (GET é público e só leitura;
    // o POST valida master dentro da própria rota)
    pathname === '/api/config/programas' ||
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
  if (!['master', 'salon', 'sub', 'profissional'].includes(payload.role)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('nodri_token', '', { maxAge: 0, path: '/' })
    return response
  }

  // PROFISSIONAL: portal somente leitura — só enxerga o PRÓPRIO perfil; nada mais.
  if (payload.role === 'profissional') {
    const meuId = (payload as any).profissionalId || payload.userId
    const meuPerfil = `/salon/profissionais/${meuId}`
    const negar = () => NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    if (pathname.startsWith('/api/')) {
      // Rotas de autenticação sempre liberadas (me, etc.)
      if (pathname.startsWith('/api/auth/')) return NextResponse.next()
      // EXCEÇÃO somente-leitura: a IA do próprio profissional pode gerar (escrita do assistente)
      const ehIaPropria = pathname === `/api/profissionais/${meuId}/ia-profissional` || pathname.startsWith('/api/ia/')
      // EXCEÇÃO somente-leitura: a profissional pode solicitar seus próprios kits (a rota valida o dono da solicitação)
      const ehKitsPropria = pathname === '/api/kits/solicitacoes' && request.method === 'POST'
      // EXCEÇÃO somente-leitura: a profissional pode dispensar/marcar como lida uma notificação dela ("já peguei")
      const ehNotifPropria = pathname === '/api/salon/notificacoes' && request.method === 'DELETE'
      // EXCEÇÃO: a profissional pode ENVIAR uma solicitação para um departamento (a rota escopa pelo id dela)
      const ehSolicitacaoPropria = pathname === '/api/solicitacoes' && request.method === 'POST'
      // EXCEÇÃO: a profissional pode RESPONDER/CONCLUIR uma demanda dela (a rota valida se é dona)
      const ehResponderDemanda = pathname.startsWith('/api/pendencias/') && request.method === 'PUT'
      // EXCEÇÃO: contabilizar visualização/compartilhamento de uma Ação Comercial (só incrementa contador)
      const ehMetricaAcao = pathname === '/api/salon/acoes-comerciais' && request.method === 'PATCH'
      // EXCEÇÃO: a profissional pode definir a PRÓPRIA meta manual do mês (a rota valida o id dela)
      const ehMetaPropria = pathname === `/api/profissionais/${meuId}/metas` && request.method === 'PUT'
      // EXCEÇÃO: a profissional pode gerar/salvar a PRÓPRIA estratégia de meta (a rota valida o id dela)
      const ehEstrategiaPropria = pathname === `/api/profissionais/${meuId}/estrategia-meta` && (request.method === 'POST' || request.method === 'PUT')
      // EXCEÇÃO: a profissional envia alicates p/ esterilizar e confirma o recebimento (a rota valida o id dela)
      const ehEsterFluxo = pathname === '/api/salon/esterilizacao-fluxo' && (request.method === 'POST' || request.method === 'PATCH')
      // SOMENTE LEITURA: nenhum método de escrita é permitido (GET/HEAD apenas), exceto as exceções acima
      if (request.method !== 'GET' && request.method !== 'HEAD' && !ehIaPropria && !ehKitsPropria && !ehNotifPropria && !ehSolicitacaoPropria && !ehResponderDemanda && !ehMetricaAcao && !ehMetaPropria && !ehEstrategiaPropria && !ehEsterFluxo) return negar()
      // Nunca pode listar todos os profissionais
      if (pathname === '/api/profissionais' || pathname === '/api/profissionais/') return negar()
      // Em /api/profissionais/<id>/... o id TEM que ser o dele
      if (pathname.startsWith('/api/profissionais/')) {
        const seg = pathname.split('/')[3] || ''
        if (seg !== meuId) return negar()
        return NextResponse.next()
      }
      // Qualquer endpoint que receba um id de profissional na query → só o próprio
      const sp = request.nextUrl.searchParams
      for (const k of ['profissional_id', 'prof_id', 'profId', 'profissionalId', 'solicitante_id']) {
        const v = sp.get(k)
        if (v && v !== meuId) return negar()
      }
      const idsQ = sp.get('ids')
      if (idsQ && idsQ.split(',').some(x => x.trim() && x.trim() !== meuId)) return negar()
      return NextResponse.next()
    }

    // Páginas: perfil completo (todas as funcionalidades, somente leitura) + painel-resumo
    const painel = '/salon/meu-painel'
    if (pathname.startsWith('/salon')) {
      if (!pathname.startsWith(painel) && !pathname.startsWith(meuPerfil)) {
        return NextResponse.redirect(new URL(meuPerfil, request.url))
      }
      return NextResponse.next()
    }
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL(meuPerfil, request.url))
    }
    return NextResponse.next()
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
      ['/salon/calendario', 'calendario'],
      ['/salon/consultoria', 'ia'],
      ['/salon/auditoria', 'cfg_auditoria'],
      ['/salon/lojistas', 'lojistas'],
      ['/salon/checkprocon', 'checkprocon'],
      ['/salon/usuarios', 'cfg_usuarios'],
      ['/salon/departamentos', 'profissionais'],
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

  // ── Módulo contratado ──────────────────────────────────────────────────
  // Até aqui o módulo era só um cadeado desenhado no card: nada no servidor
  // olhava `salao_modulos`, então digitar o link direto abria a tela igual.
  // Quem paga o plano Inicial não tem Relatórios — e agora não entra mesmo.
  //
  // Só as rotas dos 4 módulos web passam por esta checagem, e a consulta ao
  // banco só acontece nelas — as telas da base (check list, calendários,
  // setores…) não pagam nenhuma ida ao banco por causa disso.
  const moduloExigido = moduloExigidoPelaRota(pathname)
  if (moduloExigido && (payload.role === 'salon' || payload.role === 'sub')) {
    let liberado = false
    try {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      const url = `${base}/rest/v1/salao_modulos?salao_id=eq.${payload.salaoId}&ativo=is.true&select=modulos(nome)`
      const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' })
      if (r.ok) {
        const rows = await r.json()
        for (const linha of Array.isArray(rows) ? rows : []) {
          const nome = Array.isArray(linha.modulos) ? linha.modulos[0]?.nome : linha.modulos?.nome
          if (chaveDoModulo(nome || '') === moduloExigido) { liberado = true; break }
        }
      } else {
        // Banco fora do ar não pode virar bloqueio: um salão que paga ficaria
        // sem o que contratou por causa de uma falha nossa. Na dúvida, passa.
        liberado = true
      }
    } catch {
      liberado = true
    }

    if (!liberado) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Módulo não contratado', modulo: moduloExigido },
          { status: 403 },
        )
      }
      // Página: volta para o painel com o módulo em destaque, para o dono ver
      // o que falta e como contratar — em vez de um erro seco.
      const destino = new URL('/salon', request.url)
      destino.searchParams.set('contratar', moduloExigido)
      return NextResponse.redirect(destino)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}
