import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { arquivosDosCandidatos, excluirArquivos, lerConfigCurriculos } from '@/lib/crmCurriculos'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Peso dos arquivos de candidatos em TODOS os salões, e a limpeza geral.
// Só o master. Apagar remove o arquivo do armazenamento; a conversa fica, com
// a mensagem "[arquivo removido]". Nunca toca em arquivo que não seja de
// candidato (a lista vem de arquivosDosCandidatos).

async function master() {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  return p && p.role === 'master' ? p : null
}

export async function GET() {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: saloes } = await supabaseAdmin.from('saloes').select('id, nome, is_modelo')
  const linhas: any[] = []
  for (const s of (saloes || []) as any[]) {
    try {
      const { itens, bytes } = await arquivosDosCandidatos(s.id)
      const cfg = await lerConfigCurriculos(s.id)
      const maisAntigo = itens.length ? itens[itens.length - 1].criado_em : null
      linhas.push({ id: s.id, nome: s.nome, modelo: !!s.is_modelo, arquivos: itens.length, bytes, mais_antigo: maisAntigo, limpeza: cfg.limpeza })
    } catch { /* salão com problema não derruba a tela */ }
  }
  linhas.sort((a, b) => b.bytes - a.bytes)
  return NextResponse.json({
    saloes: linhas,
    total_bytes: linhas.reduce((t, l) => t + l.bytes, 0),
    total_arquivos: linhas.reduce((t, l) => t + l.arquivos, 0),
  })
}

// { salao: '<id>' | 'todos', antes_de_dias?: N }  -- sem antes_de_dias apaga TUDO de candidatos.
export async function POST(req: NextRequest) {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const dias = Number(body?.antes_de_dias) || undefined
  let alvo: string[] = []
  if (body?.salao === 'todos') {
    const { data } = await supabaseAdmin.from('saloes').select('id')
    alvo = (data || []).map((s: any) => s.id)
  } else if (body?.salao) {
    alvo = [String(body.salao)]
  }
  if (!alvo.length) return NextResponse.json({ error: 'Escolha o salão.' }, { status: 400 })

  let removidos = 0, bytes = 0
  for (const id of alvo) {
    const r = await excluirArquivos(id, [], dias, !dias)   // sem prazo = tudo
    removidos += r.removidos; bytes += r.bytes
  }
  return NextResponse.json({ ok: true, removidos, bytes })
}
