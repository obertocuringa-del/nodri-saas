import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sincronizar } from '@/lib/cuponsIndicacao'

export const dynamic = 'force-dynamic'
export const maxDuration = 100

// ── Cupom de indicação: cruzar com o que o Avec trouxe ──────────────────────
//
// Duas contas que ninguém deveria precisar fazer à mão:
//
//  a) conferir contra a comanda quem a recepção validou. O crédito já nasceu
//     no balcão, com a cliente na frente dela; aqui só se checa. Quem
//     apareceu vira confirmada, quem validou e foi embora sem se atender
//     perde o crédito depois do prazo;
//  b) a dona foi ao salão tendo saldo → o crédito é baixado, mesmo que a
//     recepção tenha esquecido de marcar.
//
// A (b) é o pedido literal do dono: "pode acontecer da recepção não marcar e
// ela ficar como se não tivesse usado". Marcar à mão é justamente o passo que
// não acontece -- a Central e o vigia já provaram isso aqui.
//
// A rota de validação também chama `sincronizar` sob demanda. Este cron é a
// segunda perna: o salão que passa o mês sem abrir a tela continua com a
// contagem certa.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Só os salões que têm cupom. Varrer a base inteira faria o servidor de um
  // núcleo trabalhar por nada -- a maioria não usa indicação.
  const { data: comCupom } = await supabaseAdmin
    .from('cupom_indicacao').select('salao_id').limit(5000)
  const saloes = [...new Set((comCupom || []).map((r: any) => r.salao_id))]

  const resultado: Record<string, { confirmadas: number; revogadas: number; creditosBaixados: number }> = {}
  for (const salaoId of saloes) {
    try {
      resultado[salaoId] = await sincronizar(salaoId)
    } catch {
      // Um salão com dado torto não pode parar a fila dos outros.
    }
  }

  const soma = Object.values(resultado).reduce(
    (s, r) => ({
      confirmadas: s.confirmadas + r.confirmadas,
      revogadas: s.revogadas + r.revogadas,
      creditosBaixados: s.creditosBaixados + r.creditosBaixados,
    }),
    { confirmadas: 0, revogadas: 0, creditosBaixados: 0 },
  )
  return NextResponse.json({ ok: true, saloes: saloes.length, ...soma })
}
