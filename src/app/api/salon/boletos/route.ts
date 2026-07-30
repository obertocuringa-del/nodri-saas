import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, sessaoModoCaixa, Sessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'

// ── Boletos / contas a pagar ────────────────────────────────────────────────
// NÃO existe tabela nova. Um "boleto" é simplesmente uma despesa indireta da
// Calculadora que tem VENCIMENTO preenchido (campo `venc` dentro do jsonb do
// mês). Esta rota só LÊ esses meses e monta a fila ordenada por vencimento.
//
// O status "pago" é guardado FORA da calculadora, num único registro de
// salao_config (chave 'boletos_pagos'). Assim dar baixa num boleto nunca
// reescreve valores financeiros — zero risco de mexer em total, % ou gráfico.

const CHAVE_PAGOS = 'boletos_pagos'

// Quem pode VER a fila: dono/master sempre; sub só com a permissão da Calculadora.
// Profissional nunca (valores do salão).
function salaoIdSeVeBoletos(s: Sessao | null): string | null {
  if (!s || s.role === 'profissional') return null
  if (s.permissoes === null) return s.salaoId                                  // dono/master
  return s.permissoes.includes('calculadora') ? s.salaoId : null
}

// Quem pode dar baixa: dono/master e sub em MODO CAIXA (é só um selo de status)
function podeDarBaixa(s: Sessao | null): boolean {
  if (!s || s.role === 'profissional') return false
  if (s.permissoes === null) return true
  return sessaoModoCaixa(s)
}

const num = (v: any) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}
// Aceita 'YYYY-MM-DD' (padrão) ou 'DD/MM/YYYY' (legado digitado à mão)
function normVenc(v: any): string {
  const s = String(v || '').trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return ''
}

// Identificador estável do boleto, sem depender do índice na lista (se o usuário
// apagar uma linha acima, a baixa dos outros continua valendo). O sufixo de
// ocorrência só desempata linhas idênticas dentro do mesmo mês.
function chaveBoleto(ano: number, mes: number, lista: string, nome: string, venc: string, valor: number, parcela: string, ocorrencia: number) {
  return [`${ano}-${mes}`, lista, String(nome || '').trim(), venc, valor.toFixed(2), parcela || '', ocorrencia].join('|')
}

async function lerPagos(salaoId: string): Promise<Record<string, { pagoEm: string }>> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_PAGOS).maybeSingle()
  const v = (data as any)?.valor
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
}

// GET — fila completa de boletos (todos os meses), ordenada por vencimento.
// Com ?resumo=1 devolve só as contagens (usado nos avisos da tela Início e
// no card do setor, pra não trafegar a lista inteira).
export async function GET(req: NextRequest) {
  const sess = await getSessao()
  const salaoId = salaoIdSeVeBoletos(sess)
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const [resMeses, pagos] = await Promise.all([
    supabaseAdmin.from('calculadora_historico').select('ano, mes, dados').eq('salao_id', salaoId),
    lerPagos(salaoId),
  ])
  const meses = (resMeses as any)?.data

  const itens: any[] = []
  for (const m of (meses || []) as any[]) {
    const d = (m?.dados && typeof m.dados === 'object') ? m.dados : {}
    const varrer = (arr: any, lista: 'fix' | 'extra') => {
      if (!Array.isArray(arr)) return
      const vistos = new Map<string, number>()
      arr.forEach((it: any, idx: number) => {
        const venc = normVenc(it?.venc)
        if (!venc) return                                  // sem vencimento → não é boleto
        const valor = num(it?.valor)
        const nome = String(it?.nome || '').trim()
        const parcela = String(it?.parcela || '')
        const base = `${m.ano}-${m.mes}|${lista}|${nome}|${venc}|${valor.toFixed(2)}|${parcela}`
        const oc = vistos.get(base) || 0
        vistos.set(base, oc + 1)
        const key = chaveBoleto(m.ano, m.mes, lista, nome, venc, valor, parcela, oc)
        const pg = pagos[key]
        itens.push({
          key, ano: m.ano, mes: m.mes, lista, idx, nome, valor, venc, parcela,
          obs: String(it?.obs || ''), cod: String(it?.cod || ''),
          pago: !!pg, pagoEm: pg?.pagoEm || '',
        })
      })
    }
    varrer(d.despInd, 'fix')
    varrer(d.extrasDespInd, 'extra')
  }

  itens.sort((a, b) => a.venc < b.venc ? -1 : a.venc > b.venc ? 1 : 0)

  if (new URL(req.url).searchParams.get('resumo') === '1') {
    const hj = new Date(); hj.setHours(0, 0, 0, 0)
    const hoje = `${hj.getFullYear()}-${String(hj.getMonth() + 1).padStart(2, '0')}-${String(hj.getDate()).padStart(2, '0')}`
    const abertos = itens.filter(b => !b.pago)
    const vencidos = abertos.filter(b => b.venc < hoje)
    return NextResponse.json({
      vencidos: vencidos.length,
      vencidosValor: vencidos.reduce((s, b) => s + b.valor, 0),
      vencemHoje: abertos.filter(b => b.venc === hoje).length,
      aVencer: abertos.filter(b => b.venc > hoje).length,
      pagos: itens.length - abertos.length,
    })
  }

  return NextResponse.json({ boletos: itens, podeDarBaixa: podeDarBaixa(sess) })
}

// POST — marca como pago / desfaz. Só grava o selo em salao_config.
export async function POST(req: NextRequest) {
  const sess = await getSessao()
  const salaoId = salaoIdSeVeBoletos(sess)
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  if (!podeDarBaixa(sess)) return NextResponse.json({ error: 'Somente leitura — só o salão (ou o Modo Caixa) pode dar baixa em boleto.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const key = String(body?.key || '')
  if (!key) return NextResponse.json({ error: 'Falta a identificação do boleto' }, { status: 400 })
  const pago = body?.pago !== false

  const mapa = await lerPagos(salaoId)
  if (pago) {
    const hoje = new Date()
    const data = normVenc(body?.data) || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    mapa[key] = { pagoEm: data }
  } else {
    delete mapa[key]
  }

  const { error } = await supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE_PAGOS, valor: mapa, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  registrarAuditoria(pago ? 'Marcou como pago' : 'Desfez o pagamento', 'Boleto', key.split('|').slice(0, 4).join(' · '))
  return NextResponse.json({ ok: true, pago, pagoEm: mapa[key]?.pagoEm || '' })
}
