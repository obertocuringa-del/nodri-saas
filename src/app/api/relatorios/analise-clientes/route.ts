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

async function fetchCelulares(salaoId: string, nomes: string[]): Promise<Record<string, string>> {
  if (!nomes.length) return {}
  const map: Record<string, string> = {}
  let from = 0
  while (true) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw')
      .select('cliente, celular')
      .eq('salao_id', salaoId)
      .in('cliente', nomes.slice(0, 500))
      .neq('celular', '')
      .range(from, from + 999)
    if (!data || data.length === 0) break
    for (const c of data) if (c.celular && !map[c.cliente]) map[c.cliente] = c.celular
    if (data.length < 1000) break
    from += 1000
  }
  return map
}

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || 'resumo'

  try {
    // ── Resumo geral ─────────────────────────────────────────────────────
    if (tipo === 'resumo') {
      let perfis: any[] = []
      let from = 0
      while (true) {
        const { data } = await supabaseAdmin
          .from('clientes_perfil').select('status, score_rfm, ltv_total, total_visitas, dias_desde_ultima_visita')
          .eq('salao_id', salaoId).range(from, from + 999)
        if (!data || data.length === 0) break
        perfis = perfis.concat(data)
        if (data.length < 1000) break
        from += 1000
      }
      if (perfis.length === 0) return NextResponse.json({ vazio: true })
      const total    = perfis.length
      const vip      = perfis.filter(p => p.score_rfm === 'vip').length
      const em_risco = perfis.filter(p => p.status === 'risco').length
      const perdidos = perfis.filter(p => p.status === 'perdido').length
      const novos    = perfis.filter(p => p.score_rfm === 'novo').length
      const ativos   = perfis.filter(p => p.status === 'ativo').length
      const ltv_medio = Math.round(perfis.reduce((s, p) => s + (p.ltv_total || 0), 0) / total)
      const ltv_total = Math.round(perfis.reduce((s, p) => s + (p.ltv_total || 0), 0))
      return NextResponse.json({ total, vip, em_risco, perdidos, novos, ativos, ltv_medio, ltv_total })
    }

    // ── Em Risco ─────────────────────────────────────────────────────────
    if (tipo === 'risco') {
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('cliente_nome, ltv_total, total_visitas, ultima_visita, dias_desde_ultima_visita, intervalo_medio_dias, score_rfm, servicos_feitos')
        .eq('salao_id', salaoId)
        .eq('status', 'risco')
        .order('ltv_total', { ascending: false })
        .limit(100)
      const lista = data || []
      const cel = await fetchCelulares(salaoId, lista.map(d => d.cliente_nome))
      return NextResponse.json(lista.map(d => ({ ...d, celular: cel[d.cliente_nome] || '' })))
    }

    // ── Perdidos ─────────────────────────────────────────────────────────
    if (tipo === 'perdidos') {
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('cliente_nome, ltv_total, total_visitas, ultima_visita, dias_desde_ultima_visita, intervalo_medio_dias, servicos_feitos')
        .eq('salao_id', salaoId)
        .eq('status', 'perdido')
        .order('ltv_total', { ascending: false })
        .limit(100)
      const lista = data || []
      const cel = await fetchCelulares(salaoId, lista.map(d => d.cliente_nome))
      return NextResponse.json(lista.map(d => ({ ...d, celular: cel[d.cliente_nome] || '' })))
    }

    // ── VIP ───────────────────────────────────────────────────────────────
    if (tipo === 'vip') {
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('cliente_nome, ltv_total, total_visitas, ultima_visita, intervalo_medio_dias, servicos_feitos')
        .eq('salao_id', salaoId)
        .eq('score_rfm', 'vip')
        .order('ltv_total', { ascending: false })
        .limit(50)
      const lista = data || []
      const cel = await fetchCelulares(salaoId, lista.map(d => d.cliente_nome))
      return NextResponse.json(lista.map(d => ({ ...d, celular: cel[d.cliente_nome] || '' })))
    }

    // ── Regular ───────────────────────────────────────────────────────────
    if (tipo === 'regular') {
      let lista: any[] = []
      let from = 0
      while (true) {
        const { data } = await supabaseAdmin
          .from('clientes_perfil')
          .select('cliente_nome, ltv_total, total_visitas, ultima_visita, intervalo_medio_dias, servicos_feitos')
          .eq('salao_id', salaoId)
          .eq('score_rfm', 'regular')
          .order('ltv_total', { ascending: false })
          .range(from, from + 999)
        if (!data || data.length === 0) break
        lista = lista.concat(data)
        if (data.length < 1000) break
        from += 1000
      }
      const cel = await fetchCelulares(salaoId, lista.map(d => d.cliente_nome))
      return NextResponse.json(lista.map(d => ({ ...d, celular: cel[d.cliente_nome] || '' })))
    }

    // ── Novo ──────────────────────────────────────────────────────────────
    if (tipo === 'novo') {
      let lista: any[] = []
      let from = 0
      while (true) {
        const { data } = await supabaseAdmin
          .from('clientes_perfil')
          .select('cliente_nome, ltv_total, total_visitas, ultima_visita, intervalo_medio_dias, servicos_feitos')
          .eq('salao_id', salaoId)
          .eq('score_rfm', 'novo')
          .order('ltv_total', { ascending: false })
          .range(from, from + 999)
        if (!data || data.length === 0) break
        lista = lista.concat(data)
        if (data.length < 1000) break
        from += 1000
      }
      const cel = await fetchCelulares(salaoId, lista.map(d => d.cliente_nome))
      return NextResponse.json(lista.map(d => ({ ...d, celular: cel[d.cliente_nome] || '' })))
    }

    // ── RFM distribution ─────────────────────────────────────────────────
    if (tipo === 'rfm') {
      let rfmData: any[] = []
      let from = 0
      while (true) {
        const { data } = await supabaseAdmin
          .from('clientes_perfil').select('score_rfm, status')
          .eq('salao_id', salaoId).range(from, from + 999)
        if (!data || data.length === 0) break
        rfmData = rfmData.concat(data)
        if (data.length < 1000) break
        from += 1000
      }
      const contagem: Record<string, number> = {}
      for (const p of rfmData) contagem[p.score_rfm] = (contagem[p.score_rfm] || 0) + 1
      return NextResponse.json(contagem)
    }

    // ── Frequência: distribuição por faixa ───────────────────────────────
    if (tipo === 'frequencia') {
      let freqData: any[] = []
      let from = 0
      while (true) {
        const { data } = await supabaseAdmin
          .from('clientes_perfil').select('intervalo_medio_dias, total_visitas, score_rfm')
          .eq('salao_id', salaoId).neq('intervalo_medio_dias', 0).range(from, from + 999)
        if (!data || data.length === 0) break
        freqData = freqData.concat(data)
        if (data.length < 1000) break
        from += 1000
      }
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

    // ── Frequência: clientes de uma faixa (para modal) ───────────────────
    if (tipo === 'frequencia-clientes') {
      const min = parseInt(searchParams.get('min') || '0')
      const max = parseInt(searchParams.get('max') || '9999')
      let lista: any[] = []
      let from = 0
      while (true) {
        const { data } = await supabaseAdmin
          .from('clientes_perfil')
          .select('cliente_nome, ltv_total, total_visitas, ultima_visita, intervalo_medio_dias, servicos_feitos')
          .eq('salao_id', salaoId)
          .gte('intervalo_medio_dias', min)
          .lte('intervalo_medio_dias', max)
          .order('ltv_total', { ascending: false })
          .range(from, from + 999)
        if (!data || data.length === 0) break
        lista = lista.concat(data)
        if (data.length < 1000) break
        from += 1000
      }
      const cel = await fetchCelulares(salaoId, lista.map(d => d.cliente_nome))
      return NextResponse.json(lista.map(d => ({ ...d, celular: cel[d.cliente_nome] || '' })))
    }

    // ── crosssell (legado) ────────────────────────────────────────────────
    if (tipo === 'crosssell') {
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('cliente_nome, servicos_feitos, ltv_total, total_visitas')
        .eq('salao_id', salaoId)
        .eq('status', 'ativo')
        .order('ltv_total', { ascending: false })
        .limit(200)
      if (!data || data.length === 0) return NextResponse.json([])
      const freqServico: Record<string, number> = {}
      for (const c of data)
        for (const s of (c.servicos_feitos || []))
          freqServico[s] = (freqServico[s] || 0) + 1
      const servicosOrdenados = Object.entries(freqServico).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s]) => s)
      const oportunidades: any[] = []
      for (const sA of servicosOrdenados.slice(0, 5)) {
        for (const sB of servicosOrdenados.slice(0, 5)) {
          if (sA === sB) continue
          const fazA = data.filter(c => (c.servicos_feitos || []).includes(sA))
          const naoFazB = fazA.filter(c => !(c.servicos_feitos || []).includes(sB))
          if (naoFazB.length >= 3)
            oportunidades.push({ servico_tem: sA, servico_nao_tem: sB, clientes: naoFazB.length, clientes_lista: naoFazB.slice(0, 5).map(c => c.cliente_nome) })
        }
      }
      return NextResponse.json(oportunidades.sort((a, b) => b.clientes - a.clientes).slice(0, 10))
    }

    // ── Frequência: distribuição ─────────────────────────────────────────
    if (tipo === 'frequencia') {
      let freqData: any[] = []
      let from = 0
      while (true) {
        const { data } = await supabaseAdmin
          .from('clientes_perfil').select('intervalo_medio_dias, total_visitas, score_rfm')
          .eq('salao_id', salaoId).neq('intervalo_medio_dias', 0).range(from, from + 999)
        if (!data || data.length === 0) break
        freqData = freqData.concat(data)
        if (data.length < 1000) break
        from += 1000
      }
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

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
