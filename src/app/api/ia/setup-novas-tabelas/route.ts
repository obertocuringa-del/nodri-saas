import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const sqls = [
    // Custos mensais do salão
    `CREATE TABLE IF NOT EXISTS salao_despesas_mensais (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      salao_id uuid NOT NULL,
      ano int NOT NULL,
      mes int NOT NULL,
      itens jsonb DEFAULT '[]',
      total numeric DEFAULT 0,
      atualizado_em timestamptz DEFAULT now(),
      UNIQUE(salao_id, ano, mes)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_despesas_mensais_salao ON salao_despesas_mensais(salao_id, ano, mes)`,

    // Resumos semanais gerados pela IA
    `CREATE TABLE IF NOT EXISTS ia_resumos_semanais (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      salao_id uuid NOT NULL,
      semana text NOT NULL,
      resumo text,
      criado_em timestamptz DEFAULT now(),
      UNIQUE(salao_id, semana)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_resumos_semanais_salao ON ia_resumos_semanais(salao_id)`,

    // Email para envio de resumo semanal na configuração da IA
    `ALTER TABLE ia_configuracao ADD COLUMN IF NOT EXISTS email_resumo text`,
  ]

  const erros: string[] = []
  for (const sql of sqls) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql }).single()
      if (error && !error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
        erros.push(error.message)
      }
    } catch {
      erros.push('rpc indisponível para: ' + sql.slice(0, 60))
    }
  }

  return NextResponse.json({ ok: true, erros: erros.length ? erros : undefined })
}
