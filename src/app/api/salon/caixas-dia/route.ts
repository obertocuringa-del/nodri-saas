import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { chaveDoMes, type CaixaDoDia, type FolhaCaixas } from '@/lib/caixasDia'

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
