import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

// ─────────────────────────────────────────────────────────────────────────────
// ENVIO DE ARQUIVO GRANDE
//
// A Vercel corta qualquer requisição acima de ~4,5 MB antes de a rota rodar —
// uma tabela de preços em Excel com fotos estoura isso fácil, e o salão via só
// "erro ao enviar arquivo". Aqui o arquivo NÃO passa pelo servidor: devolvemos
// uma URL assinada e o navegador sobe direto para o storage.
//
// O servidor continua sendo quem decide o caminho e quem pode enviar.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const payload = await verifyJWT(token)
  if (!payload?.salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const { nome, tamanho } = await req.json().catch(() => ({ nome: '', tamanho: 0 }))
  if (Number(tamanho) > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande (máx. 50 MB)' }, { status: 400 })
  }

  const safe = String(nome || 'arquivo').replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80)
  const path = `arquivos/${payload.salaoId}/${Date.now()}_${safe}`

  async function assinar() {
    return supabaseAdmin.storage.from('uploads').createSignedUploadUrl(path)
  }

  let { data, error } = await assinar()
  // Bucket ainda não existe (primeiro envio da instalação): cria e tenta de novo
  if (error && /bucket not found/i.test(error.message || '')) {
    await supabaseAdmin.storage.createBucket('uploads', { public: true, fileSizeLimit: 52428800 }).catch(() => { })
    ;({ data, error } = await assinar())
  }
  if (error || !data) return NextResponse.json({ error: error?.message || 'Falhou' }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl, filename: nome || safe })
}
