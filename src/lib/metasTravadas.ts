import { supabaseAdmin } from '@/lib/supabase'

// ── Travar as metas de um mês ───────────────────────────────────────────────
//
// Pedido do dono (03/10/2026). O fluxo dele é:
//
//   1. gera as metas na aba Redistribuição (automáticas, por profissional);
//   2. entra em alguns profissionais e troca por uma META MANUAL, quando não
//      concorda com a conta automática;
//   3. volta na Redistribuição e TRAVA o mês.
//
// Depois disso o número é o combinado da corrida e não pode mudar. O risco é
// real e não é hipotético: a rota PUT de metas diz, em letra miúda, que "a
// profissional pode definir a PRÓPRIA meta" -- ou seja, quem está competindo
// consegue mexer no próprio alvo. Com a corrida valendo, isso é o fim do placar.
//
// A trava é por MÊS, não global: travar outubro não atrapalha novembro, e no
// mês seguinte tudo nasce destravado sem ninguém precisar lembrar de nada.
//
// Vale para TODO MUNDO, inclusive o dono. Quem quiser mudar destrava, muda e
// trava de novo -- assim a mudança é sempre uma decisão consciente, e não um
// campo que alguém editou sem perceber.

export const CHAVE_METAS_TRAVADAS = 'metas_travadas'

/** 'AAAA-MM' — a chave de um mês dentro do registro. */
export const chaveMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}`

export interface TravaDoMes {
  em: string            // quando travou (ISO)
  por: string           // quem travou (e-mail), para a tela poder dizer
}

export async function carregarTravas(salaoId: string): Promise<Record<string, TravaDoMes>> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_METAS_TRAVADAS).maybeSingle()
  const v = (data?.valor as any) || {}
  const saida: Record<string, TravaDoMes> = {}
  for (const [k, t] of Object.entries<any>(v)) {
    if (/^\d{4}-\d{2}$/.test(k) && t?.em) saida[k] = { em: String(t.em), por: String(t.por || '') }
  }
  return saida
}

/** A trava daquele mês, ou `null` se está livre. */
export async function travaDoMes(salaoId: string, ano: number, mes: number): Promise<TravaDoMes | null> {
  const todas = await carregarTravas(salaoId)
  return todas[chaveMes(ano, mes)] || null
}

/**
 * Liga ou desliga a trava de um mês.
 *
 * Guarda só os 12 meses mais recentes: o registro existe para dizer o que vale
 * agora, não para virar histórico de anos.
 */
export async function travarMes(
  salaoId: string, ano: number, mes: number, travar: boolean, quem: string,
): Promise<Record<string, TravaDoMes>> {
  const todas = await carregarTravas(salaoId)
  const k = chaveMes(ano, mes)
  if (travar) todas[k] = { em: new Date().toISOString(), por: quem }
  else delete todas[k]

  const limpo: Record<string, TravaDoMes> = {}
  for (const key of Object.keys(todas).sort().slice(-12)) limpo[key] = todas[key]

  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_METAS_TRAVADAS,
    valor: limpo, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
  return limpo
}
