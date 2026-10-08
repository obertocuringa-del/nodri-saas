// ─────────────────────────────────────────────────────────────────────────────
// CONTENT SCRIPT — a tela de Notas Fiscais do Avec.
//
// Faz o que a pessoa faria à mão: preenche as datas, marca "Emissão", escolhe
// o status "Emitidas" e o tipo de nota, manda mostrar 500 por página e clica
// em Buscar. Depois lê a tabela e, para cada linha, pede ao service worker o
// conteúdo do XML (o link aponta para outro domínio).
//
// ── Coisas que a página real ensinou ──
//
//  - O botão Buscar é um <a> com onclick="financeiroNotaFiscal.listarNotas()".
//  - O "mostrar por página" VOLTA PARA 10 a cada busca. Por isso o 500 é
//    aplicado DEPOIS de buscar, não antes.
//  - A tabela é DataTables do lado do navegador: pôr 500 não faz nova ida ao
//    servidor, só mostra o que já veio. "Mostrando 1 a 57 de 57".
//  - As COLUNAS MUDAM conforme o status: com "Emitidas" aparecem "Data de
//    Emissão" e "Ação", que não existem em "Não emitidas". Por isso nada aqui
//    usa número de coluna -- tudo é achado pelo nome do cabeçalho.
//  - O link do XML tem target vazio: clicar nele SAI DA PÁGINA. Nunca clicar.
//  - A célula do Tomador é "NOME<br>CPF: 000...". O nome é o que vem antes.
// ─────────────────────────────────────────────────────────────────────────────

(() => {
  const VALOR_TIPO = { produto: 'NFC-e', servico: 'NFS-e' }
  const STATUS_EMITIDAS = '1'

  let cancelado = false

  const $ = () => window.jQuery
  const esperar = ms => new Promise(r => setTimeout(r, ms))
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()

  function relatar(conteudo) {
    try { chrome.runtime.sendMessage({ tipo: 'relato', conteudo }, () => { void chrome.runtime.lastError }) } catch { /* */ }
  }
  const etapa = msg => relatar({ tipo: 'etapa', msg })

  function definir(seletor, valor) {
    const el = document.querySelector(seletor)
    if (!el) throw new Error(`Não achei o campo ${seletor} na tela do Avec.`)
    el.value = valor
    const jq = $()
    if (jq) jq(el).trigger('change'); else el.dispatchEvent(new Event('change', { bubbles: true }))
    return el
  }

  /** dd/mm/aaaa a partir do aaaa-mm-dd que vem do NODRI. */
  function paraBr(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
    if (!m) throw new Error(`Data inválida: ${iso}`)
    return `${m[3]}/${m[2]}/${m[1]}`
  }

  /** O "processando" do DataTables é o sinal honesto de que a busca terminou. */
  async function esperarBusca(msMax = 90000) {
    const girando = () => Array.from(
      document.querySelectorAll('.dataTables_processing, [id$="_processing"]'),
    ).some(e => e.offsetParent !== null)

    // Dá um tempo para ele ACENDER (a ida ao servidor não é instantânea)…
    const ateAcender = Date.now() + 4000
    while (Date.now() < ateAcender && !girando()) await esperar(150)
    // …e então espera apagar.
    const ate = Date.now() + msMax
    while (Date.now() < ate && girando()) await esperar(250)
    if (girando()) throw new Error('O Avec ficou carregando por tempo demais.')
    await esperar(600)   // a tabela é desenhada logo depois que o aviso some
  }

  function tabela() {
    return document.querySelector('#tableFilter')
      || Array.from(document.querySelectorAll('table'))
        .find(t => /tomador/i.test(t.tHead?.textContent || ''))
  }

  /** Índice de cada coluna pelo NOME do cabeçalho — a ordem muda por status. */
  function colunas(tab) {
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const cab = Array.from(tab.querySelectorAll('thead th')).map(th => norm(txt(th)))
    const achar = (...nomes) => {
      for (const n of nomes) {
        const i = cab.findIndex(c => c.includes(norm(n)))
        if (i >= 0) return i
      }
      return -1
    }
    return {
      tomador: achar('tomador'),
      comanda: achar('n comanda', 'comanda'),
      valor: achar('valor'),
      emissao: achar('data de emissao'),
      data: achar('data'),
      rps: achar('nrps', 'rps'),
      info: achar('informacao'),
      cabecalho: cab,
    }
  }

  function lerLinhas() {
    const tab = tabela()
    if (!tab) throw new Error('Não achei a tabela de notas na tela do Avec.')
    const col = colunas(tab)
    if (col.tomador < 0) {
      throw new Error('A tabela do Avec veio com colunas que eu não reconheci: ' + col.cabecalho.join(' | '))
    }

    const saida = []
    for (const tr of tab.querySelectorAll('tbody tr')) {
      const tds = tr.querySelectorAll('td')
      if (!tds.length) continue
      // Linha de "nenhum registro" do DataTables
      if (tds.length === 1) continue

      const celula = i => (i >= 0 && tds[i]) ? tds[i] : null
      // "NOME<br>CPF: ..." — fica só a primeira linha.
      const bruto = celula(col.tomador)?.innerHTML || ''
      const nome = txt(Object.assign(document.createElement('div'), {
        innerHTML: bruto.split(/<br\s*\/?>/i)[0] || '',
      }))

      const link = Array.from(tr.querySelectorAll('a'))
        .find(a => /^\s*xml\s*$/i.test(a.textContent || ''))

      saida.push({
        nome: nome || txt(celula(col.tomador)),
        comanda: txt(celula(col.comanda)),
        valor: txt(celula(col.valor)),
        emissao: txt(celula(col.emissao)) || txt(celula(col.data)),
        rps: txt(celula(col.rps)),
        info: txt(celula(col.info)),
        url: link ? link.href : '',
      })
    }
    return saida
  }

  function limpo(s) {
    return String(s || '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function nomeArquivo(molde, item) {
    const nome = limpo(molde || '{nome} - {comanda} - {valor} - {emissao}')
      .split('{nome}').join(limpo(item.nome) || 'sem nome')
      .split('{comanda}').join(limpo(item.comanda).replace(/^N[ºo°]\s*/i, '') || 's-comanda')
      .split('{valor}').join(limpo(item.valor).replace(/^R\$\s*/i, ''))
      .split('{emissao}').join(limpo(item.emissao).split('/').join('-'))
      .split('{rps}').join(limpo(item.rps))
    const curto = nome.slice(0, 150).trim()
    return (curto || 'nota') + '.xml'
  }

  /** Parece mesmo um XML de nota? Página de erro e tela de login também
   *  voltam com status 200 — o que separa é o conteúdo. */
  function pareceXml(texto, tipoConteudo) {
    const t = String(texto || '').trim()
    if (!t) return 'veio vazio'
    if (/^\s*<!doctype html/i.test(t) || /^\s*<html/i.test(t)) return 'veio uma página HTML, não um XML'
    if (!t.startsWith('<')) return 'o conteúdo não começa como XML'
    if (!/<(nfeProc|NFe|nfeProc|CompNfse|Nfse|ConsultarNfseResposta|infNFe)/i.test(t)
        && !/xml/i.test(tipoConteudo || '')) {
      return 'o conteúdo não parece uma nota fiscal'
    }
    return ''
  }

  async function buscarXml(url) {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ tipo: 'buscarXml', url }, resp => {
          void chrome.runtime.lastError
          resolve(resp || { ok: false, erro: 'sem resposta da extensão' })
        })
      } catch (e) { resolve({ ok: false, erro: String(e?.message || e) }) }
    })
  }

  async function executar(job) {
    cancelado = false
    const pausaMs = Math.max(0, Math.min(30000, Number(job.pausaMs) || 900))
    const tentativas = Math.max(1, Math.min(5, Number(job.tentativas) || 3))

    // ── 1. Preencher a busca ──
    // A tela de login do Avec responde no mesmo endereço, então este script
    // carrega nela também. Sem esta conferência o erro seria "não achei o
    // campo #dataini", que não diz a ninguém o que fazer.
    const pedindoSenha = Array.from(document.querySelectorAll('input[type="password"]'))
      .some(i => i.offsetParent !== null)
    if (pedindoSenha || !document.querySelector('#dataini')) {
      throw new Error('O Avec está pedindo login. Entre na sua conta, abra a tela de Notas Fiscais e tente de novo.')
    }

    etapa('Preenchendo o período na tela do Avec…')
    definir('#dataini', paraBr(job.dataIni))
    definir('#datafim', paraBr(job.dataFim))

    const radio = document.querySelector('#tipoDataEmissao')
    if (!radio) throw new Error('Não achei a opção "Emissão" na tela do Avec.')
    radio.checked = true
    radio.click()

    definir('#notaEmitida', STATUS_EMITIDAS)
    definir('#nota', VALOR_TIPO[job.tipo] || VALOR_TIPO.produto)

    // ── 2. Buscar ──
    etapa('Clicando em Buscar…')
    const botao = Array.from(document.querySelectorAll('a, button'))
      .find(b => /listarNotas/.test(b.getAttribute('onclick') || ''))
      || Array.from(document.querySelectorAll('a, button')).find(b => /^\s*buscar\s*$/i.test(txt(b)))
    if (!botao) throw new Error('Não achei o botão Buscar na tela do Avec.')
    botao.click()
    await esperarBusca()

    // ── 3. 500 por página ──
    // Depois da busca, não antes: a cada busca o Avec devolve o seletor para 10.
    const sel = document.querySelector('select[name$="_length"]')
    if (sel) {
      const tem500 = Array.from(sel.options).some(o => o.value === '500')
      sel.value = tem500 ? '500' : sel.options[sel.options.length - 1].value
      const jq = $()
      if (jq) jq(sel).trigger('change'); else sel.dispatchEvent(new Event('change', { bubbles: true }))
      await esperar(1200)
    }

    // ── 4. Ler a tabela ──
    const linhas = lerLinhas()
    const totalTela = txt(document.querySelector('#totalNotas'))
    const paginacao = txt(document.querySelector('#tableFilter_info'))

    if (!linhas.length) {
      relatar({ tipo: 'fim', vazio: true, totalTela, paginacao })
      return
    }

    // Se a paginação diz mais do que lemos, o 500 não pegou e levaríamos só a
    // primeira página sem perceber. Melhor parar e dizer do que entregar pela
    // metade: nota fiscal que falta ninguém descobre olhando o .zip.
    const m = /de\s+([\d.]+)\s+registros/i.exec(paginacao || '')
    const prometidas = m ? Number(m[1].replace(/\./g, '')) : 0
    if (prometidas && prometidas > linhas.length) {
      throw new Error(
        `O Avec diz ter ${prometidas} notas e a tela só mostrou ${linhas.length}. `
        + 'O "mostrar por página" não chegou a 500 — tente de novo.',
      )
    }

    relatar({ tipo: 'lista', total: linhas.length, totalTela, itens: linhas.map(l => ({
      nome: l.nome, comanda: l.comanda, valor: l.valor, emissao: l.emissao, temXml: !!l.url,
    })) })

    // ── 5. Buscar cada XML ──
    const arquivos = []
    const usados = new Set()
    let okN = 0, erroN = 0

    for (let i = 0; i < linhas.length; i++) {
      if (cancelado) { relatar({ tipo: 'fim', cancelado: true }); return }
      const l = linhas[i]

      if (!l.url) {
        erroN++
        relatar({ tipo: 'item', i, ok: false, msg: 'esta linha não tem botão XML' })
        continue
      }

      let conseguiu = false
      let ultimoErro = ''
      for (let t = 1; t <= tentativas && !conseguiu; t++) {
        if (cancelado) { relatar({ tipo: 'fim', cancelado: true }); return }
        if (t > 1) {
          relatar({ tipo: 'item', i, tentando: t, msg: `tentativa ${t} de ${tentativas}…` })
          await esperar(pausaMs * t)   // internet ruim merece espera maior
        }
        const r = await buscarXml(l.url)
        if (!r.ok) { ultimoErro = r.erro || `o servidor respondeu ${r.status}`; continue }
        const problema = pareceXml(r.texto, r.tipoConteudo)
        if (problema) { ultimoErro = problema; continue }

        let nome = nomeArquivo(job.molde, l)
        let n = 2
        while (usados.has(nome.toLowerCase())) {
          nome = nome.replace(/\.xml$/i, '') + ` (${n++}).xml`
        }
        usados.add(nome.toLowerCase())
        arquivos.push({ nome, bytes: new TextEncoder().encode(r.texto) })
        conseguiu = true
        okN++
        relatar({ tipo: 'item', i, ok: true, arquivo: nome, tamanho: r.texto.length })
      }

      if (!conseguiu) {
        erroN++
        relatar({ tipo: 'item', i, ok: false, msg: ultimoErro || 'não deu para baixar' })
      }

      if (i < linhas.length - 1) await esperar(pausaMs)
    }

    // ── 6. Zipar e entregar ──
    if (!arquivos.length) {
      relatar({ tipo: 'fim', erro: 'Nenhum XML foi baixado.', ok: 0, erros: erroN })
      return
    }

    etapa(`Montando o .zip com ${arquivos.length} arquivo(s)…`)
    const blob = montarZip(arquivos)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = limpo(job.nomeZip || 'notas-fiscais') + '.zip'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)

    relatar({
      tipo: 'fim', ok: okN, erros: erroN,
      zip: a.download, tamanhoZip: blob.size, totalTela,
    })
  }

  // ── Conversa com o service worker ──
  chrome.runtime.onMessage.addListener((msg, _s, responder) => {
    if (msg?.tipo === 'ping') { responder({ pronto: true }); return false }
    if (msg?.tipo === 'cancelar') { cancelado = true; return false }
    if (msg?.tipo === 'executar') {
      executar(msg.job).catch(e => {
        relatar({ tipo: 'fim', erro: String(e?.message || e) })
      })
      return false
    }
    return false
  })
})()
