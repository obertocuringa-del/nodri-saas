// ─────────────────────────────────────────────────────────────────────────────
// Compartilhar um arquivo anexado por WhatsApp.
//
// Manda o ARQUIVO, não o link: quem recebe abre a planilha sem precisar de
// login no sistema. No celular usa o compartilhamento do próprio Android/iOS,
// que já lista o WhatsApp. No computador o navegador não deixa anexar em outro
// aplicativo, então baixa o arquivo, copia o texto e abre o WhatsApp Web — daí
// é só arrastar o arquivo para a conversa.
// ─────────────────────────────────────────────────────────────────────────────

interface Opcoes { url: string; filename?: string; texto?: string }

export async function compartilharArquivoWhats({ url, filename, texto }: Opcoes): Promise<string> {
  const nome = filename || 'arquivo'
  const legenda = texto || nome

  let file: File | null = null
  try {
    const r = await fetch(url)
    if (r.ok) {
      const blob = await r.blob()
      file = new File([blob], nome, { type: blob.type || 'application/octet-stream' })
    }
  } catch { /* sem rede ou storage fora do ar → cai no link */ }

  const nav = navigator as Navigator & {
    canShare?: (d: unknown) => boolean
    share?: (d: unknown) => Promise<void>
  }

  if (file && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: legenda })
      return 'enviado'
    } catch { /* cancelou ou o app recusou → cai no download */ }
  }

  if (file) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = nome
    a.click()
    URL.revokeObjectURL(a.href)
    try { await navigator.clipboard?.writeText(legenda) } catch { /* segue sem copiar */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(legenda)}`, '_blank', 'noopener')
    return 'baixado'
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(`${legenda}\n\n${url}`)}`, '_blank', 'noopener')
  return 'link'
}
