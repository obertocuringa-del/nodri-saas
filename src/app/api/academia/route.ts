import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { escritaBloqueadaSub } from '@/lib/apiAuth'
import { sincronizarCatalogo } from '@/lib/academiaCatalogo'

// ── Por que a Academia se completa sozinha ──────────────────────────────────
//
// O catálogo de artigos mora no código, mas quem serve a tela é o banco. Isso
// deixava um degrau manual entre os dois: subia artigo novo no deploy e ele só
// aparecia depois que alguém entrasse no painel master e clicasse em carregar.
// Na prática o clique não acontecia, e o salão via a Academia desatualizada
// sem ter como saber que faltava algo.
//
// Agora a primeira leitura de cada instância acerta isso. É seguro repetir:
// insere só título que não existe, nunca sobrescreve texto editado e nunca
// desfaz artigo ocultado. Se falhar, a leitura segue normalmente — sincronia
// nunca pode derrubar a página.
let jaSincronizou = false

async function sincronizarUmaVez() {
  if (jaSincronizou) return
  jaSincronizou = true
  try {
    await sincronizarCatalogo()
  } catch {
    jaSincronizou = false // deu errado: deixa a próxima leitura tentar de novo
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    await sincronizarUmaVez()

    const { searchParams } = new URL(req.url)
    const categoria = searchParams.get('categoria')
    const todos = searchParams.get('todos') === '1' // admin vê todos (ativos e inativos)

    let query = supabaseAdmin
      .from('academia_artigos')
      .select('id, categoria, titulo, resumo, emoji, ordem, ativo, criado_em')
      .order('categoria')
      .order('ordem')

    if (!todos || payload.role !== 'master') query = query.eq('ativo', true)
    if (categoria) query = query.eq('categoria', categoria)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ artigos: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    if (!payload || payload.role !== 'master') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('academia_artigos')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ artigo: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
