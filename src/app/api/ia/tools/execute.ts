import { supabaseAdmin } from '@/lib/supabase'
import { apelidoCasa, criarMatchProfissional } from '@/lib/matchProfissional'
import { calcularIndicadoresMeta } from '@/lib/metasAnalitico'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmtR = (v: number) => `R$${(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
// Preposições não podem ser usadas como token de match de nome, senão "Daniel da Rocha"
// casa com qualquer nome que contenha "da" — ver mesma correção em metasAnalitico.ts
const STOPWORDS_NOME = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

/** Minúsculas e SEM ACENTO — quem pergunta escreve "Janaína", o cadastro tem "JANAINA". */
export function normalizarNome(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokensNorm(s: string | null | undefined): string[] {
  return normalizarNome(s).split(' ').filter(t => t && !STOPWORDS_NOME.has(t))
}

/**
 * Duas palavras são a mesma pessoa?
 *
 * Aceita abreviação pelo começo ("cris" ~ "cristina", mínimo 3 letras) e UMA
 * letra trocada em palavras de 5+ ("suelem" ~ "suelen"). A tolerância existe
 * porque nome próprio é digitado de ouvido: Suelem/Suelen, Jéssica/Jessyca,
 * Tainá/Thainá. Sem ela, a IA responde "não encontrado" para alguém que está
 * cadastrada — que foi exatamente o que aconteceu em 10/09/2026.
 */
function palavraCasa(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const curta = a.length <= b.length ? a : b
  const longa = a.length <= b.length ? b : a
  if (curta.length >= 3 && longa.startsWith(curta)) return true
  // Uma letra de diferença, mesmo comprimento — erro de digitação comum.
  if (a.length === b.length && a.length >= 5) {
    let diferencas = 0
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++diferencas > 1) return false
    return diferencas === 1
  }
  return false
}

/**
 * Encontra a profissional que a pessoa quis dizer.
 *
 * ── Por que este código foi reescrito (10/09/2026) ───────────────────────────
 *
 * A versão anterior terminava com:
 *
 *     n.includes(p.apelido?.toLowerCase()?.split(' ')[0] || '')
 *
 * Quando a profissional NÃO tinha apelido cadastrado, o `|| ''` entregava
 * string vazia — e em JavaScript `qualquerCoisa.includes('')` é SEMPRE true.
 * Resultado: o primeiro cadastro sem apelido casava com toda e qualquer busca.
 * No Rouge Hair esse cadastro era "CAFÉ", e a IA respondia perguntas sobre a
 * Janaína e a Suelen com o perfil do café — e depois dizia que elas não tinham
 * faturamento nem ocorrências, porque estava filtrando tudo pelo nome errado.
 *
 * Um curinga silencioso é pior que um erro: ele não falha, ele responde
 * convicto a coisa errada.
 *
 * Regras agora: sem acento, por palavra inteira a partir do começo, com
 * tolerância de uma letra, e o MELHOR resultado — não o primeiro que passar.
 * Empate entre pessoas diferentes é devolvido como ambiguidade, para a IA
 * perguntar qual delas em vez de escolher no escuro.
 */
function encontrarProfissional(nome: string, profissionais: any[]):
  { prof: any | null; ambiguos: any[] } {
  const alvo = normalizarNome(nome)
  if (!alvo) return { prof: null, ambiguos: [] }
  const tokensAlvo = tokensNorm(nome)
  if (!tokensAlvo.length) return { prof: null, ambiguos: [] }

  const pontuados = (profissionais || []).map((p: any) => {
    const nomeNorm = normalizarNome(p.nome_completo)
    const apelidoNorm = normalizarNome(p.apelido)
    const tNome = tokensNorm(p.nome_completo)
    const tApelido = tokensNorm(p.apelido)

    let pontos = 0
    if (alvo === nomeNorm) pontos = 100
    else if (apelidoNorm && alvo === apelidoNorm) pontos = 95
    // Começo do nome completo: "janaina cristina" acha "JANAINA CRISTINA SILVA".
    else if (tNome.length && tokensAlvo.every((t, i) => i < tNome.length && palavraCasa(t, tNome[i]))) pontos = 90
    else if (tApelido.length && tokensAlvo.every((t, i) => i < tApelido.length && palavraCasa(t, tApelido[i]))) pontos = 85
    else {
      // Palavras soltas: todas precisam existir no nome, como palavra inteira.
      const casaram = tokensAlvo.filter(t => tNome.some(nt => palavraCasa(t, nt))).length
      if (casaram === tokensAlvo.length) pontos = 70
      // Nome único que bate com o PRIMEIRO nome — "suelen" acha "SUELEN RIBEIRO".
      else if (tokensAlvo.length === 1 && tNome.length && palavraCasa(tokensAlvo[0], tNome[0])) pontos = 60
    }
    return { p, pontos }
  }).filter(x => x.pontos > 0).sort((a, b) => b.pontos - a.pontos)

  if (!pontuados.length) return { prof: null, ambiguos: [] }
  const melhor = pontuados[0].pontos
  const empatados = pontuados.filter(x => x.pontos === melhor).map(x => x.p)
  if (empatados.length > 1) return { prof: null, ambiguos: empatados }
  return { prof: pontuados[0].p, ambiguos: [] }
}

// ── Datas do atendimentos_raw ───────────────────────────────────────────────
//
// `data_comanda` é TEXTO, quase sempre "DD/MM/YYYY" — e ordenar texto nessa
// forma ordena errado ("02/12" vem antes de "10/01"). Toda comparação de data
// passa por aqui, que devolve um número comparável.

/** "DD/MM/YYYY" ou "YYYY-MM-DD" -> milissegundos. Data inválida vira NaN. */
function tsData(d: string | null | undefined): number {
  const s = String(d || '').trim()
  if (!s) return NaN
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.slice(0, 10) + 'T12:00:00').getTime()
  const p = s.split('/')
  if (p.length !== 3) return NaN
  const iso = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}T12:00:00`
  const t = new Date(iso).getTime()
  return isNaN(t) ? NaN : t
}

function dataBonita(ms: number): string {
  if (isNaN(ms)) return '-'
  return new Date(ms).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

/** Variação percentual entre dois números, com sinal. */
function variacao(antes: number, depois: number): string {
  if (!antes) return depois ? 'novo' : '0%'
  const v = ((depois - antes) / antes) * 100
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

type LinhaAtend = {
  profissional?: string | null
  cliente?: string | null
  servico?: string | null
  categoria?: string | null
  data_comanda?: string | null
  num_comanda?: string | null
  qtd?: number | null
  total?: number | null
  valor?: number | null
  desconto?: number | null
}

/**
 * Resume um conjunto de linhas de atendimento em números de gestão.
 *
 * Uma COMANDA pode ter vários serviços; por isso "atendimento" é a combinação
 * cliente + data + número da comanda, e não a contagem de linhas. Contar linhas
 * infla o número de atendimentos de quem vende combo.
 */
function resumirAtendimentos(linhas: LinhaAtend[], primeiraVisitaGeral?: Map<string, number>) {
  const dias = new Set<string>()
  const comandas = new Set<string>()
  const clientes = new Set<string>()
  const porServico = new Map<string, { qtd: number; valor: number }>()
  let faturamento = 0
  let servicos = 0

  for (const l of linhas) {
    const d = String(l.data_comanda || '')
    if (d) dias.add(d)
    const cli = normalizarNome(l.cliente)
    if (cli) clientes.add(cli)
    comandas.add(`${cli}||${d}||${l.num_comanda || ''}`)
    faturamento += Number(l.total || 0)
    servicos += Number(l.qtd || 0) || 1
    const s = String(l.servico || '').trim()
    if (s) {
      const at = porServico.get(s) || { qtd: 0, valor: 0 }
      at.qtd += Number(l.qtd || 0) || 1
      at.valor += Number(l.total || 0)
      porServico.set(s, at)
    }
  }

  const atendimentos = comandas.size
  const diasTrabalhados = dias.size
  const datasMs = [...dias].map(tsData).filter(t => !isNaN(t)).sort((a, b) => a - b)

  // Cliente novo: a primeira visita dele no salão cai dentro deste conjunto.
  let novos = 0
  if (primeiraVisitaGeral) {
    const inicio = datasMs[0]
    const fim = datasMs[datasMs.length - 1]
    for (const c of clientes) {
      const pv = primeiraVisitaGeral.get(c)
      if (pv != null && pv >= inicio && pv <= fim) novos++
    }
  }

  return {
    faturamento,
    atendimentos,
    servicos,
    diasTrabalhados,
    clientes: clientes.size,
    novos,
    recorrentes: primeiraVisitaGeral ? clientes.size - novos : 0,
    ticket: atendimentos ? faturamento / atendimentos : 0,
    porDia: diasTrabalhados ? faturamento / diasTrabalhados : 0,
    atendPorDia: diasTrabalhados ? atendimentos / diasTrabalhados : 0,
    primeiraData: datasMs[0],
    ultimaData: datasMs[datasMs.length - 1],
    topServicos: [...porServico.entries()].sort((a, b) => b[1].qtd - a[1].qtd).slice(0, 8),
    clientesSet: clientes,
  }
}

/** Lê o atendimentos_raw em páginas — a tabela passa de mil linhas com folga. */
async function lerAtendimentos(salaoId: string, filtroProf?: (n: string) => boolean, teto = 24000) {
  const linhas: LinhaAtend[] = []
  const passo = 1000
  for (let de = 0; de < teto; de += passo) {
    const { data, error } = await supabaseAdmin
      .from('atendimentos_raw')
      .select('profissional, cliente, servico, categoria, data_comanda, num_comanda, qtd, total')
      .eq('salao_id', salaoId)
      .range(de, de + passo - 1)
    if (error || !data || !data.length) break
    for (const l of data) {
      if (!filtroProf || filtroProf(String(l.profissional || ''))) linhas.push(l as LinhaAtend)
    }
    if (data.length < passo) break
  }
  return linhas
}

/** Mensagem quando a busca não resolveu — nunca devolver dado de outra pessoa. */
function recadoNaoEncontrado(nome: string, ambiguos: any[]): string {
  if (ambiguos.length > 1) {
    const lista = ambiguos.map((p: any) => `${p.nome_completo}${p.cargo ? ` (${p.cargo})` : ''}`).join(' ou ')
    return `Encontrei mais de uma profissional para "${nome}": ${lista}. Qual delas?`
  }
  return `Profissional "${nome}" não encontrado no cadastro deste salão.`
}

export async function executarFerramenta(nome: string, args: any, salaoId: string, profissionalId?: string): Promise<string> {
  try {
    // MODO PROFISSIONAL: ferramentas que expõem dados do salão ou de colegas
    // são BLOQUEADAS no servidor (não confiar só no prompt). O profissional só
    // enxerga a si mesmo.
    if (profissionalId) {
      const bloqueadasNoProf = new Set([
        'buscar_indicadores_salao',
        'buscar_comparativo_profissionais',
        'buscar_feedbacks_clientes',
        'buscar_faturamento_por_dia_semana',
      ])
      if (bloqueadasNoProf.has(nome)) {
        return 'Neste chat consigo mostrar apenas os seus próprios dados. Dados de outros profissionais ou do salão como um todo só ficam disponíveis no painel do gestor.'
      }
    }
    switch (nome) {

      // ── Meta do mês: a IA LÊ, não calcula ─────────────────────────────
      //
      // A IA errava a meta porque fazia a conta sozinha, a partir dos dados
      // crus do prompt. Deu "faltam R$ 4.239,65 / R$ 192,71 por dia" enquanto
      // a tela da profissional mostrava "faltam R$ 3.634,23 / R$ 165,19".
      // Dois números para a mesma pergunta, e o errado com toda a cara de
      // certo — que é o pior tipo de erro que um sistema de gestão pode ter.
      //
      // A causa não é o modelo ser ruim de conta: é ele estar fazendo uma
      // conta que já existe pronta. `calcularIndicadoresMeta` é a MESMA função
      // que alimenta o card de Metas na tela. Chamando ela, os dois números
      // passam a nascer do mesmo lugar — e divergir deixa de ser possível.
      case 'buscar_meta_profissional': {
        const { data: profs } = await supabaseAdmin.from('profissionais').select('id, nome_completo, apelido, cargo').eq('salao_id', salaoId)
        // No modo profissional o nome é ignorado: só existe ele mesmo.
        let prof: any = null
        let ambiguos: any[] = []
        if (profissionalId) {
          prof = (profs || []).find((p: any) => p.id === profissionalId) || null
        } else {
          const achado = encontrarProfissional(args.nome || '', profs || [])
          prof = achado.prof
          ambiguos = achado.ambiguos
        }
        if (!prof) return recadoNaoEncontrado(args.nome || '', ambiguos)

        const hoje = new Date()
        let ano = Number(args.ano) || hoje.getFullYear()
        let mes = Number(args.mes) || (hoje.getMonth() + 1)
        if (mes < 1 || mes > 12) { mes = hoje.getMonth() + 1 }

        const { data: metaRow } = await supabaseAdmin
          .from('metas_profissionais').select('*')
          .eq('profissional_id', prof.id).eq('salao_id', salaoId)
          .eq('ano', ano).eq('mes', mes).maybeSingle()
        const metaFinal = (metaRow as any)?.meta_manual ?? (metaRow as any)?.meta_redistribuida ?? 0

        if (!metaFinal) return `Não há meta cadastrada para ${prof.apelido || prof.nome_completo} em ${MESES[mes-1]}/${ano}.`

        const ind: any = await calcularIndicadoresMeta(prof.id, salaoId, ano, mes, metaFinal)
        const l: string[] = []
        l.push(`META DE ${(prof.apelido || prof.nome_completo || '').toUpperCase()} — ${MESES[mes-1]}/${ano}`)
        l.push('Estes numeros sao os MESMOS que aparecem na tela de Metas. Use-os exatamente como estao; NAO recalcule nem arredonde.')
        l.push(`Meta mensal: ${fmtR(metaFinal)}`)
        l.push(`Realizado: ${fmtR(ind.realizado)}`)
        l.push(`Faltam: ${fmtR(ind.faltam)}`)
        l.push(`Dias restantes: ${ind.dias_restantes}`)
        l.push(`Necessario por dia: ${fmtR(ind.necessario_por_dia)}`)
        if (ind.alcancabilidade?.probabilidade != null) {
          l.push(`Chance de bater: ${ind.alcancabilidade.probabilidade}% (${ind.alcancabilidade.label})`)
        }
        if (ind.principal_gargalo) l.push(`Principal gargalo: ${ind.principal_gargalo}`)
        if (ind.ticket_atual) l.push(`Ticket atual: ${fmtR(ind.ticket_atual)} (media historica ${fmtR(ind.ticket_medio_historico)})`)
        if (ind.ocupacao_atual) l.push(`Ocupacao atual: ${ind.ocupacao_atual}% (media historica ${ind.ocupacao_media_historico}%)`)
        return l.join('\n')
      }

      // ── Dado DIÁRIO: o que os agregados mensais não conseguem responder ────
      //
      // Todas as outras ferramentas leem `relatorio_periodos`, que é mensal.
      // Isso basta para "como foi agosto", mas não para "como ela estava antes
      // do dia 15 e como ficou depois" — e é exatamente esse tipo de recorte
      // que uma decisão de gestão precisa. Agosto inteiro é uma linha só lá.
      //
      // Aqui a fonte é o `atendimentos_raw`: uma linha por serviço executado,
      // com data. Dela saem os números que antes não existiam para a IA — dias
      // efetivamente trabalhados, atendimentos por dia, cliente novo contra
      // cliente que voltou, e comparação entre dois períodos quaisquer.
      case 'buscar_atendimentos_periodo': {
        const { data: profs } = await supabaseAdmin
          .from('profissionais').select('id, nome_completo, apelido, cargo').eq('salao_id', salaoId)

        // Modo profissional: o nome pedido é ignorado, só existe ele mesmo.
        let prof: any = null
        if (profissionalId) {
          prof = (profs || []).find((p: any) => p.id === profissionalId) || null
          if (!prof) return 'Não consegui identificar o seu cadastro neste salão.'
        } else if (args.nome) {
          const achado = encontrarProfissional(String(args.nome), profs || [])
          if (!achado.prof) return recadoNaoEncontrado(String(args.nome), achado.ambiguos)
          prof = achado.prof
        }

        const ini1 = tsData(args.data_inicio)
        const fim1 = tsData(args.data_fim)
        if (isNaN(ini1) || isNaN(fim1)) {
          return 'Informe data_inicio e data_fim no formato DD/MM/AAAA.'
        }
        if (ini1 > fim1) return 'A data de início é posterior à data de fim.'

        const ini2 = tsData(args.comparar_inicio)
        const fim2 = tsData(args.comparar_fim)
        const temComparacao = !isNaN(ini2) && !isNaN(fim2) && ini2 <= fim2

        // Filtro por profissional usa o mesmo comparador do resto do sistema:
        // o nome no relatório vem da Avec e nem sempre bate letra por letra.
        const casaProf = prof ? criarMatchProfissional(prof) : null
        const linhas = await lerAtendimentos(
          salaoId,
          casaProf ? (n: string) => casaProf({ profissional: n }) : undefined
        )
        if (!linhas.length) {
          return prof
            ? `Não há atendimentos importados para ${prof.nome_completo} em atendimentos_raw. Verifique se os relatórios do período foram importados.`
            : 'Não há atendimentos importados para este salão em atendimentos_raw.'
        }

        // Primeira visita de cada cliente em TODO o histórico: é o que permite
        // dizer se um cliente é novo ou se voltou.
        const primeiraVisita = new Map<string, number>()
        for (const l of linhas) {
          const c = normalizarNome(l.cliente)
          if (!c) continue
          const t = tsData(l.data_comanda)
          if (isNaN(t)) continue
          const at = primeiraVisita.get(c)
          if (at == null || t < at) primeiraVisita.set(c, t)
        }

        const noIntervalo = (de: number, ate: number) => linhas.filter(l => {
          const t = tsData(l.data_comanda)
          return !isNaN(t) && t >= de && t <= ate
        })

        const quem = prof ? (prof.apelido || prof.nome_completo) : 'SALÃO (todos os profissionais)'
        const out: string[] = []
        out.push(`ATENDIMENTOS POR DATA — ${String(quem).toUpperCase()}`)
        out.push('Fonte: atendimentos_raw (uma linha por serviço executado, com data da comanda).')
        out.push('Atendimento = cliente + data + comanda. Uma comanda com 3 servicos conta como 1 atendimento.')
        out.push('')

        function bloco(titulo: string, de: number, ate: number) {
          const sub = noIntervalo(de, ate)
          const r = resumirAtendimentos(sub, primeiraVisita)
          out.push(`${titulo} (${dataBonita(de)} a ${dataBonita(ate)})`)
          if (!sub.length) { out.push('  Sem atendimentos registrados neste periodo.'); out.push(''); return r }
          out.push(`  Faturamento: ${fmtR(r.faturamento)}`)
          out.push(`  Atendimentos: ${r.atendimentos}`)
          out.push(`  Servicos executados: ${r.servicos}`)
          out.push(`  Dias trabalhados: ${r.diasTrabalhados}`)
          out.push(`  Ticket medio por atendimento: ${fmtR(r.ticket)}`)
          out.push(`  Media por dia trabalhado: ${fmtR(r.porDia)} em ${r.atendPorDia.toFixed(1)} atendimentos`)
          out.push(`  Clientes distintos: ${r.clientes} (novos no salao: ${r.novos} | ja conheciam: ${r.recorrentes})`)
          if (r.topServicos.length) {
            out.push('  Servicos mais executados:')
            r.topServicos.forEach(([nome, v]) => out.push(`    - ${nome}: ${v.qtd}x (${fmtR(v.valor)})`))
          }
          out.push('')
          return r
        }

        const p1 = bloco(temComparacao ? 'PERIODO 1' : 'PERIODO', ini1, fim1)

        if (temComparacao) {
          const p2 = bloco('PERIODO 2', ini2, fim2)
          out.push('COMPARACAO — PERIODO 1 para PERIODO 2:')
          out.push(`  Faturamento: ${fmtR(p1.faturamento)} -> ${fmtR(p2.faturamento)} (${variacao(p1.faturamento, p2.faturamento)})`)
          out.push(`  Atendimentos: ${p1.atendimentos} -> ${p2.atendimentos} (${variacao(p1.atendimentos, p2.atendimentos)})`)
          out.push(`  Dias trabalhados: ${p1.diasTrabalhados} -> ${p2.diasTrabalhados} (${variacao(p1.diasTrabalhados, p2.diasTrabalhados)})`)
          out.push(`  Ticket medio: ${fmtR(p1.ticket)} -> ${fmtR(p2.ticket)} (${variacao(p1.ticket, p2.ticket)})`)
          out.push(`  Media por dia: ${fmtR(p1.porDia)} -> ${fmtR(p2.porDia)} (${variacao(p1.porDia, p2.porDia)})`)
          out.push(`  Clientes distintos: ${p1.clientes} -> ${p2.clientes} (${variacao(p1.clientes, p2.clientes)})`)
          out.push(`  Clientes novos: ${p1.novos} -> ${p2.novos}`)

          // Quem voltou de um periodo para o outro: fidelizacao de verdade.
          let voltaram = 0
          p1.clientesSet.forEach((c: string) => { if (p2.clientesSet.has(c)) voltaram++ })
          const taxa = p1.clientes ? (voltaram / p1.clientes) * 100 : 0
          out.push(`  Clientes do periodo 1 que voltaram no periodo 2: ${voltaram} de ${p1.clientes} (${taxa.toFixed(1)}%)`)
          out.push('')
          out.push('IMPORTANTE: periodos de tamanhos diferentes nao se comparam direto pelo total.')
          out.push('Para julgar evolucao, use MEDIA POR DIA TRABALHADO e TICKET, nao o faturamento bruto.')
        }

        return out.join('\n')
      }

      case 'buscar_dados_profissional': {
        const { data: profs } = await supabaseAdmin.from('profissionais').select('*').eq('salao_id', salaoId)
        const achado = encontrarProfissional(args.nome || '', profs || [])
        const prof = achado.prof
        if (!prof) return recadoNaoEncontrado(args.nome || '', achado.ambiguos)
        // MODO PROFISSIONAL: só pode consultar a si mesmo.
        if (profissionalId && prof.id !== profissionalId) {
          return 'Neste chat consigo mostrar apenas os seus próprios dados. Para ver dados de outros profissionais, o gestor pode acessar o painel principal.'
        }

        const [{ data: periodos }, { data: ocorrs }, { data: pendencias }] = await Promise.all([
          // FONTE CORRETA: relatorio_periodos (mesma fonte da tela de Faturamento)
          supabaseAdmin.from('relatorio_periodos')
            .select('ano, mes, prof_pagamentos, prof_ticket, prof_preferencia, prof_ocupacao, prof_servicos, prof_produtos')
            .eq('salao_id', salaoId).order('ano').order('mes'),
          supabaseAdmin.from('feedback_prof_respostas').select('tipo, ocorrido_descricao, descricao, criado_em, profissional_nome').eq('salao_id', salaoId).order('criado_em', { ascending: false }),
          supabaseAdmin.from('pendencias_profissionais').select('mensagem, data_limite, resolvido').eq('salao_id', salaoId).eq('profissional_id', prof.id),
        ])

        // Busca serviços habilitados do profissional
        let servicosHabilitadosTexto = ''
        if (prof.servicos_habilitados?.length) {
          const { data: servsSalao } = await supabaseAdmin
            .from('salao_servicos')
            .select('id, nome, categoria, preco_fixo, preco_min, comissao_valor')
            .eq('salao_id', salaoId)
            .in('id', prof.servicos_habilitados)
          if (servsSalao?.length) {
            const porCat: Record<string, string[]> = {}
            servsSalao.forEach((s: any) => {
              if (!porCat[s.categoria]) porCat[s.categoria] = []
              const preco = s.preco_fixo ? `R$ ${Number(s.preco_fixo).toFixed(2)}` : s.preco_min ? `a partir de R$ ${Number(s.preco_min).toFixed(2)}` : ''
              const comissao = s.comissao_valor ? ` (comissão: R$ ${Number(s.comissao_valor).toFixed(2)})` : ''
              porCat[s.categoria].push(`${s.nome} — ${preco}${comissao}`)
            })
            servicosHabilitadosTexto = '\nSERVIÇOS HABILITADOS:\n' + Object.entries(porCat).map(([cat, items]) => `  ${cat}:\n` + items.map(i => `    • ${i}`).join('\n')).join('\n')
          }
        }

        const linhas: string[] = [`PROFISSIONAL: ${prof.nome_completo} (${prof.cargo})`]
        linhas.push(`Apelido: ${prof.apelido || '-'} | CNPJ: ${prof.cnpj || 'não cadastrado'}`)
        if (prof.habilidades) linhas.push(`Habilidades: ${prof.habilidades}`)
        if (servicosHabilitadosTexto) linhas.push(servicosHabilitadosTexto)
        linhas.push('')

        // Match de nome — mesma lógica da tela (preposições filtradas para evitar
        // que "da"/"de"/"do" casem indevidamente com outro profissional, ver metasAnalitico.ts)
        const nomeCompleto = prof.nome_completo.toLowerCase().trim()
        const apelidoProf = (prof.apelido || '').toLowerCase().trim()
        const tokens = nomeCompleto.split(/\s+/).filter((t: string) => t && !STOPWORDS_NOME.has(t)).slice(0, 2)
        function matchProfNome(item: any): boolean {
          const n = (item.profissional || item.profissional_original || '').toLowerCase().trim()
          if (!n) return false
          if (n === nomeCompleto) return true
          if (apelidoCasa(apelidoProf, n)) return true
          const nTokens = n.split(/\s+/).filter((t: string) => t && !STOPWORDS_NOME.has(t))
          if (tokens.length === 0 || nTokens.length === 0) return false
          const matchCount = tokens.filter((t: string) => nTokens.some((nt: string) => nt.startsWith(t) || t.startsWith(nt))).length
          return matchCount >= Math.min(tokens.length, 2)
        }

        // Agrega dados por mês — mesma lógica da tela
        linhas.push('DADOS POR MÊS (fonte: relatorio_periodos — mesma da tela):')
        for (const per of (periodos || [])) {
          const chave = `${MESES[per.mes-1]}/${String(per.ano).slice(2)}`
          let fat = 0, ticket = 0, ticketCount = 0, pref = 0, semPref = 0
          let dias = 0, ocup = 0, ocupCount = 0, servTotal = 0, prodTotal = 0
          let temDados = false
          for (const item of (per.prof_pagamentos || [])) {
            if (matchProfNome(item)) { fat += Number(item.valor_a_pagar||0) + Number(item.desconto||0); temDados = true }
          }
          for (const item of (per.prof_ticket || [])) {
            if (matchProfNome(item)) { ticket += Number(item.ticket_medio||0); ticketCount++; temDados = true }
          }
          for (const item of (per.prof_preferencia || [])) {
            if (matchProfNome(item)) { pref += Number(item.clientes_preferencia||0); semPref += Number(item.clientes_sem_preferencia||0); temDados = true }
          }
          for (const item of (per.prof_ocupacao || [])) {
            if (matchProfNome(item)) { dias += Number(item.dias_trabalhados||0); ocup += Number(item.taxa_ocupacao||0); ocupCount++; temDados = true }
          }
          const servicosDoProf: { nome: string; qtd: number; valor: number }[] = []
          for (const item of (per.prof_servicos || [])) {
            if (matchProfNome(item)) {
              servTotal += Number(item.quantidade||0)
              temDados = true
              if (item.servico) {
                servicosDoProf.push({ nome: item.servico, qtd: Number(item.quantidade||0), valor: Number(item.valor||0) })
              }
            }
          }
          for (const item of (per.prof_produtos || [])) {
            if (matchProfNome(item)) { prodTotal += Number(item.quantidade||0); temDados = true }
          }
          if (temDados) {
            const ticketFinal = ticketCount > 0 ? ticket/ticketCount : (servTotal > 0 ? fat/servTotal : 0)
            const ocupFinal = ocupCount > 0 ? ocup/ocupCount : 0
            linhas.push(`  ${chave}: Faturamento=${fmtR(fat)}, Ticket=${fmtR(ticketFinal)}, Ocupação=${ocupFinal.toFixed(1)}%, Dias=${dias}, ComPreferência=${pref}, SemPreferência=${semPref}, Serviços=${servTotal}, Produtos=${prodTotal}`)
            if (servicosDoProf.length > 0) {
              linhas.push(`    SERVIÇOS REALIZADOS em ${chave}:`)
              servicosDoProf
                .sort((a, b) => b.qtd - a.qtd)
                .forEach(s => {
                  const val = s.valor > 0 ? ` — ${fmtR(s.valor)}` : ''
                  linhas.push(`      • ${s.nome}: ${s.qtd}x${val}`)
                })
            }
          }
        }

        // Ocorrências filtradas por nome do profissional.
        // Comparação por PALAVRA INTEIRA e sem acento: "Janaína" no registro e
        // "JANAINA" no cadastro são a mesma pessoa, e "ana" não pode pescar a
        // "Juliana". A guarda de vazio evita o curinga que causou o bug do café.
        const primeiroNome = tokensNorm(prof.nome_completo)[0] || ''
        const apelidoNome = tokensNorm(prof.apelido)[0] || ''
        const ocorrProf = (ocorrs || []).filter((f: any) => {
          const tokens = tokensNorm(f.profissional_nome)
          if (!tokens.length) return false
          if (primeiroNome && tokens.some(t => palavraCasa(t, primeiroNome))) return true
          if (apelidoNome && tokens.some(t => palavraCasa(t, apelidoNome))) return true
          return false
        })
        if (ocorrProf.length) {
          linhas.push(`\nOCORRÊNCIAS/FEEDBACKS (${ocorrProf.length} registros totais):`)
          // Agrupa por tipo com contagem e datas
          const contagem: Record<string, { qtd: number; datas: string[] }> = {}
          ocorrProf.forEach((f: any) => {
            const tipo = f.ocorrido_descricao || f.tipo || 'Outro'
            if (!contagem[tipo]) contagem[tipo] = { qtd: 0, datas: [] }
            contagem[tipo].qtd++
            if (f.criado_em) contagem[tipo].datas.push(new Date(f.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
          })
          Object.entries(contagem)
            .sort((a,b) => b[1].qtd - a[1].qtd)
            .forEach(([tipo, v]) => {
              const ultimas = v.datas.slice(0, 5).join(', ')
              linhas.push(`  ${tipo}: ${v.qtd}x (últimas datas: ${ultimas})`)
            })
        } else {
          linhas.push('\nNenhuma ocorrência registrada para este profissional.')
        }

        // Pendências
        const pendAbertas = (pendencias || []).filter((p: any) => !p.resolvido)
        if (pendAbertas.length) {
          linhas.push(`\nPENDÊNCIAS (${pendAbertas.length}):`)
          pendAbertas.forEach((p: any) => linhas.push(`  - ${p.mensagem}${p.data_limite ? ` [Vence: ${p.data_limite}]` : ''}`))
        }

        return linhas.join('\n')
      }

      case 'buscar_indicadores_salao': {
        const { data: periodos } = await supabaseAdmin.from('relatorio_periodos').select('ano, mes, resumo_mensal, servicos, produtos').eq('salao_id', salaoId).order('ano').order('mes')

        // Detecta se foi pedido um mês/ano específico
        const periodoArg = (args.periodo || '').toLowerCase()
        const MESES_NOMES: Record<string, number> = {
          jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
          jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
          janeiro: 1, fevereiro: 2, março: 3, abril: 4, maio: 5, junho: 6,
          julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
        }
        let filtroMes = 0, filtroAno = 0
        if (periodoArg) {
          for (const [nome, num] of Object.entries(MESES_NOMES)) {
            if (periodoArg.includes(nome)) { filtroMes = num; break }
          }
          const anoMatch = periodoArg.match(/20\d{2}/)
          if (anoMatch) filtroAno = Number(anoMatch[0])
        }

        const periodosFiltrados = (periodos || []).filter(per => {
          if (filtroMes && per.mes !== filtroMes) return false
          if (filtroAno && per.ano !== filtroAno) return false
          return true
        })

        const linhas: string[] = [filtroMes || filtroAno
          ? `INDICADORES DO SALÃO — ${filtroMes ? MESES[filtroMes-1] : ''}${filtroAno ? '/'+String(filtroAno).slice(2) : ''}:`
          : 'INDICADORES DO SALÃO (histórico completo):']

        const rankServicos: Record<string, number> = {}

        for (const per of periodosFiltrados) {
          const chave = `${MESES[per.mes-1]}/${String(per.ano).slice(2)}`
          for (const item of (per.resumo_mensal || [])) {
            linhas.push(`  ${chave}: Fat ${fmtR(item.faturamento_total||0)}, Ticket ${fmtR(item.ticket_medio||0)}, Clientes ${item.clientes_atendidos||0}, Novos ${item.clientes_novos||0}, Serviços ${fmtR(item.faturamento_servicos||0)}, Produtos ${fmtR(item.faturamento_produtos||0)}`)
          }
          // Serviços do período com quantidade e valor
          const servsPeriodo = (per.servicos || []).filter((s: any) => s.servico)
          if (servsPeriodo.length && (filtroMes || filtroAno)) {
            linhas.push(`\n  SERVIÇOS VENDIDOS em ${chave}:`)
            servsPeriodo
              .sort((a: any, b: any) => Number(b.quantidade||0) - Number(a.quantidade||0))
              .forEach((s: any) => {
                linhas.push(`    • ${(s.servico||'').toUpperCase()}: ${s.quantidade||0}x${s.valor ? ' — '+fmtR(Number(s.valor)) : ''}`)
              })
          }
          for (const s of servsPeriodo) {
            const nome = (s.servico || '').toUpperCase().trim()
            if (nome) rankServicos[nome] = (rankServicos[nome] || 0) + Number(s.quantidade || 0)
          }

          // Produtos do período com quantidade e valor
          const prodsPeriodo = (per.produtos || []).filter((p: any) => p.produto || p.nome)
          if (prodsPeriodo.length && (filtroMes || filtroAno)) {
            linhas.push(`\n  PRODUTOS VENDIDOS em ${chave}:`)
            prodsPeriodo
              .sort((a: any, b: any) => Number(b.quantidade||0) - Number(a.quantidade||0))
              .forEach((p: any) => {
                const nome = (p.produto || p.nome || '').toUpperCase()
                linhas.push(`    • ${nome}: ${p.quantidade||0}x${p.valor ? ' — '+fmtR(Number(p.valor)) : ''}`)
              })
          }
        }

        if (!filtroMes && !filtroAno && Object.keys(rankServicos).length) {
          linhas.push('\nTOP 15 SERVIÇOS (histórico geral):')
          Object.entries(rankServicos).sort((a,b) => b[1]-a[1]).slice(0,15).forEach(([s,q]) => linhas.push(`  ${s}: ${q}x`))
        }

        return linhas.join('\n')
      }

      case 'buscar_comparativo_profissionais': {
        const { data: profs } = await supabaseAdmin
          .from('profissionais').select('id, nome_completo, apelido, cargo')
          .eq('salao_id', salaoId).eq('ativo', true)

        // Busca todos os períodos — filtra por ano se informado
        let query = supabaseAdmin
          .from('relatorio_periodos')
          .select('ano, mes, prof_pagamentos, prof_servicos, prof_ticket, prof_ocupacao, prof_preferencia')
          .eq('salao_id', salaoId)
          .order('ano').order('mes')

        const anoInicio = args.ano_inicio ? Number(args.ano_inicio) : 0
        const anoFim = args.ano_fim ? Number(args.ano_fim) : 9999
        if (anoInicio) query = query.gte('ano', anoInicio)
        if (anoFim < 9999) query = query.lte('ano', anoFim)

        const { data: periodos } = await query

        const { data: ocorrs } = await supabaseAdmin
          .from('feedback_prof_respostas').select('profissional_nome, tipo').eq('salao_id', salaoId)

        // Agrega por profissional usando match de nome (mesma lógica da tela)
        const fatMap: Record<string, number> = {}
        const servMap: Record<string, number> = {}
        const tickMap: Record<string, number[]> = {}
        const ocupMap: Record<string, number[]> = {}
        const prefMap: Record<string, number> = {}
        const semPrefMap: Record<string, number> = {}

        for (const per of (periodos || [])) {
          for (const item of (per.prof_pagamentos || [])) {
            const n = item.profissional || ''; if (!n) continue
            fatMap[n] = (fatMap[n] || 0) + Number(item.valor_a_pagar||0) + Number(item.desconto||0)
          }
          for (const item of (per.prof_servicos || [])) {
            const n = item.profissional || ''; if (!n) continue
            servMap[n] = (servMap[n] || 0) + Number(item.quantidade||0)
          }
          for (const item of (per.prof_ticket || [])) {
            const n = item.profissional || ''; if (!n) continue
            if (!tickMap[n]) tickMap[n] = []
            tickMap[n].push(Number(item.ticket_medio||0))
          }
          for (const item of (per.prof_ocupacao || [])) {
            const n = item.profissional || ''; if (!n) continue
            if (!ocupMap[n]) ocupMap[n] = []
            ocupMap[n].push(Number(item.taxa_ocupacao||0))
          }
          for (const item of (per.prof_preferencia || [])) {
            const n = item.profissional || ''; if (!n) continue
            prefMap[n] = (prefMap[n] || 0) + Number(item.clientes_preferencia||0)
            semPrefMap[n] = (semPrefMap[n] || 0) + Number(item.clientes_sem_preferencia||0)
          }
        }

        // Ocorrências por tipo
        const ocorrNegMap: Record<string, number> = {}
        const ocorrPosMap: Record<string, number> = {}
        for (const f of (ocorrs || [])) {
          const n = f.profissional_nome || ''
          if (f.tipo === 'negativo') ocorrNegMap[n] = (ocorrNegMap[n] || 0) + 1
          else ocorrPosMap[n] = (ocorrPosMap[n] || 0) + 1
        }

        // Cruza profissionais com dados aggregados — exige nome E sobrenome batendo
        // (não só o primeiro nome) para não misturar dois profissionais com nome em comum
        function resolverNome(p: any) {
          const nome = p.nome_completo
          const apelido = p.apelido || ''
          // Tenta match exato, depois por apelido
          if (fatMap[nome]) return nome
          if (apelido && fatMap[apelido]) return apelido
          const tokensNome = nome.toLowerCase().split(/\s+/).filter((t: string) => t && !STOPWORDS_NOME.has(t)).slice(0, 2)
          if (tokensNome.length < 2) return nome
          const achado = Object.keys(fatMap).find((k) => {
            const kTokens = k.toLowerCase().split(/\s+/).filter((t: string) => t && !STOPWORDS_NOME.has(t))
            return tokensNome.every((t: string) => kTokens.some((kt: string) => kt.startsWith(t) || t.startsWith(kt)))
          })
          return achado || nome
        }

        const cargo = args.cargo?.toLowerCase() || ''
        const profsFiltrados = (profs || []).filter((p: any) => !cargo || p.cargo?.toLowerCase().includes(cargo))
        profsFiltrados.sort((a: any, b: any) => {
          const nA = resolverNome(a), nB = resolverNome(b)
          return (fatMap[nB] || 0) - (fatMap[nA] || 0)
        })

        const periodoLabel = anoInicio ? `${anoInicio}${anoFim < 9999 ? ' a ' + anoFim : ' em diante'}` : 'todo o período'
        const linhas: string[] = [`RANKING DE PROFISSIONAIS — ${periodoLabel} (ordenado por faturamento):\n`]
        linhas.push('| # | Profissional | Cargo | Faturamento | Serviços | Ticket Médio | Ocupação | Fidelizados | Recepção | Ocorr.Neg | Ocorr.Pos |')
        linhas.push('|---|---|---|---|---|---|---|---|---|---|---|')

        profsFiltrados.forEach((p: any, i: number) => {
          const n = resolverNome(p)
          const fat = fatMap[n] || 0
          const serv = servMap[n] || 0
          const ticks = tickMap[n] || []
          const tick = ticks.length ? ticks.reduce((a: number, b: number) => a + b, 0) / ticks.length : 0
          const ocups = ocupMap[n] || []
          const ocup = ocups.length ? ocups.reduce((a: number, b: number) => a + b, 0) / ocups.length : 0
          const fidelizados = prefMap[n] || 0
          const recepcao = semPrefMap[n] || 0
          const neg = ocorrNegMap[p.nome_completo] || ocorrNegMap[p.apelido] || 0
          const pos = ocorrPosMap[p.nome_completo] || ocorrPosMap[p.apelido] || 0
          if (fat > 0 || serv > 0) {
            linhas.push(`| ${i+1}º | ${p.nome_completo} | ${p.cargo} | ${fmtR(fat)} | ${serv} | ${fmtR(tick)} | ${ocup.toFixed(0)}% | ${fidelizados} | ${recepcao} | ${neg} | ${pos} |`)
          }
        })

        return linhas.join('\n')
      }

      case 'buscar_feedbacks_clientes': {
        const { data: feedbacks } = await supabaseAdmin.from('feedback_respostas').select('nota_geral, comentario, criado_em').eq('salao_id', salaoId).order('criado_em', { ascending: false })

        if (!feedbacks?.length) return 'Nenhum feedback de clientes registrado.'

        const notas = feedbacks.map((f: any) => Number(f.nota_geral)).filter(n => !isNaN(n) && n > 0)
        const media = notas.reduce((a,b) => a+b, 0) / notas.length
        const promotores = notas.filter(n => n >= 9).length
        const neutros = notas.filter(n => n >= 7 && n < 9).length
        const detratores = notas.filter(n => n < 7).length
        const nps = Math.round(((promotores - detratores) / notas.length) * 100)

        const linhas = [
          `FEEDBACKS DE CLIENTES (${feedbacks.length} avaliações):`,
          `Média: ${media.toFixed(1)}/10`,
          `NPS: ${nps} | Promotores: ${promotores} | Neutros: ${neutros} | Detratores: ${detratores}`,
          '',
          'Comentários recentes:'
        ]
        feedbacks.filter((f: any) => f.comentario).slice(0, 10).forEach((f: any) => {
          const data = new Date(f.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          linhas.push(`  [${data}] Nota ${f.nota_geral}: ${f.comentario}`)
        })

        return linhas.join('\n')
      }

      case 'buscar_academia': {
        const { data: artigos } = await supabaseAdmin
          .from('academia_artigos')
          .select('titulo, resumo, conteudo, categoria, emoji')
          .eq('ativo', true)
          .order('categoria')
          .order('ordem')

        if (!artigos?.length) return 'Nenhum artigo encontrado na Academia.'

        // Filtra por tema se fornecido
        const tema = (args.tema || '').toLowerCase()
        const filtrados = tema
          ? artigos.filter((a: any) =>
              a.titulo.toLowerCase().includes(tema) ||
              (a.resumo || '').toLowerCase().includes(tema) ||
              (a.conteudo || '').toLowerCase().includes(tema) ||
              a.categoria.toLowerCase().includes(tema)
            )
          : artigos

        if (!filtrados.length) {
          const todos = artigos.map((a: any) => `${a.emoji} ${a.titulo} (${a.categoria})`).join('\n')
          return `Nenhum artigo encontrado sobre "${tema}".\n\nArtigos disponíveis:\n${todos}`
        }

        // Retorna até 3 artigos mais relevantes com conteúdo completo
        const linhas = [`ARTIGOS DA ACADEMIA NODRI${tema ? ` — sobre "${tema}"` : ''} (${filtrados.length} encontrados):\n`]
        filtrados.slice(0, 3).forEach((a: any) => {
          linhas.push(`\n${'═'.repeat(40)}`)
          linhas.push(`${a.emoji} ${a.titulo.toUpperCase()}`)
          linhas.push(`Categoria: ${a.categoria}`)
          if (a.resumo) linhas.push(`Resumo: ${a.resumo}`)
          linhas.push(`\n${a.conteudo}`)
        })

        if (filtrados.length > 3) {
          linhas.push(`\n... e mais ${filtrados.length - 3} artigos relacionados.`)
        }

        return linhas.join('\n')
      }

      case 'buscar_servicos_salao': {
        const { data: servicos } = await supabaseAdmin
          .from('salao_servicos')
          .select('categoria, nome, preco_min, preco_fixo, observacao')
          .eq('salao_id', salaoId)
          .eq('ativo', true)
          .order('categoria')
          .order('nome')

        if (!servicos?.length) return 'Tabela de serviços não cadastrada para este salão.'

        const porCategoria: Record<string, string[]> = {}
        servicos.forEach((s: any) => {
          if (!porCategoria[s.categoria]) porCategoria[s.categoria] = []
          let preco = ''
          if (s.preco_fixo) preco = `R$ ${Number(s.preco_fixo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          else if (s.preco_min) preco = `A partir de R$ ${Number(s.preco_min).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          const comissao = s.comissao_valor ? ` | comissão: R$ ${Number(s.comissao_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''
          const obs = s.observacao ? ` (${s.observacao})` : ''
          porCategoria[s.categoria].push(`  • ${s.nome} [id:${s.id}]: ${preco}${comissao}${obs}`)
        })

        const linhas = ['TABELA DE SERVIÇOS E PREÇOS DO SALÃO:\n']
        Object.entries(porCategoria).forEach(([cat, items]) => {
          linhas.push(`${cat.toUpperCase()}`)
          linhas.push(...items)
          linhas.push('')
        })

        return linhas.join('\n')
      }

      case 'buscar_faturamento_por_dia_semana': {
        const anosAtras = Math.min(Math.max(parseInt(args.anos_atras) || 2, 1), 5)
        const diaFiltro = (args.dia_semana || '').toLowerCase().trim() // ex: "domingo", "sábado"

        const dataCorte = new Date()
        dataCorte.setFullYear(dataCorte.getFullYear() - anosAtras)
        const anoCorte = dataCorte.getFullYear()
        const mesCorte = dataCorte.getMonth() + 1

        const { data: periodos } = await supabaseAdmin
          .from('relatorio_periodos')
          .select('ano, mes, faturamento_diario')
          .eq('salao_id', salaoId)
          .or(`ano.gt.${anoCorte},and(ano.eq.${anoCorte},mes.gte.${mesCorte})`)
          .order('ano').order('mes')

        // Agrupa por dia da semana
        const totaisPorDia: Record<string, { total: number; ocorrencias: number; dias: string[] }> = {}
        for (const p of (periodos || [])) {
          for (const item of (p.faturamento_diario || [])) {
            const dia = (item.dia_semana || '').toLowerCase().trim()
            if (!dia) continue
            if (diaFiltro && !dia.includes(diaFiltro) && !diaFiltro.includes(dia)) continue
            if (!totaisPorDia[dia]) totaisPorDia[dia] = { total: 0, ocorrencias: 0, dias: [] }
            totaisPorDia[dia].total += Number(item.valor || 0)
            totaisPorDia[dia].ocorrencias++
            if (item.data) totaisPorDia[dia].dias.push(item.data)
          }
        }

        if (Object.keys(totaisPorDia).length === 0) return 'Nenhum dado de faturamento diário encontrado para o período solicitado.'

        const fmtR = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        const linhas: string[] = [`FATURAMENTO POR DIA DA SEMANA — últimos ${anosAtras} ano(s):\n`]

        const ordem = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
        const diasOrdenados = Object.entries(totaisPorDia).sort((a, b) => {
          const ia = ordem.findIndex(d => a[0].includes(d))
          const ib = ordem.findIndex(d => b[0].includes(d))
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
        })

        for (const [dia, dados] of diasOrdenados) {
          const media = dados.ocorrencias > 0 ? dados.total / dados.ocorrencias : 0
          linhas.push(`${dia.charAt(0).toUpperCase() + dia.slice(1)}`)
          linhas.push(`  Total acumulado: ${fmtR(dados.total)}`)
          linhas.push(`  Quantidade de dias: ${dados.ocorrencias}`)
          linhas.push(`  Média por dia: ${fmtR(media)}`)
          linhas.push('')
        }

        // Se filtrou por dia específico, mostra histórico mês a mês
        if (diaFiltro && Object.keys(totaisPorDia).length === 1) {
          const [, dados] = Object.entries(totaisPorDia)[0]
          if (dados.dias.length > 0) {
            linhas.push(`DETALHE POR DATA (${diaFiltro}s):`)
            // Agrupa por ano/mês para mostrar totais mensais
            const porMes: Record<string, number> = {}
            for (const p of (periodos || [])) {
              let totalMes = 0
              for (const item of (p.faturamento_diario || [])) {
                const dia = (item.dia_semana || '').toLowerCase().trim()
                if (diaFiltro && (dia.includes(diaFiltro) || diaFiltro.includes(dia))) {
                  totalMes += Number(item.valor || 0)
                }
              }
              if (totalMes > 0) porMes[`${String(p.mes).padStart(2,'0')}/${p.ano}`] = totalMes
            }
            Object.entries(porMes).forEach(([periodo, val]) => {
              linhas.push(`  ${periodo}: ${fmtR(val)}`)
            })
          }
        }

        return linhas.join('\n')
      }

      case 'buscar_internet': {
        // Busca keys Tavily no banco (rotação automática)
        const { data: keysData } = await supabaseAdmin
          .from('ia_config_global')
          .select('tavily_keys')
          .limit(1)
          .maybeSingle()

        const keys: string[] = keysData?.tavily_keys || []
        if (!keys.length) return 'Busca na internet não configurada. Adicione as keys Tavily no painel admin.'

        const query = args.query || ''
        if (!query) return 'Nenhuma query informada para busca.'

        // Tenta cada key até uma funcionar
        for (const key of keys) {
          try {
            const res = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: key,
                query: `${query} salão de beleza`,
                search_depth: 'basic',
                max_results: 5,
                include_answer: true,
                include_raw_content: false,
              }),
            })

            if (!res.ok) continue

            const data = await res.json()

            const linhas: string[] = [`RESULTADOS DA INTERNET — "${query}":\n`]

            if (data.answer) {
              linhas.push(`RESPOSTA DIRETA:\n${data.answer}\n`)
            }

            if (data.results?.length) {
              linhas.push('FONTES:')
              data.results.slice(0, 4).forEach((r: any) => {
                linhas.push(`\n• ${r.title}`)
                if (r.content) linhas.push(`  ${r.content.slice(0, 400)}`)
                linhas.push(`  Fonte: ${r.url}`)
              })
            }

            return linhas.join('\n')
          } catch { continue }
        }

        return 'Não foi possível realizar a busca na internet no momento. Tente novamente.'
      }

      default:
        return `Ferramenta "${nome}" não reconhecida.`
    }
  } catch (err: any) {
    return `Erro ao executar ferramenta: ${err.message}`
  }
}

export const FERRAMENTAS_GEMINI = [
  {
    functionDeclarations: [
      {
        name: 'buscar_atendimentos_periodo',
        description: 'Busca atendimentos POR DATA a partir do atendimentos_raw (dado diario). USAR SEMPRE que a pergunta envolver um intervalo de datas, um dia especifico, comparacao antes/depois de uma data, evolucao a partir de uma reuniao ou marco, dias trabalhados, clientes novos contra clientes que voltaram, ou taxa de retorno. As outras ferramentas so tem dado MENSAL e nao conseguem responder recortes dentro do mes. Aceita dois periodos para comparar de uma vez.',
        parameters: {
          type: 'OBJECT',
          properties: {
            nome: { type: 'STRING', description: 'Nome do profissional. Vazio = salao inteiro. No chat de um profissional e ignorado: ele so ve os proprios dados.' },
            data_inicio: { type: 'STRING', description: 'Inicio do periodo, formato DD/MM/AAAA. Obrigatorio.' },
            data_fim: { type: 'STRING', description: 'Fim do periodo, formato DD/MM/AAAA. Obrigatorio.' },
            comparar_inicio: { type: 'STRING', description: 'Opcional. Inicio de um SEGUNDO periodo para comparar com o primeiro, DD/MM/AAAA.' },
            comparar_fim: { type: 'STRING', description: 'Opcional. Fim do segundo periodo, DD/MM/AAAA.' }
          },
          required: ['data_inicio', 'data_fim']
        }
      },
      {
        name: 'buscar_meta_profissional',
        description: 'Busca a META DO MES ja calculada: meta mensal, realizado, quanto falta, dias restantes, necessario por dia, chance de bater e principal gargalo. USAR SEMPRE E OBRIGATORIAMENTE em qualquer pergunta sobre meta, quanto falta, se vai bater, quanto precisa por dia, corrida ou desafio. NUNCA calcular esses numeros por conta propria a partir de faturamento: os valores desta ferramenta sao os mesmos que aparecem na tela do sistema, e qualquer conta feita a mao vai divergir da tela.',
        parameters: {
          type: 'OBJECT',
          properties: {
            nome: { type: 'STRING', description: 'Nome do profissional. No chat de um profissional pode deixar vazio: ele so consulta a propria meta.' },
            ano: { type: 'NUMBER', description: 'Ano da meta. Vazio = ano atual.' },
            mes: { type: 'NUMBER', description: 'Mes da meta (1 a 12). Vazio = mes atual.' }
          }
        }
      },
      {
        name: 'buscar_dados_profissional',
        description: 'Busca dados REAIS e PRECISOS do banco sobre um profissional específico pelo nome. Retorna: faturamento histórico mês a mês, ticket médio, taxa de ocupação, total de serviços, clientes com preferência (fidelizados), clientes sem preferência (distribuídos pela recepção), dias trabalhados, produtos vendidos, ocorrências e pendências. USAR OBRIGATORIAMENTE quando o usuário perguntar qualquer dado específico de um profissional: sem preferência, com preferência, ocupação, faturamento, serviços, ticket, ocorrências, dias trabalhados — mesmo que o contexto já tenha algum dado. A ferramenta garante precisão total. NÃO usar para perguntas conceituais como "o que é ticket médio".',
        parameters: {
          type: 'OBJECT',
          properties: {
            nome: { type: 'STRING', description: 'Nome ou apelido do profissional' }
          },
          required: ['nome']
        }
      },
      {
        name: 'buscar_indicadores_salao',
        description: 'Busca os indicadores gerais do salão: faturamento total, ticket médio, clientes atendidos, clientes novos, faturamento de serviços vs produtos, ranking de serviços e produtos. Quando um mês/ano específico for informado, retorna TODOS os serviços E produtos vendidos naquele período com quantidade e valor.',
        parameters: {
          type: 'OBJECT',
          properties: {
            periodo: { type: 'STRING', description: 'Período específico, ex: "junho 2025", "março 2026". Deixar vazio para histórico geral.' }
          }
        }
      },
      {
        name: 'buscar_comparativo_profissionais',
        description: 'Busca dados REAIS comparando todos os profissionais: faturamento, serviços, ticket médio, ocupação, fidelizados, recepção e ocorrências. Suporta filtro por período (ano_inicio, ano_fim). Usar quando pedir ranking, comparativo, quem performa melhor/pior, quem deve ser desligado, análise geral da equipe.',
        parameters: {
          type: 'OBJECT',
          properties: {
            cargo: { type: 'STRING', description: 'Filtro por cargo. Ex: "manicure". Vazio para todos.' },
            ano_inicio: { type: 'NUMBER', description: 'Ano inicial do período. Ex: 2024. Vazio para todo o histórico.' },
            ano_fim: { type: 'NUMBER', description: 'Ano final do período. Ex: 2026. Vazio para sem limite.' }
          }
        }
      },
      {
        name: 'buscar_feedbacks_clientes',
        description: 'Busca feedbacks e avaliações dos clientes: NPS, média geral, promotores, detratores e comentários.',
        parameters: { type: 'OBJECT', properties: {} }
      },
      {
        name: 'buscar_academia',
        description: 'Busca artigos da Academia NODRI sobre gestão, marketing, equipe, atendimento e operação. Usar quando o usuário perguntar como fazer algo (feedback, reativação, estoque, precificação, conflitos, motivação, etc.) ou quando tiver um artigo relevante para complementar a resposta. Sempre que houver conteúdo na Academia sobre o tema, citar e usar.',
        parameters: {
          type: 'OBJECT',
          properties: {
            tema: { type: 'STRING', description: 'Tema ou palavra-chave para buscar. Ex: "feedback", "estoque", "reativação", "comissão", "conflito".' }
          }
        }
      },
      {
        name: 'buscar_servicos_salao',
        description: 'Busca a tabela de serviços e preços do salão. Usar quando o gestor perguntar sobre preços, quiser criar promoção, montar combo, calcular receita potencial, sugerir upsell, criar campanha comercial ou qualquer ação que envolva os serviços e valores do salão. Retorna todos os serviços organizados por categoria com preços reais.',
        parameters: {
          type: 'OBJECT',
          properties: {
            categoria: { type: 'STRING', description: 'Filtrar por categoria específica (opcional). Ex: "Unhas", "Coloração", "Massagem". Deixar vazio para retornar todos os serviços.' }
          }
        }
      },
      {
        name: 'buscar_faturamento_por_dia_semana',
        description: 'Busca o faturamento REAL do salão agrupado por dia da semana (segunda, terça, quarta, quinta, sexta, sábado, domingo) com base nos dados diários registrados no sistema. Usar quando o gestor perguntar sobre faturamento de um dia específico da semana, comparar dias, ver se vale abrir no domingo, análise de performance por dia da semana. Retorna total acumulado, quantidade de dias e média por dia para cada dia da semana.',
        parameters: {
          type: 'OBJECT',
          properties: {
            dia_semana: { type: 'STRING', description: 'Dia da semana para filtrar. Ex: "domingo", "sábado", "segunda". Deixar vazio para retornar todos os dias.' },
            anos_atras: { type: 'STRING', description: 'Quantos anos de histórico buscar. Padrão: 2. Máximo: 5.' }
          }
        }
      },
      {
        name: 'buscar_internet',
        description: 'Busca informações atualizadas na internet sobre técnicas de procedimentos de salão, colorimetria, tratamentos capilares, tendências de beleza, produtos, técnicas de manicure, estética e qualquer tema relacionado a salão de beleza. Usar quando o usuário perguntar sobre técnicas específicas, procedimentos, produtos ou tendências que exigem informação atualizada da internet. NÃO usar para dados do salão (faturamento, profissionais) — esses têm ferramentas próprias.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'O que buscar na internet. Ex: "técnica balayage passo a passo", "botox capilar como aplicar", "tendências colorimetria 2025".' }
          },
          required: ['query']
        }
      }
    ]
  }
]

// ── As mesmas ferramentas, no formato da Anthropic ──────────────────────────
//
// Sao as MESMAS ferramentas, nao uma segunda lista: derivar da declaracao do
// Gemini e o que garante que os dois provedores enxerguem exatamente o mesmo
// conjunto. Manter duas listas paralelas na mao acabaria com uma delas
// desatualizada, e aí a IA responderia diferente dependendo de quem atendeu.
//
// A diferenca entre os formatos e so casca: o Gemini escreve os tipos em
// maiuscula ('STRING') e chama de `parameters`; a Anthropic usa minuscula e
// chama de `input_schema`.
function tiposParaMinusculo(no: any): any {
  if (!no || typeof no !== 'object') return no
  if (Array.isArray(no)) return no.map(tiposParaMinusculo)
  const saida: any = {}
  for (const [k, v] of Object.entries(no)) {
    if (k === 'type' && typeof v === 'string') saida[k] = v.toLowerCase()
    else saida[k] = tiposParaMinusculo(v)
  }
  return saida
}

export const FERRAMENTAS_CLAUDE = FERRAMENTAS_GEMINI.flatMap((g: any) =>
  (g.functionDeclarations || []).map((f: any) => ({
    name: f.name,
    description: f.description,
    input_schema: tiposParaMinusculo(f.parameters) || { type: 'object', properties: {} },
  })),
)
