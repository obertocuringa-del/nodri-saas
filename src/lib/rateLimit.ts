// ─────────────────────────────────────────────────────────────────────────────
// LIMITE DE TENTATIVAS (auditoria — SEC-004)
//
// O login não tinha nenhuma proteção: dava para tentar senha à vontade
// (força bruta e credential stuffing) e para descobrir quais e-mails existem.
//
// Por que no banco e não em memória: em serverless cada requisição pode cair
// numa instância diferente, então um contador em memória zera sozinho e não
// protege nada. A contagem tem que ser compartilhada.
//
// Nunca guardamos a senha tentada nem o e-mail em claro — só um identificador
// derivado, o suficiente para contar.
// ─────────────────────────────────────────────────────────────────────────────

import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export interface Limite { permitido: boolean; restantes: number; esperarSegundos: number }

/** Identificador que não revela o valor original (e-mail ou IP). */
function identificar(chave: string): string {
  return crypto.createHash('sha256').update(String(chave).toLowerCase().trim()).digest('hex').slice(0, 40)
}

/**
 * Conta tentativas de uma ação numa janela de tempo.
 * Falha ABERTO de propósito: se a tabela não existir ou o banco engasgar, o
 * login continua funcionando. Um limitador quebrado não pode trancar o
 * cliente fora do próprio sistema — o risco de indisponibilidade é maior
 * que o de algumas tentativas a mais.
 */
export async function limitar(
  acao: string, chave: string, maximo = 8, janelaMinutos = 15,
): Promise<Limite> {
  const id = identificar(chave)
  const desde = new Date(Date.now() - janelaMinutos * 60_000).toISOString()
  try {
    const { count, error } = await supabaseAdmin
      .from('tentativas_acesso')
      .select('id', { count: 'exact', head: true })
      .eq('acao', acao).eq('identificador', id).gte('criado_em', desde)
    if (error) return { permitido: true, restantes: maximo, esperarSegundos: 0 }

    const usadas = count || 0
    if (usadas >= maximo) {
      return { permitido: false, restantes: 0, esperarSegundos: janelaMinutos * 60 }
    }
    return { permitido: true, restantes: maximo - usadas, esperarSegundos: 0 }
  } catch {
    return { permitido: true, restantes: maximo, esperarSegundos: 0 }
  }
}

/** Registra uma tentativa fracassada. Só falha conta — acerto não penaliza. */
export async function registrarFalha(acao: string, chave: string, ip?: string | null): Promise<void> {
  try {
    await supabaseAdmin.from('tentativas_acesso').insert({
      acao,
      identificador: identificar(chave),
      ip: ip || null,
      criado_em: new Date().toISOString(),
    })
  } catch { /* limitador nunca derruba o fluxo */ }
}

/** Zera o histórico após um acesso bem-sucedido. */
export async function limparTentativas(acao: string, chave: string): Promise<void> {
  try {
    await supabaseAdmin.from('tentativas_acesso')
      .delete().eq('acao', acao).eq('identificador', identificar(chave))
  } catch { /* idem */ }
}

/** IP de quem chamou, atrás do proxy da Vercel. */
export function ipDaRequisicao(req: Request): string | null {
  const h = req.headers
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || null
}
