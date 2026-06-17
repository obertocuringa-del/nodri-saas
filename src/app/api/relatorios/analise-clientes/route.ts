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

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || 'resumo'

  try {
    if (tipo === 'resumo') {
      const { data: perfis } = await supabaseAdmin
        .from('clientes_perfil').select('status, score_rfm, ltv_total, total_visitas, dias_desde_ultima_visita')
        .eq('salao_id', salaoId)

      if (!perfis || perfis.length === 0) return NextResponse.json({ vazio: true })

      const total = perfis.length
      const vip      = perfis.filter(p => p.score_rfm === 'vip').length
      const em_risco = perfis.filter(p => p.status === 'risco').length
      const perdidos = perfis.filter(p => p.status === 'perdido').length
      const novos    = perfis.filter(p => p.score_rfm === 'novo').length
      const ativos   = perfis.filter(p => p.status === 'ativo').length
      const ltv_medio = Math.round(perfis.reduce((s, p) => s + (p.ltv_total || 0), 0) / total)
      const ltv_total = Math.round(perfis.reduce((s, p) => s + (p.ltv_total || 0), 0))

      return NextResponse.json({ total, vip, em_risco, perdidos, novos, ativos, ltv_medio, ltv_total })
    }

    if (tipo === 'risco') {
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('cliente_nome, ltv_total, total_visitas, ultima_visita, dias_desde_ultima_visita, intervalo_medio_dias, score_rfm, servicos_feitos')
        .eq('salao_id', salaoId)
        .eq('status', 'risco')
        .order('ltv_total', { ascending: false })
        .limit(50)
      return NextResponse.json(data || [])
    }

    if (tipo === 'perdidos') {
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('cliente_nome, ltv_total, total_visitas, ultima_visita, dias_desde_ultima_visita, celular, telefone')
        .eq('salao_id', salaoId)
        .eq('status', 'perdido')
        .order('ltv_total', { ascending: false })
        .limit(50)
      // Busca contatos dos atendimentos raw
      const nomes = (data || []).map(d => d.cliente_nome)
      if (nomes.length) {
        const { data: contatos } = await supabaseAdmin
          .from('atendimentos_raw')
          .select('cliente, celular, telefone')
          .eq('salao_id', salaoId)
          .in('cliente', nomes)
          .neq('celular', '')
        const contatoMap: Record<string, string> = {}
        for (const c of (contatos || [])) {
          if (c.celular && !contatoMap[c.cliente]) contatoMap[c.cliente] = c.celular
        }
        return NextResponse.json((data || []).map(d => ({ ...d, celular: contatoMap[d.cliente_nome] || '' })))
      }
      return NextResponse.json(data || [])
    }

    if (tipo === 'vip') {
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('cliente_nome, ltv_total, total_visitas, ultima_visita, intervalo_medio_dias, servicos_feitos')
        .eq('salao_id', salaoId)
        .eq('score_rfm', 'vip')
        .order('ltv_total', { ascending: false })
        .limit(30)
      return NextResponse.json(data || [])
    }

    if (tipo === 'rfm') {
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('score_rfm, status')
        .eq('salao_id', salaoId)
      const contagem: Record<string, number> = {}
      for (const p of (data || [])) {
        contagem[p.score_rfm] = (contagem[p.score_rfm] || 0) + 1
      }
      return NextResponse.json(contagem)
    }

    if (tipo === 'crosssell') {
      // Clientes que fizeram serviço X mas nunca fizeram Y
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('cliente_nome, servicos_feitos, ltv_total, total_visitas')
        .eq('salao_id', salaoId)
        .eq('status', 'ativo')
        .order('ltv_total', { ascending: false })
        .limit(200)

      if (!data || data.length === 0) return NextResponse.json([])

      // Conta frequência de cada serviço
      const freqServico: Record<string, number> = {}
      for (const c of data) {
        for (const s of (c.servicos_feitos || [])) {
          freqServico[s] = (freqServico[s] || 0) + 1
        }
      }
      const servicosOrdenados = Object.entries(freqServico)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([s]) => s)

      // Para cada par popular de serviços, encontra clientes que fazem um mas não o outro
      const oportunidades: any[] = []
      for (const sA of servicosOrdenados.slice(0, 5)) {
        for (const sB of servicosOrdenados.slice(0, 5)) {
          if (sA === sB) continue
          const fazA = data.filter(c => (c.servicos_feitos || []).includes(sA))
          const naoFazB = fazA.filter(c => !(c.servicos_feitos || []).includes(sB))
          if (naoFazB.length >= 3) {
            oportunidades.push({
              servico_tem: sA,
              servico_nao_tem: sB,
              clientes: naoFazB.length,
              clientes_lista: naoFazB.slice(0, 5).map(c => c.cliente_nome),
            })
          }
        }
      }

      return NextResponse.json(oportunidades.sort((a, b) => b.clientes - a.clientes).slice(0, 10))
    }

    if (tipo === 'frequencia') {
      const { data } = await supabaseAdmin
        .from('clientes_perfil')
        .select('intervalo_medio_dias, total_visitas, score_rfm')
        .eq('salao_id', salaoId)
        .neq('intervalo_medio_dias', 0)

      if (!data) return NextResponse.json([])

      // Distribuição de frequência
      const faixas = [
        { label: '7-15 dias', min: 7, max: 15, count: 0 },
        { label: '16-30 dias', min: 16, max: 30, count: 0 },
        { label: '31-45 dias', min: 31, max: 45, count: 0 },
        { label: '46-60 dias', min: 46, max: 60, count: 0 },
        { label: '61-90 dias', min: 61, max: 90, count: 0 },
        { label: '+90 dias', min: 91, max: 9999, count: 0 },
      ]
      for (const c of data) {
        const f = faixas.find(fx => c.intervalo_medio_dias >= fx.min && c.intervalo_medio_dias <= fx.max)
        if (f) f.count++
      }
      const total = data.length
      return NextResponse.json(faixas.map(f => ({ ...f, pct: total > 0 ? Math.round(f.count / total * 100) : 0 })))
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
