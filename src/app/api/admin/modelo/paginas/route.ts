import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CHAVE_PAGINAS_COM_DADOS, ehChaveDoModelo, regraDaChave } from '@/lib/modeloSalao'

export const dynamic = 'force-dynamic'

// ── Quais páginas do modelo viajam COM o conteúdo ───────────────────────────
//
// Por padrão o modelo distribui a página montada e VAZIA: é o que impede o
// conteúdo de um salão de aparecer na tela de outro. Só que às vezes o
// conteúdo É o produto — a lista de materiais do profissional, um catálogo de
// serviços, um check list de referência.
//
// Antes isso dependia de eu (programador) acrescentar a chave numa lista no
// código, uma por uma. Aqui o dono do sistema marca sozinho, na tela, e a
// escolha vale para as próximas atualizações de todos os salões.

async function master() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload && payload.role === 'master' ? payload : null
}

/** Quantos textos escritos há neste JSON — serve para mostrar "tem conteúdo". */
function contarTextos(v: any): number {
  if (v == null) return 0
  if (typeof v === 'string') return v.trim() ? 1 : 0
  if (typeof v !== 'object') return 0
  if (Array.isArray(v)) return v.reduce((t, x) => t + contarTextos(x), 0)
  return Object.values(v).reduce((t: number, x) => t + contarTextos(x), 0)
}

export async function GET() {
  if (!await master()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: mod } = await supabaseAdmin.from('saloes').select('id, nome').eq('is_modelo', true).maybeSingle()
  if (!mod) return NextResponse.json({ error: 'Nenhum salão modelo definido' }, { status: 400 })

  const [{ data: linhas }, { data: cfg }] = await Promise.all([
    supabaseAdmin.from('salao_config').select('chave, valor').eq('salao_id', (mod as any).id),
    supabaseAdmin.from('configuracoes').select('valor').eq('chave', CHAVE_PAGINAS_COM_DADOS).maybeSingle(),
  ])

  const marcadas: string[] = Array.isArray((cfg as any)?.valor?.chaves) ? (cfg as any).valor.chaves : []

  const paginas = (linhas || [])
    .filter((l: any) => ehChaveDoModelo(l.chave))
    .map((l: any) => {
      const r = regraDaChave(l.chave)
      return {
        chave: l.chave,
        rotulo: r?.rotulo || l.chave,
        textos: contarTextos(l.valor),
        // 'inteiro'/'checklist' já viajam com conteúdo por natureza; a marcação
        // só decide o destino das outras.
        sempreVaiCheia: r?.como === 'inteiro' || r?.como === 'checklist' || r?.como === 'listaCompra',
        marcada: marcadas.includes(l.chave),
      }
    })
    .sort((a: any, b: any) => b.textos - a.textos)

  return NextResponse.json({ modelo: (mod as any).nome, paginas, marcadas })
}

export async function POST(req: NextRequest) {
  if (!await master()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const chaves = Array.isArray(body?.chaves) ? body.chaves.map(String) : null
  if (!chaves) return NextResponse.json({ error: 'Envie chaves: string[]' }, { status: 400 })

  const { error } = await supabaseAdmin.from('configuracoes')
    .upsert({ chave: CHAVE_PAGINAS_COM_DADOS, valor: { chaves } }, { onConflict: 'chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, total: chaves.length })
}
