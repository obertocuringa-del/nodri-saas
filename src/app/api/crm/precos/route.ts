import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import type { LinhaProduto } from '@/lib/produtosDia'

export const dynamic = 'force-dynamic'

// ── Preços para responder na hora ───────────────────────────────────────────
//
// "Quanto custa?" é a pergunta mais feita e a mais cara de responder errado.
// Recepção que decora preço erra; recepção que vai procurar demora; e preço
// errado dito por escrito no WhatsApp vira discussão no caixa.
//
// Então o preço vem do lugar onde ele já é mantido. E "o lugar" é diferente
// para serviço e para produto:
//
//   SERVIÇO  → salao_servicos, a MESMA tabela que a vitrine pública mostra em
//              "Tabela de preços". Mexeu lá, mudou aqui no mesmo instante, e
//              o que o cliente lê no link é o que a recepção manda no zap.
//
//   PRODUTO  → o relatório de PRODUTOS VENDIDOS (0041), não o catálogo da
//              calculadora. O catálogo guarda o que o salão PAGA na embalagem
//              — mandar aquilo para a cliente é mandar o preço de custo. O
//              que a cliente paga só existe no que já foi vendido.

const dinheiro = (v: any) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

// Acento escrito em código com o caractere combinante some no copia-e-cola de
// um editor para outro. Aqui vai a faixa por número, que ninguém apaga sem ver.
const SEM_ACENTO = new RegExp('[\\u0300-\\u036f]', 'g')

const chave = (s: any) =>
  String(s || '').normalize('NFD').replace(SEM_ACENTO, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role === 'profissional') {
    return NextResponse.json({ error: 'O CRM é do salão.' }, { status: 403 })
  }

  const [{ data: servicos }, { data: vendidos }, { data: catalogo }] = await Promise.all([
    supabaseAdmin.from('salao_servicos')
      // A OBSERVAÇÃO vem junto. É ela que evita a discussão no caixa: "a
      // pigmentação varia conforme o produto usado". Mandar o preço sem a
      // ressalva é mandar meia informação — e a metade que falta é justamente
      // a que gera reclamação depois.
      .select('nome, categoria, preco_fixo, preco_min, observacao')
      .eq('salao_id', sess.salaoId).eq('ativo', true)
      .order('categoria').order('nome').limit(1000),
    // Doze folhas mensais bastam: produto que não vende há um ano não é preço
    // que a recepção precisa ter na mão.
    supabaseAdmin.from('salao_config')
      .select('chave, valor')
      .eq('salao_id', sess.salaoId)
      .like('chave', 'produtos_%')
      .order('chave', { ascending: false })
      .limit(12),
    supabaseAdmin.from('produtos_catalogo')
      .select('nome, marca, preco, unidade')
      .eq('salao_id', sess.salaoId)
      .order('marca').order('nome').limit(1000),
  ])

  // ── Serviços ──────────────────────────────────────────────────────────────
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
      observacao: String(s.observacao || '').replace(/\s+/g, ' ').trim() || null,
    })
  }

  // ── Produtos ──────────────────────────────────────────────────────────────
  //
  // O relatório traz o que foi COBRADO em cada comanda, e comanda tem
  // desconto. Por isso o valor que vale é o MAIOR unitário já praticado: o
  // desconto só desce. Dar o menor seria prometer para a próxima cliente o
  // desconto que uma única cliente ganhou.
  type Agregado = {
    nome: string; marca: string | null; unidade: string | null
    preco: number; vezes: number; ultima: string
  }
  const porProduto = new Map<string, Agregado>()

  for (const folha of vendidos || []) {
    const itens: LinhaProduto[] = Array.isArray((folha as any)?.valor?.itens)
      ? (folha as any).valor.itens : []
    for (const l of itens) {
      const nome = String(l?.produto || '').trim()
      if (!nome) continue
      const qtd = Number(l?.qtd) || 1
      // ATENÇÃO: no relatório do Avec, `valor` é o valor da LINHA, não o
      // unitário. Conferido no dia 11/09/2026: bolo, qtd 3, valor 54 — são
      // três de dezoito. Usar `valor` direto colocaria R$ 54,00 num item de
      // R$ 18,00 na resposta para a cliente. E `total` não serve de conferência
      // porque nessa mesma linha veio 162.
      const unitario = dinheiro(Number(l?.valor) / qtd)
      if (!unitario) continue
      const k = chave(nome)
      const atual = porProduto.get(k)
      const data = String(l?.data_venda || '')
      if (!atual) {
        porProduto.set(k, {
          nome,
          marca: String(l?.marca || '').trim() || null,
          unidade: null,
          preco: unitario,
          vezes: qtd,
          ultima: data,
        })
      } else {
        if (unitario > atual.preco) atual.preco = unitario
        atual.vezes += qtd
        if (!atual.marca && l?.marca) atual.marca = String(l.marca).trim()
        if (data > atual.ultima) atual.ultima = data
      }
    }
  }

  // A unidade (300ml, kit) o relatório do Avec não traz; o catálogo traz.
  // Cruzo pelo nome só para enfeitar o rótulo — o PREÇO nunca vem daqui.
  const unidadePorNome = new Map<string, string>()
  for (const p of catalogo || []) {
    const u = String(p.unidade || '').trim()
    if (u) unidadePorNome.set(chave(p.nome), u)
  }
  for (const a of porProduto.values()) {
    a.unidade = unidadePorNome.get(chave(a.nome)) || null
  }

  const porMarca = new Map<string, any[]>()
  for (const a of porProduto.values()) {
    const marca = a.marca || 'Sem marca'
    if (!porMarca.has(marca)) porMarca.set(marca, [])
    porMarca.get(marca)!.push({
      nome: a.nome, preco: a.preco, unidade: a.unidade, vezes: a.vezes,
    })
  }

  // Salão que ainda não importou produto vendido não pode ficar com a aba
  // vazia: cai no catálogo, avisando de onde veio.
  let fonteProdutos: 'vendidos' | 'catalogo' | 'vazio' = 'vendidos'
  if (!porMarca.size) {
    fonteProdutos = 'catalogo'
    for (const p of catalogo || []) {
      const preco = dinheiro(p.preco)
      if (!preco) continue
      const marca = String(p.marca || 'Sem marca').trim() || 'Sem marca'
      if (!porMarca.has(marca)) porMarca.set(marca, [])
      porMarca.get(marca)!.push({ nome: p.nome, preco, unidade: p.unidade || null, vezes: 0 })
    }
    if (!porMarca.size) fonteProdutos = 'vazio'
  }

  const ordenar = (m: Map<string, any[]>, porVenda = false) =>
    [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([grupo, itens]) => ({
        grupo,
        // Dentro da marca, o mais vendido primeiro: é o que mais perguntam.
        itens: porVenda
          ? [...itens].sort((a, b) => (b.vezes - a.vezes) || a.nome.localeCompare(b.nome, 'pt-BR'))
          : itens,
      }))

  return NextResponse.json({
    servicos: ordenar(porCategoria),
    produtos: ordenar(porMarca, true),
    fonteProdutos,
  })
}
