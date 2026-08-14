import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CHAVES_MODELO, NUNCA_COPIA, ehChaveDoModelo, regraDaChave, sanitizar, versaoDoModelo } from '@/lib/modeloSalao'

// Painel master: define qual salão é o MODELO e alimenta ele a partir de um
// salão já maduro (o Rouge, hoje). Só estrutura viaja — ver lib/modeloSalao.

async function master() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload && payload.role === 'master' ? payload : null
}

async function configDoSalao(salaoId: string) {
  const { data } = await supabaseAdmin.from('salao_config').select('chave, valor').eq('salao_id', salaoId)
  return (data || []) as { chave: string; valor: any }[]
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

  return NextResponse.json({
    modelo: modelo ? { id: modelo.id, nome: modelo.nome } : null,
    versao,
    chavesDoModelo,
    saloes: lista.map(s => ({ id: s.id, nome: s.nome, is_modelo: s.is_modelo, modelo_versao: s.modelo_versao, modelo_aplicado_em: s.modelo_aplicado_em })),
    faltando,
    ignorado,               // ficou de fora por ser preenchimento do salão
    regras: CHAVES_MODELO.map(c => ({ chave: c.chave + (c.prefixo ? '*' : ''), rotulo: c.rotulo })),
    nuncaCopia: NUNCA_COPIA,
  })
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

  if (acao === 'importar') {
    const origemId = String(body?.origemId || '')
    if (!origemId) return NextResponse.json({ error: 'Informe o salão de origem' }, { status: 400 })

    const { data: mod } = await supabaseAdmin.from('saloes').select('id').eq('is_modelo', true).maybeSingle()
    if (!mod) return NextResponse.json({ error: 'Nenhum salão está marcado como modelo' }, { status: 400 })
    if ((mod as any).id === origemId) return NextResponse.json({ error: 'A origem não pode ser o próprio modelo' }, { status: 400 })

    const cfgOrigem = await configDoSalao(origemId)
    const cfgModelo = await configDoSalao((mod as any).id)
    const jaTem = new Set(cfgModelo.map(c => c.chave))
    const pedidas: string[] | null = Array.isArray(body?.chaves) && body.chaves.length ? body.chaves.map(String) : null

    // Só o que FALTA no modelo — nunca sobrescreve o que já foi montado lá.
    const novas = cfgOrigem.filter(c => ehChaveDoModelo(c.chave) && !jaTem.has(c.chave) && (!pedidas || pedidas.includes(c.chave)))
    if (!novas.length) return NextResponse.json({ ok: true, copiadas: 0, chaves: [] })

    const agora = new Date().toISOString()
    const linhas = novas.map(c => ({
      salao_id: (mod as any).id,
      chave: c.chave,
      valor: sanitizar(c.chave, c.valor),   // estrutura sim, preenchimento não
      atualizado_em: agora,
    }))
    const { error } = await supabaseAdmin.from('salao_config').upsert(linhas, { onConflict: 'salao_id,chave' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, copiadas: linhas.length, chaves: linhas.map(l => l.chave) })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
