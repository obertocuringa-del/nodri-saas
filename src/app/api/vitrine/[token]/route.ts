import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSalaoPorToken, whatsappDoSalao } from '@/lib/vitrineConfig'
import { statusCampanha, capaDaCampanha } from '@/lib/acoesComerciais'
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
  dataInicio?: string
  dataFim?: string
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const salao = await getSalaoPorToken(params.token)
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
      dataInicio: c.dataInicio,
      dataFim: c.dataFim,
    }))

  // ── Serviços (tabela de preço e montagem do agendamento) ──
  const { data: servicos } = await supabaseAdmin
    .from('salao_servicos')
    .select('id, categoria, nome, preco_fixo, preco_min, observacao, ativo')
    .eq('salao_id', salao.salaoId)
    .order('categoria').order('nome')

  const servicosPublicos = (servicos || [])
    .filter((s: any) => s.ativo !== false)
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
    .select('id, nome_completo, apelido, servicos_habilitados, ativo')
    .eq('salao_id', salao.salaoId)

  const profissionais = (profs || [])
    .filter((p: any) => p.ativo !== false && Array.isArray(p.servicos_habilitados) && p.servicos_habilitados.length)
    .map((p: any) => ({
      id: p.id,
      nome: p.apelido || p.nome_completo || 'Profissional',
      servicos: p.servicos_habilitados as string[],
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
