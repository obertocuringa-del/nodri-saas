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

async function buscarTodosRaw(salaoId: string) {
  let rows: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw')
      .select('cliente, servico, categoria, data_comanda, celular, telefone')
      .eq('salao_id', salaoId)
      .order('ano').order('mes').order('data_comanda')
      .range(from, from + 999)
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  return rows
}

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || 'categorias'
  const categoria = searchParams.get('categoria') || ''
  const servico = searchParams.get('servico') || ''

  try {
    // ── Lista de categorias com contagem de serviços e clientes ──────────
    if (tipo === 'categorias') {
      const rows = await buscarTodosRaw(salaoId)

      const cats: Record<string, { servicos: Set<string>; clientes: Set<string> }> = {}
      for (const r of rows) {
        const cat = (r.categoria || 'Sem categoria').trim()
        const svc = (r.servico || '').trim()
        const cli = (r.cliente || '').trim()
        if (!cats[cat]) cats[cat] = { servicos: new Set(), clientes: new Set() }
        if (svc) cats[cat].servicos.add(svc)
        if (cli) cats[cat].clientes.add(cli)
      }

      const resultado = Object.entries(cats)
        .map(([nome, v]) => ({
          categoria: nome,
          total_servicos: v.servicos.size,
          total_clientes: v.clientes.size,
        }))
        .sort((a, b) => b.total_clientes - a.total_clientes)

      return NextResponse.json(resultado)
    }

    // ── Serviços de uma categoria ────────────────────────────────────────
    if (tipo === 'servicos' && categoria) {
      const rows = await buscarTodosRaw(salaoId)

      const svcs: Record<string, { clientes: Set<string> }> = {}
      for (const r of rows) {
        const cat = (r.categoria || 'Sem categoria').trim()
        if (cat !== categoria) continue
        const svc = (r.servico || '').trim()
        const cli = (r.cliente || '').trim()
        if (!svc) continue
        if (!svcs[svc]) svcs[svc] = { clientes: new Set() }
        if (cli) svcs[svc].clientes.add(cli)
      }

      const resultado = Object.entries(svcs)
        .map(([nome, v]) => ({
          servico: nome,
          total_clientes: v.clientes.size,
        }))
        .sort((a, b) => b.total_clientes - a.total_clientes)

      return NextResponse.json(resultado)
    }

    // ── Clientes que NUNCA fizeram determinado serviço ───────────────────
    if (tipo === 'nunca-fez' && servico) {
      const rows = await buscarTodosRaw(salaoId)

      // Quem já fez esse serviço
      const fizeram = new Set<string>()
      for (const r of rows) {
        if ((r.servico || '').trim() === servico) {
          fizeram.add((r.cliente || '').trim())
        }
      }

      // Todos os clientes com seus dados
      const clientes: Record<string, {
        celular: string; telefone: string; visitas: Set<string>; ultima: string
      }> = {}

      for (const r of rows) {
        const cli = (r.cliente || '').trim()
        if (!cli || cli === 'nan') continue
        if (!clientes[cli]) clientes[cli] = { celular: '', telefone: '', visitas: new Set(), ultima: '' }
        const c = clientes[cli]
        if (r.celular && !c.celular) c.celular = r.celular
        if (r.telefone && !c.telefone) c.telefone = r.telefone
        if (r.data_comanda) {
          c.visitas.add(r.data_comanda)
          if (!c.ultima || r.data_comanda > c.ultima) c.ultima = r.data_comanda
        }
      }

      // Filtra quem nunca fez
      const resultado = Object.entries(clientes)
        .filter(([nome]) => !fizeram.has(nome))
        .map(([nome, c]) => ({
          cliente: nome,
          celular: c.celular || c.telefone || '',
          total_visitas: c.visitas.size,
          ultima_visita: c.ultima,
        }))
        .sort((a, b) => b.total_visitas - a.total_visitas)

      return NextResponse.json({ servico, total: resultado.length, clientes: resultado })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
