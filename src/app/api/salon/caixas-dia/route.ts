import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { chaveDoMes, type CaixaDoDia, type ComandaNoCaixa, type FolhaCaixas } from '@/lib/caixasDia'

export const dynamic = 'force-dynamic'

// Onde a extensão entrega o movimento de caixa de um dia.
//
// Guardo por MÊS, não por dia: uma linha de salao_config por dia daria ~30
// linhas/mês por salão e uma consulta por dia aberto. A folha do mês é lida de
// uma vez e a conferência escolhe o dia dentro dela.

function dataValida(s: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(String(s || '').trim())
}

async function lerFolha(salaoId: string, chave: string): Promise<FolhaCaixas> {
  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', chave).maybeSingle()
  const v = (data as any)?.valor
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as FolhaCaixas) : {}
}

/**
 * Grava as linhas da aba COMANDAS_RAW, agrupando por dia e por responsável.
 *
 * Cada DIA presente no envio é substituído inteiro. Isso é o certo: reimportar
 * é o jeito de corrigir, e somar por cima duplicaria comandas — cada duplicata
 * viraria "entrou dinheiro a mais" na conferência.
 *
 * Os dias que NÃO vierem no envio ficam intactos: uma planilha de um período
 * curto não pode apagar o que já estava guardado de outro.
 */
async function gravarDaPlanilha(salaoId: string, linhas: any[]) {
  const soDigitos = (v: any) => {
    const d = String(v ?? '').replace(/\D/g, '')
    return d.replace(/^0+/, '') || d
  }
  const dinheiro = (v: any) => {
    if (typeof v === 'number') return v
    const t = String(v ?? '').replace(/[^\d,.-]/g, '')
    if (!t) return 0
    const n = Number(t.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }

  /**
   * Limpa o nome do responsável, aqui também.
   *
   * O robô já entrega limpo, mas normalizar nas DUAS pontas é o que impede o
   * dia em que uma versão diferente do robô mandar "Ruth - 15/01/2020 10:00"
   * e a tela passar a mostrar isso como se fosse o nome de uma pessoa. Pior:
   * "Não utiliza um caixa." precisa virar exatamente "Sem caixa", senão a
   * regra que aponta comanda paga fora de caixa deixa de casar — e some, em
   * silêncio, justamente o apontamento que ela existe para dar.
   */
  const limparResponsavel = (v: any) => {
    const bruto = String(v ?? '').split(/\s+-\s+\d{2}\//)[0].trim()
    const semAcento = bruto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (!bruto || semAcento.includes('nao utiliza')) return 'Sem caixa'
    return bruto
  }

  // dia → responsável → comandas
  const porDia = new Map<string, Map<string, ComandaNoCaixa[]>>()
  for (const l of linhas) {
    const dia = String(l?.data ?? '').trim().slice(0, 10)
    if (!dataValida(dia)) continue
    const comanda = soDigitos(l?.num_comanda)
    if (!comanda) continue
    const resp = limparResponsavel(l?.caixa_responsavel)
    if (!porDia.has(dia)) porDia.set(dia, new Map())
    const doDia = porDia.get(dia)!
    if (!doDia.has(resp)) doDia.set(resp, [])
    doDia.get(resp)!.push({ comanda, valor: dinheiro(l?.valor), forma: '' })
  }

  if (!porDia.size) {
    return NextResponse.json({ ok: true, ignorado: true, comandas: 0,
      aviso: 'Nenhuma linha de comanda reconhecida; nada foi alterado.' })
  }

  // Uma folha por mês, e dentro dela só os dias que vieram.
  const porMes = new Map<string, FolhaCaixas>()
  for (const [dia, resps] of porDia) {
    const chave = chaveDoMes(dia)
    if (!chave) continue
    if (!porMes.has(chave)) porMes.set(chave, await lerFolha(salaoId, chave))
    porMes.get(chave)![dia] = Array.from(resps.entries())
      .map(([responsavel, comandas]) => ({ responsavel, comandas, em: Date.now() }))
  }

  const { error } = await supabaseAdmin.from('salao_config').upsert(
    Array.from(porMes.entries()).map(([chave, folha]) => ({
      salao_id: salaoId, chave, valor: folha, atualizado_em: new Date().toISOString(),
    })),
    { onConflict: 'salao_id,chave' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = Array.from(porDia.values())
    .reduce((s, m) => s + Array.from(m.values()).reduce((t, c) => t + c.length, 0), 0)
  return NextResponse.json({ ok: true, comandas: total, dias: porDia.size, meses: porMes.size })
}

export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const data = String(new URL(req.url).searchParams.get('data') || '').trim()
  if (!dataValida(data)) return NextResponse.json({ error: 'Informe a data como DD/MM/AAAA' }, { status: 400 })

  const folha = await lerFolha(sess.salaoId, chaveDoMes(data))
  return NextResponse.json({ data, caixas: folha[data] || [] })
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)

  // ── Dois remetentes, um destino ───────────────────────────────────────────
  //
  // A EXTENSÃO manda `{ data, caixas }` — um dia por vez, lido da tela ao vivo.
  // O ROBÔ manda `{ linhas }` — a aba COMANDAS_RAW da planilha, com vários dias
  // de uma vez. Os dois gravam no mesmo lugar, e é de propósito: quem conferir
  // hoje pela extensão não perde o que o robô trouxer de madrugada, e vice-versa.
  if (Array.isArray(body?.linhas)) return gravarDaPlanilha(sess.salaoId, body.linhas)

  const data = String(body?.data || '').trim()
  if (!dataValida(data)) return NextResponse.json({ error: 'Informe a data como DD/MM/AAAA' }, { status: 400 })
  if (!Array.isArray(body?.caixas)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  // A extensão lê uma tela de fora e pode trazer qualquer coisa. Normalizo aqui
  // — número que vem como texto, campo faltando, comanda com espaço — para o
  // motor de conferência nunca receber sujeira e concluir errado em silêncio.
  const caixas: CaixaDoDia[] = []
  for (const c of body.caixas) {
    const responsavel = String(c?.responsavel || '').trim()
    if (!responsavel) continue
    const comandas = Array.isArray(c?.comandas) ? c.comandas : []
    caixas.push({
      responsavel,
      abertura: c?.abertura ? String(c.abertura) : undefined,
      fechamento: c?.fechamento ? String(c.fechamento) : undefined,
      totais: c?.totais && typeof c.totais === 'object' ? c.totais : undefined,
      em: Date.now(),
      comandas: comandas
        .map((x: any) => ({
          comanda: String(x?.comanda ?? '').trim(),
          valor: Number(x?.valor) || 0,
          forma: String(x?.forma || '').trim(),
          bandeira: x?.bandeira ? String(x.bandeira).trim() : undefined,
          parcelas: Number(x?.parcelas) || undefined,
        }))
        .filter((x: any) => x.comanda),
    })
  }
  if (!caixas.length) return NextResponse.json({ error: 'Nenhum caixa reconhecido no envio' }, { status: 400 })

  // Leio a folha e reescrevo só o dia. Sobrescrever o dia inteiro é o certo:
  // reenviar é o jeito de corrigir um caixa que veio incompleto, e somar por
  // cima duplicaria as comandas a cada nova leitura.
  const chave = chaveDoMes(data)
  const folha = await lerFolha(sess.salaoId, chave)
  folha[data] = caixas

  const { error } = await supabaseAdmin.from('salao_config').upsert(
    { salao_id: sess.salaoId, chave, valor: folha, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    data,
    caixas: caixas.length,
    comandas: caixas.reduce((s, c) => s + c.comandas.length, 0),
    total: caixas.reduce((s, c) => s + c.comandas.reduce((t, x) => t + x.valor, 0), 0),
  })
}
