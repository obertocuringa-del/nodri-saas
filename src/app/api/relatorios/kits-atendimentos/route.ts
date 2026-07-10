import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { salaoIdSe, getSessao } from '@/lib/apiAuth'
import { mesmoProf } from '@/lib/kitsShared'

// Só esses nomes de serviço contam pra cada tipo de kit (mesmo critério exato
// já usado na Esterilização — nada de correspondência ampla por palavra-chave).
const SERVICOS_MAO = ['manicure']
const SERVICOS_PE = ['pedicure', 'pedicure e cuidados especiais dos pes']
function normaliza(s: string) {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Atendimentos de mão (manicure) e de pé (pedicure) por profissional, no mês —
// usado pra dar à profissional (e ao salão) uma média de quantos kits pedir,
// sem sobrar nem faltar. Mesma fonte e mesmo padrão de consulta rápida da
// Esterilização (filtra direto no banco por salão+ano+mês).
export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const url = new URL(req.url)
  const ano = parseInt(url.searchParams.get('ano') || '0')
  const mes = parseInt(url.searchParams.get('mes') || '0')
  if (!ano || !mes) return NextResponse.json({ error: 'ano e mes obrigatórios' }, { status: 400 })

  const salaoId = sess.role === 'profissional' ? sess.salaoId : await salaoIdSe('adm_kits')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const { data: linhas, error } = await supabaseAdmin
    .from('atendimentos_raw')
    .select('profissional, servico, qtd')
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const porProf: Record<string, { mao: number; pe: number }> = {}
  for (const r of (linhas || [])) {
    const servicoN = normaliza(String(r.servico || ''))
    const prof = String(r.profissional || '').trim()
    if (!prof || !servicoN) continue
    const ehMao = SERVICOS_MAO.includes(servicoN)
    const ehPe = SERVICOS_PE.includes(servicoN)
    if (!ehMao && !ehPe) continue
    if (!porProf[prof]) porProf[prof] = { mao: 0, pe: 0 }
    const qtd = Number(r.qtd) || 1
    if (ehMao) porProf[prof].mao += qtd
    if (ehPe) porProf[prof].pe += qtd
  }

  let profissionais = Object.entries(porProf)
    .map(([profissional, d]) => ({ profissional, atendimentosMao: d.mao, atendimentosPe: d.pe }))
    .sort((a, b) => (b.atendimentosMao + b.atendimentosPe) - (a.atendimentosMao + a.atendimentosPe))

  // Profissional só vê a própria linha (não os números dos colegas).
  if (sess.role === 'profissional' && sess.profissionalId) {
    const { data: p } = await supabaseAdmin.from('profissionais').select('nome_completo, apelido').eq('id', sess.profissionalId).maybeSingle()
    const nome = (p as any)?.nome_completo || '', apelido = (p as any)?.apelido || ''
    profissionais = profissionais.filter(x => mesmoProf(x.profissional, nome) || (apelido && mesmoProf(x.profissional, apelido)))
  }

  return NextResponse.json({ ano, mes, profissionais })
}
