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
// ── A única coisa que este script mexe na tela ─────────────────────────────
// O seletor de "quantos por página". A tabela mostra 10 de cada vez e o dia
// pode ter mais; ler só a primeira página devolveria um caixa pela metade —
// que é pior que não ler. Ele põe no máximo, lê, e DEVOLVE ao valor anterior.
// Nenhum dado do Avec é alterado, nada é salvo, nada é clicado além disso.
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

  /**
   * Põe a listagem no máximo por página, para o dia inteiro caber na tela.
   *
   * Devolve uma função que restaura o valor anterior. Ler só a primeira página
   * traria um caixa pela metade, e meio caixa conferido é pior que nenhum:
   * as comandas que ficaram de fora apareceriam como "sem dinheiro recebido".
   */
  async function mostrarTudo() {
    const sel = document.querySelector('select[name$="_length"]')
    if (!sel) return () => {}
    const antes = sel.value
    const maior = Array.from(sel.options)
      .map(o => Number(o.value)).filter(n => Number.isFinite(n) && n > 0)
      .sort((a, b) => b - a)[0]
    if (!maior || String(maior) === antes) return () => {}

    sel.value = String(maior)
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    await sleep(800)
    return async () => {
      sel.value = antes
      sel.dispatchEvent(new Event('change', { bubbles: true }))
      await sleep(300)
    }
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

      const restaurar = await mostrarTudo()
      try {
        await esperarEstabilizar(() => document.querySelectorAll('table tbody tr').length)

        const t = acharTabelaDeComandas()
        if (!t) {
          responder({ ok: false,
            erro: 'Achei a tela, mas nenhuma tabela tem as colunas de comanda e valor. '
                + 'Confira se está em Financeiro › Comandas Finalizadas.',
            diag: diagnostico(), url: location.href })
          return
        }

        const { caixas, lidas, deOutroDia } = montarCaixas(t, msg.data)

        if (!caixas.length) {
          responder({ ok: false,
            erro: lidas > 0
              ? `Li ${lidas} comanda(s), mas nenhuma é de ${msg.data}. `
                + 'Ajuste o período da tela para incluir esse dia e clique de novo.'
              : 'A tabela de comandas veio vazia.',
            diag: diagnostico(), url: location.href })
          return
        }

        responder({ ok: true, caixas, url: location.href,
          lidas, deOutroDia, diag: diagnostico() })
      } finally {
        // Devolve a listagem como estava, dê certo ou não.
        await restaurar()
      }
    })()

    return true   // resposta assíncrona
  })
})()
