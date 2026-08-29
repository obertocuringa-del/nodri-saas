import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/apiAuth'
import { garantirConfig, getConfig, salvarConfig, gerarToken, paraSlug, slugLivre } from '@/lib/vitrineConfig'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Link da vitrine do cliente. Só o dono mexe: o link expõe preços e promoções
// do salão para qualquer um que o receba, e ligar ou trocar isso não é decisão
// de sub-usuário nem de profissional.

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Todo salão já nasce com o endereço pronto, sem precisar descobrir que
  // existe um botão "Gerar link" — quem não sabe que a página existe nunca a
  // usa. Mas nasce FORA DO AR: a página abre a tabela de preços para qualquer
  // um com o endereço, e publicar isso é decisão da dona, não nossa. O painel
  // mostra o link com o botão "Colocar no ar" do lado.
  //
  // Vale também para salão antigo: basta abrir Ações Comerciais uma vez.
  let cfg = await getConfig(sess.salaoId)
  if (!cfg && sess.role === 'salon') cfg = await garantirConfig(sess.salaoId, false)
  return NextResponse.json({ config: cfg })
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => ({ acao: 'criar' }))
  const acao = body?.acao || 'criar'

  if (acao === 'criar') {
    const cfg = await garantirConfig(sess.salaoId)
    await registrarAuditoria('criar', 'Link da vitrine', 'Link publico do cliente gerado')
    return NextResponse.json({ config: cfg })
  }

  const atual = await getConfig(sess.salaoId)
  if (!atual) return NextResponse.json({ error: 'Gere o link primeiro' }, { status: 400 })

  if (acao === 'ligar' || acao === 'desligar') {
    const cfg = { ...atual, ativo: acao === 'ligar' }
    await salvarConfig(sess.salaoId, cfg)
    await registrarAuditoria('editar', 'Link da vitrine', acao === 'ligar' ? 'Link religado' : 'Link tirado do ar')
    return NextResponse.json({ config: cfg })
  }

  // Endereço legível escolhido pelo dono: /promocoes/rouge-hair.
  //
  // O slug antigo para de funcionar assim que o novo entra — e por isso a tela
  // avisa antes. O token continua valendo por trás, então quem tem o link
  // velho com token não fica sem acesso.
  if (acao === 'slug') {
    const pedido = paraSlug(String(body?.slug || ''))
    if (pedido.length < 3) {
      return NextResponse.json({ error: 'O endereço precisa de pelo menos 3 letras.' }, { status: 400 })
    }
    const livre = await slugLivre(pedido, sess.salaoId)
    const cfg = { ...atual, slug: livre }
    await salvarConfig(sess.salaoId, cfg)
    await registrarAuditoria('editar', 'Link da vitrine', `Endereco do link agora e /${livre}`)
    return NextResponse.json({
      config: cfg,
      // Quando o pedido ja estava em uso, o salvo sai com sufixo: dizer isso
      // evita o dono achar que digitou e nao salvou.
      ajustado: livre !== pedido,
    })
  }

  // O que fica de fora do link. Chega a lista inteira do que está oculto — a
  // tela manda o estado completo, então desmarcar também grava.
  if (acao === 'ocultos') {
    const servicos = Array.isArray(body?.servicos) ? body.servicos.map(String).slice(0, 2000) : []
    const categorias = Array.isArray(body?.categorias) ? body.categorias.map(String).slice(0, 200) : []
    const cfg = { ...atual, ocultos: { servicos, categorias } }
    await salvarConfig(sess.salaoId, cfg)
    return NextResponse.json({ config: cfg })
  }

  // Faixa de atendimento: fora dela a cliente não consegue pedir horário.
  // Guarda 'HH:MM' cru — quem valida é `horariosDoDia`, que cai no padrão se a
  // faixa vier invertida. Melhor abrir demais do que ficar sem horário nenhum
  // e ninguém conseguir agendar.
  if (acao === 'horario') {
    const hhmm = (v: any) => (/^\d{1,2}:\d{2}$/.test(String(v || '')) ? String(v) : '')
    const abertura = hhmm(body?.abertura)
    const fechamento = hhmm(body?.fechamento)
    const cfg = { ...atual, horario: (abertura && fechamento) ? { abertura, fechamento } : undefined }
    await salvarConfig(sess.salaoId, cfg)
    await registrarAuditoria('editar', 'Link da vitrine',
      (abertura && fechamento) ? `Atendimento das ${abertura} as ${fechamento}` : 'Horario de atendimento voltou ao padrao')
    return NextResponse.json({ config: cfg })
  }

  // Trocar o token invalida o link antigo na hora — é o que se usa quando
  // o link vazou para quem não devia.
  if (acao === 'novo-endereco') {
    const cfg = { ...atual, token: gerarToken() }
    await salvarConfig(sess.salaoId, cfg)
    await registrarAuditoria('editar', 'Link da vitrine', 'Endereco trocado; o link antigo parou de funcionar')
    return NextResponse.json({ config: cfg })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
