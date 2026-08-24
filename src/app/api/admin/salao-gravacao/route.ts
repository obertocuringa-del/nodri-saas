import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ── Salão de gravação ───────────────────────────────────────────────────────
//
// Monta um salão de demonstração a partir dos dados reais de outro salão, para
// gravar vídeo das ferramentas sem expor cliente nenhum.
//
// A regra que vale acima de todas: o salão de ORIGEM é somente leitura. Todo
// SELECT daqui filtra por origem; todo INSERT e todo DELETE filtram por
// destino. Não existe caminho no código em que o id de origem chegue a uma
// escrita — e `guardas()` recusa a operação antes de começar se origem e
// destino forem o mesmo salão.
//
// O que sai transformado (nunca entra cru no destino):
//   - nome, telefone, celular e CPF de cliente  → apelido fictício estável
//   - nome de profissional                      → pseudônimo fictício estável
//   - valores                                   → variação por comanda
//
// "Estável" quer dizer que a mesma pessoa vira sempre o mesmo apelido dentro
// da rodada. Sem isso o mesmo cliente apareceria com nomes diferentes em cada
// tela e o vídeo mostraria um salão que não faz sentido.

async function master() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return payload && payload.role === 'master' ? payload : null
}

// ── nomes de fachada ────────────────────────────────────────────────────────
// Listas genéricas de propósito: nada aqui pode lembrar gente real de salão
// nenhum, senão o problema que estamos resolvendo volta pela porta dos fundos.
const NOMES_PROF = [
  'Aline Prado', 'Bruno Teixeira', 'Camila Rocha', 'Diego Nunes', 'Elisa Moraes',
  'Fábio Antunes', 'Gabriela Serra', 'Heitor Campos', 'Isadora Lemos', 'Joana Bastos',
  'Kléber Amaral', 'Lorena Vieira', 'Marcos Aurélio', 'Natália Freire', 'Otávio Pires',
  'Paula Mendonça', 'Quéren Alves', 'Rafael Duarte', 'Sabrina Coelho', 'Tiago Barreto',
  'Úrsula Neves', 'Vinícius Aragão', 'Wanda Portela', 'Yara Bettencourt', 'Zeca Andrade',
  'Ana Clara Fontes', 'Beatriz Salgado', 'Caio Vasques', 'Daniela Peixoto', 'Eduardo Rangel',
]
const PRE_CLI = [
  'Adriana', 'Bianca', 'Carla', 'Débora', 'Eduarda', 'Fernanda', 'Giovana', 'Helena',
  'Iara', 'Juliana', 'Karina', 'Letícia', 'Marina', 'Nicole', 'Olívia', 'Priscila',
  'Renata', 'Simone', 'Tatiana', 'Vanessa', 'André', 'Bernardo', 'César', 'Daniel',
  'Emerson', 'Felipe', 'Gustavo', 'Henrique', 'Igor', 'Leonardo',
]
const SOB_CLI = [
  'Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Ferraz', 'Guedes', 'Horta',
  'Ibrahim', 'Jardim', 'Klein', 'Lacerda', 'Machado', 'Nogueira', 'Osório', 'Paiva',
  'Queiroz', 'Ribas', 'Sampaio', 'Tavares', 'Ulhôa', 'Valença', 'Werneck', 'Xavier',
]

/** Hash estável: o mesmo texto sempre devolve o mesmo número. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** Variação de -12% a +12%, sempre igual para a mesma comanda. */
function fatorDe(chave: string): number {
  return 1 + (((hash('v:' + chave) % 2401) / 2400) * 0.24 - 0.12)
}

function dinheiro(v: any, f: number): number {
  const n = Number(v)
  if (!isFinite(n) || n === 0) return Number(v) || 0
  return Math.round(n * f * 100) / 100
}

class Apelidos {
  private mapa = new Map<string, string>()
  private usados = new Set<string>()
  constructor(private tipo: 'prof' | 'cli') {}

  de(original: string | null | undefined): string {
    const chave = String(original ?? '').trim()
    if (!chave) return ''
    const achado = this.mapa.get(chave.toLowerCase())
    if (achado) return achado

    let nome: string
    const h = hash(this.tipo + ':' + chave.toLowerCase())
    if (this.tipo === 'prof') {
      nome = NOMES_PROF[h % NOMES_PROF.length]
    } else {
      nome = PRE_CLI[h % PRE_CLI.length] + ' ' + SOB_CLI[(h >> 7) % SOB_CLI.length]
    }
    // Dois nomes reais não podem cair no mesmo apelido: no relatório eles
    // virariam uma pessoa só e os totais por profissional mudariam de dono.
    let n = 2
    while (this.usados.has(nome)) nome = `${nome.split(' (')[0]} (${n++})`
    this.usados.add(nome)
    this.mapa.set(chave.toLowerCase(), nome)
    return nome
  }

  get pares() {
    return Array.from(this.mapa.entries()).map(([de, para]) => ({ de, para }))
  }
  get total() { return this.mapa.size }
}

/** Telefone fictício, estável, no formato brasileiro. */
function telefoneFake(semente: string): string {
  const h = hash('tel:' + semente)
  return `(11) 9${String(h % 10000).padStart(4, '0')}-${String((h >> 9) % 10000).padStart(4, '0')}`
}

/** Lê tudo de uma tabela em páginas: o Supabase corta em 1000 por consulta. */
async function lerTudo(tabela: string, salaoId: string, filtro?: (q: any) => any) {
  const linhas: any[] = []
  const passo = 1000
  for (let de = 0; ; de += passo) {
    let q = supabaseAdmin.from(tabela).select('*').eq('salao_id', salaoId)
    if (filtro) q = filtro(q)
    const { data, error } = await q.range(de, de + passo - 1)
    if (error) throw new Error(`${tabela}: ${error.message}`)
    linhas.push(...(data || []))
    if (!data || data.length < passo) break
  }
  return linhas
}

async function inserirEmLotes(tabela: string, linhas: any[], lote = 500) {
  for (let i = 0; i < linhas.length; i += lote) {
    const { error } = await supabaseAdmin.from(tabela).insert(linhas.slice(i, i + lote))
    if (error) throw new Error(`${tabela} (insert): ${error.message}`)
  }
}

/**
 * Percorre um JSON de relatório trocando nome de profissional e escalando
 * dinheiro. O fator sai do profissional que estiver no próprio objeto; quando
 * não dá para saber de quem é o número, usa o fator do mês. É isso que faz o
 * total do relatório continuar batendo com a soma das comandas.
 */
const CAMPOS_PROF = ['profissional', 'nome', 'prof', 'colaborador', 'nome_profissional']
const CAMPOS_R$ = [
  'valor', 'total', 'desconto', 'faturamento', 'ticket', 'ticket_medio', 'meta',
  'comissao', 'liquido', 'bruto', 'pagamento', 'produtos', 'servicos_valor',
  'valor_total', 'media', 'receita', 'custo', 'lucro', 'salario', 'gasto_total', 'ltv_total',
]

function transformaJson(no: any, profs: Apelidos, fatorProf: Map<string, number>,
                        fatorMes: number, profAtual?: string): any {
  if (Array.isArray(no)) return no.map(x => transformaJson(x, profs, fatorProf, fatorMes, profAtual))
  if (!no || typeof no !== 'object') return no

  // de quem é este bloco? define o fator dos números daqui pra baixo
  let dono = profAtual
  for (const c of CAMPOS_PROF) {
    if (typeof no[c] === 'string' && no[c].trim()) { dono = no[c].trim(); break }
  }
  const f = (dono && fatorProf.get(dono.toLowerCase())) || fatorMes

  const saida: any = {}
  for (const [k, v] of Object.entries(no)) {
    if (CAMPOS_PROF.includes(k) && typeof v === 'string' && v.trim()) {
      saida[k] = profs.de(v)
    } else if (typeof v === 'number' && CAMPOS_R$.some(c => k.toLowerCase().includes(c))) {
      saida[k] = dinheiro(v, f)
    } else if (v && typeof v === 'object') {
      saida[k] = transformaJson(v, profs, fatorProf, fatorMes, dono)
    } else {
      saida[k] = v
    }
  }
  return saida
}

function guardas(origem: string, destino: string) {
  if (!origem || !destino) return 'Informe origem_id e destino_id.'
  if (origem === destino) {
    return 'Origem e destino são o mesmo salão. A operação apagaria os dados reais — recusada.'
  }
  return null
}

export async function POST(req: NextRequest) {
  if (!await master()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const origem = String(body?.origem_id || '')
  const destino = String(body?.destino_id || '')
  const periodos: { ano: number; mes: number }[] = Array.isArray(body?.periodos) ? body.periodos : []
  const copiarPaginas = body?.copiar_paginas !== false

  const erro = guardas(origem, destino)
  if (erro) return NextResponse.json({ error: erro }, { status: 400 })
  if (!periodos.length) return NextResponse.json({ error: 'Escolha ao menos um mês.' }, { status: 400 })

  const [{ data: sOrigem }, { data: sDestino }] = await Promise.all([
    supabaseAdmin.from('saloes').select('id, nome').eq('id', origem).maybeSingle(),
    supabaseAdmin.from('saloes').select('id, nome').eq('id', destino).maybeSingle(),
  ])
  if (!sOrigem) return NextResponse.json({ error: 'Salão de origem não encontrado.' }, { status: 404 })
  if (!sDestino) return NextResponse.json({ error: 'Salão de destino não encontrado.' }, { status: 404 })

  const anos = Array.from(new Set(periodos.map(p => p.ano)))
  const chaveMes = (a: number, m: number) => `${a}-${m}`
  const alvo = new Set(periodos.map(p => chaveMes(p.ano, p.mes)))

  const profs = new Apelidos('prof')
  const clis = new Apelidos('cli')
  const feito: Record<string, number> = {}

  try {
    // ── 1. comandas ────────────────────────────────────────────────────────
    const atend = (await lerTudo('atendimentos_raw', origem, q => q.in('ano', anos)))
      .filter(r => alvo.has(chaveMes(r.ano, r.mes)))

    // soma antes/depois por profissional e mês: é a razão entre as duas que
    // vai escalar os relatórios prontos, para agregado e detalhe fecharem
    const antes = new Map<string, number>()
    const depois = new Map<string, number>()

    const novosAtend = atend.map(r => {
      const f = fatorDe(`${r.num_comanda || r.id}|${r.servico || ''}|${r.cliente || ''}`)
      const k = `${String(r.profissional || '').toLowerCase()}|${r.ano}|${r.mes}`
      antes.set(k, (antes.get(k) || 0) + (Number(r.total) || 0))
      const total = dinheiro(r.total, f)
      depois.set(k, (depois.get(k) || 0) + total)

      const nomeCli = clis.de(r.cliente)
      return {
        salao_id: destino,
        ano: r.ano, mes: r.mes,
        profissional: profs.de(r.profissional),
        data_comanda: r.data_comanda, dia_semana: r.dia_semana,
        num_comanda: r.num_comanda,
        servico: r.servico, categoria: r.categoria,
        cliente: nomeCli,
        cpf: null,
        telefone: nomeCli ? telefoneFake(nomeCli) : null,
        celular: nomeCli ? telefoneFake(nomeCli) : null,
        qtd: r.qtd,
        valor: dinheiro(r.valor, f),
        desconto: dinheiro(r.desconto, f),
        total,
        pacote: r.pacote,
      }
    })

    await supabaseAdmin.from('atendimentos_raw').delete().eq('salao_id', destino)
    await inserirEmLotes('atendimentos_raw', novosAtend)
    feito.comandas = novosAtend.length

    // fator efetivo por profissional (média dos meses pedidos)
    const fatorProf = new Map<string, number>()
    const acc = new Map<string, [number, number]>()
    for (const [k, v] of antes) {
      const nome = k.split('|')[0]
      const a = acc.get(nome) || [0, 0]
      acc.set(nome, [a[0] + v, a[1] + (depois.get(k) || 0)])
    }
    for (const [nome, [a, d]] of acc) if (a > 0) fatorProf.set(nome, d / a)
    const somaA = Array.from(antes.values()).reduce((s, v) => s + v, 0)
    const somaD = Array.from(depois.values()).reduce((s, v) => s + v, 0)
    const fatorMes = somaA > 0 ? somaD / somaA : 1

    // ── 2. equipe ──────────────────────────────────────────────────────────
    const equipe = await lerTudo('profissionais', origem)
    const novaEquipe = equipe.map(p => ({
      salao_id: destino,
      nome_completo: profs.de(p.nome_completo),
      apelido: p.apelido ? profs.de(p.nome_completo).split(' ')[0] : null,
      email: null, cpf: null, rg: null, cnpj: null,
      cargo: p.cargo, habilidades: p.habilidades,
      endereco: null, data_aniversario: null, foto_url: null,
      cor_favorita: p.cor_favorita, comida_favorita: p.comida_favorita,
      animal_favorito: p.animal_favorito, hobbies: p.hobbies, um_sonho: p.um_sonho,
      contato_responsavel: null, certificados: p.certificados,
      ativo: p.ativo,
    }))
    await supabaseAdmin.from('profissionais').delete().eq('salao_id', destino)
    if (novaEquipe.length) await inserirEmLotes('profissionais', novaEquipe)
    feito.profissionais = novaEquipe.length

    // ── 3. relatórios prontos ──────────────────────────────────────────────
    const rels = (await lerTudo('relatorio_periodos', origem, q => q.in('ano', anos)))
      .filter(r => alvo.has(chaveMes(r.ano, r.mes)))
    const novosRels = rels.map(r => {
      const saida: any = { salao_id: destino, ano: r.ano, mes: r.mes }
      for (const [k, v] of Object.entries(r)) {
        if (['id', 'salao_id', 'ano', 'mes', 'criado_em', 'importado_em', 'atualizado_em'].includes(k)) continue
        saida[k] = v && typeof v === 'object'
          ? transformaJson(v, profs, fatorProf, fatorMes)
          : v
      }
      return saida
    })
    await supabaseAdmin.from('relatorio_periodos').delete().eq('salao_id', destino)
    if (novosRels.length) await inserirEmLotes('relatorio_periodos', novosRels)
    feito.relatorios = novosRels.length

    // ── 4. clientes: refeitos a partir das comandas já anonimizadas ────────
    // Não copio as tabelas de cliente da origem. Recalcular do que já está
    // limpo garante que nenhum campo de PII sobreviva por descuido — e de
    // quebra os números batem com as comandas novas.
    const porCliente = new Map<string, any>()
    const porMes = new Map<string, any>()
    for (const a of novosAtend) {
      if (!a.cliente) continue
      const c = porCliente.get(a.cliente) || {
        salao_id: destino, cliente_nome: a.cliente, ltv_total: 0, total_visitas: 0,
        primeira_visita: a.data_comanda, ultima_visita: a.data_comanda,
        servicos_feitos: [] as string[], score_rfm: 'ativo', status: 'ativo',
        intervalo_medio_dias: 0, dias_desde_ultima_visita: 0,
      }
      c.ltv_total = Math.round((c.ltv_total + (Number(a.total) || 0)) * 100) / 100
      c.total_visitas += 1
      if (a.servico && !c.servicos_feitos.includes(a.servico)) c.servicos_feitos.push(a.servico)
      if (a.data_comanda && a.data_comanda < c.primeira_visita) c.primeira_visita = a.data_comanda
      if (a.data_comanda && a.data_comanda > c.ultima_visita) c.ultima_visita = a.data_comanda
      porCliente.set(a.cliente, c)

      const km = `${a.cliente}|${a.ano}|${a.mes}`
      const m = porMes.get(km) || {
        salao_id: destino, cliente_nome: a.cliente, ano: a.ano, mes: a.mes,
        visitas: 0, gasto_total: 0, servicos: [] as string[],
      }
      m.visitas += 1
      m.gasto_total = Math.round((m.gasto_total + (Number(a.total) || 0)) * 100) / 100
      if (a.servico && !m.servicos.includes(a.servico)) m.servicos.push(a.servico)
      porMes.set(km, m)
    }
    await supabaseAdmin.from('clientes_perfil').delete().eq('salao_id', destino)
    await supabaseAdmin.from('clientes_resumo_mensal').delete().eq('salao_id', destino)
    await supabaseAdmin.from('clientes_contatos').delete().eq('salao_id', destino)
    if (porCliente.size) await inserirEmLotes('clientes_perfil', Array.from(porCliente.values()))
    if (porMes.size) await inserirEmLotes('clientes_resumo_mensal', Array.from(porMes.values()))
    feito.clientes = porCliente.size

    // ── 5. serviços e páginas ──────────────────────────────────────────────
    const servs = await lerTudo('salao_servicos', origem)
    if (servs.length) {
      await supabaseAdmin.from('salao_servicos').delete().eq('salao_id', destino)
      await inserirEmLotes('salao_servicos', servs.map(s => ({
        salao_id: destino, categoria: s.categoria, nome: s.nome,
        preco_min: s.preco_min, preco_max: s.preco_max, preco_fixo: s.preco_fixo,
        observacao: s.observacao, ativo: s.ativo,
      })))
    }
    feito.servicos = servs.length

    if (copiarPaginas) {
      const pags = await lerTudo('salao_config', origem)
      const novas = pags.map(p => ({
        salao_id: destino,
        chave: p.chave,
        valor: p.valor && typeof p.valor === 'object'
          ? transformaJson(p.valor, profs, fatorProf, fatorMes)
          : p.valor,
        atualizado_em: new Date().toISOString(),
      }))
      if (novas.length) {
        await supabaseAdmin.from('salao_config').delete().eq('salao_id', destino)
        await inserirEmLotes('salao_config', novas)
      }
      feito.paginas = novas.length
    }

    return NextResponse.json({
      ok: true,
      origem: sOrigem.nome,
      destino: sDestino.nome,
      periodos: periodos.map(p => `${String(p.mes).padStart(2, '0')}/${p.ano}`),
      feito,
      profissionais_trocados: profs.total,
      clientes_anonimizados: clis.total,
      variacao_media: `${((fatorMes - 1) * 100).toFixed(1)}%`,
      // o de/para dos profissionais volta para você saber quem virou quem
      // durante a gravação; o de clientes não volta, de propósito
      equivalencia_profissionais: profs.pares,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao gerar o salão de gravação.' }, { status: 500 })
  }
}
