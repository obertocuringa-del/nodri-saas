import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { documentoSemNome } from '@/lib/nomeGenerico'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// DEIXAR UMA PÁGINA DO MODELO GENÉRICA
//
// O conteúdo do modelo nasce copiado do salão de verdade e chega com o nome
// dele no meio do texto. Esta rota troca o nome por "salão" — só isso: nada é
// apagado, nada é reescrito, e mexe SÓ no salão MODELO.
//
// Aceita GET para poder ser aberta direto no navegador de quem está logado.
// ─────────────────────────────────────────────────────────────────────────────

const MODELO = '2b2c5cd6-99e6-46a0-b125-7a15d9c79b26'
const DONO = 'b0902527-1199-4b4c-ba3b-eecb51bc61c6'   // quem pode mexer no modelo

async function aplicar(req: NextRequest) {
  const sess = await getSessao()
  const podeMexer = sess && (sess.role === 'master' || sess.salaoId === DONO || sess.salaoId === MODELO)
  if (!podeMexer) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const sp = new URL(req.url).searchParams
  const chave = sp.get('chave') || 'pontos_ebulicao'
  const nome = sp.get('nome') || 'Rouge'
  const simular = sp.get('aplicar') !== '1'

  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', MODELO).eq('chave', `grid_${chave}`).maybeSingle()

  if (!data?.valor) return NextResponse.json({ error: `O modelo não tem nada em ${chave}` }, { status: 404 })

  const { doc, trocas } = documentoSemNome(data.valor, nome)

  if (simular) {
    return NextResponse.json({
      modo: 'simulação — nada foi gravado',
      chave, nome, textosQueMudam: trocas,
      paraAplicar: `${new URL(req.url).pathname}?chave=${chave}&aplicar=1`,
    })
  }

  const { error } = await supabaseAdmin.from('salao_config').upsert({
    salao_id: MODELO,
    chave: `grid_${chave}`,
    valor: doc,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, chave, nome, textosAjustados: trocas, onde: 'somente o salão MODELO' })
}

export const GET = aplicar
export const POST = aplicar
