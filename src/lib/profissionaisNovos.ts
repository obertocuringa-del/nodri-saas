import { supabaseAdmin } from './supabase'

// ── Profissional nova que apareceu nos relatórios da Avec ────────────────────
//
// Quem entra no salão é cadastrado primeiro na Avec. O NODRI só ficava sabendo
// quando alguém lembrava de cadastrar aqui também — e até lá os números dela
// não apareciam em lugar nenhum.
//
// Aqui cada importação procura, nos relatórios dos DOIS ÚLTIMOS MESES, nomes
// que não batem com ninguém do cadastro, e cria a pessoa como "pendente de
// aprovação". O dono aprova, corrige ou junta com quem já existe. Nada entra
// ativo sozinho.
//
// O difícil é o nome. Cada relatório escreve de um jeito:
//   atendimentos / pagamentos / serviços -> nome completo ("VERA OLIVEIRA")
//   agenda / feedbacks                    -> apelido ("VERA", "VIEGAS")
// e ainda há erro de digitação ("ILDETEE", "PATRIK", "TALDY"), acento
// ("CINTIA" x "Cíntia"), espaço duplo, sufixo ("JAICE - Auxiliar de Serviços
// Gerais") e abreviação ("Shirley F Morais").
//
// As conferências, da mais forte para a mais fraca:
//   1. nome ou apelido idênticos (sem acento, sem maiúscula, sem espaço extra)
//   2. nome já ensinado pelo dono (quando ele junta uma pendente com alguém)
//   3. dois primeiros nomes iguais, aceitando 1 letra trocada e inicial
//   4. apelido igual ao apelido ou ao primeiro nome de alguém do cadastro
//   5. cadastro com um nome só ("DARIANA") igual ao primeiro nome do relatório
//   6. mesmo atendimento nos dois relatórios: a agenda diz "VIEGAS" e a
//      comanda da mesma cliente, no mesmo dia, diz "Emilly Viegas de Oliveira"
// Se dois cadastros empatam, ninguém é escolhido — o nome aparece pendente
// com a dúvida escrita, para o dono decidir.

const CHAVE_CONFIG = 'profissionais_nomes_relatorio'
const STOP = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
const LIXO = new Set(['nao identificado', 'nao informado', 'sem profissional', 'outros', 'outro'])

export function normalizarNome(s: string | null | undefined): string {
  return String(s || '')
    .split(' - ')[0]
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[._/\\|,;:()]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const tokens = (s: string) => normalizarNome(s).split(' ').filter(t => t && !STOP.has(t))

function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[a.length][b.length]
}

/** Duas palavras de nome são a mesma, aceitando abreviação e letra trocada. */
export function palavraParecida(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const curta = a.length <= b.length ? a : b
  const longa = a.length <= b.length ? b : a
  if (curta.length >= 3 && longa.startsWith(curta)) return true
  // "ildetee" x "ildete", "patrik" x "patrick", "taldy" x "teldy"
  if (curta.length >= 4 && distancia(a, b) <= 1) return true
  if (curta.length >= 7 && distancia(a, b) <= 2) return true
  return false
}

/** Palavra do meio do nome: aceita a inicial ("F" = "Ferreira"). */
function meioParecido(a: string, b: string): boolean {
  if (a.length === 1 || b.length === 1) return a[0] === b[0]
  return palavraParecida(a, b)
}

/** Dois nomes com sobrenome são a mesma pessoa? */
function nomesCompletosIguais(a: string[], b: string[]): boolean {
  if (a.length < 2 || b.length < 2) return false
  if (!palavraParecida(a[0], b[0])) return false
  if (meioParecido(a[1], b[1])) return true
  // "Shirley Ferreira de Moraes" x "Shirley F Morais": o último também serve
  return palavraParecida(a[a.length - 1], b[b.length - 1]) && a[a.length - 1].length >= 4
}

interface Cadastro { id: string; nome_completo: string | null; apelido: string | null; is_departamento?: boolean }

interface Achado { id: string; forca: number; como: string }

export function conferir(nome: string, cadastro: Cadastro[], ensinados: Record<string, string>): { achado: Achado | null; empate: Cadastro[] } {
  const n = normalizarNome(nome)
  const t = tokens(nome)
  const candidatos: Achado[] = []

  if (ensinados[n]) candidatos.push({ id: ensinados[n], forca: 100, como: 'ensinado pelo dono' })

  for (const p of cadastro) {
    const nc = normalizarNome(p.nome_completo)
    const ap = normalizarNome(p.apelido)
    const tp = tokens(p.nome_completo || '')
    const ta = tokens(p.apelido || '')
    if (n && (n === nc || n === ap)) { candidatos.push({ id: p.id, forca: 100, como: 'nome igual' }); continue }
    if (nomesCompletosIguais(t, tp)) { candidatos.push({ id: p.id, forca: 90, como: 'dois primeiros nomes' }); continue }
    if (t.length === 1) {
      if (ta.length && palavraParecida(t[0], ta[0]) && ta.length === 1) { candidatos.push({ id: p.id, forca: 85, como: 'apelido' }); continue }
      if (tp.length && palavraParecida(t[0], tp[0])) { candidatos.push({ id: p.id, forca: 75, como: 'primeiro nome' }); continue }
    }
    if (t.length >= 2) {
      // Cadastro com um nome só ("DARIANA", "MAIDER") contra o nome inteiro
      // Os dois lados com sobrenome e o sobrenome diferente é OUTRA pessoa:
      // "Raissa Harume Viegas" não é a "Raissa Marques" só pelo primeiro nome.
      if (tp.length === 1 && palavraParecida(t[0], tp[0])) { candidatos.push({ id: p.id, forca: 75, como: 'primeiro nome' }); continue }
    }
  }

  if (!candidatos.length) return { achado: null, empate: [] }
  const melhor = Math.max(...candidatos.map(c => c.forca))
  const topo = candidatos.filter(c => c.forca === melhor)
  const ids = [...new Set(topo.map(c => c.id))]
  if (ids.length === 1) return { achado: topo[0], empate: [] }
  return { achado: null, empate: cadastro.filter(p => ids.includes(p.id)) }
}

// ── Leitura dos relatórios ──────────────────────────────────────────────────

async function paginado<T>(q: () => any, max = 20000): Promise<T[]> {
  const out: T[] = []
  for (let de = 0; de < max; de += 1000) {
    const { data, error } = await q().range(de, de + 999)
    if (error || !data?.length) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

interface Visto {
  nome: string
  fontes: Record<string, number>
  total: number
  categorias: Record<string, number>
  ultimo: number // ano*100+mes
}

function cargoPelaCategoria(cats: Record<string, number>): string {
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c]) => normalizarNome(c))
  for (const c of top.slice(0, 3)) {
    if (/manicure|pedicure|unha/.test(c)) return 'Manicure'
    if (/massag|corporal/.test(c)) return 'Massoterapeuta'
    if (/facial|sobrancelha|depila|estetica|cilio/.test(c)) return 'Esteticista'
    if (/corte|escova|modelagem|color|mecha|quimica|tratamento|penteado|cabelo/.test(c)) return 'Cabeleireiro'
  }
  return 'Profissional'
}

function tituloBonito(nome: string): string {
  const limpo = nome.split(' - ')[0].replace(/\s+/g, ' ').trim()
  // Só mexe em quem veio TODO em maiúsculas; o resto fica como foi digitado.
  if (limpo !== limpo.toUpperCase()) return limpo
  return limpo.toLowerCase().split(' ')
    .map(p => STOP.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

// Várias importações chegam em sequência (um pedaço por vez). Uma rodada por
// salão de cada vez, e no máximo uma por minuto, para não criar a mesma
// pessoa duas vezes nem pesar o servidor.
const rodando = new Map<string, Promise<any>>()
const ultimaRodada = new Map<string, number>()

// As importações chegam em pedaços, e o primeiro pedaço apaga o mês antes de
// regravar. Conferir no meio disso seria olhar um relatório pela metade —
// então as importações só AGENDAM, e a conferência roda 90 segundos depois do
// último pedaço.
const agendados = new Map<string, ReturnType<typeof setTimeout>>()
export function agendarDeteccao(salaoId: string) {
  const t = agendados.get(salaoId)
  if (t) clearTimeout(t)
  agendados.set(salaoId, setTimeout(() => {
    agendados.delete(salaoId)
    detectarProfissionaisNovos(salaoId, { forcar: true }).catch(() => {})
  }, 90_000))
}

export async function detectarProfissionaisNovos(salaoId: string, opts: { forcar?: boolean } = {}) {
  if (!opts.forcar && Date.now() - (ultimaRodada.get(salaoId) || 0) < 60_000) {
    return { criados: [] as string[], pulado: true }
  }
  const atual = rodando.get(salaoId)
  if (atual) return atual
  const p = rodar(salaoId).finally(() => { rodando.delete(salaoId); ultimaRodada.set(salaoId, Date.now()) })
  rodando.set(salaoId, p)
  return p
}

async function rodar(salaoId: string): Promise<{ criados: string[]; pulado?: boolean }> {
  // O mês mais recente que existe nos relatórios, não o do relógio: se a
  // importação atrasar, a janela anda junto.
  const { data: ult } = await supabaseAdmin.from('atendimentos_raw')
    .select('ano, mes').eq('salao_id', salaoId)
    .order('ano', { ascending: false }).order('mes', { ascending: false }).limit(1).maybeSingle()
  if (!ult) return { criados: [] }
  const ultimoMes = Number(ult.ano) * 100 + Number(ult.mes)
  const anterior = Number(ult.mes) === 1 ? (Number(ult.ano) - 1) * 100 + 12 : ultimoMes - 1
  const anoIni = Math.floor(anterior / 100)

  const [cadastroRaw, cfg, atend, agenda, feeds, periodos] = await Promise.all([
    supabaseAdmin.from('profissionais').select('id, nome_completo, apelido, is_departamento').eq('salao_id', salaoId),
    supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE_CONFIG).maybeSingle(),
    paginado<any>(() => supabaseAdmin.from('atendimentos_raw')
      .select('profissional, cliente, data_comanda, categoria, ano, mes')
      .eq('salao_id', salaoId).gte('ano', anoIni).order('id')),
    paginado<any>(() => supabaseAdmin.from('agendamentos_raw')
      .select('profissional, cliente, data_reserva, ano, mes')
      .eq('salao_id', salaoId).gte('ano', anoIni).order('id')),
    paginado<any>(() => supabaseAdmin.from('relatorio_feedbacks')
      .select('profissional, ano, mes').eq('salao_id', salaoId).gte('ano', anoIni).order('id')),
    paginado<any>(() => supabaseAdmin.from('relatorio_periodos')
      .select('ano, mes, prof_servicos, prof_pagamentos').eq('salao_id', salaoId).gte('ano', anoIni).order('id')),
  ])

  const cadastro: Cadastro[] = (cadastroRaw.data || []) as any
  const ensinados: Record<string, string> = ((cfg.data as any)?.valor?.ensinados) || {}
  const recente = (r: any) => Number(r.ano) * 100 + Number(r.mes) >= anterior

  const vistos = new Map<string, Visto>()
  const ver = (nome: any, fonte: string, r: any, qtd = 1, categoria?: string) => {
    const bruto = String(nome || '').replace(/\s+/g, ' ').trim()
    const n = normalizarNome(bruto)
    if (!n || LIXO.has(n) || !/[a-z]/.test(n)) return
    const v = vistos.get(n) || { nome: bruto, fontes: {}, total: 0, categorias: {}, ultimo: 0 }
    v.fontes[fonte] = (v.fontes[fonte] || 0) + qtd
    v.total += qtd
    if (categoria) v.categorias[categoria] = (v.categorias[categoria] || 0) + qtd
    v.ultimo = Math.max(v.ultimo, Number(r.ano) * 100 + Number(r.mes))
    // Guarda a grafia mais completa que apareceu
    if (bruto.length > v.nome.length) v.nome = bruto
    vistos.set(n, v)
  }

  for (const r of atend) if (recente(r)) ver(r.profissional, 'atendimentos', r, 1, r.categoria)
  for (const r of agenda) if (recente(r)) ver(r.profissional, 'agenda', r)
  for (const r of feeds) if (recente(r)) ver(r.profissional, 'feedbacks', r)
  for (const r of periodos) {
    if (!recente(r)) continue
    for (const it of Array.isArray(r.prof_servicos) ? r.prof_servicos : []) ver(it?.profissional, 'servicos', r, Number(it?.quantidade) || 1)
    // Pagamentos listam todo mundo que já teve cadastro na Avec; só conta
    // quem teve valor a receber no período.
    for (const it of Array.isArray(r.prof_pagamentos) ? r.prof_pagamentos : []) {
      if (Number(it?.valor_a_pagar) || Number(it?.valor)) ver(it?.profissional || it?.nome, 'pagamentos', r)
    }
  }
  if (!vistos.size) return { criados: [] }

  // Conferência 6: mesmo atendimento nos dois relatórios.
  const comanda = new Map<string, Map<string, number>>() // cliente|data -> nome completo -> n
  for (const r of atend) {
    if (!recente(r) || !r.cliente || !r.profissional) continue
    const k = `${normalizarNome(r.cliente)}|${r.data_comanda}`
    const m = comanda.get(k) || new Map()
    const nc = normalizarNome(r.profissional)
    m.set(nc, (m.get(nc) || 0) + 1)
    comanda.set(k, m)
  }
  const cruzado = new Map<string, Map<string, number>>() // nome da agenda -> nome completo -> n
  for (const r of agenda) {
    if (!recente(r) || !r.cliente || !r.profissional) continue
    const m = comanda.get(`${normalizarNome(r.cliente)}|${r.data_reserva}`)
    if (!m) continue
    const a = normalizarNome(r.profissional)
    const c = cruzado.get(a) || new Map()
    for (const [nc] of m) c.set(nc, (c.get(nc) || 0) + 1)
    cruzado.set(a, c)
  }
  // O nome completo que mais divide cliente com o apelido, e só se for
  // claramente o dono dele (pelo menos 40% dos encontros e 3 ou mais).
  const parDaAgenda = (a: string): string | null => {
    const c = cruzado.get(a)
    if (!c) return null
    const tot = [...c.values()].reduce((s, x) => s + x, 0)
    const [nc, qtd] = [...c.entries()].filter(([k]) => k).sort((x, y) => y[1] - x[1])[0] || []
    return nc && qtd >= 3 && qtd / tot >= 0.4 ? nc : null
  }

  const semDono: string[] = []
  const duvidas = new Map<string, Cadastro[]>()
  for (const [n, v] of vistos) {
    const { achado, empate } = conferir(v.nome, cadastro, ensinados)
    if (achado) continue
    const par = parDaAgenda(n)
    if (par && vistos.has(par)) {
      const viaPar = conferir(vistos.get(par)!.nome, cadastro, ensinados)
      if (viaPar.achado) continue
    }
    if (empate.length) duvidas.set(n, empate)
    semDono.push(n)
  }
  if (!semDono.length) return { criados: [] }

  // Junta as grafias da MESMA pessoa nova antes de criar: "WILLIAM" na agenda
  // e "William Gleidisson da Silva Gomes" nas comandas viram um cadastro só.
  const grupo = new Map<string, string>() // nome -> raiz
  const raiz = (n: string): string => { let r = n; while (grupo.get(r) && grupo.get(r) !== r) r = grupo.get(r)!; return r }
  const unir = (a: string, b: string) => { const ra = raiz(a), rb = raiz(b); if (ra !== rb) grupo.set(rb, ra) }
  for (const n of semDono) grupo.set(n, n)
  for (let i = 0; i < semDono.length; i++) {
    for (let j = i + 1; j < semDono.length; j++) {
      const a = semDono[i], b = semDono[j]
      const ta = tokens(a), tb = tokens(b)
      if (nomesCompletosIguais(ta, tb)) { unir(a, b); continue }
      if (parDaAgenda(a) === b || parDaAgenda(b) === a) { unir(a, b); continue }
      // Apelido solto contra nome completo: só se for o ÚNICO nome completo
      // novo com aquele primeiro nome.
      const [curto, longo, tl] = ta.length === 1 ? [ta, b, tb] : tb.length === 1 ? [tb, a, ta] : [null, '', []]
      if (curto && tl.length >= 2 && palavraParecida(curto[0], tl[0])) {
        const rivais = semDono.filter(x => x !== longo && tokens(x).length >= 2 && palavraParecida(curto[0], tokens(x)[0]))
        if (!rivais.length) unir(a, b)
      }
    }
  }
  const grupos = new Map<string, string[]>()
  for (const n of semDono) {
    const r = raiz(n)
    grupos.set(r, [...(grupos.get(r) || []), n])
  }

  const criados: string[] = []
  for (const nomes of grupos.values()) {
    const vs = nomes.map(n => vistos.get(n)!)
    const completo = vs.slice().sort((a, b) => tokens(b.nome).length - tokens(a.nome).length || b.total - a.total)[0]
    const curtos = vs.filter(v => tokens(v.nome).length === 1).sort((a, b) => b.total - a.total)
    const nomeCompleto = tituloBonito(completo.nome)
    const apelido = (curtos[0]?.nome || tokens(completo.nome)[0] || completo.nome).split(' - ')[0].trim().toUpperCase()

    // Última trava contra duplicata: alguém pode ter cadastrado à mão entre
    // a leitura e aqui, ou outra rodada já ter criado.
    const { data: ja } = await supabaseAdmin.from('profissionais').select('id')
      .eq('salao_id', salaoId).ilike('nome_completo', nomeCompleto).limit(1)
    if (ja?.length) continue

    const fontes: Record<string, number> = {}
    const categorias: Record<string, number> = {}
    for (const v of vs) {
      for (const [f, q] of Object.entries(v.fontes)) fontes[f] = (fontes[f] || 0) + q
      for (const [c, q] of Object.entries(v.categorias)) categorias[c] = (categorias[c] || 0) + q
    }
    const avisos: string[] = []
    const duvida = nomes.flatMap(n => duvidas.get(n) || [])
    if (duvida.length) avisos.push(`Pode ser: ${[...new Set(duvida.map(d => d.nome_completo || d.apelido))].join(' ou ')}`)
    if (tokens(completo.nome).length < 2) avisos.push('Só veio o apelido nos relatórios: confira o nome completo.')
    if (normalizarNome(completo.nome).replace(/ /g, '').length <= 3) avisos.push('Nome muito curto: pode ser um usuário do sistema e não uma pessoa.')
    const total = vs.reduce((s, v) => s + v.total, 0)
    if (total <= 2) avisos.push('Apareceu poucas vezes: pode ser erro de digitação na Avec.')

    const { data: novo, error } = await supabaseAdmin.from('profissionais').insert({
      salao_id: salaoId,
      nome_completo: nomeCompleto,
      apelido,
      cargo: cargoPelaCategoria(categorias),
      ativo: false,
      status_cadastro: 'pendente',
      origem_relatorio: {
        detectado_em: new Date().toISOString(),
        nomes: vs.map(v => v.nome),
        fontes,
        total,
        ultimo_mes: Math.max(...vs.map(v => v.ultimo)),
        avisos,
      },
    }).select('id').single()
    if (!error && novo) criados.push(nomeCompleto)
  }

  return { criados }
}

/**
 * O dono disse que a pendente é, na verdade, alguém que já existe: ensina os
 * nomes dela para a próxima conferência e apaga só a ficha pendente.
 */
export async function juntarPendente(salaoId: string, pendenteId: string, destinoId: string): Promise<string | null> {
  if (pendenteId === destinoId) return 'Escolha outra pessoa.'
  const [{ data: pend }, { data: dest }, { data: cfg }] = await Promise.all([
    supabaseAdmin.from('profissionais').select('id, nome_completo, apelido, status_cadastro, origem_relatorio')
      .eq('id', pendenteId).eq('salao_id', salaoId).maybeSingle(),
    supabaseAdmin.from('profissionais').select('id').eq('id', destinoId).eq('salao_id', salaoId).maybeSingle(),
    supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE_CONFIG).maybeSingle(),
  ])
  if (!pend || !dest) return 'Cadastro não encontrado.'
  // Só junta o que o próprio detector criou e ainda está pendente: nunca
  // apaga uma ficha de verdade.
  if (pend.status_cadastro !== 'pendente' || !pend.origem_relatorio) return 'Só dá para juntar cadastros que vieram dos relatórios e ainda estão pendentes.'

  const valor = (cfg as any)?.valor || {}
  const ensinados: Record<string, string> = { ...(valor.ensinados || {}) }
  const nomes: string[] = [...((pend.origem_relatorio as any)?.nomes || []), pend.nome_completo || '', pend.apelido || '']
  for (const n of nomes) { const k = normalizarNome(n); if (k) ensinados[k] = destinoId }

  const { error: e1 } = await supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE_CONFIG, valor: { ...valor, ensinados }, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
  if (e1) return e1.message
  const { error: e2 } = await supabaseAdmin.from('profissionais').delete()
    .eq('id', pendenteId).eq('salao_id', salaoId).eq('status_cadastro', 'pendente')
  return e2 ? e2.message : null
}
