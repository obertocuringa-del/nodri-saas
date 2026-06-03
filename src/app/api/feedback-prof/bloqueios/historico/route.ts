import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const anoAtual = new Date().getFullYear()

  const { data, error } = await supabaseAdmin
    .from('feedback_prof_bloqueios_historico')
    .select('*')
    .eq('salao_id', payload.salaoId)
    .gte('bloqueado_em', `${anoAtual}-01-01`)
    .order('bloqueado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrupa por profissional
  const porProf: Record<string, {
    total: number
    ultimo: string | null
    meses: Record<string, number>
    registros: typeof data
  }> = {}

  for (const r of data || []) {
    if (!porProf[r.profissional_nome]) {
      porProf[r.profissional_nome] = { total: 0, ultimo: null, meses: {}, registros: [] }
    }
    porProf[r.profissional_nome].total++
    if (!porProf[r.profissional_nome].ultimo) {
      porProf[r.profissional_nome].ultimo = r.bloqueado_em
    }
    const mes = r.bloqueado_em.slice(0, 7)
    porProf[r.profissional_nome].meses[mes] = (porProf[r.profissional_nome].meses[mes] || 0) + 1
    porProf[r.profissional_nome].registros.push(r)
  }

  const resultado = Object.entries(porProf)
    .map(([nome, d]) => ({ nome, ...d }))
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({ ano: anoAtual, profissionais: resultado })
}
