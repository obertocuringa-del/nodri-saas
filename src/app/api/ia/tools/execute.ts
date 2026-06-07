import { supabaseAdmin } from '@/lib/supabase'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmtR = (v: number) => `R$${(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

// Encontra profissional por nome/apelido
function encontrarProfissional(nome: string, profissionais: any[]) {
  const n = nome.toLowerCase().trim()
  return profissionais.find((p: any) =>
    p.nome_completo?.toLowerCase().includes(n) ||
    p.apelido?.toLowerCase().includes(n) ||
    n.includes(p.apelido?.toLowerCase()?.split(' ')[0] || '') ||
    n.includes(p.nome_completo?.toLowerCase()?.split(' ')[0] || '')
  )
}

export async function executarFerramenta(nome: string, args: any, salaoId: string): Promise<string> {
  try {
    switch (nome) {

      case 'buscar_dados_profissional': {
        const { data: profs } = await supabaseAdmin.from('profissionais').select('*').eq('salao_id', salaoId)
        const prof = encontrarProfissional(args.nome || '', profs || [])
        if (!prof) return `Profissional "${args.nome}" não encontrado.`

        const [{ data: periodos }, { data: ocorrs }, { data: pendencias }] = await Promise.all([
          // FONTE CORRETA: relatorio_periodos (mesma fonte da tela de Faturamento)
          supabaseAdmin.from('relatorio_periodos')
            .select('ano, mes, prof_pagamentos, prof_ticket, prof_preferencia, prof_ocupacao, prof_servicos, prof_produtos')
            .eq('salao_id', salaoId).order('ano').order('mes'),
          supabaseAdmin.from('feedback_prof_respostas').select('tipo, ocorrido_descricao, descricao, criado_em, profissional_nome').eq('salao_id', salaoId).order('criado_em', { ascending: false }),
          supabaseAdmin.from('pendencias_profissionais').select('mensagem, data_limite, resolvido').eq('salao_id', salaoId).eq('profissional_id', prof.id),
        ])

        const linhas: string[] = [`PROFISSIONAL: ${prof.nome_completo} (${prof.cargo})`]
        linhas.push(`Apelido: ${prof.apelido || '-'} | CNPJ: ${prof.cnpj || 'não cadastrado'}`)
        linhas.push('')

        // Match de nome — mesma lógica da tela
        const nomeCompleto = prof.nome_completo.toLowerCase().trim()
        const apelidoProf = (prof.apelido || '').toLowerCase().trim()
        const tokens = nomeCompleto.split(/\s+/).filter(Boolean).slice(0, 2)
        function matchProfNome(item: any): boolean {
          const n = (item.profissional || item.profissional_original || '').toLowerCase().trim()
          if (!n) return false
          if (n === nomeCompleto) return true
          if (apelidoProf && (n === apelidoProf || n.includes(apelidoProf) || apelidoProf.includes(n))) return true
          const nTokens = n.split(/\s+/).filter(Boolean)
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
          for (const item of (per.prof_servicos || [])) {
            if (matchProfNome(item)) { servTotal += Number(item.quantidade||0); temDados = true }
          }
          for (const item of (per.prof_produtos || [])) {
            if (matchProfNome(item)) { prodTotal += Number(item.quantidade||0); temDados = true }
          }
          if (temDados) {
            const ticketFinal = ticketCount > 0 ? ticket/ticketCount : (servTotal > 0 ? fat/servTotal : 0)
            const ocupFinal = ocupCount > 0 ? ocup/ocupCount : 0
            linhas.push(`  ${chave}: Faturamento=${fmtR(fat)}, Ticket=${fmtR(ticketFinal)}, Ocupação=${ocupFinal.toFixed(1)}%, Dias=${dias}, ComPreferência=${pref}, SemPreferência=${semPref}, Serviços=${servTotal}, Produtos=${prodTotal}`)
          }
        }

        // Ocorrências filtradas por nome do profissional
        const primeiroNome = prof.nome_completo?.toLowerCase()?.split(' ')[0] || ''
        const apelidoNome = prof.apelido?.toLowerCase()?.split(' ')[0] || ''
        const ocorrProf = (ocorrs || []).filter((f: any) => {
          const n = (f.profissional_nome || '').toLowerCase()
          return (primeiroNome && n.includes(primeiroNome)) || (apelidoNome && n.includes(apelidoNome))
        })
        if (ocorrProf.length) {
          linhas.push(`\nOCORRÊNCIAS/FEEDBACKS (${ocorrProf.length} registros totais):`)
          // Agrupa por tipo com contagem e datas
          const contagem: Record<string, { qtd: number; datas: string[] }> = {}
          ocorrProf.forEach((f: any) => {
            const tipo = f.ocorrido_descricao || f.tipo || 'Outro'
            if (!contagem[tipo]) contagem[tipo] = { qtd: 0, datas: [] }
            contagem[tipo].qtd++
            if (f.criado_em) contagem[tipo].datas.push(new Date(f.criado_em).toLocaleDateString('pt-BR'))
          })
          Object.entries(contagem)
            .sort((a,b) => b[1].qtd - a[1].qtd)
            .forEach(([tipo, v]) => linhas.push(`  ${tipo}: ${v.qtd}x`))
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
        // Fonte principal: prof_metricas_mensais (usa profissional_id — sem risco de mismatch de nome)
        const { data: profs } = await supabaseAdmin
          .from('profissionais').select('id, nome_completo, apelido, cargo, data_admissao')
          .eq('salao_id', salaoId).eq('ativo', true)

        // Pega os 3 meses mais recentes disponíveis
        const { data: metricas } = await supabaseAdmin
          .from('prof_metricas_mensais')
          .select('profissional_id, ano, mes, faturamento, total_servicos, ticket_medio, taxa_ocupacao, clientes_preferencia, clientes_sem_preferencia')
          .eq('salao_id', salaoId)
          .order('ano', { ascending: false }).order('mes', { ascending: false })

        const { data: ocorrs } = await supabaseAdmin
          .from('feedback_prof_respostas').select('profissional_nome, tipo').eq('salao_id', salaoId)

        // Detecta os 3 meses mais recentes com dados
        const mesesDisponiveis = [...new Set((metricas || []).map((m: any) => `${m.ano}-${m.mes}`))]
          .sort((a, b) => b.localeCompare(a)).slice(0, 3)

        // Agrega por profissional_id (fonte confiável)
        const fatById: Record<string, number> = {}
        const servById: Record<string, number> = {}
        const tickById: Record<string, number[]> = {}
        const ocupById: Record<string, number[]> = {}
        const prefById: Record<string, number> = {}
        const semPrefById: Record<string, number> = {}

        for (const m of (metricas || [])) {
          const chave = `${m.ano}-${m.mes}`
          if (!mesesDisponiveis.includes(chave)) continue
          const id = m.profissional_id
          fatById[id] = (fatById[id] || 0) + Number(m.faturamento || 0)
          servById[id] = (servById[id] || 0) + Number(m.total_servicos || 0)
          if (!tickById[id]) tickById[id] = []
          if (m.ticket_medio) tickById[id].push(Number(m.ticket_medio))
          if (!ocupById[id]) ocupById[id] = []
          if (m.taxa_ocupacao) ocupById[id].push(Number(m.taxa_ocupacao))
          prefById[id] = (prefById[id] || 0) + Number(m.clientes_preferencia || 0)
          semPrefById[id] = (semPrefById[id] || 0) + Number(m.clientes_sem_preferencia || 0)
        }

        // Ocorrências por nome (única fonte disponível)
        const ocorrMap: Record<string, number> = {}
        for (const f of (ocorrs || [])) {
          if (f.tipo === 'negativo') {
            const n = f.profissional_nome || ''
            ocorrMap[n] = (ocorrMap[n] || 0) + 1
          }
        }

        const cargo = args.cargo?.toLowerCase() || ''
        const profsFiltrados = (profs || []).filter((p: any) => !cargo || p.cargo?.toLowerCase().includes(cargo))

        // Ordena por faturamento decrescente para ranking correto
        profsFiltrados.sort((a: any, b: any) => (fatById[b.id] || 0) - (fatById[a.id] || 0))

        const mesesLabel = mesesDisponiveis.map(m => {
          const [ano, mes] = m.split('-')
          return `${MESES[Number(mes)-1]}/${String(ano).slice(2)}`
        }).join(', ')

        const linhas: string[] = [`RANKING DE PROFISSIONAIS — ${mesesLabel} (ordenado por faturamento, fonte: métricas por ID):\n`]
        linhas.push('| # | Profissional | Cargo | Faturamento | Serviços | Ticket Médio | Ocupação | Fidelizados | Recepção | Ocorr.Neg |')
        linhas.push('|---|---|---|---|---|---|---|---|---|---|')

        profsFiltrados.forEach((p: any, i: number) => {
          const fat = fatById[p.id] || 0
          const serv = servById[p.id] || 0
          const ticks = tickById[p.id] || []
          const tick = ticks.length ? ticks.reduce((a: number, b: number) => a + b, 0) / ticks.length : 0
          const ocups = ocupById[p.id] || []
          const ocup = ocups.length ? ocups.reduce((a: number, b: number) => a + b, 0) / ocups.length : 0
          const fidelizados = prefById[p.id] || 0
          const recepcao = semPrefById[p.id] || 0
          const ocorrNeg = ocorrMap[p.nome_completo] || ocorrMap[p.apelido] || 0
          linhas.push(`| ${i+1}º | ${p.nome_completo} | ${p.cargo} | ${fmtR(fat)} | ${serv} | ${fmtR(tick)} | ${ocup.toFixed(0)}% | ${fidelizados} | ${recepcao} | ${ocorrNeg} |`)
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
          const data = new Date(f.criado_em).toLocaleDateString('pt-BR')
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
        description: 'Busca dados REAIS do banco comparando todos os profissionais ativos: faturamento, serviços, ticket médio, ocupação, clientes fidelizados, clientes da recepção e ocorrências. Usar SOMENTE quando o usuário pedir comparação real entre profissionais do salão, ranking ou quem performa melhor/pior. NÃO usar para perguntas conceituais como "o que significa ticket alto com ocupação baixa" — essas devem ser respondidas do conhecimento direto.',
        parameters: {
          type: 'OBJECT',
          properties: {
            cargo: { type: 'STRING', description: 'Filtro por cargo, ex: "manicure", "cabeleireiro". Deixar vazio para todos.' }
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
