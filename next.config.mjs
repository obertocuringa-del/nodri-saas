/** @type {import('next').NextConfig} */

// ─────────────────────────────────────────────────────────────────────────────
// CABEÇALHOS DE SEGURANÇA (auditoria — SEC-005)
//
// O projeto não enviava nenhum. São a camada que o navegador aplica sozinho:
// não dependem de acertarmos cada rota, valem para o site inteiro.
//
// CSP: deliberadamente NÃO usa 'strict-dynamic' nem nonce porque o Next em
// produção ainda injeta scripts inline de hidratação — travar agora quebraria
// a aplicação. O que ela já faz: impede <iframe> de terceiros, bloqueia
// plugins, restringe de onde vêm imagens/estilos e proíbe form-action externo.
// Endurecer para nonce é um passo posterior, com teste em preview.
// ─────────────────────────────────────────────────────────────────────────────
const csp = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval': exigidos pelo runtime do Next hoje
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  // Áudio e vídeo das conversas do CRM moram no storage do Supabase. Sem esta
  // linha valia o default-src 'self' e o Chrome recusava carregar o arquivo:
  // o player aparecia com 0:00 / 0:00 e não tocava (21/09/2026). blob: é a
  // prévia do áudio gravado na própria tela.
  "media-src 'self' blob: https://*.supabase.co",
  "font-src 'self' data:",
  // Supabase (banco/storage) e as APIs de IA usadas pelo servidor.
  //
  // viacep: o CEP e consultado pelo NAVEGADOR, no formulario de cadastro do
  // profissional (link publico, cadastro manual e edicao do perfil). Sem estar
  // nesta lista o browser bloqueia a chamada antes de sair, e o campo para de
  // preencher bairro/cidade/UF sozinho - sem erro visivel na tela, que foi
  // exatamente como o preenchimento automatico "parou de funcionar".
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://api.tavily.com https://viacep.com.br",
  "frame-ancestors 'none'",      // ninguém embute o sistema num iframe (clickjacking)
  // YouTube liberado para os vídeos das páginas de funcionalidade. Sem isto o
  // player aparece como "Este conteúdo está bloqueado" — a política recusava
  // qualquer frame de fora e o dono do site não tinha como saber o porquê.
  //
  // `frame-ancestors 'none'` acima continua valendo e é o que importa contra
  // clickjacking: ele impede que ALGUÉM embuta o NODRI. Este `frame-src` faz o
  // caminho inverso, dizendo o que o NODRI pode embutir — e a lista é só o
  // YouTube, não um "permitir tudo".
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",           // sem Flash/applets
  "base-uri 'self'",
  "form-action 'self'",          // formulário não posta para fora
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  // Só HTTPS por 2 anos, inclusive subdomínios
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
  // Navegador não "adivinha" o tipo do arquivo — protege upload servido errado
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Não vaza a URL interna (com ids) para sites externos
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

const nextConfig = {
  // ── O servidor tem UM núcleo ──────────────────────────────────────────────
  //
  // Antes quem montava era a Vercel, numa máquina separada: só o resultado
  // pronto vinha para cá. Desde 26/09/2026 a montagem acontece no mesmo
  // servidor que atende o salão -- e em 01/10 ela passou de 28 minutos com o
  // servidor em carga 20, disputando um núcleo só com o site, a ponte e o
  // Chrome do robô.
  //
  // O ESLint não muda uma vírgula do que vai para o ar: é conferência de
  // estilo, e ela já é feita aqui no computador antes de subir. Rodar de novo
  // lá dentro só atrasa a publicação e deixa o salão com o sistema lento
  // enquanto monta.
  //
  // E a conferência de TIPOS também sai daqui -- com uma condição, que está
  // escrita no scripts/publicar-no-servidor.sh e tem de ser respeitada: ela
  // roda ANTES de subir, no computador de quem programa (`npx tsc --noEmit`).
  //
  // Medido em 01/10/2026 nesta máquina de um núcleo: a montagem compila em
  // uns 3 minutos e depois fica MAIS DE UMA HORA só conferindo tipos. Durante
  // esse tempo o robô do Avec fica pausado para a montagem caber na memória
  // -- ou seja, uma hora inteira sem feedback, sem confirmação e sem aviso ao
  // profissional, por uma conferência que já tinha sido feita antes de subir.
  //
  // Conferir duas vezes não deixa o sistema mais seguro; deixa o salão mais
  // tempo parado. A conferência continua obrigatória, só que no lugar certo.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Não expõe a versão do Next (facilita mirar exploit conhecido)
  poweredByHeader: false,
  // Source maps de produção entregam o código legível ao navegador
  productionBrowserSourceMaps: false,
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
    // Tree-shaking de bibliotecas grandes: importa só os ícones/funções usados,
    // em vez do pacote inteiro. Reduz o JS que trafega em todas as telas.
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns']
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
