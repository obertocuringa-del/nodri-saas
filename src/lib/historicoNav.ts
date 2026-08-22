'use client'

// ─────────────────────────────────────────────────────────────────────────────
// HISTÓRICO DE NAVEGAÇÃO DO SALÃO — o que o botão Voltar precisa saber
//
// Antes cada tela tinha o próprio Voltar com destino escrito no código:
// `router.push('/salon')`. Por isso o botão às vezes acertava e às vezes
// jogava a pessoa na tela inicial ou no organograma — ele nunca voltava, ele
// ia para um lugar fixo.
//
// `router.back()` sozinho também não resolve: quem abre uma tela por link
// direto não tem para onde voltar, e algumas telas trocam a URL sem criar
// entrada no histórico do navegador.
//
// Então o próprio sistema guarda por onde a pessoa passou. Fica em
// sessionStorage: vale por aba, some ao fechar, e sobrevive a recarga de
// página inteira (que é como algumas telas trocam de aba).
// ─────────────────────────────────────────────────────────────────────────────

const CHAVE = 'nodri_hist_nav'
const LIMITE = 40

function ler(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const v = JSON.parse(sessionStorage.getItem(CHAVE) || '[]')
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []
  } catch { return [] }
}

function gravar(lista: string[]) {
  try { sessionStorage.setItem(CHAVE, JSON.stringify(lista)) } catch { /* aba cheia */ }
}

/** Anota a tela aberta agora. Repetição seguida não entra: recarregar a mesma
 *  página não pode empilhar duas vezes, senão o Voltar não sai do lugar. */
export function registrarPagina(url: string) {
  if (!url) return
  const h = ler()
  if (h[h.length - 1] === url) return
  h.push(url)
  if (h.length > LIMITE) h.splice(0, h.length - LIMITE)
  gravar(h)
}

/** Tira a tela atual da pilha e devolve a anterior — ou null quando não há
 *  anterior (link direto, aba nova). Quem chama decide o destino padrão. */
export function paginaAnterior(): string | null {
  const h = ler()
  if (h.length < 2) return null
  h.pop()
  const alvo = h[h.length - 1]
  gravar(h)
  return alvo || null
}

/** O Voltar de qualquer tela do salão. `padrao` é para onde ir quando não há
 *  história nenhuma — normalmente o início. */
export function voltar(router: { push: (url: string) => void }, padrao = '/salon') {
  router.push(paginaAnterior() || padrao)
}
