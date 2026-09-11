import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// ── Preços para responder na hora ───────────────────────────────────────────
//
// "Quanto custa?" é a pergunta mais feita e a mais cara de responder errado.
// Recepção que decora preço erra; recepção que vai procurar demora; e preço
// errado dito por escrito no WhatsApp vira discussão no caixa.
//
// Então o preço vem do lugar onde ele já é mantido — o catálogo de serviços e
// o de produtos do próprio NODRI. Mexeu no catálogo, mudou aqui no mesmo
// instante. Não existe segunda lista para alguém esquecer de atualizar.

const dinheiro = (v: any) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'profissional') {
    return NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 })
  }

  const [{ data: servicos }, { data: produtos }] = await Promise.all([
    supabaseAdmin.from('salao_servicos')
      .select('nome, categoria, preco_fixo, preco_min')
      .eq('salao_id', sess.salaoId).eq('ativo', true)
      .order('categoria').order('nome').limit(1000),
    supabaseAdmin.from('produtos_catalogo')
      .select('nome, marca, preco, unidade')
      .eq('salao_id', sess.salaoId)
      .order('marca').order('nome').limit(1000),
  ])

  // Serviço sem preço não entra: um botão que insere "R$ 0,00" na conversa é
  // pior do que botão nenhum.
  const porCategoria = new Map<string, any[]>()
  for (const s of servicos || []) {
    const preco = dinheiro(s.preco_fixo) ?? dinheiro(s.preco_min)
    if (!preco) continue
    const cat = String(s.categoria || 'Outros').trim() || 'Outros'
    if (!porCategoria.has(cat)) porCategoria.set(cat, [])
    porCategoria.get(cat)!.push({
      nome: s.nome,
      preco,
      // Preço mínimo é "a partir de": dizer o contrário é prometer um valor
      // que o salão não vai cobrar.
      apartir: !dinheiro(s.preco_fixo) && !!dinheiro(s.preco_min),
    })
  }

  const porMarca = new Map<string, any[]>()
  for (const p of produtos || []) {
    const preco = dinheiro(p.preco)
    if (!preco) continue
    const marca = String(p.marca || 'Sem marca').trim() || 'Sem marca'
    if (!porMarca.has(marca)) porMarca.set(marca, [])
    porMarca.get(marca)!.push({ nome: p.nome, preco, unidade: p.unidade || null })
  }

  const ordenar = (m: Map<string, any[]>) =>
    [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([grupo, itens]) => ({ grupo, itens }))

  return NextResponse.json({
    servicos: ordenar(porCategoria),
    produtos: ordenar(porMarca),
  })
}
