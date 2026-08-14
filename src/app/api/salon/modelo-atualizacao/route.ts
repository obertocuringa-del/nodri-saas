import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { compararComModelo, ehChaveDoModelo, regraDaChave, sanitizar, versaoDoModelo } from '@/lib/modeloSalao'

// ETAPA 3 — o modelo PROPÕE, o salão DECIDE.
//
// O salão nunca é sobrescrito sozinho: aqui ele consulta se há atualização
// da estrutura e, se quiser, aplica. Aplicar ACRESCENTA o que é novo e
// atualiza o que ele nunca personalizou — nunca apaga o que ele criou.

async function linhas(salaoId: string) {
  const { data } = await supabaseAdmin.from('salao_config').select('chave, valor').eq('salao_id', salaoId)
  return (data || []) as { chave: string; valor: any }[]
}

// GET — tem novidade? o que muda?
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: mod } = await supabaseAdmin.from('saloes').select('id, nome').eq('is_modelo', true).maybeSingle()
  if (!mod || (mod as any).id === sess.salaoId) return NextResponse.json({ temAtualizacao: false })

  const { data: meu } = await supabaseAdmin
    .from('saloes').select('modelo_versao, modelo_aplicado_em').eq('id', sess.salaoId).maybeSingle()

  const doModelo = await linhas((mod as any).id)
  const versao = versaoDoModelo(doModelo)
  if (versao === (meu as any)?.modelo_versao) return NextResponse.json({ temAtualizacao: false, versao })

  const diferencas = compararComModelo(doModelo, await linhas(sess.salaoId))
  return NextResponse.json({
    temAtualizacao: diferencas.length > 0,
    versao,
    aplicadoEm: (meu as any)?.modelo_aplicado_em || null,
    novos: diferencas.filter(d => d.situacao === 'novo'),
    alterados: diferencas.filter(d => d.situacao === 'diferente'),
  })
}

// POST — aplicar
//  { chaves?: string[] }  → aplica só as escolhidas; sem isso, aplica as novas
//  { incluirAlterados?: true } → também atualiza as que existem e diferem
//  { acao: 'ignorar' } → marca a versão como vista, sem mexer em nada
export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  // Só o dono do salão decide (sub-usuário e profissional não aplicam).
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const { data: mod } = await supabaseAdmin.from('saloes').select('id').eq('is_modelo', true).maybeSingle()
  if (!mod) return NextResponse.json({ error: 'Nenhum salão modelo definido' }, { status: 400 })

  const doModelo = await linhas((mod as any).id)
  const versao = versaoDoModelo(doModelo)
  const agora = new Date().toISOString()

  // "Ignorar": só carimba a versão, para o aviso parar de aparecer.
  if (String(body?.acao || '') === 'ignorar') {
    await supabaseAdmin.from('saloes').update({ modelo_versao: versao }).eq('id', sess.salaoId)
    return NextResponse.json({ ok: true, aplicadas: 0 })
  }

  const doSalao = await linhas(sess.salaoId)
  const diferencas = compararComModelo(doModelo, doSalao)
  const pedidas: string[] | null = Array.isArray(body?.chaves) && body.chaves.length ? body.chaves.map(String) : null
  const incluirAlterados = body?.incluirAlterados === true

  const alvo = diferencas.filter(d => {
    if (pedidas) return pedidas.includes(d.chave)
    return d.situacao === 'novo' || incluirAlterados
  }).map(d => d.chave)

  if (!alvo.length) {
    await supabaseAdmin.from('saloes').update({ modelo_versao: versao, modelo_aplicado_em: agora }).eq('id', sess.salaoId)
    return NextResponse.json({ ok: true, aplicadas: 0 })
  }

  const mapaModelo = new Map(doModelo.map(l => [l.chave, l.valor]))
  const linhasNovas = alvo
    .filter(ehChaveDoModelo)
    .map(chave => ({ salao_id: sess.salaoId, chave, valor: sanitizar(chave, mapaModelo.get(chave)), atualizado_em: agora }))

  const { error } = await supabaseAdmin.from('salao_config').upsert(linhasNovas, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('saloes')
    .update({ modelo_versao: versao, modelo_aplicado_em: agora }).eq('id', sess.salaoId)

  return NextResponse.json({
    ok: true,
    aplicadas: linhasNovas.length,
    chaves: linhasNovas.map(l => ({ chave: l.chave, rotulo: regraDaChave(l.chave)?.rotulo || l.chave })),
  })
}
