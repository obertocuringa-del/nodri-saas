import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Rota temporária de teste — remover após validação
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const nome = url.searchParams.get('nome') || 'Suelen'
  const mes = Number(url.searchParams.get('mes') || '1')
  const ano = Number(url.searchParams.get('ano') || '2026')

  // Busca profissional por nome
  const { data: profs } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, cargo, salao_id')
    .ilike('nome_completo', `%${nome}%`)
    .limit(5)

  if (!profs?.length) return NextResponse.json({ erro: `Profissional "${nome}" não encontrado` })

  const prof = profs[0]

  // Busca métricas do período
  const { data: metricas } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('*')
    .eq('profissional_id', prof.id)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  // Busca ocorrências
  const { data: ocorrs } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('tipo, ocorrido_descricao, criado_em')
    .eq('salao_id', prof.salao_id)
    .ilike('profissional_nome', `%${prof.nome_completo.split(' ')[0]}%`)
    .gte('criado_em', `${ano}-${String(mes).padStart(2,'0')}-01`)
    .lte('criado_em', `${ano}-${String(mes).padStart(2,'0')}-31`)

  return NextResponse.json({
    profissional: { id: prof.id, nome: prof.nome_completo, cargo: prof.cargo },
    periodo: `${mes}/${ano}`,
    metricas_banco: metricas ? {
      faturamento: metricas.faturamento,
      ticket_medio: metricas.ticket_medio,
      taxa_ocupacao: metricas.taxa_ocupacao,
      dias_trabalhados: metricas.dias_trabalhados,
      clientes_preferencia: metricas.clientes_preferencia,
      clientes_sem_preferencia: metricas.clientes_sem_preferencia,
      total_servicos: metricas.total_servicos,
      total_produtos: metricas.total_produtos,
    } : null,
    esperado_foto: {
      faturamento: 2657.52,
      ticket_medio: 69.45,
      taxa_ocupacao: 33.3,
      dias_trabalhados: 18,
      clientes_preferencia: 67,
      clientes_sem_preferencia: 25,
      total_servicos: 95,
      total_produtos: 0,
    },
    bate_com_foto: metricas ? {
      faturamento: Math.abs(Number(metricas.faturamento) - 2657.52) < 1,
      ticket_medio: Math.abs(Number(metricas.ticket_medio) - 69.45) < 1,
      taxa_ocupacao: Math.abs(Number(metricas.taxa_ocupacao) - 33.3) < 1,
      dias_trabalhados: Number(metricas.dias_trabalhados) === 18,
      clientes_preferencia: Number(metricas.clientes_preferencia) === 67,
      clientes_sem_preferencia: Number(metricas.clientes_sem_preferencia) === 25,
      total_servicos: Number(metricas.total_servicos) === 95,
      total_produtos: Number(metricas.total_produtos) === 0,
    } : 'sem dados',
    ocorrencias_janeiro: ocorrs?.map(o => ({ tipo: o.ocorrido_descricao || o.tipo, data: o.criado_em })) || [],
    ocorrencias_esperadas: { ATRASO: 4, FALTA: 2 },
  })
}
