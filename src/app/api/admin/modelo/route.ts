import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CHAVES_MODELO, NUNCA_COPIA, ehChaveDoModelo, regraDaChave, sanitizar, versaoDoModelo, marcarOrigem } from '@/lib/modeloSalao'
import { copiarMoldesDeTabelas } from '@/lib/modeloTabelas'

// Painel master: define qual salão é o MODELO e alimenta ele a partir de um
// salão já maduro (o Rouge, hoje). Só estrutura viaja — ver lib/modeloSalao.

async function master() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload && payload.role === 'master' ? payload : null
}

async function configDoSalao(salaoId: string) {
  const { data } = await supabaseAdmin.from('salao_config').select('chave, valor, atualizado_em').eq('salao_id', salaoId)
  return (data || []) as { chave: string; valor: any; atualizado_em?: string | null }[]
}

// GET — quem é o modelo, o que ele já tem e o que dá para importar
export async function GET(req: NextRequest) {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: saloes } = await supabaseAdmin
    .from('saloes').select('id, nome, is_modelo, modelo_versao, modelo_aplicado_em').order('nome')
  const lista = (saloes || []) as any[]
  const modelo = lista.find(s => s.is_modelo) || null

  let chavesDoModelo: string[] = []
  let versao = ''
  if (modelo) {
    const cfg = await configDoSalao(modelo.id)
    chavesDoModelo = cfg.filter(c => ehChaveDoModelo(c.chave)).map(c => c.chave).sort()
    versao = versaoDoModelo(cfg)
  }

  // O que um salão de origem tem e o modelo não tem (para o botão Importar)
  const origemId = new URL(req.url).searchParams.get('origem') || ''
  let faltando: { chave: string; rotulo: string }[] = []
  let ignorado: string[] = []
  if (origemId && modelo) {
    const cfg = await configDoSalao(origemId)
    const jaTem = new Set(chavesDoModelo)
    for (const c of cfg) {
      const r = regraDaChave(c.chave)
      if (!r) { ignorado.push(c.chave); continue }
      if (!jaTem.has(c.chave)) faltando.push({ chave: c.chave, rotulo: r.rotulo })
    }
    faltando.sort((a, b) => a.chave.localeCompare(b.chave))
    ignorado.sort()
  }

  // Sugestão de configuração automática — evita errar na escolha manual.
  // Modelo: o salão que se chama "modelo". Origem: o salão com mais
  // estrutura montada (na prática, o mais maduro).
  const sugestao = await sugerir(lista, modelo)

  return NextResponse.json({
    modelo: modelo ? { id: modelo.id, nome: modelo.nome } : null,
    versao,
    chavesDoModelo,
    saloes: lista.map(s => ({ id: s.id, nome: s.nome, is_modelo: s.is_modelo, modelo_versao: s.modelo_versao, modelo_aplicado_em: s.modelo_aplicado_em })),
    faltando,
    ignorado,               // ficou de fora por ser preenchimento do salão
    sugestao,
    regras: CHAVES_MODELO.map(c => ({ chave: c.chave + (c.prefixo ? '*' : ''), rotulo: c.rotulo })),
    nuncaCopia: NUNCA_COPIA,
  })
}

/** Quem deveria ser o modelo e de onde puxar — só palpite, quem confirma é o master. */
async function sugerir(lista: any[], modeloAtual: any) {
  const { data } = await supabaseAdmin.from('salao_config').select('salao_id, chave')
  const porSalao = new Map<string, number>()
  for (const l of (data || []) as any[]) {
    if (ehChaveDoModelo(l.chave)) porSalao.set(l.salao_id, (porSalao.get(l.salao_id) || 0) + 1)
  }
  const alvo = modeloAtual || lista.find(s => /modelo/i.test(s.nome || ''))
  // origem = o salão com mais estrutura, tirando o próprio modelo
  const candidatos = lista
    .filter(s => s.id !== alvo?.id)
    .map(s => ({ id: s.id, nome: s.nome, itens: porSalao.get(s.id) || 0 }))
    .sort((a, b) => b.itens - a.itens)
  const origem = candidatos[0] && candidatos[0].itens > 0 ? candidatos[0] : null
  if (!alvo || !origem) return null
  return {
    modelo: { id: alvo.id, nome: alvo.nome, itens: porSalao.get(alvo.id) || 0 },
    origem,
    jaEhModelo: !!modeloAtual,
  }
}

// POST — ações do painel
//  { acao: 'definir', salaoId }            → marca o salão como modelo
//  { acao: 'importar', origemId, chaves? } → traz do salão de origem para o
//                                            modelo SÓ o que o modelo não tem
export async function POST(req: NextRequest) {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const acao = String(body?.acao || '')

  if (acao === 'definir') {
    const salaoId = String(body?.salaoId || '')
    if (!salaoId) return NextResponse.json({ error: 'Informe o salão' }, { status: 400 })
    // só um modelo por vez (o índice único no banco também garante)
    await supabaseAdmin.from('saloes').update({ is_modelo: false }).eq('is_modelo', true)
    const { error } = await supabaseAdmin.from('saloes').update({ is_modelo: true }).eq('id', salaoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Configuração em um passo só: marca o modelo E importa a estrutura da
  // origem, na ordem certa. É o mesmo que fazer 'definir' + 'importar', mas
  // sem chance de inverter a ordem ou escolher errado.
  if (acao === 'configurar') {
    const modeloId = String(body?.modeloId || '')
    const origemId = String(body?.origemId || '')
    if (!modeloId || !origemId) return NextResponse.json({ error: 'Informe o modelo e a origem' }, { status: 400 })
    if (modeloId === origemId) return NextResponse.json({ error: 'A origem não pode ser o próprio modelo' }, { status: 400 })

    await supabaseAdmin.from('saloes').update({ is_modelo: false }).eq('is_modelo', true)
    const { error: e1 } = await supabaseAdmin.from('saloes').update({ is_modelo: true }).eq('id', modeloId)
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

    const r = await copiarParaModelo(modeloId, origemId, null)
    if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 500 })
    return NextResponse.json({ ok: true, ...r })
  }

  if (acao === 'importar') {
    const origemId = String(body?.origemId || '')
    if (!origemId) return NextResponse.json({ error: 'Informe o salão de origem' }, { status: 400 })

    const { data: mod } = await supabaseAdmin.from('saloes').select('id').eq('is_modelo', true).maybeSingle()
    if (!mod) return NextResponse.json({ error: 'Nenhum salão está marcado como modelo' }, { status: 400 })
    if ((mod as any).id === origemId) return NextResponse.json({ error: 'A origem não pode ser o próprio modelo' }, { status: 400 })

    const pedidas: string[] | null = Array.isArray(body?.chaves) && body.chaves.length ? body.chaves.map(String) : null
    const r = await copiarParaModelo((mod as any).id, origemId, pedidas)
    if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 500 })
    return NextResponse.json({ ok: true, ...r })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}

/**
 * Traz da origem para o modelo SÓ o que o modelo ainda não tem, já sanitizado.
 * Nunca sobrescreve o que foi montado no modelo.
 */
async function copiarParaModelo(modeloId: string, origemId: string, pedidas: string[] | null) {
  // Moldes que vivem em tabelas próprias (setores, serviços, feedback).
  // São idempotentes: rodar de novo não duplica.
  let moldes: { tabela: string; copiados: number }[] = []
  try {
    const { data: m } = await supabaseAdmin.from('saloes').select('nome').eq('id', modeloId).maybeSingle()
    moldes = await copiarMoldesDeTabelas(origemId, modeloId, (m as any)?.nome || 'modelo')
  } catch { /* segue com o salao_config */ }

  const cfgOrigem = await configDoSalao(origemId)
  const cfgModelo = await configDoSalao(modeloId)
  const jaTem = new Set(cfgModelo.map(c => c.chave))

  const novas = cfgOrigem.filter(c =>
    ehChaveDoModelo(c.chave) && !jaTem.has(c.chave) && (!pedidas || pedidas.includes(c.chave)))
  if (!novas.length) return { copiadas: 0, chaves: [] as string[], moldes }

  const agora = new Date().toISOString()
  const linhas = novas.map(c => ({
    salao_id: modeloId,
    chave: c.chave,
    valor: marcarOrigem(sanitizar(c.chave, c.valor)),   // estrutura sim, preenchimento não
    atualizado_em: agora,
  }))
  const { error } = await supabaseAdmin.from('salao_config').upsert(linhas, { onConflict: 'salao_id,chave' })
  if (error) return { erro: error.message }
  return { copiadas: linhas.length, chaves: linhas.map(l => l.chave), moldes }
}
