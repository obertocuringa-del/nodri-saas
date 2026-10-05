import { NextRequest, NextResponse } from 'next/server'
import { getSalaoPorToken } from '@/lib/vitrineConfig'
import { normalizarTelefone } from '@/lib/crm'
import { acharOuCriarContato } from '@/lib/crmContatos'
import {
  getCfg, campanhaVencida, acharCupomPorTelefone, criarCupom, nomeNoCrm, saldoDoCupom,
} from '@/lib/cuponsIndicacao'

export const dynamic = 'force-dynamic'

// ── A cliente pega o cupom dela ─────────────────────────────────────────────
//
// Uma etapa só, quase sempre: digita o telefone e recebe o código. Se o salão
// já a conhece, nem o nome é pedido — o CRM sabe quem ela é.
//
// Esta rota é PÚBLICA. Por isso ela devolve só o que o cupom precisa mostrar:
// o código, o nome de quem ele é e a contagem de indicações. Nunca a lista de
// quem usou — isso é dado de outras clientes e fica no balcão, atrás de login.

function erro(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
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
    const saldo = await saldoDoCupom(salao.salaoId, existente.id)
    return NextResponse.json({
      situacao: 'tem',
      codigo: existente.codigo,
      nome: existente.dono_nome,
      indicadas: saldo.indicadas,
      compareceram: saldo.compareceram,
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
  })
}
