import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { chaveDoModulo, type ChaveModulo } from '@/lib/planosModulos'

// Módulos ativos do salão da sessão, em chave ('relatorios', 'calculadora'…).
// Serve às telas da BASE que mostram uma seção alimentada por dado de módulo:
// em vez de abrir vazia, elas mostram o <AvisoPlano>.
//
// Lê ao vivo do banco de propósito. O módulo pode ser ligado pelo admin a
// qualquer momento e o salão precisa ver a mudança recarregando a página, sem
// precisar sair e entrar de novo — mesmo critério das permissões do sub.
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('salao_modulos')
    .select('ativo, modulos(nome)')
    .eq('salao_id', sess.salaoId)
    .eq('ativo', true)

  const chaves = new Set<ChaveModulo>()
  for (const linha of (data || []) as any[]) {
    // O join volta objeto ou array conforme a cardinalidade que o PostgREST
    // infere; aceitar os dois evita depender da forma da FK.
    const nome = Array.isArray(linha.modulos) ? linha.modulos[0]?.nome : linha.modulos?.nome
    const chave = chaveDoModulo(nome || '')
    if (chave) chaves.add(chave)
  }

  return NextResponse.json({ modulos: Array.from(chaves) })
}
