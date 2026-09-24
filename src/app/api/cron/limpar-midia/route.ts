import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Limpeza da mídia antiga do CRM ──────────────────────────────────────────
//
// Foto, áudio e documento que a cliente manda no WhatsApp ficam no bucket
// `uploads`, em `crm/<salao>/<hora>_<nome>`. Nada nunca saía de lá.
//
// Com poucos salões isso não aparece: em 24/09/2026 eram 36 MB no total. Mas
// o arquivo entra e nunca sai, e a conta é por salão. Com cinquenta salões
// ativos são uns 10 GB por mês; em um ano estoura os 100 GB que o plano
// inclui, e aí o problema deixa de ser custo -- o Supabase passa a recusar
// upload novo e a foto da cliente simplesmente não chega.
//
// ── Por que 90 dias, e não 7 ────────────────────────────────────────────────
//
// O que some aqui é o ARQUIVO; a mensagem, a conversa e o histórico ficam.
// Mas a cliente que mandou foto de referência e volta duas semanas depois
// esperando que a recepção veja aquela foto de novo é caso REAL, e 7 dias
// deixaria a recepção sem ela já na segunda visita. 90 dias cobre a temporada
// inteira e ainda estabiliza o espaço em torno de 30 GB.
//
// Ajustável por variável de ambiente, sem precisar de deploy.
const DIAS = Number(process.env.CRM_MIDIA_DIAS || 90)

// Teto por volta: apagar em lote gigante estoura o tempo da função. O que
// sobrar sai na volta de amanhã -- esta limpeza não precisa terminar hoje.
const POR_VOLTA = 400

// ── Por que a lista vem pela API de Storage, e não por SQL ──────────────────
//
// A data de cada arquivo mora em `storage.objects`, mas o Supabase só expõe o
// schema `public` na API REST: uma consulta a `storage.objects` pelo
// supabase-js falha. A API de Storage é o caminho que funciona -- ela lista
// por pasta, então aqui se percorre `crm/<salao>/` uma a uma.
export async function GET() {
  if (!Number.isFinite(DIAS) || DIAS < 7) {
    return NextResponse.json({ ok: false, erro: 'CRM_MIDIA_DIAS abaixo do mínimo de 7' })
  }

  const limite = Date.now() - DIAS * 24 * 60 * 60 * 1000
  const bucket = supabaseAdmin.storage.from('uploads')

  const { data: pastas, error: erroPastas } = await bucket.list('crm', { limit: 1000 })
  if (erroPastas) return NextResponse.json({ ok: false, erro: erroPastas.message })
  if (!pastas?.length) return NextResponse.json({ ok: true, apagados: 0, dias: DIAS })

  const velhos: string[] = []
  for (const pasta of pastas) {
    if (velhos.length >= POR_VOLTA) break
    // Entrada sem id é pasta (um salão); com id seria arquivo solto na raiz.
    if (pasta.id) continue

    const { data: arquivos } = await bucket.list(`crm/${pasta.name}`, { limit: 1000 })
    for (const a of arquivos || []) {
      if (velhos.length >= POR_VOLTA) break
      const nascido = a.created_at ? Date.parse(a.created_at) : NaN
      if (Number.isFinite(nascido) && nascido < limite) {
        velhos.push(`crm/${pasta.name}/${a.name}`)
      }
    }
  }

  if (!velhos.length) return NextResponse.json({ ok: true, apagados: 0, dias: DIAS })

  const { error: erroApagar } = await bucket.remove(velhos)
  if (erroApagar) return NextResponse.json({ ok: false, erro: erroApagar.message })

  // A mensagem continua na conversa; só o ponteiro para o arquivo sai. Sem
  // isso a tela tentaria carregar uma foto que não existe mais e mostraria um
  // quadro quebrado. O texto que acompanhava a mídia é preservado.
  const urls = velhos.map(c => bucket.getPublicUrl(c).data.publicUrl)
  for (let i = 0; i < urls.length; i += 100) {
    await supabaseAdmin
      .from('crm_mensagens')
      .update({ midia_url: null })
      .in('midia_url', urls.slice(i, i + 100))
  }

  return NextResponse.json({ ok: true, apagados: velhos.length, dias: DIAS })
}
