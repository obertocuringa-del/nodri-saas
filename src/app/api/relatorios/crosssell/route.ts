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

// Converte "dd/mm/yyyy" → Date para comparação correta
function parseDataBR(d: string): Date | null {
  if (!d) return null
  const p = d.split('/')
  if (p.length !== 3) return null
  return new Date(`${p[2]}-${p[1]}-${p[0]}`)
}

async function buscarTodosRaw(salaoId: string) {
  let rows: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw')
      .select('cliente, servico, categoria, data_comanda, celular, telefone, ano, mes')
      .eq('salao_id', salaoId)
      .order('ano').order('mes').order('cliente')
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
    // ── Lista de categorias ──────────────────────────────────────────────
    if (tipo === 'categorias') {
      const rows = await buscarTodosRaw(salaoId)

      const cats: Record<string, { servicos: Set<string>; clientes: Set<string> }> = {}
      for (const r of rows) {
        const cat = (r.categoria || 'Sem categoria').trim().toUpperCase()
        const svc = (r.servico || '').trim().toUpperCase()
        const cli = (r.cliente || '').trim().toUpperCase()
        if (!cat) continue
        if (!cats[cat]) cats[cat] = { servicos: new Set(), clientes: new Set() }
        if (svc) cats[cat].servicos.add(svc)
        if (cli && cli !== 'NAN') cats[cat].clientes.add(cli)
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
      const categoriaUpper = categoria.trim().toUpperCase()

      const svcs: Record<string, { clientes: Set<string> }> = {}
      for (const r of rows) {
        const cat = (r.categoria || 'Sem categoria').trim().toUpperCase()
        if (cat !== categoriaUpper) continue
        const svc = (r.servico || '').trim().toUpperCase()
        const cli = (r.cliente || '').trim().toUpperCase()
        if (!svc) continue
        if (!svcs[svc]) svcs[svc] = { clientes: new Set() }
        if (cli && cli !== 'NAN') svcs[svc].clientes.add(cli)
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
      const servicoUpper = servico.trim().toUpperCase()

      // Normaliza tudo para UPPERCASE para evitar falso "nunca fez" por diferença de case
      const fizeram = new Set<string>()
      for (const r of rows) {
        const svc = (r.servico || '').trim().toUpperCase()
        const cli = (r.cliente || '').trim().toUpperCase()
        if (svc === servicoUpper && cli && cli !== 'NAN') {
          fizeram.add(cli)
        }
      }

      // Todos os clientes com seus dados (nomes normalizados)
      const clientes: Record<string, {
        celular: string; telefone: string; visitas: Set<string>; ultimaDate: Date | null; ultimaStr: string
      }> = {}

      for (const r of rows) {
        const cli = (r.cliente || '').trim().toUpperCase()
        if (!cli || cli === 'NAN') continue
        if (!clientes[cli]) clientes[cli] = { celular: '', telefone: '', visitas: new Set(), ultimaDate: null, ultimaStr: '' }
        const c = clientes[cli]
        if (r.celular && !c.celular) c.celular = r.celular
        if (r.telefone && !c.telefone) c.telefone = r.telefone
        if (r.data_comanda) {
          c.visitas.add(r.data_comanda)
          const d = parseDataBR(r.data_comanda)
          if (d && (!c.ultimaDate || d > c.ultimaDate)) {
            c.ultimaDate = d
            c.ultimaStr = r.data_comanda
          }
        }
      }

      // Filtra quem nunca fez — nome já está em uppercase, fizeram também
      const resultado = Object.entries(clientes)
        .filter(([nome]) => !fizeram.has(nome))
        .map(([nome, c]) => ({
          cliente: nome,
          celular: c.celular || c.telefone || '',
          total_visitas: c.visitas.size,
          ultima_visita: c.ultimaStr,
        }))
        .sort((a, b) => b.total_visitas - a.total_visitas)

      return NextResponse.json({ servico, total: resultado.length, clientes: resultado })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
