import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, escritaBloqueadaSub } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * Habilitar profissionais A PARTIR do serviço, e não só do perfil de cada uma.
 *
 * O caminho existente é pelo avesso do trabalho real: cadastrou um serviço
 * novo, e para dizer quem faz é preciso abrir profissional por profissional e
 * procurar o serviço no meio da lista de 135. Com dez manicures, são dez
 * telas para uma decisão só — e por isso serviço novo ficava meses sem
 * ninguém habilitado.
 *
 * A habilitação continua morando onde sempre morou: `servicos_habilitados` na
 * profissional. Isto aqui não é um cadastro paralelo, é a mesma lista escrita
 * pelo outro lado. O que a tela do perfil mostra continua sendo a verdade.
 */

/** Ids já gravados, tolerando o que veio torto do banco. */
function idsDe(v: any): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean)
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p.map(String) : [] } catch { return [] }
  }
  return []
}

export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const servicoId = new URL(req.url).searchParams.get('servicoId') || ''

  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, cargo, ativo, is_departamento, servicos_habilitados')
    .eq('salao_id', sess.salaoId)
    .order('apelido')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Setor não faz serviço: ele não tem agenda nem comissão, e apareceria no
  // meio das profissionais como se fizesse.
  const profissionais = (data || [])
    .filter((p: any) => !p.is_departamento && p.ativo !== false)
    .map((p: any) => ({
      id: String(p.id),
      nome: p.apelido || p.nome_completo || 'Profissional',
      cargo: p.cargo || '',
      habilitado: servicoId ? idsDe(p.servicos_habilitados).includes(servicoId) : false,
    }))

  return NextResponse.json({ profissionais })
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const servicoId = String(body?.servicoId || '')
  const marcados = new Set((Array.isArray(body?.profissionais) ? body.profissionais : []).map(String))
  if (!servicoId) return NextResponse.json({ error: 'Serviço não informado' }, { status: 400 })

  // O serviço tem de ser deste salão. Sem esta linha, um id de fora entraria
  // na lista de habilitados de gente daqui.
  const { data: servico } = await supabaseAdmin
    .from('salao_servicos').select('id, nome')
    .eq('id', servicoId).eq('salao_id', sess.salaoId).maybeSingle()
  if (!servico) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })

  const { data: profs, error } = await supabaseAdmin
    .from('profissionais')
    .select('id, servicos_habilitados')
    .eq('salao_id', sess.salaoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let habilitou = 0, desabilitou = 0
  for (const p of (profs || []) as any[]) {
    const id = String(p.id)
    const atuais = idsDe(p.servicos_habilitados)
    const tem = atuais.includes(servicoId)
    const quer = marcados.has(id)
    if (tem === quer) continue

    // Grava a lista inteira de volta, mas mexendo SÓ neste serviço: os outros
    // saem daqui exatamente como entraram. Escrever a lista que a tela mandou
    // apagaria habilitações que ela nem sabia que existiam.
    const nova = quer ? [...atuais, servicoId] : atuais.filter(x => x !== servicoId)
    const { error: e2 } = await supabaseAdmin
      .from('profissionais')
      .update({ servicos_habilitados: nova })
      .eq('id', id).eq('salao_id', sess.salaoId)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    if (quer) habilitou++; else desabilitou++
  }

  if (habilitou || desabilitou) {
    registrarAuditoria('Editou', 'Profissionais do serviço',
      (servico as any).nome + ': +' + habilitou + ' / -' + desabilitou)
  }
  return NextResponse.json({ ok: true, habilitou, desabilitou })
}
