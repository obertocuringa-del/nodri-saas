// Domínio público OFICIAL do sistema — usado em todos os links enviados a
// clientes, profissionais e parceiros (cadastro, feedback, pendências,
// lojistas...). Garante que o link sai sempre com o domínio próprio,
// mesmo quando o painel está sendo acessado pela URL técnica da Vercel.
export const DOMINIO_PUBLICO = 'https://www.nodri.com.br'

export function urlPublica(caminho: string): string {
  return `${DOMINIO_PUBLICO}${caminho.startsWith('/') ? caminho : '/' + caminho}`
}
