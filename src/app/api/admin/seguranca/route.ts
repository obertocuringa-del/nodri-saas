import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// VERIFICAÇÃO DE AMBIENTE (auditoria)
//
// Diz se cada segredo está configurado — NUNCA o valor, nem parte dele.
// Existe porque a auditoria encontrou fallbacks embutidos no código: sem
// saber se a variável está definida em produção, remover o fallback poderia
// derrubar o sistema. Isto tira a decisão do escuro.
//
// Só o master vê.

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const definido = (nome: string) => !!(process.env[nome] || '').trim()

  // Só reporta presença e tamanho — tamanho ajuda a flagrar valor de teste
  // (um segredo de 8 caracteres é fraco) sem revelar o conteúdo.
  const forca = (nome: string) => {
    const v = (process.env[nome] || '').trim()
    if (!v) return 'AUSENTE'
    if (v.length < 32) return `FRACO (${v.length} caracteres — use 32+)`
    return `ok (${v.length} caracteres)`
  }

  // A tabela do limitador de tentativas já existe?
  let tabelaTentativas = 'NECESSITA VERIFICAÇÃO'
  try {
    const { error } = await supabaseAdmin
      .from('tentativas_acesso').select('id', { count: 'exact', head: true })
    tabelaTentativas = error ? 'AUSENTE — rode sql_seguranca.sql' : 'ok'
  } catch { tabelaTentativas = 'AUSENTE — rode sql_seguranca.sql' }

  const jwtOk = definido('JWT_SECRET')

  return NextResponse.json({
    ambiente: process.env.NODE_ENV,
    segredos: {
      JWT_SECRET: forca('JWT_SECRET'),
      SUPABASE_SERVICE_ROLE_KEY: definido('SUPABASE_SERVICE_ROLE_KEY') ? 'ok' : 'AUSENTE',
      CRON_SECRET: forca('CRON_SECRET'),
      ANTHROPIC_API_KEY: definido('ANTHROPIC_API_KEY') ? 'ok' : 'ausente (IA desligada)',
      RESEND_API_KEY: definido('RESEND_API_KEY') ? 'ok' : 'ausente (e-mail desligado)',
      MP_ACCESS_TOKEN: definido('MP_ACCESS_TOKEN') ? 'ok' : 'ausente (pagamento desligado)',
    },
    tabelaTentativas,
    // O que trava a remoção do fallback do JWT (SEC-001)
    podeRemoverFallbackJWT: jwtOk,
    alerta: jwtOk
      ? null
      : 'JWT_SECRET NÃO ESTÁ DEFINIDO. O sistema está assinando sessões com o fallback que está no código-fonte — qualquer pessoa com acesso ao repositório forja um token de master. Configure a variável no Vercel (Production, Preview e Development) ANTES de qualquer outra coisa.',
  })
}
