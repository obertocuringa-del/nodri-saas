// ── Tipos de arquivo que o NODRI aceita subir ───────────────────────────────
//
// Auditoria de segurança (30/09/2026): as rotas de envio do salão aceitavam
// qualquer arquivo, até página HTML, na pasta pública -- um link desses pode
// rodar script de quem o abrir. Agora só entram imagem, vídeo, áudio (inclui
// o áudio gravado no CRM), PDF, documentos e planilhas, e o tipo servido é o
// NOSSO, não o que o navegador informou. A mesma ideia da /api/upload.
export const TIPOS_PERMITIDOS: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp', m4v: 'video/x-m4v',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', aac: 'audio/aac',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

/** A extensão do nome, só letras e números. */
export const extensaoDe = (nome: string) => String(nome || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''

/**
 * O tipo que o NODRI serve para este arquivo, ou null se ele não é aceito.
 * Imagem, vídeo e áudio mantêm o tipo informado pelo navegador (o áudio
 * gravado no CRM é .webm e é ÁUDIO, não vídeo), desde que seja da mesma
 * família e nunca svg/html/xml.
 */
export function tipoPermitido(nome: string, informado?: string | null): string | null {
  const nosso = TIPOS_PERMITIDOS[extensaoDe(nome)]
  if (!nosso) return null
  const inf = String(informado || '').split(';')[0].trim().toLowerCase()
  if (/^(image|video|audio)\/[a-z0-9.+-]+$/.test(inf) && !/svg|html|xml/.test(inf) && /^(image|video|audio)\//.test(nosso)) return inf
  return nosso
}

export const MSG_TIPO_RECUSADO = 'Tipo de arquivo não aceito. Envie imagem, vídeo, áudio, PDF, documento ou planilha.'
