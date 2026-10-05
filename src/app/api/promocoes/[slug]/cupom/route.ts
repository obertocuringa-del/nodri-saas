import { NextRequest, NextResponse } from 'next/server'
import { getSalaoPorToken } from '@/lib/vitrineConfig'
import { normalizarTelefone } from '@/lib/crm'
import { acharOuCriarContato } from '@/lib/crmContatos'
import { supabaseAdmin } from '@/lib/supabase'
import {
  getCfg, campanhaVencida, acharCupomPorTelefone, criarCupom, nomeNoCrm, saldoDoCupom,
} from '@/lib/cuponsIndicacao'

export const dynamic = 'force-dynamic'

// ── A cliente pega o cupom dela ─────────────────────────────────────────────
//
// Uma etapa só, quase sempre: digita o telefone e recebe o código. Se o salão
// já a conhece, nem o nome é pedido — o CRM sabe quem ela é.
//
// Esta rota é PÚBLICA: abre com o telefone, sem senha. Por isso o extrato
// dela sai com os nomes ABREVIADOS -- "Maria S.".
//
// A dona pediu para ver quem veio pelo cupom dela, e é justo: é o placar do
// esforço dela. Mas quem souber o telefone de uma cliente abriria aqui a
// lista inteira de amigas dela e as datas em que cada uma foi ao salão.
// Abreviado, a dona reconhece quem indicou; um estranho, não.
//
// O nome inteiro continua existindo, no balcão, atrás de login.

function erro(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

/** "Maria Silva Souza" -> "Maria S." */
function abreviar(nome: string): string {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return 'Cliente'
  if (partes.length === 1) return partes[0]
  return `${partes[0]} ${partes[1][0].toUpperCase()}.`
}

/** O extrato da dona: quem veio pelo cupom dela e os descontos que ela usou. */
async function extrato(salaoId: string, cupomId: string) {
  const [{ data: usos }, { data: creditos }] = await Promise.all([
    supabaseAdmin.from('cupom_indicacao_usos')
      .select('indicada_nome, situacao, atendida_em, validado_em')
      .eq('salao_id', salaoId).eq('cupom_id', cupomId).limit(200),
    supabaseAdmin.from('cupom_indicacao_creditos')
      .select('usado_em')
      .eq('salao_id', salaoId).eq('cupom_id', cupomId).limit(200),
  ])

  const linhas = [
    ...(usos || []).map((u: any) => ({
      tipo: 'veio' as const,
      nome: abreviar(u.indicada_nome),
      data: String(u.atendida_em || u.validado_em || '').slice(0, 10),
      valeu: u.situacao !== 'nao_compareceu',
    })),
    ...(creditos || []).map((c: any) => ({
      tipo: 'usou' as const,
      nome: '',
      data: String(c.usado_em).slice(0, 10),
      valeu: true,
    })),
  ].sort((a, b) => b.data.localeCompare(a.data))

  return linhas
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const salao = await getSalaoPorToken(params.slug)
  if (!salao) return erro('Link indisponível', 404)

  const cfg = await getCfg(salao.salaoId)
  if (!cfg.ativo) return erro('Os cupons não estão disponíveis neste momento.', 404)
  if (campanhaVencida(cfg)) {
    return erro('A campanha de indicação já encerrou.', 410)
  }

  const body = await req.json().catch(() => null)
  const telefone = normalizarTelefone(body?.telefone)
  // 12 = DDI + DDD + 8 dígitos (fixo). Abaixo disso não é telefone, é engano
  // de digitação, e criar cupom para número torto polui a base para sempre.
  if (!telefone || telefone.length < 12) return erro('Digite um celular válido, com DDD.')

  // Já tem cupom? Devolve o mesmo, sempre. Ela já distribuiu esse código.
  const existente = await acharCupomPorTelefone(salao.salaoId, telefone)
  if (existente) {
    const [saldo, linhas] = await Promise.all([
      saldoDoCupom(salao.salaoId, existente.id),
      extrato(salao.salaoId, existente.id),
    ])
    return NextResponse.json({
      situacao: 'tem',
      codigo: existente.codigo,
      nome: existente.dono_nome,
      indicadas: saldo.indicadas,
      compareceram: saldo.compareceram,
      usados: saldo.usados,
      saldo: saldo.saldo,
      extrato: linhas,
    })
  }

  // Sem cupom ainda. O nome pode vir do CRM — e aí ela não digita nada.
  const nomeInformado = String(body?.nome || '').trim()
  const nome = nomeInformado || (await nomeNoCrm(salao.salaoId, telefone)) || ''

  if (!nome) {
    // Primeira vez de alguém que o salão não conhece: só agora pedimos o nome.
    return NextResponse.json({ situacao: 'precisa_nome' })
  }
  if (nome.length < 3) return erro('Digite seu nome completo.')

  const cupom = await criarCupom(salao.salaoId, nome, telefone)
  if (!cupom) return erro('Não foi possível gerar o cupom agora. Tente de novo.', 500)

  // Quem gerou cupom passa a existir no CRM. Sem isto, a cliente que o salão
  // ainda não conhecia entregaria o telefone e sumiria — e o objetivo da
  // campanha é justamente engordar a cartela.
  if (nomeInformado) {
    await acharOuCriarContato(salao.salaoId, telefone, nome).catch(() => null)
  }

  return NextResponse.json({
    situacao: 'criado',
    codigo: cupom.codigo,
    nome: cupom.dono_nome,
    indicadas: 0,
    compareceram: 0,
    usados: 0,
    saldo: 0,
    extrato: [],
  })
}
