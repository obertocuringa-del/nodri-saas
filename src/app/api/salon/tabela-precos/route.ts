import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { lerLinhas, type PrecoDeTabela } from '@/lib/tabelaPrecos'

export const dynamic = 'force-dynamic'

// A tabela de preços do salão (relatório 0033 do Avec), que o robô traz junto
// da planilha de todo dia.
//
// Fica em salao_config e NÃO é folha do mês: é a tabela vigente, uma só, que a
// importação do dia seguinte substitui. Guardar histórico de tabela seria outro
// assunto — e a conferência só precisa saber quanto o serviço custa hoje.
const CHAVE = 'tabela_precos'

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('salao_config').select('valor, atualizado_em')
    .eq('salao_id', sess.salaoId).eq('chave', CHAVE).maybeSingle()

  const itens: PrecoDeTabela[] = Array.isArray((data as any)?.valor?.itens)
    ? (data as any).valor.itens : []

  return NextResponse.json({
    itens,
    total: itens.length,
    atualizadoEm: (data as any)?.atualizado_em || null,
  })
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.linhas)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  // A normalização mora na lib, e não aqui, porque o motor de conferência lê a
  // mesma coisa: se as duas pontas normalizassem por conta própria, um dia uma
  // acentuação diferente faria a régua deixar de casar com o serviço.
  const itens = lerLinhas(body.linhas)

  // Envio vazio não apaga a tabela que existe. Uma planilha sem a aba (robô
  // antigo, ou coleta do 0033 que falhou naquela madrugada) chegaria aqui como
  // lista vazia — e apagar a régua por causa disso deixaria a conferência cega
  // sem ninguém entender por quê.
  if (!itens.length) {
    return NextResponse.json({ ok: true, ignorado: true, total: 0,
      aviso: 'Nenhuma linha de preço reconhecida; a tabela anterior foi mantida.' })
  }

  const { error } = await supabaseAdmin.from('salao_config').upsert(
    { salao_id: sess.salaoId, chave: CHAVE, valor: { itens }, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, total: itens.length })
}
