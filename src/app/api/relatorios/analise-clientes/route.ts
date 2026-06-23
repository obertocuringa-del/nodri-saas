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

// Converte "DD/MM/YYYY" (ou ISO) para timestamp
function parseBR(s: string): number {
  if (!s) return 0
  if (s.includes('/')) { const [d, m, y] = s.split('/'); return new Date(`${y}-${m}-${d}`).getTime() || 0 }
  return new Date(s).getTime() || 0
}

type Perfil = {
  cliente_nome: string; celular: string; ltv_total: number; total_visitas: number
  primeira_visita: string; ultima_visita: string; dias_desde_ultima_visita: number
  intervalo_medio_dias: number; servicos_feitos: string[]; status: string; score_rfm: string
}

// Calcula os perfis de clientes DIRETO do atendimentos_raw (sem tabela cacheada),
// garantindo que os "Mais Relatórios" fiquem sempre em sincronia com os dados importados.
async function buildPerfis(salaoId: string): Promise<Perfil[]> {
  let rows: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw')
      .select('cliente, celular, data_comanda, servico, total, valor')
      .eq('salao_id', salaoId)
      .range(from, from + 999)
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  const map: Record<string, { datas: Set<string>; ltv: number; servicos: Set<string>; celular: string }> = {}
  for (const r of rows) {
    const nome = (r.cliente || '').trim()
    if (!nome) continue
    if (!map[nome]) map[nome] = { datas: new Set(), ltv: 0, servicos: new Set(), celular: '' }
    const m = map[nome]
    if (r.data_comanda) m.datas.add(r.data_comanda)
    m.ltv += Number(r.total) || Number(r.valor) || 0
    if (r.servico) m.servicos.add(String(r.servico).trim())
    if (r.celular && !m.celular) m.celular = String(r.celular)
  }

  const now = Date.now()
  const perfis: Perfil[] = Object.entries(map).map(([nome, m]) => {
    const datasOrd = [...m.datas].sort((a, b) => parseBR(a) - parseBR(b))
    const total_visitas = datasOrd.length
    const ultima = datasOrd[total_visitas - 1] || ''
    const dias_desde_ultima_visita = ultima ? Math.floor((now - parseBR(ultima)) / 86400000) : 9999
    let intervalo_medio_dias = 0
    if (datasOrd.length >= 2) {
      const diffs: number[] = []
      for (let i = 1; i < datasOrd.length; i++) {
        const d = (parseBR(datasOrd[i]) - parseBR(datasOrd[i - 1])) / 86400000
        if (d > 0) diffs.push(d)
      }
      if (diffs.length) intervalo_medio_dias = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
    }
    return {
      cliente_nome: nome,
      celular: m.celular,
      ltv_total: Math.round(m.ltv * 100) / 100,
      total_visitas,
      primeira_visita: datasOrd[0] || '',
      ultima_visita: ultima,
      dias_desde_ultima_visita,
      intervalo_medio_dias,
      servicos_feitos: [...m.servicos],
      status: '', score_rfm: '',
    }
  })

  // Status pela recência (relativo a 45/90 dias)
  for (const p of perfis) {
    p.status = p.dias_desde_ultima_visita > 90 ? 'perdido' : p.dias_desde_ultima_visita > 45 ? 'risco' : 'ativo'
  }
  // RFM: novo = 1 visita; vip = top 15% por LTV; regular = recorrente
  const ltvsOrd = perfis.map(p => p.ltv_total).sort((a, b) => b - a)
  const vipThreshold = ltvsOrd.length ? (ltvsOrd[Math.floor(ltvsOrd.length * 0.15)] || ltvsOrd[0] || 0) : 0
  for (const p of perfis) {
    if (p.total_visitas <= 1) p.score_rfm = 'novo'
    else if (p.ltv_total > 0 && p.ltv_total >= vipThreshold) p.score_rfm = 'vip'
    else p.score_rfm = 'regular'
  }
  return perfis
}

// Cache curto em memória: ao trocar de aba, reaproveita os perfis (evita
// recalcular tudo do atendimentos_raw a cada clique).
const _cache = new Map<string, { perfis: Perfil[]; ts: number }>()
const CACHE_TTL = 60_000
async function buildPerfisCached(salaoId: string): Promise<Perfil[]> {
  const c = _cache.get(salaoId)
  if (c && Date.now() - c.ts < CACHE_TTL) return c.perfis
  const perfis = await buildPerfis(salaoId)
  _cache.set(salaoId, { perfis, ts: Date.now() })
  return perfis
}

const campos = (p: Perfil) => ({
  cliente_nome: p.cliente_nome, ltv_total: p.ltv_total, total_visitas: p.total_visitas,
  ultima_visita: p.ultima_visita, dias_desde_ultima_visita: p.dias_desde_ultima_visita,
  intervalo_medio_dias: p.intervalo_medio_dias, servicos_feitos: p.servicos_feitos, celular: p.celular,
})

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || 'resumo'

  try {
    const perfis = await buildPerfisCached(salaoId)

    if (tipo === 'resumo') {
      if (perfis.length === 0) return NextResponse.json({ vazio: true })
      const total = perfis.length
      const vip = perfis.filter(p => p.score_rfm === 'vip').length
      const em_risco = perfis.filter(p => p.status === 'risco').length
      const perdidos = perfis.filter(p => p.status === 'perdido').length
      const novos = perfis.filter(p => p.score_rfm === 'novo').length
      const ativos = perfis.filter(p => p.status === 'ativo').length
      const ltv_total = Math.round(perfis.reduce((s, p) => s + p.ltv_total, 0))
      const ltv_medio = Math.round(ltv_total / total)
      const ltv_total_perdidos = Math.round(perfis.filter(p => p.status === 'perdido').reduce((s, p) => s + p.ltv_total, 0))
      return NextResponse.json({ total, vip, em_risco, perdidos, novos, ativos, ltv_medio, ltv_total, ltv_total_perdidos })
    }

    if (tipo === 'risco')
      return NextResponse.json(perfis.filter(p => p.status === 'risco').sort((a, b) => b.ltv_total - a.ltv_total).map(campos))
    if (tipo === 'perdidos')
      return NextResponse.json(perfis.filter(p => p.status === 'perdido').sort((a, b) => b.ltv_total - a.ltv_total).map(campos))
    if (tipo === 'vip')
      return NextResponse.json(perfis.filter(p => p.score_rfm === 'vip').sort((a, b) => b.ltv_total - a.ltv_total).map(campos))
    if (tipo === 'regular')
      return NextResponse.json(perfis.filter(p => p.score_rfm === 'regular').sort((a, b) => b.ltv_total - a.ltv_total).map(campos))
    if (tipo === 'novo')
      return NextResponse.json(perfis.filter(p => p.score_rfm === 'novo').sort((a, b) => b.ltv_total - a.ltv_total).map(campos))

    if (tipo === 'rfm') {
      const contagem: Record<string, number> = {}
      for (const p of perfis) contagem[p.score_rfm] = (contagem[p.score_rfm] || 0) + 1
      return NextResponse.json(contagem)
    }

    if (tipo === 'frequencia') {
      const freqData = perfis.filter(p => p.intervalo_medio_dias > 0)
      const faixas = [
        { label: '7-15 dias', min: 7, max: 15, count: 0 },
        { label: '16-30 dias', min: 16, max: 30, count: 0 },
        { label: '31-45 dias', min: 31, max: 45, count: 0 },
        { label: '46-60 dias', min: 46, max: 60, count: 0 },
        { label: '61-90 dias', min: 61, max: 90, count: 0 },
        { label: '+90 dias', min: 91, max: 9999, count: 0 },
      ]
      for (const c of freqData) {
        const f = faixas.find(fx => c.intervalo_medio_dias >= fx.min && c.intervalo_medio_dias <= fx.max)
        if (f) f.count++
      }
      const total = freqData.length
      return NextResponse.json(faixas.map(f => ({ ...f, pct: total > 0 ? Math.round(f.count / total * 100) : 0 })))
    }

    if (tipo === 'frequencia-clientes') {
      const min = parseInt(searchParams.get('min') || '0')
      const max = parseInt(searchParams.get('max') || '9999')
      return NextResponse.json(perfis
        .filter(p => p.intervalo_medio_dias >= min && p.intervalo_medio_dias <= max)
        .sort((a, b) => b.ltv_total - a.ltv_total).map(campos))
    }

    if (tipo === 'crosssell') {
      const ativos = perfis.filter(p => p.status === 'ativo').sort((a, b) => b.ltv_total - a.ltv_total).slice(0, 200)
      if (!ativos.length) return NextResponse.json([])
      const freqServico: Record<string, number> = {}
      for (const c of ativos) for (const s of c.servicos_feitos) freqServico[s] = (freqServico[s] || 0) + 1
      const servicosOrdenados = Object.entries(freqServico).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s]) => s)
      const oportunidades: any[] = []
      for (const sA of servicosOrdenados.slice(0, 5)) {
        for (const sB of servicosOrdenados.slice(0, 5)) {
          if (sA === sB) continue
          const fazA = ativos.filter(c => c.servicos_feitos.includes(sA))
          const naoFazB = fazA.filter(c => !c.servicos_feitos.includes(sB))
          if (naoFazB.length >= 3)
            oportunidades.push({ servico_tem: sA, servico_nao_tem: sB, clientes: naoFazB.length, clientes_lista: naoFazB.slice(0, 5).map(c => c.cliente_nome) })
        }
      }
      return NextResponse.json(oportunidades.sort((a, b) => b.clientes - a.clientes).slice(0, 10))
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
