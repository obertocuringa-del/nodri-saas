import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, escritaBloqueadaSub } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'
import { norm, type PrecoDeTabela } from '@/lib/tabelaPrecos'

export const dynamic = 'force-dynamic'

/**
 * O cadastro de serviços conversando com a TABELA DE PREÇOS do Avec (0033).
 *
 * A tela já avisava o que foi ATENDIDO e não está cadastrado. Isso responde
 * "o que o salão fez"; não responde "o que o salão oferece". Serviço novo no
 * cardápio que ninguém pediu ainda não aparecia em lugar nenhum.
 *
 * Aqui a fonte é a tabela de preços, e a comparação vira duas perguntas:
 *   NOVO  — está na tabela e não no cadastro. Entra com nome, categoria e
 *           preço, e fica VERDE até o dono abrir e completar.
 *   FORA  — está no cadastro e sumiu da tabela. Fica VERMELHO: provavelmente
 *           saiu do cardápio. É sugestão, nunca exclusão.
 *
 * Nada é criado sozinho. O dono vê a lista e manda importar — criar cem linhas
 * caladas no cadastro de alguém é o tipo de coisa que ninguém desfaz depois.
 *
 * As marcas moram em `salao_config`, não em coluna nova: nenhuma migração para
 * rodar, e desfazer é apagar a chave.
 */

const CHAVE_NOVOS = 'servicos_novos_da_tabela'      // ids ainda não revisados
const CHAVE_DISPENSA = 'servicos_fora_tabela_ok'    // nomes que não são da tabela
const CHAVE_TABELA = 'tabela_precos'

async function lerConfig(salaoId: string, chave: string): Promise<any> {
  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', chave).maybeSingle()
  return (data as any)?.valor ?? null
}

async function gravarConfig(salaoId: string, chave: string, valor: any) {
  return supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave, valor, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}

const listaDeIds = (v: any): string[] => Array.isArray(v?.ids) ? v.ids.map(String) : []
const listaDeNomes = (v: any): string[] => Array.isArray(v?.nomes) ? v.nomes.map(String) : []

/** Categoria do 0033 só entra se o salão já usa esse nome — senão fica a crua. */
function categoriaValida(bruta: string | undefined, conhecidas: Set<string>): string {
  const c = String(bruta || '').trim()
  if (!c) return 'Outros'
  for (const k of Array.from(conhecidas)) if (norm(k) === norm(c)) return k
  return c
}

export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const [cfgTabela, cfgNovos, cfgDispensa, resServicos] = await Promise.all([
    lerConfig(sess.salaoId, CHAVE_TABELA),
    lerConfig(sess.salaoId, CHAVE_NOVOS),
    lerConfig(sess.salaoId, CHAVE_DISPENSA),
    supabaseAdmin.from('salao_servicos').select('id, nome, categoria, preco_fixo, preco_min')
      .eq('salao_id', sess.salaoId),
  ])

  const tabela: PrecoDeTabela[] = Array.isArray(cfgTabela?.itens) ? cfgTabela.itens : []
  const cadastro = (resServicos.data || []) as any[]

  // Sem tabela coletada não há o que comparar — e um "todos fora da tabela"
  // por tabela vazia acusaria o cadastro inteiro de errado.
  if (!tabela.length) {
    return NextResponse.json({ temTabela: false, novos: [], foraDaTabela: [], marcados: [] })
  }

  const noCadastro = new Set(cadastro.map(s => norm(s.nome)))
  const naTabela = new Set(tabela.map(t => norm(t.servico)))
  const dispensados = new Set(listaDeNomes(cfgDispensa).map(norm))
  const categoriasDoSalao = new Set(cadastro.map(s => String(s.categoria || '')).filter(Boolean))

  // Nome repetido na tabela entra uma vez só.
  const vistos = new Set<string>()
  const novos = tabela.filter(t => {
    const k = norm(t.servico)
    if (!k || noCadastro.has(k) || vistos.has(k) || dispensados.has(k)) return false
    vistos.add(k)
    return true
  }).map(t => ({
    servico: String(t.servico),
    categoria: categoriaValida(t.categoria, categoriasDoSalao),
    preco: Number(t.preco) || 0,
  })).sort((a, b) => a.servico.localeCompare(b.servico, 'pt-BR'))

  const foraDaTabela = cadastro
    .filter(s => !naTabela.has(norm(s.nome)) && !dispensados.has(norm(s.nome)))
    .map(s => ({ id: String(s.id), nome: String(s.nome), categoria: String(s.categoria || '') }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  // Marca verde só vale enquanto o serviço existe: apagado o serviço, a marca
  // morre junto, senão a lista cresceria com fantasma para sempre.
  const vivos = new Set(cadastro.map(s => String(s.id)))
  const marcados = listaDeIds(cfgNovos).filter(id => vivos.has(id))

  return NextResponse.json({
    temTabela: true,
    itensNaTabela: tabela.length,
    novos,
    foraDaTabela,
    marcados,
  })
}

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const acao = String(body?.acao || '')

  // ── Importar os que faltam ───────────────────────────────────────────────
  if (acao === 'importar') {
    const itens = Array.isArray(body?.itens) ? body.itens : []
    if (!itens.length) return NextResponse.json({ error: 'Nada para importar' }, { status: 400 })

    // Relê o cadastro na hora de gravar: entre a tela abrir e o clique, o dono
    // pode ter cadastrado na mão. Sem isto, nasceria duplicado.
    const { data: atuais } = await supabaseAdmin
      .from('salao_servicos').select('nome').eq('salao_id', sess.salaoId)
    const jaTem = new Set((atuais || []).map((s: any) => norm(s.nome)))

    const linhas = itens
      .filter((i: any) => String(i?.servico || '').trim() && !jaTem.has(norm(i.servico)))
      .map((i: any) => ({
        salao_id: sess.salaoId,
        nome: String(i.servico).trim(),
        categoria: String(i.categoria || 'Outros').trim() || 'Outros',
        preco_fixo: Number(i.preco) > 0 ? Number(i.preco) : null,
        preco_min: null, comissao_valor: null, observacao: null, ciclo_retorno_dias: null,
      }))

    if (!linhas.length) return NextResponse.json({ ok: true, criados: 0 })

    const { data: inseridos, error } = await supabaseAdmin
      .from('salao_servicos').insert(linhas).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const antes = listaDeIds(await lerConfig(sess.salaoId, CHAVE_NOVOS))
    const ids = Array.from(new Set([...antes, ...(inseridos || []).map((r: any) => String(r.id))]))
    await gravarConfig(sess.salaoId, CHAVE_NOVOS, { ids })

    registrarAuditoria('Importou', 'Serviços da tabela de preços', linhas.length + ' serviço(s)')
    return NextResponse.json({ ok: true, criados: linhas.length })
  }

  // ── Tirar o verde (o dono já configurou) ─────────────────────────────────
  if (acao === 'revisado') {
    const id = String(body?.id || '')
    const ids = listaDeIds(await lerConfig(sess.salaoId, CHAVE_NOVOS)).filter(x => x !== id)
    await gravarConfig(sess.salaoId, CHAVE_NOVOS, { ids })
    return NextResponse.json({ ok: true })
  }

  // ── Calar o vermelho ("esse não é da tabela") ────────────────────────────
  if (acao === 'dispensar') {
    const nome = String(body?.nome || '').trim()
    if (!nome) return NextResponse.json({ error: 'Nome vazio' }, { status: 400 })
    const nomes = listaDeNomes(await lerConfig(sess.salaoId, CHAVE_DISPENSA))
    if (!nomes.some(n => norm(n) === norm(nome))) nomes.push(nome)
    await gravarConfig(sess.salaoId, CHAVE_DISPENSA, { nomes })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
