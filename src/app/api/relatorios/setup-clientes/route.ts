import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const sqls = [
    `CREATE TABLE IF NOT EXISTS atendimentos_raw (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      salao_id uuid NOT NULL,
      ano int NOT NULL,
      mes int NOT NULL,
      profissional text,
      data_comanda text,
      dia_semana text,
      num_comanda text,
      servico text,
      categoria text,
      cliente text,
      cpf text,
      telefone text,
      celular text,
      qtd numeric DEFAULT 0,
      valor numeric DEFAULT 0,
      desconto numeric DEFAULT 0,
      total numeric DEFAULT 0,
      pacote text,
      criado_em timestamptz DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_atendimentos_salao_ano_mes ON atendimentos_raw(salao_id, ano, mes)`,
    `CREATE INDEX IF NOT EXISTS idx_atendimentos_cliente ON atendimentos_raw(salao_id, cliente)`,
    `CREATE INDEX IF NOT EXISTS idx_atendimentos_profissional ON atendimentos_raw(salao_id, profissional)`,

    `CREATE TABLE IF NOT EXISTS clientes_perfil (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      salao_id uuid NOT NULL,
      cliente_nome text NOT NULL,
      ltv_total numeric DEFAULT 0,
      total_visitas int DEFAULT 0,
      primeira_visita text,
      ultima_visita text,
      intervalo_medio_dias int DEFAULT 0,
      servicos_feitos jsonb DEFAULT '[]',
      score_rfm text DEFAULT 'novo',
      status text DEFAULT 'ativo',
      atualizado_em timestamptz DEFAULT now(),
      UNIQUE(salao_id, cliente_nome)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_clientes_perfil_salao ON clientes_perfil(salao_id)`,

    `CREATE TABLE IF NOT EXISTS clientes_resumo_mensal (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      salao_id uuid NOT NULL,
      cliente_nome text NOT NULL,
      ano int NOT NULL,
      mes int NOT NULL,
      visitas int DEFAULT 0,
      gasto_total numeric DEFAULT 0,
      servicos jsonb DEFAULT '[]',
      UNIQUE(salao_id, cliente_nome, ano, mes)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_clientes_resumo_salao ON clientes_resumo_mensal(salao_id, ano, mes)`,
  ]

  const erros: string[] = []
  for (const sql of sqls) {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql }).single().catch(() => ({ error: { message: 'rpc indisponível' } }))
    if (error && !error.message?.includes('already exists')) {
      erros.push(error.message)
    }
  }

  return NextResponse.json({ ok: true, erros: erros.length ? erros : undefined })
}
