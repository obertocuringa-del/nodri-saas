import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'

// Lista os serviços que aparecem no relatório "Serviços mais vendidos"
// (fonte: relatorio_periodos.prof_servicos — a mesma que o ranking da corrida
// conta). Serve para o salão ESCOLHER o serviço da corrida numa lista, em vez
// de digitar. Retorna { servicos: [{ nome, quantidade }] } ordenado por volume.
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('prof_servicos')
    .eq('salao_id', sess.salaoId)

  const mapa = new Map<string, { nome: string; quantidade: number }>()
  for (const row of (data || []) as any[]) {
    for (const it of (Array.isArray(row.prof_servicos) ? row.prof_servicos : [])) {
      const nome = String(it.servico || '').trim()
      if (!nome) continue
      const chave = nome.toLowerCase()
      const atual = mapa.get(chave)
      const q = Number(it.quantidade || 0)
      if (atual) atual.quantidade += q
      else mapa.set(chave, { nome, quantidade: q })
    }
  }

  const servicos = Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade)
  return NextResponse.json({ servicos })
}
