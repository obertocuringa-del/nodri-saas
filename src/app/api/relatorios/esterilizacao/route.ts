import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { salaoIdSe } from '@/lib/apiAuth'

// Só esses serviços contam pra esterilização (nada de correspondência ampla
// por palavra-chave — evita pegar troca de esmalte, cílios, henna etc).
const SERVICOS_ALICATE = ['manicure', 'pedicure', 'sobrancelhas', 'pedicure e cuidados especiais dos pes']
function normaliza(s: string) {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim()
}
function usaAlicatePinca(servico: string) { return SERVICOS_ALICATE.includes(normaliza(servico)) }

// Quantidade de ATENDIMENTOS (visitas de cliente) com uso de alicate/pinça por
// profissional, no mês — vem do dado bruto dos Relatórios (atendimentos_raw),
// filtrado direto no banco por salão+ano+mês (rápido, usa o índice já existente
// em vez de varrer todos os meses) e agrupado por comanda (ou cliente, se a
// comanda não veio no import) pra não contar mão + pé da mesma cliente como 2
// esterilizações — ela usa só 1 alicate pra atender as duas coisas na mesma visita.
export async function GET(req: NextRequest) {
  const salaoId = await salaoIdSe('adm_esterilizacao')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const url = new URL(req.url)
  const ano = parseInt(url.searchParams.get('ano') || '0')
  const mes = parseInt(url.searchParams.get('mes') || '0')
  if (!ano || !mes) return NextResponse.json({ error: 'ano e mes obrigatórios' }, { status: 400 })

  const { data: linhas, error } = await supabaseAdmin
    .from('atendimentos_raw')
    .select('profissional, servico, cliente, num_comanda, data_comanda, qtd')
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const porProf: Record<string, { visitas: Set<string>; servicos: Record<string, number> }> = {}
  for (const r of (linhas || [])) {
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
