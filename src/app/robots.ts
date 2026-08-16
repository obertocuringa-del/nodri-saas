import type { MetadataRoute } from 'next'

// ── O que o Google pode e não pode ler ──────────────────────────────────────
//
// O site não tinha robots.txt. Sem ele o buscador entra em tudo que alcança —
// e boa parte do que é "público" aqui não é público no sentido de vitrine: são
// links pessoais que o salão manda para UMA pessoa.
//
// O formulário de avaliação de um cliente, a ficha de um candidato a emprego,
// o cadastro de um lojista parceiro: nenhum deles deveria aparecer numa busca
// por nome. Eles são abertos porque quem recebe o link ainda não tem login,
// não porque devam ser encontrados por estranhos.
//
// Indexar fica só o que é vitrine: a home e a landing.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/salon/',        // painel do salão
          '/admin/',        // painel master
          '/api/',          // nada aqui é página
          '/avaliacao/',    // link de avaliação de um cliente
          '/feedback/',     // link de feedback
          '/feedback-profissional/',
          '/lojista/',      // autocadastro de parceiro
          '/curriculo/',    // ficha de candidato
          '/cadastro/',     // cadastro por convite (token na URL)
          '/conteudo/',
          '/planos',        // pagina de precos, so por convite
          '/renovar-licenca',
          '/redefinir-senha',
          '/recuperar-senha',
          '/logout',
        ],
      },
    ],
    sitemap: 'https://www.nodri.com.br/sitemap.xml',
  }
}
