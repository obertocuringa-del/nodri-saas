import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

// A tela de Relatórios lê a meta daqui a cada abertura: resposta guardada
// devolveria o valor velho. Ver [[next_data_cache_supabase]].
export const dynamic = 'force-dynamic'

// GET — busca metas salvas para a IA (usada pelo chat route)
export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data } = await supabaseAdmin
      .from('ia_metas_salao')
      .select('*')
      .eq('salao_id', salaoId)
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
      .limit(12)

    return NextResponse.json({ metas: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — salva metas do salão e por profissional
export async function POST(req: NextRequest) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { ano, mes, meta_tipo, meta_valor, meta_pct, meta_em_comissoes, metas_profissionais } = body

    // ── Só se grava o que foi MANDADO ────────────────────────────────────
    //
    // Isto é um upsert: ele reescreve a linha inteira. Escrevendo
    // `meta_valor: meta_valor || 0` para todo mundo, quem chama sem mandar a
    // meta APAGAVA a meta -- e é exatamente o que acontecia. Quem salva o
    // valor é o botão "Salvar Meta"; mas a gravação automática das metas por
    // profissional chama esta mesma rota mandando só ano, mês e a lista, e
    // zerava a meta do salão logo em seguida. O dono salvava, via o número na
    // tela (que vinha do navegador), e quando o navegador esquecia a meta
    // "voltava zerada" -- porque no banco ela já era 0 havia tempo.
    // Achado em 11/10/2026: as cinco linhas do Rouge, de junho a outubro,
    // todas com meta_valor = 0.
    //
    // Agora cada campo só entra quando veio no pedido. Campo que não veio
    // fica como estava.
    const linha: Record<string, any> = {
      salao_id: salaoId, ano, mes, atualizado_em: new Date().toISOString(),
    }
    if (meta_tipo !== undefined) linha.meta_tipo = meta_tipo || 'valor'
    if (meta_valor !== undefined) linha.meta_valor = meta_valor || 0
    if (meta_pct !== undefined) linha.meta_pct = meta_pct || 0
    if (meta_em_comissoes !== undefined) linha.meta_em_comissoes = meta_em_comissoes || 0
    if (metas_profissionais !== undefined) linha.metas_profissionais = metas_profissionais || []

    await supabaseAdmin
      .from('ia_metas_salao')
      .upsert(linha, { onConflict: 'salao_id,ano,mes' })

    // Grava também a meta individual de cada profissional (não altera o cálculo
    // de redistribuição, apenas persiste o valor já calculado para uso na aba "Metas")
    if (Array.isArray(metas_profissionais) && metas_profissionais.length > 0) {
      const linhas = metas_profissionais
        .filter((m: any) => m?.prof_id)
        .map((m: any) => ({
          salao_id: salaoId,
          profissional_id: m.prof_id,
          ano, mes,
          meta_redistribuida: m.meta_redistribuida ?? m.meta_original ?? 0,
          atualizado_em: new Date().toISOString(),
        }))
      if (linhas.length > 0) {
        await supabaseAdmin
          .from('metas_profissionais')
          .upsert(linhas, { onConflict: 'profissional_id,ano,mes' })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
