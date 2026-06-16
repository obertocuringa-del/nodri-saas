import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

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
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { ano, mes, meta_tipo, meta_valor, meta_pct, meta_em_comissoes, metas_profissionais } = body

    await supabaseAdmin
      .from('ia_metas_salao')
      .upsert({
        salao_id: salaoId,
        ano,
        mes,
        meta_tipo: meta_tipo || 'valor',
        meta_valor: meta_valor || 0,
        meta_pct: meta_pct || 0,
        meta_em_comissoes: meta_em_comissoes || 0,
        metas_profissionais: metas_profissionais || [],
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'salao_id,ano,mes' })

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
