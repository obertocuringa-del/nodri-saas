import type { MetadataRoute } from 'next'

// Mapa das páginas que o Google deve conhecer. Sem ele o buscador só acha o
// que consegue seguir por links, e demora mais a perceber mudança de texto.
//
// Só entra vitrine. Link pessoal (avaliação de cliente, ficha de candidato,
// cadastro de parceiro) fica de fora aqui e bloqueado no robots.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.nodri.com.br'
  const agora = new Date()

  return [
    { url: base,              lastModified: agora, changeFrequency: 'weekly',  priority: 1 },
    { url: `${base}/landing`, lastModified: agora, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/trabalhe-conosco`, lastModified: agora, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
