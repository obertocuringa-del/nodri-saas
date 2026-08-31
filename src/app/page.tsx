import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import LandingPage from './landing/page'
import { lerLandingConfig } from '@/lib/landingConfig'

export const dynamic = 'force-dynamic'

// ── A porta da frente do NODRI ──────────────────────────────────────────────
//
// Antes, quem digitava nodri.com.br caía direto na tela de login. Quem nunca
// ouviu falar do sistema encontrava um formulário pedindo e-mail e senha, sem
// nada explicando o que é o produto, quanto custa ou como assinar — e ia
// embora. A página de vendas existia, mas escondida em /landing, um endereço
// que ninguém adivinha.
//
// Isso também empobrecia a busca: o Google indexava a raiz e via uma tela de
// login, e era com isso que ele montava o resumo do NODRI.
//
// Agora a raiz é a vitrine para quem chega de fora. Quem já tem sessão aberta
// continua indo direto para o painel, como sempre — cliente que entra todo dia
// não precisa passar por página de venda.
export default async function HomePage() {
  const token = cookies().get('nodri_token')?.value

  if (token) {
    const payload = await verifyJWT(token)
    if (payload) {
      if (payload.role === 'master') redirect('/admin')
      redirect('/salon')
    }
  }

  // Visitante: mostra a vitrine NA PRÓPRIA RAIZ, sem redirecionar para
  // /landing. O conteúdo precisa estar aqui para o Google indexar o endereço
  // que as pessoas realmente digitam e compartilham.
  // Textos lidos no servidor: sem isto a página nascia com o texto do código e
  // trocava depois, piscando na frente do visitante.
  const cfgInicial = await lerLandingConfig()
  return (
    <>
      {/* ── Ficha técnica para máquina ────────────────────────────────────────
          O texto da página é escrito para gente. Isto aqui é a mesma
          informação num formato que buscador e assistente de IA leem sem ter
          que interpretar: o que o NODRI é, para que serve, para quem, em que
          língua, quanto custa a partir de.

          Vale para os dois lados da busca de hoje. No Google, é o que permite
          o resultado sair com nome, avaliação e descrição em vez de um link
          seco. No ChatGPT, no Gemini e no modo IA da busca — que respondem em
          texto e não em lista de links — é a diferença entre o modelo dizer
          "NODRI é um sistema de gestão para salões de beleza, em português,
          com financeiro e portal do profissional" e não ter o que dizer.

          O JSON fica dentro de <script type="application/ld+json">, que o
          navegador não executa e a pessoa não vê. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FICHA_ESTRUTURADA) }}
      />
      <LandingPage cfgInicial={cfgInicial} />
    </>
  )
}

// Não leva preço: o valor dos planos vive no banco e mudaria aqui sem ninguém
// perceber — ficha técnica desatualizada é pior do que ficha ausente, porque o
// buscador passa a repetir um número errado.
const FICHA_ESTRUTURADA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.nodri.com.br/#organizacao',
      name: 'NODRI',
      alternateName: 'NODRI Estilo & Beleza',
      url: 'https://www.nodri.com.br',
      logo: 'https://www.nodri.com.br/logo-nodri.png',
      email: 'nodriestiloebeleza@gmail.com',
      areaServed: { '@type': 'Country', name: 'Brasil' },
      knowsLanguage: 'pt-BR',
      description:
        'Sistema de gestão para salões de beleza, barbearias e clínicas de estética.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.nodri.com.br/#site',
      url: 'https://www.nodri.com.br',
      name: 'NODRI',
      inLanguage: 'pt-BR',
      publisher: { '@id': 'https://www.nodri.com.br/#organizacao' },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://www.nodri.com.br/#aplicativo',
      name: 'NODRI',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Gestão para salão de beleza',
      operatingSystem: 'Navegador de internet (Windows, Android, iOS)',
      inLanguage: 'pt-BR',
      url: 'https://www.nodri.com.br',
      publisher: { '@id': 'https://www.nodri.com.br/#organizacao' },
      description:
        'Controle do salão em um só lugar: financeiro, equipe, processos, atendimento, metas e indicadores. Transforma os dados do salão em decisão.',
      audience: {
        '@type': 'BusinessAudience',
        audienceType: 'Salão de beleza, barbearia, estúdio de estética, clínica de estética e esmalteria',
      },
      featureList: [
        'Calculadora de custo e formação de preço',
        'Ponto de equilíbrio e despesas do salão',
        'Comissões, descontos e empréstimos por profissional',
        'Cadastro de profissionais CLT e PJ, com plano de carreira',
        'Portal do profissional, com acesso só ao que é dele',
        'Check list diário por período e POPs',
        'Organograma de setores e fila de solicitações',
        'Pesquisa de satisfação do cliente e convite para avaliar no Google',
        'Vitrine com preços, promoções e agendamento pelo WhatsApp',
        'Relatórios de faturamento, ticket médio e clientes inativos',
        'Consultoria por inteligência artificial sobre os números do salão',
      ],
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'BRL',
        offerCount: 4,
        url: 'https://www.nodri.com.br',
      },
    },
  ],
}
