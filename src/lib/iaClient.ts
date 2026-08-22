// Cliente de IA central e resiliente — usado por todas as rotas que chamam a IA
// (Claude/Anthropic ou Gemini/Google, conforme ia_config_global.modelo).
//
// Resolve as duas causas das falhas intermitentes ("hora funciona, hora não"):
//  1) SEM RETRY: a Anthropic/Gemini devolvem 429 (limite) / 5xx / 529 (sobrecarga)
//     de vez em quando. Aqui tentamos de novo com backoff exponencial.
//  2) JSON FRÁGIL: o modelo às vezes embrulha o JSON em ```json ... ``` ou põe
//     texto antes/depois. extrairJSON() acha e parseia o JSON de forma robusta.
import Anthropic from '@anthropic-ai/sdk'

// Status HTTP que valem nova tentativa (transitórios).
const TRANSIENTES = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529])
const dormir = (ms: number) => new Promise(r => setTimeout(r, ms))

export interface IaOpts {
  maxTokens?: number
  system?: string
  geminiThinkingBudget?: number
  tentativas?: number
}

// Chama a IA e devolve o texto. Tenta novamente em erro transitório/rede/resposta
// vazia. Só lança quando todas as tentativas falharem.
// O site nao usa emoji em lugar nenhum (ago/2026). Sem esta linha a IA volta
// a enfeitar as respostas com eles, e o texto dela aparece dentro das telas —
// entao a regra tem que valer para toda chamada, nao so para as que lembrarem.
const SEM_EMOJI = 'Nunca use emojis, emoticons ou simbolos decorativos na resposta. Escreva em texto puro.'

export async function iaGerar(apiKey: string, modelo: string, prompt: string, opts: IaOpts = {}): Promise<string> {
  const maxTokens = opts.maxTokens ?? 4096
  const system = opts.system ? `${opts.system}

${SEM_EMOJI}` : SEM_EMOJI
  const tentativas = Math.max(1, opts.tentativas ?? 4)
  let ultimoErro: any = null

  for (let i = 0; i < tentativas; i++) {
    try {
      let out = ''
      if (modelo.startsWith('claude')) {
        // maxRetries:0 → o retry é nosso (unificado com o Gemini)
        const anthropic = new Anthropic({ apiKey, maxRetries: 0 })
        const msg = await anthropic.messages.create({
          model: modelo,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: prompt }],
        })
        const txt = msg.content.find((c: any) => c.type === 'text') as any
        out = txt?.text || ''
      } else {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`
        const genCfg: any = { maxOutputTokens: maxTokens }
        if (typeof opts.geminiThinkingBudget === 'number') genCfg.thinkingConfig = { thinkingBudget: opts.geminiThinkingBudget }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: system }] },
            generationConfig: genCfg,
          }),
        })
        if (!res.ok) {
          const e: any = new Error(`Gemini HTTP ${res.status}`); e.status = res.status; throw e
        }
        const j = await res.json()
        if (j?.error) { const e: any = new Error(`Gemini: ${j.error.message || 'erro'}`); e.status = j.error.code; throw e }
        // Bloqueio de conteúdo NÃO é transitório — não adianta repetir.
        if (j?.promptFeedback?.blockReason) { const e: any = new Error(`Gemini bloqueou: ${j.promptFeedback.blockReason}`); e.semRetry = true; throw e }
        out = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') || ''
      }
      if (out.trim()) return out
      throw new Error('resposta vazia da IA') // vazio → tenta de novo
    } catch (e: any) {
      ultimoErro = e
      const semRetry = !!e?.semRetry
      const status = e?.status ?? e?.statusCode
      // rede/timeout (sem status) ou status transitório → repete; resto não.
      const transitorio = !semRetry && (status == null || TRANSIENTES.has(Number(status)))
      if (semRetry || !transitorio || i === tentativas - 1) break
      await dormir(600 * 2 ** i + Math.floor(Math.random() * 300)) // 0.6s, 1.2s, 2.4s + jitter
    }
  }
  throw ultimoErro || new Error('Falha ao chamar a IA')
}

// Extrai e parseia JSON de uma resposta da IA de forma tolerante:
// remove as cercas ```json ... ```, pega do primeiro { ou [ até o fechamento
// correspondente (balanceado, ignorando aspas). Devolve null se não parsear.
export function extrairJSON<T = any>(texto: string): T | null {
  if (!texto) return null
  const s = texto.replace(/```json/gi, '').replace(/```/g, '').trim()
  try { return JSON.parse(s) as T } catch { /* segue para extração */ }

  const iObj = s.indexOf('{'), iArr = s.indexOf('[')
  let start = -1, abre = '{', fecha = '}'
  if (iArr !== -1 && (iObj === -1 || iArr < iObj)) { start = iArr; abre = '['; fecha = ']' }
  else if (iObj !== -1) { start = iObj; abre = '{'; fecha = '}' }
  if (start === -1) return null

  let depth = 0, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') { inStr = true; continue }
    if (ch === abre) depth++
    else if (ch === fecha) {
      depth--
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)) as T } catch { return null }
      }
    }
  }
  return null
}
