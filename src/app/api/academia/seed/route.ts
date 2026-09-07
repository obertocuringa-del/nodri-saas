import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { ARTIGOS, sincronizarCatalogo } from '@/lib/academiaCatalogo'

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    if (!payload || payload.role !== 'master') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const r = await sincronizarCatalogo()
    return NextResponse.json({ ok: true, ...r })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ total: ARTIGOS.length, categorias: [...new Set(ARTIGOS.map(a => a.categoria))] })
}
