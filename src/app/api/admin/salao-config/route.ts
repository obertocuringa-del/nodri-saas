import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Raio-X das páginas de um salão (só master) ──────────────────────────────
//
// Nasceu de um estrago: uma atualização do modelo gravou páginas "em branco"
// por cima de páginas que o salão já usava, e não havia como responder a
// pergunta óbvia — "o que mais eu perdi?".
//
// Devolve, por página: quando foi gravada pela última vez e QUANTO tem dentro
// (itens, linhas, categorias). Nunca devolve o conteúdo em si: para saber se
// uma página está vazia, o tamanho basta, e assim o dado do salão não trafega.
//
// Páginas gravadas todas no mesmo segundo são o dedo da aplicação do modelo:
// `?desde=<ISO>` filtra por isso.

function resumir(valor: any): { tipo: string; itens: number; vazia: boolean } {
  if (valor === null || valor === undefined) return { tipo: 'vazio', itens: 0, vazia: true }
  if (Array.isArray(valor)) return { tipo: 'lista', itens: valor.length, vazia: valor.length === 0 }
  if (typeof valor !== 'object') return { tipo: typeof valor, itens: valor ? 1 : 0, vazia: !valor }

  // Conta o que costuma ser "o conteúdo" de cada tipo de página.
  let itens = 0
  for (const campo of ['itens', 'registros', 'cards', 'linhas', 'lista', 'campanhas', 'categorias', 'pedidos', 'blocos', 'paginas', 'anexos']) {
    if (Array.isArray((valor as any)[campo])) itens += (valor as any)[campo].length
  }
  if (Array.isArray((valor as any).tabelas)) {
    for (const t of (valor as any).tabelas) {
      const linhas = Array.isArray(t?.linhas) ? t.linhas : []
      // Linha só com células vazias não conta: é grade montada, não conteúdo.
      itens += linhas.filter((l: any[]) => (l || []).some((c: any) => String(c?.t ?? '').trim())).length
    }
  }
  const texto = typeof (valor as any).texto === 'string' ? (valor as any).texto.trim().length : 0
  return { tipo: 'documento', itens: itens || (texto ? 1 : 0), vazia: itens === 0 && texto === 0 }
}

export async function GET(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const salao = searchParams.get('salao')
  const desde = searchParams.get('desde')
  if (!salao) return NextResponse.json({ error: 'Informe ?salao=<id>' }, { status: 400 })

  let q = supabaseAdmin.from('salao_config')
    .select('chave, valor, atualizado_em').eq('salao_id', salao)
  if (desde) q = q.gte('atualizado_em', desde)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const linhas = (data || []).map((l: any) => ({
    chave: l.chave,
    atualizado_em: l.atualizado_em,
    ...resumir(l.valor),
  })).sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em)))

  return NextResponse.json({
    total: linhas.length,
    vazias: linhas.filter(l => l.vazia).length,
    linhas,
  })
}
