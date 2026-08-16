import { supabaseAdmin } from './supabase'
import { LANDING_PADRAO } from './landingDefaults'

// ── Textos da vitrine, lidos NO SERVIDOR ────────────────────────────────────
//
// A página montava com os textos do código e só depois o navegador buscava os
// salvos e trocava. Dava para ver o texto antigo piscar a cada atualização —
// e o Google, que não espera o JavaScript, lia justamente a versão errada.
//
// Lendo aqui, a página já nasce com o texto certo.
export async function lerLandingConfig(): Promise<Record<string, any>> {
  try {
    const { data } = await supabaseAdmin
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'landing_config')
      .maybeSingle()

    const salvo = (data as any)?.valor
    return { ...LANDING_PADRAO, ...(salvo && typeof salvo === 'object' ? salvo : {}) }
  } catch {
    // Banco fora do ar não pode derrubar a vitrine: ela abre com os textos do
    // código, que são sempre válidos.
    return { ...LANDING_PADRAO }
  }
}
