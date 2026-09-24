import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Limpeza da mídia antiga do CRM ──────────────────────────────────────────
//
// Foto, áudio e documento que a cliente manda no WhatsApp ficam no bucket
// `uploads`, em `crm/<salao>/<hora>_<nome>`. Nada nunca saía de lá.
//
// Com poucos salões isso não aparece: em 24/09/2026 eram 36 MB no total. Mas
// o arquivo entra e nunca sai, então o espaço só cresce -- e a conta é por
// salão. Com cinquenta salões ativos são uns 10 GB por mês; em um ano estoura
// os 100 GB que o plano inclui, e aí o problema não é mais só custo: o
// Supabase passa a recusar upload novo.
//
// ── Por que 90 dias, e não 7 ────────────────────────────────────────────────
//
// O que some aqui é o ARQUIVO; a mensagem, a conversa e o histórico ficam.
// Mas a cliente que mandou foto de referência e volta duas semanas depois
// esperando que a recepção veja aquela foto de novo é caso REAL, e 7 dias
// deixaria a recepção sem ela na segunda visita. 90 dias cobre a temporada
// inteira de um salão e ainda estabiliza o espaço em torno de 30 GB.
//
// Ajustável por variável de ambiente sem precisar de deploy.
const DIAS = Number(process.env.CRM_MIDIA_DIAS || 90)

// Teto por volta: o Storage apaga em lote e uma lista gigante trava a chamada.
// O que sobrar sai na volta de amanhã -- a limpeza não precisa terminar hoje.
const POR_VOLTA = 500

export async function GET() {
  if (!Number.isFinite(DIAS) || DIAS < 7) {
    return NextResponse.json({ ok: false, erro: 'CRM_MIDIA_DIAS abaixo do mínimo de 7' }, { status: 200 })
  }

  const limite = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString()

  // A lista vem da tabela do próprio Storage: é a única fonte que sabe a data
  // de cada arquivo. `name` aqui é o caminho dentro do bucket.
  const { data: antigos, error: erroLista } = await supabaseAdmin
    .schema('storage')
    .from('objects')
    .select('name')
    .eq('bucket_id', 'uploads')
    .like('name', 'crm/%')
    .lt('created_at', limite)
    .limit(POR_VOLTA)

  if (erroLista) {
    return NextResponse.json({ ok: false, erro: erroLista.message }, { status: 200 })
  }
  if (!antigos?.length) {
    return NextResponse.json({ ok: true, apagados: 0, dias: DIAS })
  }

  const caminhos = antigos.map(o => o.name as string)
  const { error: erroApagar } = await supabaseAdmin.storage.from('uploads').remove(caminhos)
  if (erroApagar) {
    return NextResponse.json({ ok: false, erro: erroApagar.message }, { status: 200 })
  }

  // A mensagem continua na conversa; só o ponteiro para o arquivo sai, senão a
  // tela tentaria carregar uma foto que não existe mais e mostraria um quadro
  // quebrado. O texto que acompanhava a mídia é preservado.
  await supabaseAdmin
    .from('crm_mensagens')
    .update({ midia_url: null })
    .in('midia_url', caminhos.map(c =>
      supabaseAdmin.storage.from('uploads').getPublicUrl(c).data.publicUrl))

  return NextResponse.json({ ok: true, apagados: caminhos.length, dias: DIAS })
}
