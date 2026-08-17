import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { compararComModelo, ehChaveDoModelo, mesclarComExistente, regraDaChave, sanitizar, temConteudo, versaoDoModelo } from '@/lib/modeloSalao'
import { copiarMoldesDeTabelas } from '@/lib/modeloTabelas'

/** Setores são linhas de `profissionais` — conta para saber se faltam. */
async function totalSetores(salaoId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('profissionais').select('id', { count: 'exact', head: true })
    .eq('salao_id', salaoId).eq('is_departamento', true)
  return count || 0
}

// ETAPA 3 — o modelo PROPÕE, o salão DECIDE.
//
// O salão nunca é sobrescrito sozinho: aqui ele consulta se há atualização
// da estrutura e, se quiser, aplica. Aplicar ACRESCENTA o que é novo e
// atualiza o que ele nunca personalizou — nunca apaga o que ele criou.

async function linhas(salaoId: string) {
  const { data } = await supabaseAdmin.from('salao_config').select('chave, valor, atualizado_em').eq('salao_id', salaoId)
  return (data || []) as { chave: string; valor: any; atualizado_em?: string | null }[]
}

// GET — tem novidade? o que muda?
//
// `?tudo=1` responde MESMO quando a versão já foi vista. É o que sustenta a
// tela "Atualizações do sistema": quem clicou no X sem querer (ou mudou de
// ideia depois) precisa de um lugar para achar a atualização de novo — antes
// ela sumia para sempre naquela versão.
export async function GET(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const verTudo = new URL(req.url).searchParams.get('tudo') === '1'

  const { data: mod } = await supabaseAdmin.from('saloes').select('id, nome').eq('is_modelo', true).maybeSingle()
  if (!mod || (mod as any).id === sess.salaoId) return NextResponse.json({ temAtualizacao: false })

  const { data: meu } = await supabaseAdmin
    .from('saloes').select('modelo_versao, modelo_aplicado_em').eq('id', sess.salaoId).maybeSingle()

  const doModelo = await linhas((mod as any).id)
  const versao = versaoDoModelo(doModelo)

  // Os SETORES não moram em salao_config: se o salão está sem eles e o
  // modelo tem, há atualização pendente mesmo com a versão batendo — foi
  // o que aconteceu com quem aplicou antes desta parte existir.
  const faltamSetores = (await totalSetores(sess.salaoId)) === 0 && (await totalSetores((mod as any).id)) > 0

  if (versao === (meu as any)?.modelo_versao && !faltamSetores && !verTudo) {
    return NextResponse.json({ temAtualizacao: false, versao })
  }

  const diferencas = compararComModelo(doModelo, await linhas(sess.salaoId))
  const novos = diferencas.filter(d => d.situacao === 'novo').map(d => ({ chave: d.chave, rotulo: d.rotulo }))
  if (faltamSetores) novos.unshift({ chave: '__moldes__', rotulo: 'Setores, serviços e formulários de feedback' })

  return NextResponse.json({
    temAtualizacao: novos.length > 0 || diferencas.length > 0,
    versao,
    // `jaVista` distingue "novidade que acabou de sair" de "novidade que você
    // já dispensou" — a tela de atualizações usa isso no texto.
    jaVista: versao === (meu as any)?.modelo_versao,
    aplicadoEm: (meu as any)?.modelo_aplicado_em || null,
    novos,
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

  // Moldes que vivem em tabelas próprias (setores, serviços, feedback).
  // É idempotente: se o salão já tem, não duplica.
  let moldes: { tabela: string; copiados: number }[] = []
  try {
    const { data: eu } = await supabaseAdmin.from('saloes').select('nome').eq('id', sess.salaoId).maybeSingle()
    moldes = await copiarMoldesDeTabelas((mod as any).id, sess.salaoId, (eu as any)?.nome || 'salao')
  } catch { /* segue com o salao_config */ }

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
    return NextResponse.json({ ok: true, aplicadas: 0, moldes })
  }

  const mapaModelo = new Map(doModelo.map(l => [l.chave, l.valor]))
  const mapaSalao = new Map(doSalao.map(l => [l.chave, l.valor]))
  const linhasNovas = alvo
    .filter(ehChaveDoModelo)
    // Cinto e suspensório: página VAZIA do modelo nunca é gravada por cima de
    // uma que o salão já tem. Página do modelo COM conteúdo pode entrar — o
    // que ela faz lá embaixo é mesclar, nunca apagar.
    .filter(chave => {
      const r = regraDaChave(chave)
      if (r?.como !== 'gradeVazia' || !mapaSalao.has(chave)) return true
      return temConteudo(sanitizar(chave, mapaModelo.get(chave)))
    })
    .map(chave => ({
      salao_id: sess.salaoId,
      chave,
      // Página que já existe aqui é sempre MESCLADA: entra o que é novo, fica
      // o que é do salão. Não há caminho que substitua — nem pedindo à mão.
      valor: mesclarComExistente(chave, sanitizar(chave, mapaModelo.get(chave)), mapaSalao.get(chave)),
      atualizado_em: agora,
    }))

  // ── Antes de gravar: guarda o que existe hoje ────────────────────────────
  //
  // Só das páginas que JÁ EXISTEM e vão ser substituídas — página nova não tem
  // versão anterior para guardar. É esta cópia que permite desfazer depois; sem
  // ela, "atualizar" era uma decisão sem volta.
  const lote = `modelo-${Date.now()}`
  const paraGuardar = linhasNovas
    .filter(l => mapaSalao.has(l.chave))
    .map(l => ({
      salao_id: sess.salaoId, chave: l.chave, valor: mapaSalao.get(l.chave) ?? null,
      lote, motivo: 'Substituída ao aplicar atualização do modelo',
    }))
  if (paraGuardar.length) {
    // Falhar aqui NÃO impede a atualização (a tabela pode ainda não existir),
    // mas fica registrado — sem isso, o desfazer sumiria em silêncio.
    const { error: erroHist } = await supabaseAdmin.from('salao_config_historico').insert(paraGuardar)
    if (erroHist) console.error('Histórico do modelo não gravou:', erroHist.message)
  }

  const { error } = await supabaseAdmin.from('salao_config').upsert(linhasNovas, { onConflict: 'salao_id,chave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('saloes')
    .update({ modelo_versao: versao, modelo_aplicado_em: agora }).eq('id', sess.salaoId)

  return NextResponse.json({
    ok: true,
    aplicadas: linhasNovas.length,
    substituidas: paraGuardar.length,
    lote: paraGuardar.length ? lote : null,
    moldes,
    chaves: linhasNovas.map(l => ({ chave: l.chave, rotulo: regraDaChave(l.chave)?.rotulo || l.chave })),
  })
}

// DELETE — desfaz a última atualização (ou o lote informado).
//
// Devolve às páginas o conteúdo que elas tinham no instante anterior à
// substituição. O que a atualização apenas ACRESCENTOU (página que o salão não
// tinha) continua lá: desfazer não é apagar novidade, é recuperar o que era
// seu e foi trocado.
export async function DELETE(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const loteParam = new URL(req.url).searchParams.get('lote')

  let q = supabaseAdmin.from('salao_config_historico')
    .select('chave, valor, lote, criado_em')
    .eq('salao_id', sess.salaoId)
    .order('criado_em', { ascending: false })
  if (loteParam) q = q.eq('lote', loteParam)

  const { data, error } = await q.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ ok: true, restauradas: 0, aviso: 'Não há atualização para desfazer' })

  const lote = loteParam || (data[0] as any).lote
  const doLote = data.filter((l: any) => l.lote === lote)

  const agora = new Date().toISOString()
  const { error: erroVolta } = await supabaseAdmin.from('salao_config').upsert(
    doLote.map((l: any) => ({ salao_id: sess.salaoId, chave: l.chave, valor: l.valor, atualizado_em: agora })),
    { onConflict: 'salao_id,chave' },
  )
  if (erroVolta) return NextResponse.json({ error: erroVolta.message }, { status: 500 })

  // Consumido o lote, ele sai do histórico — senão o botão "desfazer"
  // continuaria oferecendo voltar para o mesmo ponto para sempre.
  await supabaseAdmin.from('salao_config_historico').delete().eq('salao_id', sess.salaoId).eq('lote', lote)

  return NextResponse.json({ ok: true, restauradas: doLote.length, lote })
}
