import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { getAtendimentosRaw } from '@/lib/atendimentosCache'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

// Dia da semana (0=Dom … 6=Sáb) a partir de "DD/MM/YYYY", em data LOCAL.
function dow(data: string): number {
  if (!data || !data.includes('/')) return -1
  const [d, m, y] = data.split('/')
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  return isNaN(dt.getTime()) ? -1 : dt.getDay()
}
function tsData(s: string): number {
  if (!s || !s.includes('/')) return 0
  const [d, m, y] = s.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime() || 0
}

// ============================================================
// ANÁLISE DE DEPENDÊNCIA DO DIA
// ------------------------------------------------------------
// Para o dia da semana escolhido, descobre quais clientes vêm
// SÓ naquele dia (exclusivos = receita em risco real ao fechar)
// vs quem também vem em outros dias (multidia = recuperável).
// Aceita 1 ou mais anos (anos=2024,2025,2026) para período maior.
// ============================================================
export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const dia = parseInt(url.searchParams.get('dia') || '-1') // 0=Dom … 6=Sáb
  // Aceita ?anos=2024,2025 ou ?ano=2026 (compatibilidade)
  const anosParam = url.searchParams.get('anos') || url.searchParams.get('ano') || ''
  const anos = new Set(anosParam.split(',').map(s => parseInt(s.trim())).filter(n => !!n))
  if (!anos.size || dia < 0 || dia > 6) {
    return NextResponse.json({ error: 'anos e dia (0-6) obrigatórios' }, { status: 400 })
  }

  const rows = await getAtendimentosRaw(salaoId)

  // Por cliente: dias da semana frequentados (no período) + receita/visitas/telefone no dia-alvo
  const porCliente: Record<string, {
    dias: Set<number>; receitaNoDia: number; visitasNoDia: number; ultimaNoDia: string; celular: string
  }> = {}

  for (const r of rows) {
    if (!anos.has(Number(r.ano))) continue
    const cli = (r.cliente || '').trim().toUpperCase()
    if (!cli || cli === 'NAN') continue
    const wd = dow(r.data_comanda)
    if (wd < 0) continue
    const val = Number(r.total) || Number(r.valor) || 0
    if (!porCliente[cli]) porCliente[cli] = { dias: new Set(), receitaNoDia: 0, visitasNoDia: 0, ultimaNoDia: '', celular: '' }
    const c = porCliente[cli]
    c.dias.add(wd)
    if (wd === dia) {
      c.receitaNoDia += val
      c.visitasNoDia += 1
      const tel = r.celular || r.telefone || ''
      if (tel && !c.celular) c.celular = tel
      if (!c.ultimaNoDia || tsData(r.data_comanda) > tsData(c.ultimaNoDia)) c.ultimaNoDia = r.data_comanda
    }
  }

  let exclusivos = 0, multidia = 0
  let receitaExclusiva = 0, receitaMultidia = 0
  const listaExclusivos: Array<{ cliente: string; celular: string; visitas: number; ultima_visita: string; receita: number; prob_migracao: 'alta' | 'media' | 'baixa' }> = []
  let migAlta = 0, migMedia = 0, migBaixa = 0

  for (const [cli, c] of Object.entries(porCliente)) {
    if (c.visitasNoDia === 0) continue // só clientes que vêm no dia-alvo
    const ehExclusivo = c.dias.size === 1 // frequenta APENAS o dia-alvo
    if (ehExclusivo) {
      exclusivos++
      receitaExclusiva += c.receitaNoDia
      // Estimativa de migração (heurística do sistema, não IA):
      // poucas visitas = cliente casual, fácil de mover (alta); muitas visitas
      // = muito apegado a esse dia, difícil de mover (baixa).
      const prob: 'alta' | 'media' | 'baixa' = c.visitasNoDia <= 3 ? 'alta' : c.visitasNoDia <= 8 ? 'media' : 'baixa'
      if (prob === 'alta') migAlta++; else if (prob === 'media') migMedia++; else migBaixa++
      listaExclusivos.push({ cliente: cli, celular: c.celular, visitas: c.visitasNoDia, ultima_visita: c.ultimaNoDia, receita: Math.round(c.receitaNoDia), prob_migracao: prob })
    } else {
      multidia++
      receitaMultidia += c.receitaNoDia
    }
  }

  const totalClientes = exclusivos + multidia
  const receitaTotal = receitaExclusiva + receitaMultidia
  listaExclusivos.sort((a, b) => b.receita - a.receita)

  return NextResponse.json({
    dia,
    anos: [...anos].sort((a, b) => a - b),
    total_clientes: totalClientes,
    exclusivos,
    multidia,
    pct_exclusivos: totalClientes > 0 ? Math.round((exclusivos / totalClientes) * 1000) / 10 : 0,
    receita_exclusiva: Math.round(receitaExclusiva),
    receita_multidia: Math.round(receitaMultidia),
    receita_total: Math.round(receitaTotal),
    pct_receita_risco: receitaTotal > 0 ? receitaExclusiva / receitaTotal : 0,
    migracao: { alta: migAlta, media: migMedia, baixa: migBaixa },
    lista_exclusivos: listaExclusivos.slice(0, 500),
  })
}
