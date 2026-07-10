import { NextRequest, NextResponse } from 'next/server'
import { salaoIdSe } from '@/lib/apiAuth'
import { getAtendimentosRaw } from '@/lib/atendimentosCache'

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

// Quantidade de ATENDIMENTOS (visitas de cliente) com uso de alicate/pinça por
// profissional, no mês — vem do dado bruto dos Relatórios (atendimentos_raw),
// agrupado por comanda (ou cliente, se a comanda não veio no import) pra não
// contar mão + pé da mesma cliente como 2 esterilizações — ela usa só 1
// alicate pra atender as duas coisas na mesma visita.
export async function GET(req: NextRequest) {
  const salaoId = await salaoIdSe('adm_esterilizacao')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const url = new URL(req.url)
  const ano = parseInt(url.searchParams.get('ano') || '0')
  const mes = parseInt(url.searchParams.get('mes') || '0')
  if (!ano || !mes) return NextResponse.json({ error: 'ano e mes obrigatórios' }, { status: 400 })

  const todasLinhas = await getAtendimentosRaw(salaoId)
  const linhasDoMes = todasLinhas.filter((r: any) => Number(r.ano) === ano && Number(r.mes) === mes)

  const porProf: Record<string, { visitas: Set<string>; servicos: Record<string, number> }> = {}
  for (const r of linhasDoMes) {
    const servico = String(r.servico || '').trim()
    if (!servico || !usaAlicatePinca(servico)) continue
    const prof = String(r.profissional || '').trim()
    if (!prof) continue
    const numComanda = String(r.num_comanda || '').trim()
    const cliente = String(r.cliente || '').trim().toLowerCase()
    // Chave da visita: prefere nº da comanda (mesmo checkout); se não veio no
    // import, cai pra cliente+data — ainda assim junta mão+pé da mesma pessoa.
    const idVisita = numComanda ? `c:${numComanda}` : `cl:${cliente}`
    const chaveVisita = `${r.data_comanda || ''}|${idVisita}`

    if (!porProf[prof]) porProf[prof] = { visitas: new Set(), servicos: {} }
    porProf[prof].visitas.add(chaveVisita)
    porProf[prof].servicos[servico] = (porProf[prof].servicos[servico] || 0) + (Number(r.qtd) || 1)
  }

  const profissionais = Object.entries(porProf)
    .map(([profissional, d]) => ({ profissional, atendimentos: d.visitas.size, servicos: d.servicos }))
    .sort((a, b) => b.atendimentos - a.atendimentos)

  return NextResponse.json({ ano, mes, profissionais })
}
