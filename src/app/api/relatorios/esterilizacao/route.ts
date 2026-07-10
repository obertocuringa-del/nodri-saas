import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { salaoIdSe } from '@/lib/apiAuth'

// Serviços que normalmente usam alicate/pinça (manicure, pedicure, sobrancelha…).
// Casamento por palavra-chave (sem acento) no nome do serviço importado dos relatórios.
const PALAVRAS_ALICATE = ['manicur', 'pedicur', 'unha', 'cutilagem', 'esmalt', 'sobrancelha']
// Serviços que batem numa palavra-chave acima mas NÃO usam alicate/pinça de
// verdade (ex: só troca a cor do esmalte, sem mexer na cutícula) — ficam de fora.
const PALAVRAS_EXCLUIR = ['troca de esmalte']
function normaliza(s: string) { return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }
function usaAlicatePinca(servico: string) {
  const n = normaliza(servico)
  if (PALAVRAS_EXCLUIR.some(p => n.includes(p))) return false
  return PALAVRAS_ALICATE.some(p => n.includes(p))
}

// Quantidade de atendimentos com uso de alicate/pinça por profissional, no mês —
// vem do mesmo dado já usado em Relatórios (relatorio_periodos.prof_servicos),
// filtrado pelas palavras-chave acima. Usado para cruzar com o registro de
// esterilização (foco em manicures e quem faz sobrancelha).
export async function GET(req: NextRequest) {
  const salaoId = await salaoIdSe('adm_esterilizacao')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const url = new URL(req.url)
  const ano = parseInt(url.searchParams.get('ano') || '0')
  const mes = parseInt(url.searchParams.get('mes') || '0')
  if (!ano || !mes) return NextResponse.json({ error: 'ano e mes obrigatórios' }, { status: 400 })

  const { data: periodos } = await supabaseAdmin
    .from('relatorio_periodos')
    .select('prof_servicos')
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
  const itens = (periodos || []).flatMap((r: any) => Array.isArray(r.prof_servicos) ? r.prof_servicos : [])

  const porProf: Record<string, { atendimentos: number; servicos: Record<string, number> }> = {}
  for (const it of itens) {
    const servico = String(it.servico || '').trim()
    if (!servico || !usaAlicatePinca(servico)) continue
    const prof = String(it.profissional || '').trim()
    if (!prof) continue
    if (!porProf[prof]) porProf[prof] = { atendimentos: 0, servicos: {} }
    const qtd = Number(it.quantidade || 0)
    porProf[prof].atendimentos += qtd
    porProf[prof].servicos[servico] = (porProf[prof].servicos[servico] || 0) + qtd
  }

  const profissionais = Object.entries(porProf)
    .map(([profissional, d]) => ({ profissional, atendimentos: d.atendimentos, servicos: d.servicos }))
    .sort((a, b) => b.atendimentos - a.atendimentos)

  return NextResponse.json({ ano, mes, profissionais })
}
