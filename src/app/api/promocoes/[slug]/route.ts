import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSalaoPorToken, whatsappDoSalao } from '@/lib/vitrineConfig'
import { statusCampanha, capaDaCampanha, precoDaCampanha } from '@/lib/acoesComerciais'
import type { Campanha } from '@/lib/acoesComerciais'

export const dynamic = 'force-dynamic'

// Tudo que a vitrine do cliente precisa, numa requisição só: identidade do
// salão, campanhas, serviços e quem faz o quê.
//
// O que sai daqui é público. Por isso cada bloco leva só o campo que a tela
// mostra — nada de custo, comissão, rateio, telefone de profissional ou o
// texto interno de "como lançar no sistema", que é instrução para a equipe.

interface AcaoPublica {
  id: string
  titulo: string
  descricao: string
  categoria: string
  status: string
  capa: string | null
  // Preço já formatado no servidor: a página pública não recebe o valor cru,
  // e as duas telas mostram o mesmo número porque a conta é uma só.
  preco?: { de: string | null; por: string; parcela: string | null; descontoPct: number | null } | null
  dataInicio?: string
  dataFim?: string
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const salao = await getSalaoPorToken(params.slug)
  if (!salao) return NextResponse.json({ error: 'Link indisponível' }, { status: 404 })

  // ── Ações comerciais ──
  const { data: campRow } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salao.salaoId).eq('chave', 'acoes_comerciais').maybeSingle()

  const campanhas: Campanha[] = Array.isArray((campRow as any)?.valor) ? (campRow as any).valor : []

  // Rascunho não publicado não vaza: o cliente vê o que o salão ligou.
  const acoes: AcaoPublica[] = campanhas
    .filter(c => c.ativa)
    .map(c => ({
      id: c.id,
      titulo: c.titulo,
      descricao: c.descricao || '',
      categoria: c.categoria || '',
      status: statusCampanha(c),
      capa: capaDaCampanha(c)?.url || null,
      preco: precoDaCampanha(c),
      dataInicio: c.dataInicio,
      dataFim: c.dataFim,
    }))

  // ── Serviços (tabela de preço e montagem do agendamento) ──
  const { data: servicos } = await supabaseAdmin
    .from('salao_servicos')
    .select('id, categoria, nome, preco_fixo, preco_min, observacao, ativo')
    .eq('salao_id', salao.salaoId)
    .order('categoria').order('nome')

  // O salão escolhe o que aparece no link. Isso vale aqui e só aqui: o
  // serviço segue inteiro no sistema. E como o agendamento sai desta mesma
  // lista, o que está oculto também não pode ser pedido — nao da para
  // agendar o que nao esta no cardapio.
  const ocultosServ = new Set(salao.config.ocultos?.servicos || [])
  const ocultasCat = new Set(salao.config.ocultos?.categorias || [])

  const servicosPublicos = (servicos || [])
    .filter((s: any) => s.ativo !== false)
    .filter((s: any) => !ocultosServ.has(s.id) && !ocultasCat.has(s.categoria || 'Outros'))
    .map((s: any) => ({
      id: s.id,
      categoria: s.categoria || 'Outros',
      nome: s.nome,
      precoFixo: s.preco_fixo,
      precoMin: s.preco_min,
      observacao: s.observacao || null,
    }))

  // ── Quem faz o quê ──
  //
  // Só quem está ativo e tem serviço habilitado. Sai apenas o nome de
  // tratamento: o cliente escolhe por quem conhece, e o resto da ficha
  // (documento, telefone, contrato) não tem por que sair do salão.
  const { data: profs } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, servicos_habilitados, ativo, is_departamento, vinculo')
    .eq('salao_id', salao.salaoId)

  // Quem atende cliente, e so isso:
  //
  // - `is_departamento` marca SETOR (RH, Comercial). Setor nao atende ninguem,
  //   e estava aparecendo na lista de "quem voce prefere".
  // - `vinculo` CLT e a equipe interna; quem atende na cadeira e CNPJ.
  //
  // Sem servico habilitado o profissional continua na lista: promocao nao tem
  // servico vinculado, entao nao ha como filtrar por habilidade nesse caso.
  // Quem filtra por servico e a tela, ao escolher um servico especifico.
  const profissionais = (profs || [])
    .filter((p: any) =>
      p.ativo !== false
      && !p.is_departamento
      && String(p.vinculo || '').toUpperCase() !== 'CLT')
    .map((p: any) => ({
      id: p.id,
      nome: p.apelido || p.nome_completo || 'Profissional',
      servicos: Array.isArray(p.servicos_habilitados) ? (p.servicos_habilitados as string[]) : [],
    }))

  return NextResponse.json({
    salao: {
      nome: salao.nome,
      logo: salao.logo,
      whatsapp: whatsappDoSalao(salao.telefone),
    },
    acoes,
    servicos: servicosPublicos,
    profissionais,
  })
}
