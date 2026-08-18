// ─────────────────────────────────────────────────────────────────────────────
// Envio de arquivo — um caminho só para todas as telas que anexam algo.
//
// Até ~4 MB vai pela rota de sempre. Acima disso a Vercel recusa a requisição
// antes de ela chegar no nosso código (413), então o navegador sobe direto
// para o storage com uma URL assinada que o servidor autoriza.
// ─────────────────────────────────────────────────────────────────────────────

const LIMITE_DIRETO = 4 * 1024 * 1024

export interface ArquivoEnviado { url: string; filename: string; type?: string }

export async function enviarArquivo(file: File): Promise<ArquivoEnviado> {
  if (file.size > 50 * 1024 * 1024) throw new Error('Arquivo muito grande (máx. 50 MB)')

  if (file.size <= LIMITE_DIRETO) {
    const fd = new FormData()
    fd.append('arquivo', file)
    const res = await fetch('/api/salon/upload', { method: 'POST', body: fd })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(d?.error || 'Erro ao enviar arquivo')
    return { url: d.url, filename: d.filename, type: d.type }
  }

  const res = await fetch('/api/salon/upload/assinado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: file.name, tamanho: file.size }),
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || !d?.signedUrl) throw new Error(d?.error || 'Erro ao enviar arquivo')

  const envio = await fetch(d.signedUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
    body: file,
  })
  if (!envio.ok) throw new Error('O arquivo não chegou ao servidor. Tente de novo.')

  return { url: d.publicUrl, filename: d.filename || file.name, type: file.type }
}
