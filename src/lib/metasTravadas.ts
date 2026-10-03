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
// ── E trava SÓ QUEM O DONO DEFINIU À MÃO (ordem dele, 03/10) ───────────────
//
// Ele deixa de propósito uma parte da equipe na meta automática, e essa parte
// CONTINUA podendo definir a própria meta -- ele não tem opinião sobre aquele
// número, então não há o que proteger. O que a trava protege é a decisão DELE:
// o profissional em que ele entrou e trocou a conta por um valor escolhido.
//
// Por isso a lista de quem fica travado é CONGELADA no instante em que a chave
// é ligada: são os que tinham meta manual naquele momento. Se fosse "quem tem
// meta manual agora", o profissional que definisse a própria meta depois da
// trava se trancaria sozinho sem entender por quê -- ele mesmo acabou de
// escrever o número e de repente não pode mais mexer.
//
// Vale inclusive para o dono: para mudar, ele destrava, muda e trava de novo.
// Assim a mudança é sempre consciente, nunca um campo editado sem perceber.

export const CHAVE_METAS_TRAVADAS = 'metas_travadas'

/** 'AAAA-MM' — a chave de um mês dentro do registro. */
export const chaveMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}`

export interface TravaDoMes {
  em: string            // quando travou (ISO)
  por: string           // quem travou (e-mail), para a tela poder dizer
  /** Ids dos profissionais que tinham meta manual quando a chave foi ligada. */
  profissionais: string[]
}

export async function carregarTravas(salaoId: string): Promise<Record<string, TravaDoMes>> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_METAS_TRAVADAS).maybeSingle()
  const v = (data?.valor as any) || {}
  const saida: Record<string, TravaDoMes> = {}
  for (const [k, t] of Object.entries<any>(v)) {
    if (/^\d{4}-\d{2}$/.test(k) && t?.em) {
      saida[k] = {
        em: String(t.em), por: String(t.por || ''),
        profissionais: Array.isArray(t.profissionais) ? t.profissionais.map(String) : [],
      }
    }
  }
  return saida
}

/** A trava daquele mês, ou `null` se está livre. */
export async function travaDoMes(salaoId: string, ano: number, mes: number): Promise<TravaDoMes | null> {
  const todas = await carregarTravas(salaoId)
  return todas[chaveMes(ano, mes)] || null
}

/**
 * Este profissional está travado neste mês?
 *
 * Só quem estava na lista no momento em que a chave foi ligada -- ou seja, só
 * quem tinha meta MANUAL, posta pelo dono. Quem ficou na automática continua
 * livre para definir a própria meta, porque ali não há decisão dele a proteger.
 */
export async function metaTravadaPara(
  salaoId: string, profissionalId: string, ano: number, mes: number,
): Promise<TravaDoMes | null> {
  const t = await travaDoMes(salaoId, ano, mes)
  if (!t) return null
  return t.profissionais.includes(String(profissionalId)) ? t : null
}

/** Quem tem meta manual neste mês -- a lista que a trava congela. */
export async function comMetaManual(salaoId: string, ano: number, mes: number): Promise<string[]> {
  const { data } = await supabaseAdmin.from('metas_profissionais')
    .select('profissional_id, meta_manual')
    .eq('salao_id', salaoId).eq('ano', ano).eq('mes', mes)
    .not('meta_manual', 'is', null)
  return (data || []).map((m: any) => String(m.profissional_id))
}

/**
 * Liga ou desliga a trava de um mês.
 *
 * Ao LIGAR, congela quem tinha meta manual naquele instante: são esses, e só
 * esses, que ficam travados.
 *
 * Guarda só os 12 meses mais recentes: o registro existe para dizer o que vale
 * agora, não para virar histórico de anos.
 */
export async function travarMes(
  salaoId: string, ano: number, mes: number, travar: boolean, quem: string,
): Promise<Record<string, TravaDoMes>> {
  const todas = await carregarTravas(salaoId)
  const k = chaveMes(ano, mes)
  if (travar) {
    todas[k] = {
      em: new Date().toISOString(), por: quem,
      profissionais: await comMetaManual(salaoId, ano, mes),
    }
  } else delete todas[k]

  const limpo: Record<string, TravaDoMes> = {}
  for (const key of Object.keys(todas).sort().slice(-12)) limpo[key] = todas[key]

  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_METAS_TRAVADAS,
    valor: limpo, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
  return limpo
}
