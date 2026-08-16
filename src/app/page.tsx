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
  return <LandingPage cfgInicial={cfgInicial} />
}
