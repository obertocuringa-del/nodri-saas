import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { lerConfigIA } from '@/lib/iaClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── O que a cliente disse no áudio, por escrito ─────────────────────────────
//
// Nem sempre dá para ouvir áudio na recepção (cliente na cadeira, secador
// ligado). Aqui o áudio vai para o Gemini, que entende som, e o texto volta
// para aparecer embaixo do áudio.
//
// A transcrição fica gravada na própria mensagem: o mesmo áudio nunca é
// mandado duas vezes para a IA, nem quando outra pessoa abre a conversa.

const LIMITE_BYTES = 15 * 1024 * 1024

function mimeDoAudio(url: string, informado: string | null): string {
  const t = (informado || '').split(';')[0].trim()
  if (t.startsWith('audio/')) return t
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase()
  if (ext === 'mp3') return 'audio/mp3'
  if (ext === 'm4a' || ext === 'mp4' || ext === 'aac') return 'audio/aac'
  if (ext === 'wav') return 'audio/wav'
  if (ext === 'webm') return 'audio/webm'
  return 'audio/ogg'
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'profissional') return NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const id = String(body?.mensagem || '')
  if (!id) return NextResponse.json({ error: 'Mensagem não informada' }, { status: 400 })

  const { data: m } = await supabaseAdmin
    .from('crm_mensagens')
    .select('id, tipo, midia_url, transcricao')
    .eq('id', id)
    .eq('salao_id', sess.salaoId)
    .maybeSingle()
  if (!m) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
  if (m.tipo !== 'audio' || !m.midia_url) return NextResponse.json({ error: 'Esta mensagem não é um áudio.' }, { status: 400 })
  if (m.transcricao) return NextResponse.json({ texto: m.transcricao })

  const { chaveGemini } = await lerConfigIA()
  if (!chaveGemini) return NextResponse.json({ error: 'A IA não está configurada. Cadastre a chave do Gemini em Admin > IA.' }, { status: 422 })

  const arq = await fetch(m.midia_url).catch(() => null)
  if (!arq || !arq.ok) return NextResponse.json({ error: 'Não consegui baixar o áudio.' }, { status: 502 })
  const bytes = Buffer.from(await arq.arrayBuffer())
  if (bytes.length > LIMITE_BYTES) return NextResponse.json({ error: 'Áudio grande demais para transcrever.' }, { status: 413 })

  const prompt = 'Transcreva este áudio de WhatsApp, em português do Brasil, exatamente como a pessoa falou. '
    + 'Devolva só o texto falado, sem comentários, sem aspas e sem emojis. '
    + 'Se não houver fala, responda apenas: (áudio sem fala)'

  let texto = ''
  let ultimoErro = ''
  for (let i = 0; i < 3 && !texto; i++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${chaveGemini}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [
            { inline_data: { mime_type: mimeDoAudio(m.midia_url, arq.headers.get('content-type')), data: bytes.toString('base64') } },
            { text: prompt },
          ] }],
          generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
        }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || j?.error) {
        ultimoErro = j?.error?.message || `HTTP ${res.status}`
        if (res.status < 500 && res.status !== 429) break
      } else {
        texto = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text).filter(Boolean).join('').trim()
      }
    } catch (e: any) {
      ultimoErro = e?.message || 'erro de rede'
    }
    if (!texto && i < 2) await new Promise(r => setTimeout(r, 1500 * (i + 1)))
  }

  if (!texto) return NextResponse.json({ error: `Não consegui transcrever agora. Tente de novo. (${ultimoErro || 'sem resposta'})` }, { status: 502 })

  await supabaseAdmin.from('crm_mensagens').update({ transcricao: texto }).eq('id', m.id).eq('salao_id', sess.salaoId)
  return NextResponse.json({ texto })
}
