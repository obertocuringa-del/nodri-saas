import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

// Retorna o faturamento BRUTO de cada dia do ano (do faturamento_diario / 0088).
// O componente calcula o dia da semana, agrupa por mês e roda o simulador.
export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const ano = parseInt(new URL(req.url).searchParams.get('ano') || '0')
  if (!ano) return NextResponse.json({ error: 'ano obrigatório' }, { status: 400 })

  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('mes, faturamento_diario')
    .eq('salao_id', salaoId)
    .eq('ano', ano)

  const dias: Array<{ data: string; valor: number; mes: number }> = []
  for (const p of (periodos || [])) {
    for (const fd of (p.faturamento_diario || [])) {
      if (!fd?.data) continue
      dias.push({ data: String(fd.data), valor: Number(fd.valor) || 0, mes: Number(p.mes) })
    }
  }
  return NextResponse.json({ ano, dias })
}
