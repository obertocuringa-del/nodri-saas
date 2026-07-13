import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { limparCacheAtendimentos } from '@/lib/atendimentosCache'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

function safeNum(v: any): number { const n = Number(v); return isNaN(n) ? 0 : n }
function safeStr(v: any): string { if (v === null || v === undefined) return ''; return String(v).trim() }

export async function POST(req: NextRequest) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { rows, periodos_para_limpar, ultimo_chunk } = await req.json()

    // Limpa os períodos antes de inserir (só no primeiro chunk)
    if (periodos_para_limpar?.length) {
      for (const { ano, mes } of periodos_para_limpar) {
        await supabaseAdmin.from('atendimentos_raw')
          .delete().eq('salao_id', salaoId).eq('ano', ano).eq('mes', mes)
      }
    }

    if (rows?.length) {
      const chunk = rows.map((r: any) => ({
        salao_id:     salaoId,
        ano:          safeNum(r.ano),
        mes:          safeNum(r.mes),
        profissional: safeStr(r.profissional),
        data_comanda: safeStr(r.data_comanda),
        dia_semana:   safeStr(r.dia_semana),
        num_comanda:  safeStr(r.num_comanda),
        servico:      safeStr(r.servico),
        categoria:    safeStr(r.categoria),
        cliente:      safeStr(r.cliente),
        cpf:          safeStr(r.cpf),
        telefone:     safeStr(r.telefone),
        celular:      safeStr(r.celular),
        qtd:          safeNum(r.qtd),
        valor:        safeNum(r.valor),
        desconto:     safeNum(r.desconto),
        total:        safeNum(r.total),
        pacote:       safeStr(r.pacote),
      }))
      await supabaseAdmin.from('atendimentos_raw').insert(chunk)
    }

    // Dados brutos mudaram → invalida o cache de leitura.
    limparCacheAtendimentos(salaoId)

    return NextResponse.json({ ok: true, salvos: rows?.length || 0, ultimo_chunk })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
