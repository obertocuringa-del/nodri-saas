import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'

// Notifica o profissional solicitante (mesmo canal dos kits/departamentos)
async function notificar(salaoId: string, alvo: string, texto: string) {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', 'notificacoes_prof').maybeSingle()
  const lista = Array.isArray((data as any)?.valor) ? (data as any).valor : []
  const nova = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, texto, alvo, em: Date.now(), de: 'Financeiro' }
  await supabaseAdmin.from('salao_config').upsert({ salao_id: salaoId, chave: 'notificacoes_prof', valor: [nova, ...lista].slice(0, 100), atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,chave' })
}

const isoParaBR = (iso: string) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '' }
const fmtR = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// POST — o Financeiro (dono/sub) decide um pedido de empréstimo:
//   { id, acao: 'negar', motivoNegado }
//   { id, acao: 'liberar', modo: 'mes'|'quinzena', parcelas: [{ valor, data: 'yyyy-mm-dd' }] }
// Ao liberar, cada parcela vira uma despesa "EMPRÉSTIMO" na calculadora do mês
// correspondente à sua data (nome do profissional + motivo na observação).
export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'profissional') return NextResponse.json({ error: 'Somente o Financeiro decide' }, { status: 403 })
  const salaoId = sess.salaoId

  const body = await req.json()
  const id = String(body?.id || '').trim()
  const acao = body?.acao
  if (!id) return NextResponse.json({ error: 'Falta o id' }, { status: 400 })

  const { data: pend } = await supabaseAdmin.from('pendencias_profissionais').select('*').eq('id', id).eq('salao_id', salaoId).maybeSingle()
  if (!pend) return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
  if ((pend as any).tipo !== 'emprestimo') return NextResponse.json({ error: 'Isto não é um pedido de empréstimo' }, { status: 400 })
  const emp = (pend as any).emprestimo || {}
  if (emp.status && emp.status !== 'pendente') return NextResponse.json({ error: 'Este pedido já foi decidido' }, { status: 400 })

  const nome = (pend as any).solicitante_nome || 'Profissional'
  const motivo = emp.motivo || ''
  const alvo = (pend as any).solicitante_id || ''

  if (acao === 'negar') {
    const motivoNegado = String(body?.motivoNegado || '').trim()
    const novoEmp = { ...emp, status: 'negado', motivoNegado }
    const { error } = await supabaseAdmin.from('pendencias_profissionais')
      .update({ emprestimo: novoEmp, resolvido: true, resolvido_em: new Date().toISOString(), resposta: motivoNegado ? `Negado: ${motivoNegado}` : 'Negado' })
      .eq('id', id).eq('salao_id', salaoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (alvo) await notificar(salaoId, alvo, `❌ Seu empréstimo foi negado${motivoNegado ? `: ${motivoNegado}` : ''}`)
    return NextResponse.json({ ok: true })
  }

  if (acao === 'liberar') {
    const modo = body?.modo === 'quinzena' ? 'quinzena' : 'mes'
    const parcelasIn = Array.isArray(body?.parcelas) ? body.parcelas : []
    const parcelas = parcelasIn
      .map((p: any) => ({ valor: Number(p?.valor) || 0, dataISO: String(p?.data || ''), dataBR: isoParaBR(String(p?.data || '')) }))
      .filter((p: any) => p.valor > 0 && p.dataBR)
    if (!parcelas.length) return NextResponse.json({ error: 'Informe cada parcela com valor e data de débito' }, { status: 400 })
    const N = parcelas.length
    const grupo = `emp_${id}`

    // Aprovar cria uma obrigação de PAGAR a profissional hoje. Por isso o
    // vencimento é a data de hoje: o empréstimo entra na fila de boletos do
    // FINANCEIRO em "Vencem hoje" e, se ninguém marcar como pago, vira vencido.
    // (As datas das parcelas continuam sendo as do DESCONTO, no campo `data`.)
    const hj = new Date()
    const vencHoje = `${hj.getFullYear()}-${String(hj.getMonth() + 1).padStart(2, '0')}-${String(hj.getDate()).padStart(2, '0')}`

    // Agrupa as parcelas por mês e injeta em cada mês da calculadora (soma, não apaga)
    const porMes = new Map<string, { ano: number; mes: number; itens: any[] }>()
    parcelas.forEach((p: any, i: number) => {
      const [y, m] = p.dataISO.split('-').map(Number)
      const key = `${y}-${m}`
      if (!porMes.has(key)) porMes.set(key, { ano: y, mes: m, itens: [] })
      porMes.get(key)!.itens.push({
        nome: 'EMPRÉSTIMO', valor: String(p.valor), dica: '',
        parcela: N > 1 ? `${i + 1}/${N}` : '', obs: `${nome}${motivo ? ` — ${motivo}` : ''}`,
        // profId liga o lançamento à profissional: a fila de boletos usa isso
        // pra mostrar a chave PIX ATUAL dela (não uma cópia congelada aqui)
        grupo, venc: vencHoje, data: p.dataBR, profId: alvo,
      })
    })
    for (const { ano, mes, itens } of porMes.values()) {
      const { data: hist } = await supabaseAdmin.from('calculadora_historico').select('dados').eq('salao_id', salaoId).eq('ano', ano).eq('mes', mes).maybeSingle()
      const base = ((hist as any)?.dados && typeof (hist as any).dados === 'object') ? (hist as any).dados : {}
      const extras = Array.isArray(base.extrasDespInd) ? base.extrasDespInd : []
      const novo = { ...base, extrasDespInd: [...extras, ...itens] }
      const { error } = await supabaseAdmin.from('calculadora_historico')
        .upsert({ salao_id: salaoId, ano, mes, dados: novo, atualizado_em: new Date().toISOString() }, { onConflict: 'salao_id,ano,mes' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const total = parcelas.reduce((s: number, p: any) => s + p.valor, 0)
    const unidade = N > 1 ? (modo === 'quinzena' ? 'quinzenas' : 'parcelas') : 'parcela'
    const novoEmp = {
      ...emp, status: 'liberado', modo,
      parcelas: parcelas.map((p: any, i: number) => ({ valor: p.valor, data: p.dataBR, label: N > 1 ? `${i + 1}/${N}` : 'à vista' })),
      liberadoEm: new Date().toISOString(),
    }
    const { error } = await supabaseAdmin.from('pendencias_profissionais')
      .update({ emprestimo: novoEmp, resolvido: true, resolvido_em: new Date().toISOString(), resposta: `Aprovado: R$ ${fmtR(total)} em ${N} ${unidade}` })
      .eq('id', id).eq('salao_id', salaoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (alvo) await notificar(salaoId, alvo, `✅ Seu empréstimo de R$ ${fmtR(total)} foi aprovado em ${N} ${unidade}`)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
