import { supabaseAdmin } from '@/lib/supabase'
import { normalizarVaga, mesmaVaga, vagasDoDoc, MAX_VAGAS, VAGAS } from '@/lib/curriculosShared'
import type { Curriculo, CurriculosDoc } from '@/lib/curriculosShared'

// Reexporta as constantes/tipos client-safe para as rotas de API usarem daqui.
export { ESTADOS_BR, VAGAS, EXPERIENCIAS, whatsappLink, vagasDoDoc, vagasParaExibir, normalizarVaga, mesmaVaga } from '@/lib/curriculosShared'
export type { Curriculo, CurriculosDoc } from '@/lib/curriculosShared'

// ── Currículos são GLOBAIS do NODRI, não de cada salão ──────────────────────
// Um único link, um único banco de candidatos e uma única lista de vagas: todo
// salão enxerga os mesmos currículos e pode acrescentar vagas para todos.
// Por isso o documento vive em `configuracoes` (tabela chave/valor sem salão) e
// não mais em `salao_config`.
//
// A ÚNICA coisa que continua por salão é o `visto_em` — o badge de "novos" tem
// que ser individual, senão um salão abrir a tela zeraria o aviso de todos.
const CHAVE = 'curriculos'

function novoToken(): string {
  return 'cur-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

async function lerGlobal(): Promise<CurriculosDoc | null> {
  const { data } = await supabaseAdmin.from('configuracoes').select('valor').eq('chave', CHAVE).maybeSingle()
  return (data?.valor as CurriculosDoc) || null
}

export async function salvarCurriculosDoc(doc: CurriculosDoc): Promise<void> {
  await supabaseAdmin.from('configuracoes').upsert({ chave: CHAVE, valor: doc }, { onConflict: 'chave' })
}

// Junta os currículos que já existiam separados por salão num banco único.
// Roda uma vez só: depois disso o documento global existe e este caminho não é
// mais tocado. Não apaga nada dos salões — se algo der errado, o original está lá.
async function migrarDosSaloes(): Promise<{ itens: Curriculo[]; tokens: string[] }> {
  try {
    const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('chave', CHAVE)
    const todos: Curriculo[] = []
    const vistos = new Set<string>()
    const tokens: string[] = []
    for (const row of (data || []) as any[]) {
      const t = String(row?.valor?.token || '')
      if (t && !tokens.includes(t)) tokens.push(t)
      for (const c of (row?.valor?.itens || []) as Curriculo[]) {
        // telefone + nome identifica a pessoa melhor que o id (ids eram por salão)
        const k = `${String(c?.telefone || '').replace(/\D/g, '')}|${String(c?.nome || '').trim().toLowerCase()}`
        if (!c?.nome || vistos.has(k)) continue
        vistos.add(k)
        todos.push(c)
      }
    }
    todos.sort((a, b) => String(a.criado_em).localeCompare(String(b.criado_em)))
    return { itens: todos, tokens }
  } catch {
    return { itens: [], tokens: [] }   // base antiga sem a chave: começa vazio
  }
}

// Documento global (cria na primeira vez, migrando o que já existia).
export async function getCurriculosDoc(criarSeVazio = false): Promise<CurriculosDoc> {
  const atual = await lerGlobal()
  if (atual) return atual

  const { itens, tokens } = await migrarDosSaloes()
  const doc: CurriculosDoc = {
    // O link único herda o token do primeiro salão, e os demais viram "legado".
    // Assim NENHUM link já enviado a candidato deixa de funcionar — todos
    // passam a cair no mesmo banco.
    token: tokens[0] || novoToken(),
    tokens_legado: tokens.slice(1),
    vagas: [...VAGAS],
    itens,
  }
  if (criarSeVazio) await salvarCurriculosDoc(doc)
  return doc
}

// Valida o token do link público. Aceita o token atual e também os antigos,
// de quando cada salão tinha o seu link.
export async function getDocPorToken(token: string): Promise<CurriculosDoc | null> {
  const chave = (token || '').replace(/[,()]/g, '')
  if (!chave) return null
  const doc = await getCurriculosDoc(true)
  const vale = doc.token === chave || (doc.tokens_legado || []).includes(chave)
  return vale ? doc : null
}

// ── Vagas (lista global) ────────────────────────────────────────────────────
// Qualquer salão pode acrescentar, e a vaga nova passa a valer para todos. Nome
// repetido é barrado ignorando maiúsculas e acentos: "Barista" e "barista" são
// a mesma vaga, e duas entradas iguais quebrariam a listagem por vaga.
export type ResultadoVaga = { ok: true; doc: CurriculosDoc } | { ok: false; erro: string }

export async function criarVaga(nome: string): Promise<ResultadoVaga> {
  const limpo = normalizarVaga(nome)
  if (limpo.length < 2) return { ok: false, erro: 'Escreva o nome da vaga.' }
  const doc = await getCurriculosDoc(true)
  const vagas = vagasDoDoc(doc)
  if (vagas.some(v => mesmaVaga(v, limpo))) return { ok: false, erro: `“${limpo}” já existe na lista.` }
  if (vagas.length >= MAX_VAGAS) return { ok: false, erro: `Limite de ${MAX_VAGAS} vagas atingido.` }
  doc.vagas = [...vagas, limpo]
  await salvarCurriculosDoc(doc)
  return { ok: true, doc }
}

export async function renomearVaga(de: string, para: string): Promise<ResultadoVaga> {
  const limpo = normalizarVaga(para)
  if (limpo.length < 2) return { ok: false, erro: 'Escreva o novo nome da vaga.' }
  const doc = await getCurriculosDoc(true)
  const vagas = vagasDoDoc(doc)
  const i = vagas.findIndex(v => v === de)
  if (i < 0) return { ok: false, erro: 'Vaga não encontrada.' }
  if (vagas.some((v, j) => j !== i && mesmaVaga(v, limpo))) return { ok: false, erro: `“${limpo}” já existe na lista.` }

  const novas = [...vagas]; novas[i] = limpo
  doc.vagas = novas
  // Os candidatos guardam o NOME da vaga, então precisam acompanhar a troca —
  // senão eles somem da lista como se pertencessem a uma vaga que não existe.
  doc.itens = (doc.itens || []).map(c => (c.vaga === de ? { ...c, vaga: limpo } : c))
  await salvarCurriculosDoc(doc)
  return { ok: true, doc }
}

export async function excluirVaga(nome: string): Promise<ResultadoVaga> {
  const doc = await getCurriculosDoc(true)
  const vagas = vagasDoDoc(doc)
  if (!vagas.includes(nome)) return { ok: false, erro: 'Vaga não encontrada.' }
  // Excluir vaga com gente inscrita esconderia candidatos reais de todos os
  // salões. Melhor barrar e explicar do que sumir com currículo de alguém.
  const qtd = (doc.itens || []).filter(c => c.vaga === nome).length
  if (qtd > 0) return { ok: false, erro: `“${nome}” tem ${qtd} candidato(s). Exclua os currículos antes de remover a vaga.` }
  if (vagas.length <= 1) return { ok: false, erro: 'Deixe pelo menos uma vaga na lista.' }
  doc.vagas = vagas.filter(v => v !== nome)
  await salvarCurriculosDoc(doc)
  return { ok: true, doc }
}

// ── "Novos desde a última visita" — isso sim é por salão ────────────────────
// Chave PRÓPRIA (`curriculos_visto`), nunca a `curriculos` do salão: aquela
// guarda os currículos antigos que alimentam a migração e não pode ser
// sobrescrita — é a cópia de segurança de tudo que existia antes do banco único.
const CHAVE_VISTO = 'curriculos_visto'

export async function getVistoEm(salaoId: string): Promise<number> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE_VISTO).maybeSingle()
  const v = (data?.valor as any)?.visto_em
  return v ? new Date(v).getTime() : 0
}

export async function marcarVisto(salaoId: string): Promise<void> {
  await supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE_VISTO, valor: { visto_em: new Date().toISOString() }, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}
