import type { KeyboardEvent } from 'react'

// ── Div que funciona como botão ──────────────────────────────────────────────
//
// O certo é usar <button>. Mas em alguns lugares o clicável é uma linha ou um
// cartão inteiro, com layout montado em cima de <div>, e trocar a tag levaria
// junto o estilo padrão do botão (recuo, borda, fundo, fonte) — mudança de
// aparência para resolver um problema que não é de aparência.
//
// Espalhar isto no elemento resolve o que realmente falta: ele passa a receber
// foco pelo Tab, a se anunciar como botão para quem usa leitor de tela, e a
// responder ao Enter e ao espaço. O onKeyDown dispara o clique do próprio
// elemento, então vale para qualquer onClick, sem precisar repetir a ação.
//
// Uso:  <div {...comoBotao} onClick={() => abrir(x)}>
export const comoBotao = {
  role: 'button' as const,
  tabIndex: 0,
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    // Espaço rola a página por padrão; num botão isso não pode acontecer.
    e.preventDefault()
    e.currentTarget.click()
  },
}
