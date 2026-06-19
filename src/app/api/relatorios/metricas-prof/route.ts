import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

// Retorna { [profissional_id]: faturamento } para o mês/ano pedido
// Fonte: prof_metricas_mensais — mais confiável que prof_pagamentos (usa ID direto, sem matching de texto)
export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({}, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get('ano') || '0')
  const mes = parseInt(searchParams.get('mes') || '0')
  if (!ano || !mes) return NextResponse.json({})

  const { data } = await supabaseAdmin
    .from('prof_metricas_mensais')
    .select('profissional_id, faturamento')
    .eq('salao_id', salaoId)
    .eq('ano', ano)
    .eq('mes', mes)

  const result: Record<string, number> = {}
  for (const row of (data || [])) {
    if (row.profissional_id) result[row.profissional_id] = Number(row.faturamento || 0)
  }

  return NextResponse.json(result)
}
