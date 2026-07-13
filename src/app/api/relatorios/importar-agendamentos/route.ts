import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

function safeStr(v: any): string { if (v === null || v === undefined) return ''; return String(v).trim() }
function safeNum(v: any): number { const n = Number(v); return isNaN(n) ? 0 : n }

export async function POST(req: NextRequest) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { rows, periodos_para_limpar } = await req.json()

    if (periodos_para_limpar?.length) {
      for (const { ano, mes } of periodos_para_limpar) {
        await supabaseAdmin.from('agendamentos_raw')
          .delete().eq('salao_id', salaoId).eq('ano', ano).eq('mes', mes)
      }
    }

    if (rows?.length) {
      const chunk = rows.map((r: any) => ({
        salao_id:    salaoId,
        ano:         safeNum(r.ano),
        mes:         safeNum(r.mes),
        data_reserva: safeStr(r.data_reserva),
        hora:        safeStr(r.hora),
        cliente:     safeStr(r.cliente),
        celular:     safeStr(r.celular),
        profissional: safeStr(r.profissional),
        servico:     safeStr(r.servico),
        status:      safeStr(r.status),
        observacao:  safeStr(r.observacao),
      }))
      await supabaseAdmin.from('agendamentos_raw').insert(chunk)
    }

    return NextResponse.json({ ok: true, salvos: rows?.length || 0 })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
