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

// ── Resolvedores dos jogos (sempre calculados no servidor, margem do salão) ──
function jogarRoda(): { mult: number; label: string; detalhe: any } {
  const total = RODA.reduce((s, x) => s + x.peso, 0)
  let r = Math.random() * total, idx = 0
  for (let i = 0; i < RODA.length; i++) { r -= RODA[i].peso; if (r <= 0) { idx = i; break } }
  return { mult: RODA[idx].mult, label: RODA[idx].label, detalhe: { indice: idx } }
}
// 3 dados — prêmio pela soma (EV < 1)
function jogarDados(): { mult: number; label: string; detalhe: any } {
  const d = [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6))
  const soma = d[0] + d[1] + d[2]
  let mult = 0, label = 'Perdeu'
  if (soma === 18) { mult = 10; label = 'Trinca máxima! 10×' }
  else if (soma >= 15) { mult = 3; label = `Soma ${soma} — 3×` }
  else if (soma >= 11) { mult = 1; label = `Soma ${soma} — empate` }
  else if (soma >= 8) { mult = 0.5; label = `Soma ${soma} — metade` }
  return { mult, label, detalhe: { dados: d, soma } }
}
// 1 carta — prêmio pelo valor (Ás alto)
function jogarCartas(): { mult: number; label: string; detalhe: any } {
  const naipes = ['♠', '♥', '♦', '♣']
  const rank = 2 + Math.floor(Math.random() * 13)
  const naipe = naipes[Math.floor(Math.random() * 4)]
  const nomeRank = rank === 14 ? 'A' : rank === 13 ? 'K' : rank === 12 ? 'Q' : rank === 11 ? 'J' : String(rank)
  let mult = 0, label = 'Perdeu'
  if (rank === 14) { mult = 5; label = 'Ás! 5×' }
  else if (rank >= 11) { mult = 2; label = 'Figura! 2×' }
  else if (rank >= 8) { mult = 1; label = 'Empate' }
  else if (rank >= 5) { mult = 0.5; label = 'Metade' }
  return { mult, label, detalhe: { rank: nomeRank, naipe, vermelho: naipe === '♥' || naipe === '♦' } }
}
// 12 caixas — prêmios embaralhados (soma 7.5 → EV ~0,63×)
const CAIXAS_PREMIOS = [0, 0, 0, 0, 0, 0, 0, 0.5, 1, 1, 2, 3]
function jogarCaixas(escolha: number): { mult: number; label: string; detalhe: any } {
  const arr = [...CAIXAS_PREMIOS]
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
  const e = (escolha >= 0 && escolha < 12) ? escolha : Math.floor(Math.random() * 12)
  const mult = arr[e]
  const label = mult === 0 ? 'Caixa vazia' : mult >= 2 ? `Sortuda! ${mult}×` : `${mult}×`
  return { mult, label, detalhe: { caixas: arr, escolha: e } }
}
// Mina de diamantes — 25 casas, 3 bombas; abre N, se todas seguras o prêmio cresce
const MINES_MULT: Record<number, number> = { 1: 1.0, 3: 1.3, 5: 1.8, 7: 2.6 }
function jogarMines(qtd: number): { mult: number; label: string; detalhe: any } {
  const total = 25, nBombas = 3
  const n = [1, 3, 5, 7].includes(qtd) ? qtd : 3
  const bombas = new Set<number>()
  while (bombas.size < nBombas) bombas.add(Math.floor(Math.random() * total))
  const ordem = [...Array(total).keys()].sort(() => Math.random() - 0.5)
  const abertas = ordem.slice(0, n)
  const acertouBomba = abertas.some(p => bombas.has(p))
  const mult = acertouBomba ? 0 : (MINES_MULT[n] || 1)
  const label = acertouBomba ? 'Bomba!' : `${n} diamantes! ${mult}×`
  return { mult, label, detalhe: { bombas: [...bombas], abertas, total, ganhou: !acertouBomba } }
}

// Duelo 1×1: cada uma "rola" 3 dados; maior soma vence (empate re-rola)
function resolverDuelo(): { vencedorIdx: number; somas: number[]; dados: number[][] } {
  const roll = () => [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6))
  let a = roll(), b = roll(), sa = a[0] + a[1] + a[2], sb = b[0] + b[1] + b[2]
  while (sa === sb) { a = roll(); b = roll(); sa = a[0] + a[1] + a[2]; sb = b[0] + b[1] + b[2] }
  return { vencedorIdx: sa > sb ? 0 : 1, somas: [sa, sb], dados: [a, b] }
}

async function carregarDesafios(salaoId: string) {
  const { data } = await supabaseAdmin
    .from('recepcionista_desafios')
    .select('id, desafiante, desafiado, aposta, status, vencedor, resultado, criado_em, resolvido_em')
    .eq('salao_id', salaoId)
    .order('criado_em', { ascending: false })
    .limit(60)
  return data || []
}

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
  const [movs, desafios] = await Promise.all([carregarMovimentos(p.salaoId!), carregarDesafios(p.salaoId!)])
  return NextResponse.json({
    carteira: agregar(movs),
    movimentos: movs.slice(0, 200),
    roda: RODA.map(s => ({ label: s.label, mult: s.mult, cor: s.cor })),
    limite_jogadas_dia: LIMITE_JOGADAS_DIA,
    desafios,
  })
}

export async function POST(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  const { acao, nome } = body

  // Saldo atual (recalculado do banco — fonte da verdade)
  const movs = await carregarMovimentos(p.salaoId!)
  const carteira = agregar(movs)
  const insertNome = (n: string, tipo: string, valor: number, extra: any = {}) =>
    supabaseAdmin.from('recepcionista_movimentos').insert({
      salao_id: p.salaoId, recepcionista_nome: n, tipo, valor, ...extra,
    })

  // ── Desafios 1×1 entre recepcionistas ──
  if (acao === 'desafio_criar') {
    const desafiante = String(body.desafiante || ''), desafiado = String(body.desafiado || '')
    const aposta = Math.round((Number(body.aposta) || 0) * 100) / 100
    if (!desafiante || !desafiado || desafiante === desafiado) return NextResponse.json({ error: 'Escolha duas recepcionistas diferentes' }, { status: 400 })
    if (aposta <= 0) return NextResponse.json({ error: 'Aposta inválida' }, { status: 400 })
    if (aposta > ((carteira[desafiante]?.saldo) || 0) + 0.001) return NextResponse.json({ error: `Saldo de ${desafiante} insuficiente` }, { status: 400 })
    const { data: novo, error } = await supabaseAdmin.from('recepcionista_desafios').insert({
      salao_id: p.salaoId, desafiante, desafiado, aposta, status: 'pendente',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await insertNome(desafiante, 'desafio_aposta', -aposta, { jogo: 'desafio', descricao: `Aposta no desafio contra ${desafiado}` })
    return NextResponse.json({ ok: true, desafio: novo })
  }

  if (acao === 'desafio_recusar' || acao === 'desafio_aceitar') {
    const id = String(body.id || '')
    const { data: des } = await supabaseAdmin.from('recepcionista_desafios').select('*').eq('id', id).eq('salao_id', p.salaoId).single()
    if (!des || des.status !== 'pendente') return NextResponse.json({ error: 'Desafio não disponível' }, { status: 400 })
    const aposta = Number(des.aposta) || 0

    if (acao === 'desafio_recusar') {
      await insertNome(des.desafiante, 'desafio_estorno', aposta, { jogo: 'desafio', descricao: 'Estorno (desafio recusado)' })
      await supabaseAdmin.from('recepcionista_desafios').update({ status: 'recusado', resolvido_em: new Date().toISOString() }).eq('id', id)
      return NextResponse.json({ ok: true })
    }

    // aceitar: valida saldo do desafiado, debita, resolve o duelo, paga a vencedora
    if (aposta > ((carteira[des.desafiado]?.saldo) || 0) + 0.001) return NextResponse.json({ error: `Saldo de ${des.desafiado} insuficiente` }, { status: 400 })
    await insertNome(des.desafiado, 'desafio_aposta', -aposta, { jogo: 'desafio', descricao: `Aposta no desafio contra ${des.desafiante}` })
    const rr = resolverDuelo()
    const vencedor = rr.vencedorIdx === 0 ? des.desafiante : des.desafiado
    const pote = Math.round(aposta * 2 * 100) / 100
    await insertNome(vencedor, 'desafio_premio', pote, { jogo: 'desafio', descricao: `Venceu o desafio (pote ${pote})` })
    const resultado = { somas: rr.somas, dados: rr.dados, vencedor }
    await supabaseAdmin.from('recepcionista_desafios').update({ status: 'concluido', vencedor, resultado, resolvido_em: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ ok: true, vencedor, pote, resultado })
  }

  if (!nome) return NextResponse.json({ error: 'recepcionista obrigatória' }, { status: 400 })
  const atual = carteira[nome] || { saldo: 0, bonus_creditado: 0, pago: 0, jogadas_hoje: 0 }
  const insert = (tipo: string, valor: number, extra: any = {}) => insertNome(nome, tipo, valor, extra)

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

  // ── Jogar (Roda, Dados, Cartas, Caixas, Mines) — resultado no servidor ──
  if (acao === 'jogar') {
    const aposta = Math.round((Number(body.aposta) || 0) * 100) / 100
    if (aposta <= 0) return NextResponse.json({ error: 'Aposta inválida' }, { status: 400 })
    if (aposta > atual.saldo + 0.001) return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
    if (atual.jogadas_hoje >= LIMITE_JOGADAS_DIA) return NextResponse.json({ error: `Limite de ${LIMITE_JOGADAS_DIA} jogadas por dia atingido` }, { status: 400 })

    const jogo = String(body.jogo || 'roda')
    let res: { mult: number; label: string; detalhe: any }
    if (jogo === 'dados') res = jogarDados()
    else if (jogo === 'cartas') res = jogarCartas()
    else if (jogo === 'caixas') res = jogarCaixas(Number(body.escolha))
    else if (jogo === 'mines') res = jogarMines(Number(body.qtd))
    else res = jogarRoda()

    const premio = Math.round(aposta * res.mult * 100) / 100
    await insert('jogo_aposta', -aposta, { jogo, descricao: `Aposta (${jogo})` })
    if (premio > 0) await insert('jogo_premio', premio, { jogo, descricao: `Prêmio ${jogo} (${res.label})` })

    const saldoNovo = Math.round((atual.saldo - aposta + premio) * 100) / 100
    return NextResponse.json({ ok: true, jogo, label: res.label, mult: res.mult, premio, aposta, saldo: saldoNovo, ...res.detalhe })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
