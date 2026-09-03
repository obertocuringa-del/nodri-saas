// ─────────────────────────────────────────────────────────────────────────────
// CONTENT SCRIPT — roda dentro do Avec (admin.avec.beauty).
//
// Lê a tela FINANCEIRO › COMANDAS FINALIZADAS e devolve, por comanda: quem
// fechou o caixa, quanto entrou e a data. Não altera nada no Avec.
//
// ── Por que esta tela, e não o Histórico de Caixas ──────────────────────────
//
// A primeira versão lia o Histórico de Caixas. Olhando a tela de verdade, ela
// não serve: traz responsável, abertura, fechamento e os TOTAIS por forma de
// pagamento — e nenhum número de comanda. Sem comanda não há como confrontar
// item lançado com dinheiro recebido, que é a conferência inteira.
//
// Comandas Finalizadas traz tudo numa tabela só:
//
//   Comanda | Cliente | Caixa responsável | Data de abertura | Valor
//   Nº0977 (29/08/2026) | ELAINE FREITAS | Raissa.Marques - 29/08/2026 09:12 | … | R$ 288,00
//
// ── Duas regras que valem mais que qualquer seletor bonito ─────────────────
//
//   1. NUNCA INVENTAR. Se a tela não é a esperada, devolve o que ENCONTROU
//      (os títulos das colunas que viu) em vez de dado meia-boca. Conferência
//      que chuta é pior que conferência nenhuma: some com a desconfiança.
//
//   2. ESPERAR DE VERDADE. A tabela é montada depois da página. O script
//      espera ela aparecer e ficar parada (duas leituras iguais seguidas), em
//      vez de dormir um tempo fixo e torcer.
//
// ── O que este script mexe na tela, e por quê ──────────────────────────────
//
// Dois controles de EXIBIÇÃO, os dois devolvidos ao estado anterior no fim:
//
//   · o "quantos por página", que ele põe no máximo;
//   · a navegação entre páginas, que ele percorre até a última.
//
// A primeira versão lia só a página aberta. Com um mês de período na tela a
// lista passa de mil comandas, e o dia procurado — por ser o mais recente —
// cai lá no fim. A extensão lia as primeiras e dizia, com toda a convicção,
// que não havia nenhuma comanda daquele dia.
//
// A busca da listagem não serve para isso: ela é do servidor e não procura
// por data — digitar "03/09/2026" nela devolve um registro só.
//
// Nenhum dado do Avec é alterado, nada é salvo, nada é excluído.
// ─────────────────────────────────────────────────────────────────────────────

;(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()

  const norm = s => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

  // "R$ 1.234,56" → 1234.56 · é sistema brasileiro, ponto é milhar.
  function dinheiro(s) {
    const t = String(s || '').replace(/[^\d,.-]/g, '')
    if (!t) return null
    const n = Number(t.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  /**
   * "Nº0977 (29/08/2026)" → { comanda: '977', data: '29/08/2026' }
   *
   * O zero à esquerda cai fora: o relatório importado grava o número sem ele,
   * e "0977" ≠ "977" faria a conferência não achar comanda nenhuma — em
   * silêncio, parecendo um dia sem problema.
   */
  function lerComanda(celula) {
    const bruto = String(celula || '')
    const data = (/(\d{2}\/\d{2}\/\d{4})/.exec(bruto) || [])[1] || ''
    const semData = bruto.replace(/\(.*?\)/g, '')
    const digitos = (/(\d+)/.exec(semData) || [])[1] || ''
    return { comanda: digitos.replace(/^0+/, '') || digitos, data }
  }

  /** Como o Avec chama a comanda que nao passou por caixa nenhum. */
  const SEM_CAIXA = 'Sem caixa'

  /**
   * "Raissa.Marques - 29/08/2026 09:12" → "Raissa.Marques"
   *
   * O Avec também escreve "Não utiliza um caixa." nessa coluna, quando a
   * comanda não passou por caixa nenhum. Isso não é o nome de uma pessoa, e
   * deixar como está faria a tela mostrar um caixa chamado "Não utiliza um
   * caixa." — com cara de recepcionista.
   */
  function lerResponsavel(celula) {
    const bruto = String(celula || '').split(/\s+-\s+\d{2}\//)[0].trim()
    if (/n[aã]o utiliza/i.test(bruto)) return SEM_CAIXA
    return bruto
  }

  async function esperarPor(fn, ms = 15000, passo = 300) {
    const fim = Date.now() + ms
    while (Date.now() < fim) {
      const r = fn()
      if (r) return r
      await sleep(passo)
    }
    return null
  }

  /** Espera a tabela parar de crescer: duas contagens iguais seguidas. */
  async function esperarEstabilizar(medir, ms = 20000) {
    const fim = Date.now() + ms
    let anterior = -1
    let iguais = 0
    while (Date.now() < fim) {
      const agora = medir()
      if (agora > 0 && agora === anterior) {
        iguais++
        if (iguais >= 2) return agora
      } else {
        iguais = 0
      }
      anterior = agora
      await sleep(400)
    }
    return medir()
  }

  // ── colunas ────────────────────────────────────────────────────────────────
  const SINONIMOS = {
    comanda:     ['comanda', 'n comanda', 'no comanda', 'numero comanda', 'ficha'],
    valor:       ['valor', 'valor pago', 'valor recebido', 'total', 'valor total', 'recebido', 'pago'],
    responsavel: ['caixa responsavel', 'responsavel', 'operador', 'usuario', 'caixa', 'atendente'],
    cliente:     ['cliente', 'nome cliente'],
    abertura:    ['data de abertura', 'abertura', 'aberto em'],
    forma:       ['forma pagamento', 'forma de pagamento', 'forma', 'pagamento'],
  }

  function acharColuna(cabecalhos, chave) {
    const alvos = SINONIMOS[chave] || []
    // Título idêntico primeiro; só depois o que apenas contém. Sem isso,
    // "valor desconto" roubaria o lugar de "valor".
    for (const a of alvos) {
      const i = cabecalhos.indexOf(a)
      if (i >= 0) return i
    }
    for (const a of alvos) {
      const i = cabecalhos.findIndex(h => h.startsWith(a + ' ') || h.endsWith(' ' + a))
      if (i >= 0) return i
    }
    return -1
  }

  function lerTabela(tab) {
    const linhas = Array.from(tab.querySelectorAll('tr'))
    if (!linhas.length) return null
    const iCab = linhas.findIndex(tr => tr.querySelector('th'))
    const trCab = iCab >= 0 ? linhas[iCab] : linhas[0]
    const cabecalhos = Array.from(trCab.querySelectorAll('th, td')).map(c => norm(txt(c)))
    if (!cabecalhos.length) return null
    const corpo = linhas.slice((iCab >= 0 ? iCab : 0) + 1)
      .map(tr => Array.from(tr.querySelectorAll('td')).map(c => txt(c)))
      .filter(cs => cs.length && cs.some(c => c))
    return { cabecalhos, corpo }
  }

  /** A tabela de comandas: a que tem coluna de comanda E de valor. */
  function acharTabelaDeComandas() {
    for (const tab of document.querySelectorAll('table')) {
      const t = lerTabela(tab)
      if (!t) continue
      if (acharColuna(t.cabecalhos, 'comanda') >= 0 && acharColuna(t.cabecalhos, 'valor') >= 0) {
        return { elemento: tab, ...t }
      }
    }
    return null
  }

  /** Todos os títulos de coluna que existem na tela — o diagnóstico. */
  function diagnostico() {
    const d = []
    for (const tab of document.querySelectorAll('table')) {
      const t = lerTabela(tab)
      if (t) d.push({ colunas: t.cabecalhos.filter(Boolean), linhas: t.corpo.length })
    }
    return d
  }

  /** Avisa a listagem que o controle mudou, no formato que ela escuta. */
  function avisarMudanca(el) {
    for (const tipo of ['input', 'keyup', 'change']) {
      el.dispatchEvent(new Event(tipo, { bubbles: true }))
    }
  }

  /**
   * Põe o período da tela no dia conferido e manda buscar.
   *
   * É o passo que dispensa a pessoa de configurar a tela à mão. Toca em três
   * controles nomeados e em mais nada: os dois campos de data e o botão
   * Buscar. Os botões de cada linha — editar, imprimir, EXCLUIR — não são
   * tocados em hipótese alguma; é justamente por eles existirem ali que a
   * extensão nunca clica dentro do corpo da tabela.
   *
   * Com o período no dia certo a lista vira uma página só: a leitura fica
   * imediata em vez de varrer mil comandas do mês inteiro.
   */
  async function porODiaNaTela(dataAlvo) {
    if (!dataAlvo) return false
    const ini = document.querySelector('#dataini')
    const fim = document.querySelector('#datafim')
    if (!ini || !fim) return false
    if (ini.value === dataAlvo && fim.value === dataAlvo) return true

    ini.value = dataAlvo
    avisarMudanca(ini)
    fim.value = dataAlvo
    avisarMudanca(fim)

    const buscar = Array.from(document.querySelectorAll('button, a, input[type="submit"]'))
      .find(b => /buscar/i.test(b.textContent || b.value || ''))
    if (!buscar) return false

    const antes = (acharTabelaDeComandas()?.corpo?.[0] || []).join('|')
    buscar.click()

    // Espera a tabela realmente responder ao novo período, em vez de dormir um
    // tempo fixo e ler a lista antiga achando que é a nova.
    await esperarPor(() => {
      const t = acharTabelaDeComandas()
      if (!t) return false
      const agora = (t.corpo[0] || []).join('|')
      return agora !== antes || t.corpo.length === 0
    }, 20000, 400)
    return true
  }

  /** Põe o "por página" no máximo. Devolve como desfazer. */
  async function prepararListagem() {
    const sel = document.querySelector('select[name$="_length"]')
    if (!sel) return async () => {}
    const antes = sel.value
    const maior = Array.from(sel.options)
      .map(o => Number(o.value)).filter(n => Number.isFinite(n) && n > 0)
      .sort((a, b) => b - a)[0]
    if (maior && String(maior) !== antes) {
      sel.value = String(maior)
      avisarMudanca(sel)
      await sleep(900)
    }
    return async () => {
      // Repor o tamanho da página devolve a listagem para a página 1, que é
      // exatamente como o dono a deixou.
      sel.value = antes
      avisarMudanca(sel)
      await sleep(300)
    }
  }

  /**
   * Quantos registros a listagem diz ter.
   *
   * O número vem com separador de milhar ("1,069 Registros"), então a vírgula
   * e o ponto saem antes de virar número. Sem isso "1,069" viraria 1, e a
   * checagem de leitura completa passaria batido — dizendo que estava tudo
   * lido quando faltavam mil linhas.
   */
  function registrosNaListagem() {
    const m = /de\s+([\d.,]+)\s+Registros/i.exec(document.body.innerText || '')
    return m ? Number(String(m[1]).replace(/[.,]/g, '')) : null
  }

  /**
   * Volta a listagem para a primeira página antes de começar a ler.
   *
   * Sem isso a leitura começa onde a lista estiver — se o dono já tinha
   * navegado, ela lê do meio para o fim e devolve um pedaço, achando que leu
   * tudo. Trocar o "por página" também não devolve para o começo: a paginação
   * é do servidor e mantém a posição.
   */
  async function irParaPrimeiraPagina() {
    for (let i = 0; i < 60; i++) {
      const li = document.querySelector('.dataTables_paginate li.prev')
      if (!li || /disabled/.test(li.className)) return
      const t = acharTabelaDeComandas()
      const antes = t?.corpo?.[0] ? t.corpo[0].join('|') : ''
      ;(li.querySelector('a') || li).click()
      await esperarPor(() => {
        const novo = acharTabelaDeComandas()
        const agora = novo?.corpo?.[0] ? novo.corpo[0].join('|') : ''
        return agora && agora !== antes
      }, 12000, 300)
    }
  }

  /** O botão "Próximo →" da listagem, se ele ainda estiver ativo. */
  function botaoProxima() {
    const li = document.querySelector('.dataTables_paginate li.next')
    if (!li || /disabled/.test(li.className)) return null
    return li.querySelector('a') || li
  }

  /**
   * Lê a listagem inteira, página por página.
   *
   * Ler só a página aberta traria um caixa pela metade — e meio caixa é pior
   * que nenhum, porque as comandas que ficaram de fora aparecem como dinheiro
   * que não entrou. O limite de 40 páginas existe só para nunca girar sem fim
   * se a paginação se comportar de um jeito inesperado.
   */
  async function lerTodasAsPaginas() {
    await irParaPrimeiraPagina()

    const linhas = []
    let cabecalhos = null
    let paginas = 0

    while (paginas < 40) {
      const t = acharTabelaDeComandas()
      if (!t) break
      cabecalhos = t.cabecalhos
      linhas.push(...t.corpo)
      paginas++

      const proxima = botaoProxima()
      if (!proxima) break

      const antes = t.corpo[0] ? t.corpo[0].join('|') : ''
      proxima.click()
      // Espera a tabela REALMENTE trocar, e não um tempo fixo: a primeira
      // linha diferente é a prova de que a página virou.
      await esperarPor(() => {
        const novo = acharTabelaDeComandas()
        const agora = novo?.corpo?.[0] ? novo.corpo[0].join('|') : ''
        return agora && agora !== antes
      }, 12000, 300)
    }

    return { cabecalhos, corpo: linhas, paginas }
  }

  // ── a leitura ──────────────────────────────────────────────────────────────
  function montarCaixas(t, dataAlvo) {
    const cComanda = acharColuna(t.cabecalhos, 'comanda')
    const cValor = acharColuna(t.cabecalhos, 'valor')
    const cResp = acharColuna(t.cabecalhos, 'responsavel')
    const cCliente = acharColuna(t.cabecalhos, 'cliente')
    const cForma = acharColuna(t.cabecalhos, 'forma')
    const cAber = acharColuna(t.cabecalhos, 'abertura')

    const porResp = new Map()
    let lidas = 0
    let deOutroDia = 0

    for (const cs of t.corpo) {
      const { comanda, data } = lerComanda(cs[cComanda])
      const valor = dinheiro(cs[cValor])
      if (!comanda || valor === null) continue
      lidas++

      // A tela costuma vir com um período (ex.: 29/08 a 03/09). Fico só com o
      // dia pedido — misturar dias faria dinheiro de terça aparecer na
      // conferência de quarta.
      const doDia = data || (cs[cAber] || '').slice(0, 10)
      if (dataAlvo && doDia && doDia !== dataAlvo) { deOutroDia++; continue }

      const resp = (cResp >= 0 ? lerResponsavel(cs[cResp]) : '') || 'Caixa único'
      // Comanda de valor zero e sem caixa não é dinheiro que entrou: é comanda
      // que não passou pelo caixa. Entra assim mesmo, para a conferência poder
      // dizer que ela existe — mas identificada, não somada a uma pessoa.
      if (!porResp.has(resp)) porResp.set(resp, [])
      porResp.get(resp).push({
        comanda,
        valor,
        forma: cForma >= 0 ? cs[cForma] || '' : '',
        cliente: cCliente >= 0 ? cs[cCliente] || '' : '',
      })
    }

    const caixas = Array.from(porResp.entries()).map(([responsavel, comandas]) => ({
      responsavel, comandas,
    }))
    return { caixas, lidas, deOutroDia }
  }

  // ── ordens vindas do service worker ────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
    if (!msg || msg.tipo !== 'ler-caixa') return

    ;(async () => {
      const achou = await esperarPor(() => document.querySelector('table tbody tr') || null, 15000)
      if (!achou) {
        responder({ ok: false,
          erro: 'A tela não carregou nenhuma tabela em 15 segundos.',
          diag: diagnostico(), url: location.href })
        return
      }

      // Primeiro o período, depois o tamanho da página: filtrar antes deixa
      // menos linha para paginar.
      await porODiaNaTela(msg.data)

      const restaurar = await prepararListagem()
      try {
        if (!acharTabelaDeComandas()) {
          responder({ ok: false,
            erro: 'Achei a tela, mas nenhuma tabela tem as colunas de comanda e valor. '
                + 'Confira se está em Financeiro › Comandas Finalizadas.',
            diag: diagnostico(), url: location.href })
          return
        }

        const total = registrosNaListagem()
        const t = await lerTodasAsPaginas()

        // A prova de que nada ficou para trás: o que a listagem diz ter e o
        // que foi lido têm de bater. Meio caixa é pior que nenhum — as
        // comandas ausentes apareceriam como dinheiro que não entrou.
        if (total !== null && t.corpo.length < total) {
          responder({ ok: false,
            erro: `A listagem tem ${total} registros e só consegui ler ${t.corpo.length} `
                + `em ${t.paginas} página(s). Reduza o período no Avec — de preferência `
                + 'só o dia que você quer conferir — e clique de novo.',
            diag: diagnostico(), url: location.href })
          return
        }

        const { caixas, lidas, deOutroDia } = montarCaixas(t, msg.data)

        if (!caixas.length) {
          responder({ ok: false,
            erro: lidas > 0
              ? `Li ${lidas} comanda(s) do período (${t.paginas} página(s)), e nenhuma é de ${msg.data}. `
                + 'Confira se o período do Avec cobre esse dia.'
              : 'A tabela de comandas veio vazia.',
            diag: diagnostico(), url: location.href })
          return
        }

        responder({ ok: true, caixas, url: location.href,
          lidas, deOutroDia, paginas: t.paginas, totalNaListagem: total, diag: diagnostico() })
      } finally {
        // Devolve a listagem como estava, dê certo ou não.
        await restaurar()
      }
    })()

    return true   // resposta assíncrona
  })
})()
