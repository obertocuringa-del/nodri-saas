// ─────────────────────────────────────────────────────────────────────────────
// CONTENT SCRIPT — roda dentro do Avec (admin.avec.beauty).
//
// Lê a tela de histórico de caixa e devolve, por comanda: quem fechou, quanto
// entrou e em que forma de pagamento. Não clica em nada, não muda nada, não
// salva nada no Avec. Só lê o que já está na tela.
//
// Duas regras que valem mais que qualquer seletor bonito:
//
//   1. NUNCA INVENTAR. Se a tela não é a esperada, ou a tabela não tem as
//      colunas necessárias, o script devolve o que ENCONTROU (os títulos das
//      colunas que viu) em vez de devolver dado meia-boca. Conferência que
//      chuta é pior que conferência nenhuma, porque some com a desconfiança.
//
//   2. ESPERAR DE VERDADE. O Avec monta a tabela depois da página. Então o
//      script espera a tabela APARECER e ficar parada (duas leituras iguais
//      seguidas), em vez de dormir um tempo fixo e torcer.
//
// Os títulos das colunas são procurados por texto normalizado (sem acento, sem
// caixa alta) e por sinônimo, para o script sobreviver a "Comanda", "Nº
// Comanda", "N. da comanda" e afins.
// ─────────────────────────────────────────────────────────────────────────────

;(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()

  const norm = s => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

  // "R$ 1.234,56" → 1234.56 · "1,234.56" nunca aparece aqui, é sistema BR.
  function dinheiro(s) {
    const t = String(s || '').replace(/[^\d,.-]/g, '')
    if (!t) return null
    const n = Number(t.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  function numeroComanda(s) {
    const m = /(\d{1,10})/.exec(String(s || ''))
    return m ? m[1] : ''
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

  // Espera a tabela parar de crescer: duas contagens iguais seguidas. É o que
  // evita ler 12 das 47 comandas porque a página ainda estava montando.
  async function esperarEstabilizar(medir, ms = 15000) {
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
    comanda:     ['comanda', 'n comanda', 'no comanda', 'numero comanda', 'num comanda', 'ficha', 'atendimento'],
    valor:       ['valor', 'valor pago', 'valor recebido', 'total', 'valor total', 'recebido', 'pago'],
    forma:       ['forma', 'forma pagamento', 'forma de pagamento', 'pagamento', 'tipo pagamento', 'meio pagamento'],
    responsavel: ['responsavel', 'operador', 'usuario', 'caixa', 'atendente', 'recepcionista', 'funcionario'],
    bandeira:    ['bandeira', 'cartao', 'operadora'],
    parcelas:    ['parcelas', 'parcela', 'qtd parcelas', 'nº parcelas'],
    abertura:    ['abertura', 'data abertura', 'aberto em', 'hora abertura'],
    fechamento:  ['fechamento', 'data fechamento', 'fechado em', 'hora fechamento'],
    data:        ['data', 'dia', 'data movimento', 'data caixa'],
  }

  function acharColuna(cabecalhos, chave) {
    const alvos = SINONIMOS[chave] || []
    // Primeiro título idêntico; só depois o que apenas contém. Sem isso,
    // "valor desconto" roubaria o lugar de "valor".
    for (const a of alvos) {
      const i = cabecalhos.indexOf(a)
      if (i >= 0) return i
    }
    for (const a of alvos) {
      const i = cabecalhos.findIndex(h => h === a || h.startsWith(a + ' ') || h.endsWith(' ' + a))
      if (i >= 0) return i
    }
    return -1
  }

  function lerTabela(tab) {
    const linhas = Array.from(tab.querySelectorAll('tr'))
    if (!linhas.length) return null

    // O cabeçalho é a primeira linha com <th>; se não houver <th>, a primeira.
    const iCab = linhas.findIndex(tr => tr.querySelector('th'))
    const trCab = iCab >= 0 ? linhas[iCab] : linhas[0]
    const cabecalhos = Array.from(trCab.querySelectorAll('th, td')).map(c => norm(txt(c)))
    if (!cabecalhos.length) return null

    const corpo = linhas.slice((iCab >= 0 ? iCab : 0) + 1)
      .map(tr => Array.from(tr.querySelectorAll('td')).map(c => txt(c)))
      .filter(cs => cs.length && cs.some(c => c))

    return { cabecalhos, corpo }
  }

  /**
   * Lê a tela inteira.
   *
   * Devolve sempre um diagnóstico junto: quando não dá certo, o que o dono
   * manda para nós é isto, e o ajuste sai numa rodada em vez de no escuro.
   */
  function lerTela() {
    const tabelas = Array.from(document.querySelectorAll('table'))
    const diag = []
    const comandas = []
    let responsavelDaTela = ''
    const caixasResumo = []

    for (const tab of tabelas) {
      const t = lerTabela(tab)
      if (!t) continue
      diag.push({ colunas: t.cabecalhos.filter(Boolean), linhas: t.corpo.length })

      const cComanda = acharColuna(t.cabecalhos, 'comanda')
      const cValor = acharColuna(t.cabecalhos, 'valor')
      const cForma = acharColuna(t.cabecalhos, 'forma')
      const cResp = acharColuna(t.cabecalhos, 'responsavel')
      const cBand = acharColuna(t.cabecalhos, 'bandeira')
      const cParc = acharColuna(t.cabecalhos, 'parcelas')
      const cAber = acharColuna(t.cabecalhos, 'abertura')
      const cFech = acharColuna(t.cabecalhos, 'fechamento')

      // Forma A — a tabela é a lista de comandas do caixa.
      if (cComanda >= 0 && cValor >= 0) {
        for (const cs of t.corpo) {
          const comanda = numeroComanda(cs[cComanda])
          const valor = dinheiro(cs[cValor])
          if (!comanda || valor === null) continue
          comandas.push({
            comanda,
            valor,
            forma: cForma >= 0 ? cs[cForma] || '' : '',
            bandeira: cBand >= 0 ? cs[cBand] || undefined : undefined,
            parcelas: cParc >= 0 ? Number(numeroComanda(cs[cParc])) || undefined : undefined,
            responsavel: cResp >= 0 ? cs[cResp] || '' : '',
          })
        }
        continue
      }

      // Forma B — a tabela é o índice dos caixas do dia (um por operador).
      if (cResp >= 0 && (cAber >= 0 || cFech >= 0)) {
        for (const cs of t.corpo) {
          const responsavel = (cs[cResp] || '').trim()
          if (!responsavel) continue
          caixasResumo.push({
            responsavel,
            abertura: cAber >= 0 ? cs[cAber] || '' : '',
            fechamento: cFech >= 0 ? cs[cFech] || '' : '',
            total: cValor >= 0 ? dinheiro(cs[cValor]) : null,
          })
        }
      }
    }

    // Quando a lista de comandas não traz o responsável em coluna própria, ele
    // costuma estar no cabeçalho da tela ("Caixa de FULANA"). Só aceito se
    // achar UM nome — dois seria adivinhação.
    if (!comandas.some(c => c.responsavel)) {
      const cab = txt(document.querySelector('h1, h2, h3, .page-title, .card-header')) || ''
      // O "de" de "Caixa de FULANA" é opcional e NÃO faz parte do nome — sem
      // ele na expressão, o responsável virava "de CARLIANE" e nunca casaria
      // com o nome que vem do resumo dos caixas.
      const m = /(?:caixa|operador|respons[aá]vel|usu[aá]rio)\s*(?:de\s+|d[oa]\s+)?[:\-–]?\s*([A-ZÀ-Ú][\wÀ-ú]+(?:\s+[A-ZÀ-Ú][\wÀ-ú]+)*)/i.exec(cab)
      if (m) responsavelDaTela = m[1].trim()
      else if (caixasResumo.length === 1) responsavelDaTela = caixasResumo[0].responsavel
    }

    return { comandas, caixasResumo, responsavelDaTela, diag, url: location.href }
  }

  /** Agrupa as comandas lidas em caixas, por responsável. */
  function montarCaixas(leitura) {
    const porResp = new Map()
    for (const c of leitura.comandas) {
      const resp = (c.responsavel || leitura.responsavelDaTela || '').trim() || 'Caixa único'
      if (!porResp.has(resp)) porResp.set(resp, [])
      porResp.get(resp).push({
        comanda: c.comanda, valor: c.valor, forma: c.forma,
        bandeira: c.bandeira, parcelas: c.parcelas,
      })
    }
    const resumoPor = new Map(leitura.caixasResumo.map(r => [r.responsavel, r]))
    return Array.from(porResp.entries()).map(([responsavel, comandas]) => {
      const r = resumoPor.get(responsavel)
      return {
        responsavel,
        abertura: r?.abertura || undefined,
        fechamento: r?.fechamento || undefined,
        comandas,
      }
    })
  }

  // ── ordens vindas do service worker ────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
    if (!msg || msg.tipo !== 'ler-caixa') return

    ;(async () => {
      // Espera a tabela existir, e depois parar de crescer.
      const achou = await esperarPor(() => document.querySelector('table tbody tr') || null, 15000)
      if (!achou) {
        responder({
          ok: false,
          erro: 'A tela não carregou nenhuma tabela em 15 segundos.',
          diag: { url: location.href, tabelas: document.querySelectorAll('table').length },
        })
        return
      }
      await esperarEstabilizar(() => document.querySelectorAll('table tbody tr').length)

      const leitura = lerTela()
      const caixas = montarCaixas(leitura)

      if (!caixas.length) {
        responder({
          ok: false,
          erro: 'Achei a tela, mas nenhuma tabela tinha as colunas de comanda e valor.',
          diag: leitura.diag,
          url: leitura.url,
        })
        return
      }

      responder({ ok: true, caixas, url: leitura.url, diag: leitura.diag })
    })()

    return true   // resposta assíncrona
  })
})()
