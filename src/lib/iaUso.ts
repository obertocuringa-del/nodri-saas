import { supabaseAdmin } from './supabase'

// ── Registro de consumo da IA ───────────────────────────────────────────────
//
// Uma linha por resposta. Existe para responder três perguntas que antes só
// tinham palpite: o corte de tokens funcionou, qual salão consome fora da
// curva, e o cache está pegando.
//
// Regra de ouro deste arquivo: ele NUNCA pode derrubar a resposta. Medir é
// secundário em relação a responder — se a gravação falhar, o usuário não
// pode nem ficar sabendo. Por isso tudo aqui é engolido em silêncio, e a
// chamada é sempre disparada sem await.

export interface UsoIA {
  salaoId: string
  profissionalId?: string | null
  provedor: 'claude' | 'gemini'
  modelo: string
  tokensEntrada?: number
  tokensSaida?: number
  tokensCacheLeitura?: number
  tokensCacheEscrita?: number
  ferramentas?: number
  ms?: number
  reserva?: boolean
  erro?: string | null
}

const inteiro = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

export function registrarUsoIA(u: UsoIA): void {
  try {
    supabaseAdmin.from('ia_uso').insert({
      salao_id: u.salaoId,
      profissional_id: u.profissionalId || null,
      provedor: u.provedor,
      modelo: u.modelo,
      tokens_entrada: inteiro(u.tokensEntrada),
      tokens_saida: inteiro(u.tokensSaida),
      tokens_cache_leitura: inteiro(u.tokensCacheLeitura),
      tokens_cache_escrita: inteiro(u.tokensCacheEscrita),
      ferramentas: inteiro(u.ferramentas),
      ms: inteiro(u.ms),
      reserva: !!u.reserva,
      // Corta o erro: mensagem de provedor às vezes vem com um dump inteiro
      // dentro, e a coluna não é lugar de despejo.
      erro: u.erro ? String(u.erro).slice(0, 300) : null,
    }).then(() => {}, () => {})
  } catch { /* medir nunca derruba responder */ }
}
