import { NextRequest, NextResponse } from 'next/server'
import { salaoIdSe, getSessao } from '@/lib/apiAuth'
import { servicosPorProfissional } from '@/lib/profServicosMatch'

// Só esses nomes de serviço contam pra cada tipo de kit (mesmo critério exato
// já usado na Esterilização — nada de correspondência ampla por palavra-chave).
const SERVICOS_MAO = ['manicure']
const SERVICOS_PE = ['pedicure', 'pedicure e cuidados especiais dos pes']
function normaliza(s: string) {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Atendimentos de mão (manicure) e de pé (pedicure) por profissional, no mês —
// vem de relatorio_periodos (fonte OFICIAL, a mesma da tela "Serviços
// Realizados" do perfil do profissional) — usado pra dar à profissional (e ao
// salão) uma média de quantos kits pedir, sem sobrar nem faltar.
export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const url = new URL(req.url)
  const ano = parseInt(url.searchParams.get('ano') || '0')
  const mes = parseInt(url.searchParams.get('mes') || '0')
  if (!ano || !mes) return NextResponse.json({ error: 'ano e mes obrigatórios' }, { status: 400 })

  const salaoId = sess.role === 'profissional' ? sess.salaoId : await salaoIdSe('adm_kits')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  let lista = await servicosPorProfissional(salaoId, ano, mes)
  if (sess.role === 'profissional' && sess.profissionalId) {
    lista = lista.filter(p => p.profissionalId === sess.profissionalId)
  }

  const profissionais = lista.map(p => {
    let mao = 0, pe = 0
    for (const [servico, qtd] of Object.entries(p.servicos)) {
      const n = normaliza(servico)
      if (SERVICOS_MAO.includes(n)) mao += qtd
      if (SERVICOS_PE.includes(n)) pe += qtd
    }
    return { profissional: p.apelido || p.nome, atendimentosMao: mao, atendimentosPe: pe }
  }).filter(p => p.atendimentosMao > 0 || p.atendimentosPe > 0)
    .sort((a, b) => (b.atendimentosMao + b.atendimentosPe) - (a.atendimentosMao + a.atendimentosPe))

  return NextResponse.json({ ano, mes, profissionais })
}
