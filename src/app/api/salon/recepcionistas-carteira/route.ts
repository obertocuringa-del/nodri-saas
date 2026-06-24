import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getPayload() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) return null
  return payload
}

// ── Configuração da Roda da Sorte (probabilidades a favor do salão) ──
// Prêmio = aposta × multiplicador. Retorno esperado ≈ 0,77× (margem do salão ~23%).
const RODA = [
  { label: 'Perdeu',      mult: 0,   peso: 40, cor: '#94a3b8' },
  { label: 'Metade',      mult: 0.5, peso: 20, cor: '#38bdf8' },
  { label: 'Empate',      mult: 1,   peso: 15, cor: '#34d399' },
  { label: '1,5×',        mult: 1.5, peso: 10, cor: '#a78bfa' },
  { label: 'Dobrou! 2×',  mult: 2,   peso: 10, cor: '#fb923c' },
  { label: '3×',          mult: 3,   peso: 4,  cor: '#f43f5e' },
  { label: 'JACKPOT 5×',  mult: 5,   peso: 1,  cor: '#fbbf24' },
]
const LIMITE_JOGADAS_DIA = 3

async function carregarMovimentos(salaoId: string) {
  const { data } = await supabaseAdmin
    .from('recepcionista_movimentos')
    .select('recepcionista_nome, tipo, valor, jogo, descricao, criado_em')
    .eq('salao_id', salaoId)
    .order('criado_em', { ascending: false })
  return data || []
}

function agregar(movs: any[]) {
  const hojeStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const carteira: Record<string, { saldo: number; bonus_creditado: number; pago: number; jogadas_hoje: number }> = {}
  for (const m of movs) {
    const nome = m.recepcionista_nome
    if (!carteira[nome]) carteira[nome] = { saldo: 0, bonus_creditado: 0, pago: 0, jogadas_hoje: 0 }
    const v = Number(m.valor) || 0
    carteira[nome].saldo += v
    if (m.tipo === 'bonus') carteira[nome].bonus_creditado += v
    if (m.tipo === 'pagamento' || m.tipo === 'adiantamento') carteira[nome].pago += Math.abs(v)
    if (m.tipo === 'jogo_aposta') {
      const d = new Date(m.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      if (d === hojeStr) carteira[nome].jogadas_hoje += 1
    }
  }
  // arredonda
  for (const k in carteira) {
    carteira[k].saldo = Math.round(carteira[k].saldo * 100) / 100
    carteira[k].bonus_creditado = Math.round(carteira[k].bonus_creditado * 100) / 100
    carteira[k].pago = Math.round(carteira[k].pago * 100) / 100
  }
  return carteira
}

export async function GET() {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const movs = await carregarMovimentos(p.salaoId)
  return NextResponse.json({
    carteira: agregar(movs),
    movimentos: movs.slice(0, 200),
    roda: RODA.map(s => ({ label: s.label, mult: s.mult, cor: s.cor })),
    limite_jogadas_dia: LIMITE_JOGADAS_DIA,
  })
}

export async function POST(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  const { acao, nome } = body
  if (!nome) return NextResponse.json({ error: 'recepcionista obrigatória' }, { status: 400 })

  // Saldo atual (recalculado do banco — fonte da verdade)
  const movs = await carregarMovimentos(p.salaoId)
  const carteira = agregar(movs)
  const atual = carteira[nome] || { saldo: 0, bonus_creditado: 0, pago: 0, jogadas_hoje: 0 }

  const insert = (tipo: string, valor: number, extra: any = {}) =>
    supabaseAdmin.from('recepcionista_movimentos').insert({
      salao_id: p.salaoId, recepcionista_nome: nome, tipo, valor, ...extra,
    })

  // ── Creditar bônus disponível (bônus conquistado ainda não creditado) ──
  if (acao === 'creditar') {
    const valor = Math.round((Number(body.valor) || 0) * 100) / 100
    if (valor <= 0) return NextResponse.json({ error: 'Nada a creditar' }, { status: 400 })
    const { error } = await insert('bonus', valor, { descricao: 'Crédito de bônus de recuperação' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Pagamento total ou adiantamento (parcial) ──
  if (acao === 'pagar' || acao === 'adiantar') {
    const tipo = acao === 'pagar' ? 'pagamento' : 'adiantamento'
    const valor = acao === 'pagar' ? atual.saldo : Math.round((Number(body.valor) || 0) * 100) / 100
    if (valor <= 0) return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    if (valor > atual.saldo + 0.001) return NextResponse.json({ error: 'Valor maior que o saldo disponível' }, { status: 400 })
    const dataStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const { error } = await insert(tipo, -valor, { descricao: `${acao === 'pagar' ? 'Pagamento' : 'Adiantamento'} em ${dataStr}` })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, pago: valor, data: dataStr, saldo: Math.round((atual.saldo - valor) * 100) / 100 })
  }

  // ── Jogar Roda da Sorte (resultado calculado no servidor) ──
  if (acao === 'jogar') {
    const aposta = Math.round((Number(body.aposta) || 0) * 100) / 100
    if (aposta <= 0) return NextResponse.json({ error: 'Aposta inválida' }, { status: 400 })
    if (aposta > atual.saldo + 0.001) return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
    if (atual.jogadas_hoje >= LIMITE_JOGADAS_DIA) return NextResponse.json({ error: `Limite de ${LIMITE_JOGADAS_DIA} jogadas por dia atingido` }, { status: 400 })

    // Sorteio ponderado
    const pesoTotal = RODA.reduce((s, x) => s + x.peso, 0)
    let r = Math.random() * pesoTotal
    let idx = 0
    for (let i = 0; i < RODA.length; i++) { r -= RODA[i].peso; if (r <= 0) { idx = i; break } }
    const seg = RODA[idx]
    const premio = Math.round(aposta * seg.mult * 100) / 100

    // Registra aposta (-) e prêmio (+)
    await insert('jogo_aposta', -aposta, { jogo: 'roda_sorte', descricao: 'Aposta na Roda da Sorte' })
    if (premio > 0) await insert('jogo_premio', premio, { jogo: 'roda_sorte', descricao: `Prêmio Roda da Sorte (${seg.label})` })

    const saldoNovo = Math.round((atual.saldo - aposta + premio) * 100) / 100
    return NextResponse.json({ ok: true, indice: idx, label: seg.label, mult: seg.mult, premio, aposta, saldo: saldoNovo })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
