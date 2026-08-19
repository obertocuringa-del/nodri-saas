// ─────────────────────────────────────────────────────────────────────────────
// CONTENT SCRIPT — roda dentro das páginas do PGMEI.
//
// Preenche o que um humano preencheria e clica no que ele clicaria. Nada aqui
// tenta contornar o hCaptcha: se a Receita mostrar um desafio, o script avisa a
// fila e PARA, esperando a pessoa resolver.
//
// Os seletores são propositalmente tolerantes (procuram por rótulo, por texto
// do botão e pelo formato do conteúdo, não por id fixo), para sobreviver a
// mudança cosmética no site da Receita.
// ─────────────────────────────────────────────────────────────────────────────

;(() => {
  let jaAgi = false

  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()
  const vis = el => !!(el && el.offsetParent !== null)
  const sleep = ms => new Promise(r => setTimeout(r, ms))

  function enviar(msg) {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(msg, r => { void chrome.runtime.lastError; resolve(r || {}) })
      } catch { resolve({}) }
    })
  }
  const erro = msg => enviar({ tipo: 'pgmei-erro', msg })
  const status = msg => enviar({ tipo: 'pgmei-status', msg })

  async function esperarPor(fn, ms = 12000, passo = 250) {
    const fim = Date.now() + ms
    while (Date.now() < fim) {
      const r = fn()
      if (r) return r
      await sleep(passo)
    }
    return null
  }

  // ── identificação da página ──
  function qualPagina() {
    const u = location.href.toLowerCase()
    if (u.includes('/emissao/gerardas')) return 'gerado'
    if (u.includes('/emissao')) return 'emissao'
    if (u.includes('/identificacao')) return 'identificacao'
    if (u.includes('/home/inicio') || u.includes('/home')) return 'inicio'
    return 'outra'
  }

  // ── helpers de DOM ──
  function botaoPorTexto(...termos) {
    const alvos = Array.from(document.querySelectorAll('button, input[type=submit], input[type=button], a'))
    return alvos.find(el => {
      if (!vis(el)) return false
      const t = (txt(el) + ' ' + (el.value || '') + ' ' + (el.title || '')).toLowerCase()
      return termos.some(x => t.includes(x.toLowerCase()))
    }) || null
  }

  function inputPorRotulo(...termos) {
    // 1) <label for=...>
    for (const l of Array.from(document.querySelectorAll('label'))) {
      const t = txt(l).toLowerCase()
      if (termos.some(x => t.includes(x.toLowerCase()))) {
        const id = l.getAttribute('for')
        if (id) { const el = document.getElementById(id); if (el && vis(el)) return el }
        const dentro = l.querySelector('input, select')
        if (dentro && vis(dentro)) return dentro
      }
    }
    // 2) elemento que contém o texto → primeiro input/select depois dele
    const todos = Array.from(document.querySelectorAll('td, th, div, span, p, legend'))
    for (const el of todos) {
      const t = txt(el).toLowerCase()
      if (!termos.some(x => t.includes(x.toLowerCase()))) continue
      if (t.length > 160) continue
      const dentro = el.querySelector('input:not([type=hidden]), select')
      if (dentro && vis(dentro)) return dentro
      let n = el.nextElementSibling
      for (let i = 0; n && i < 3; i++, n = n.nextElementSibling) {
        if (n.matches?.('input, select') && vis(n)) return n
        const d = n.querySelector?.('input:not([type=hidden]), select')
        if (d && vis(d)) return d
      }
      const pai = el.parentElement
      const d2 = pai?.querySelector('input:not([type=hidden]), select')
      if (d2 && vis(d2)) return d2
    }
    return null
  }

  function setarValor(el, valor) {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(el, valor); else el.value = valor
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('blur', { bubbles: true }))
  }

  function fmtCnpj(d) {
    const s = String(d || '').replace(/\D/g, '').padStart(14, '0')
    return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12, 14)}`
  }

  // Tarja de erro do PGMEI. As mensagens vêm no formato "23998 - Falha ao
  // Gerar a Apuração, limite diário excedido!" — código, hífen e texto. Casar
  // pelo formato, e não pela mensagem, cobre também os erros que ainda não
  // conhecemos.
  function erroDaReceita() {
    const cand = Array.from(document.querySelectorAll('[class*=alert],[class*=erro],[class*=error],[role=alert],.msg,.mensagem'))
    for (const el of cand) {
      if (!vis(el)) continue
      const t = txt(el)
      if (!t || t.length > 260) continue
      if (/^\d{3,6}\s*[-–]\s*\S/.test(t) || /limite di[áa]rio excedido|falha ao gerar/i.test(t)) return t
    }
    return null
  }

  // Desafio visível do hCaptcha (o modo invisível não abre nada e passa direto)
  function desafioAberto() {
    return Array.from(document.querySelectorAll('iframe'))
      .some(f => /hcaptcha|recaptcha/i.test(f.src || '') && vis(f) && f.getBoundingClientRect().height > 120)
  }

  // ── tabela de períodos ──
  function tabelaPeriodos() {
    return Array.from(document.querySelectorAll('table')).find(t =>
      /per[íi]odo de apura/i.test(txt(t.querySelector('thead') || t))) || null
  }

  // Uma linha está EM ABERTO quando traz valores em R$. Linhas sem valor
  // (Total "-") são meses ainda não apurados — não entram.
  function linhasEmAberto(tab) {
    const linhas = Array.from(tab.querySelectorAll('tbody tr, tr')).filter(tr => tr.querySelector('input[type=checkbox]'))
    const out = []
    for (const tr of linhas) {
      const chk = tr.querySelector('input[type=checkbox]')
      if (!chk || chk.disabled) continue
      const cels = Array.from(tr.querySelectorAll('td')).map(txt)
      const reais = cels.filter(c => /^R\$\s*[\d.]+,\d{2}$/.test(c))
      if (reais.length === 0) continue
      // Coluna "Situação": Liquidado / Devedor / A Vencer.
      const situacao = (cels.find(c => /^(liquidado|devedor|a vencer|em aberto)$/i.test(c)) || '').toLowerCase()
      if (situacao.includes('liquidado')) continue      // já pago — nunca marcar
      const periodo = cels.find(c => /^[A-Za-zÇçÃãÉé]+\/\d{4}$/.test(c)) || cels[1] || ''
      const total = reais[reais.length - 1]
      const datas = cels.filter(c => /^\d{2}\/\d{2}\/\d{4}$/.test(c))
      const venc = datas[0] || ''                        // 1ª data = Vencimento; 2ª = Acolhimento
      out.push({ tr, chk, periodo, total, venc, situacao })
    }
    return out
  }

  function dataBR(s) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || ''))
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null
  }

  // Sem esta regra o PGMEI entrega o ano inteiro: os meses "A Vencer" já vêm
  // com o valor cheio na tabela, e marcar todos significaria pagar meses que
  // ainda nem aconteceram.
  function aplicarRegra(linhas, regra) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)
    if (regra === 'todos') return linhas
    return linhas.filter(l => {
      const v = dataBR(l.venc)
      if (!v) return l.situacao.includes('devedor')      // sem data legível: só o que está atrasado
      if (regra === 'so_vencidos') return v < hoje
      return v <= fimDoMes                               // padrão: atrasados + o que vence neste mês
    })
  }

  function somaReais(lista) {
    const n = lista.reduce((a, s) => a + (Number(String(s).replace(/[^\d,]/g, '').replace(',', '.')) || 0), 0)
    return 'R$ ' + n.toFixed(2).replace('.', ',')
  }

  // ─────────────────────────── AÇÕES ───────────────────────────

  async function acaoPreencherCnpj(cnpj) {
    const campo = await esperarPor(() =>
      inputPorRotulo('cnpj completo', 'cnpj') ||
      Array.from(document.querySelectorAll('input[type=text]')).find(vis), 8000)
    if (!campo) return erro('Campo do CNPJ não encontrado na página de identificação.')

    setarValor(campo, fmtCnpj(cnpj))
    await sleep(300)

    const btn = botaoPorTexto('continuar', 'avançar', 'avancar')
    if (!btn) return erro('Botão "Continuar" não encontrado.')
    btn.click()

    // Se o desafio aparecer, avisa a fila e para: quem resolve é a pessoa.
    await sleep(2500)
    if (qualPagina() === 'identificacao' && desafioAberto()) {
      await enviar({ tipo: 'pgmei-captcha' })
    }
  }

  async function acaoIrEmissao() {
    const link = botaoPorTexto('emitir guia de pagamento', 'emitir guia')
    if (link) { link.click(); return }
    const base = location.href.replace(/\/(Home\/Inicio|Home|Identificacao).*$/i, '')
    location.href = base + '/emissao'
  }

  async function acaoSelecionarAno(ano) {
    await status(`Consultando ${ano}…`)
    const sel = await esperarPor(() =>
      inputPorRotulo('ano-calendário', 'ano-calendario', 'ano calendário') ||
      Array.from(document.querySelectorAll('select')).find(vis), 10000)
    if (!sel || !(sel instanceof HTMLSelectElement)) return erro('Seletor de ano-calendário não encontrado.')

    const opt = Array.from(sel.options).find(o => String(o.value).trim() === String(ano) || txt(o) === String(ano))
    if (!opt) return erro(`O ano ${ano} não aparece na lista do PGMEI.`)
    setarValor(sel, opt.value)
    await sleep(300)

    const ok = botaoPorTexto('ok') || sel.form?.querySelector('input[type=submit], button')
    if (!ok) return erro('Botão "Ok" do ano-calendário não encontrado.')
    ok.click()
  }

  async function acaoMarcarEGerar(dataPagamento, confirmar, incluir) {
    const tab = await esperarPor(tabelaPeriodos, 12000)
    if (!tab) return erro('Tabela de períodos não carregou.')

    const abertas = aplicarRegra(linhasEmAberto(tab), incluir || 'vencidos_e_mes')
    if (abertas.length === 0) {
      const r = await enviar({ tipo: 'pgmei-ano-sem-valor' })
      if (r?.acao === 'selecionar-ano') return acaoSelecionarAno(r.ano)
      return
    }

    for (const l of abertas) {
      if (!l.chk.checked) { l.chk.click(); await sleep(120) }
    }

    if (dataPagamento) {
      const campoData = inputPorRotulo('data para pagamento', 'data para pagamento do(s) das') ||
        Array.from(document.querySelectorAll('input[type=text]')).find(i => vis(i) && /^\d{2}\/\d{2}\/\d{4}$/.test(i.value || ''))
      if (campoData) { setarValor(campoData, dataPagamento); await sleep(250) }
    }

    const periodos = abertas.map(l => l.periodo).filter(Boolean)
    await enviar({
      tipo: 'pgmei-marcados',
      periodos,
      valor: somaReais(abertas.map(l => l.total)),
      vencimento: abertas[abertas.length - 1]?.venc || '',
    })

    if (confirmar) {
      const detalhe = abertas.map(l => `• ${l.periodo}  ${l.total}  (${l.situacao || 'em aberto'}, vence ${l.venc || '—'})`).join('\n')
      const ok = window.confirm(
        `NODRI — conferência antes de gerar\n\n` +
        `Meses marcados (${periodos.length}):\n${detalhe}\n\n` +
        `Total: ${somaReais(abertas.map(l => l.total))}\n\n` +
        `OK para gerar a guia · Cancelar para PULAR este profissional.`
      )
      if (!ok) return enviar({ tipo: 'pgmei-erro', msg: 'Pulado por você na conferência.' })
    }

    const gerar = botaoPorTexto('apurar/gerar das', 'apurar/gerar', 'gerar das')
    if (!gerar) return erro('Botão "Apurar/Gerar DAS" não encontrado.')
    gerar.click()

    // A Receita recusa em cima da própria página, sem trocar de endereço. Se
    // ninguém olhar essa tarja, a extensão fica esperando um PDF que nunca vem
    // — e no recarregamento seguinte recomeça o ciclo no mesmo profissional.
    const e = await esperarPor(erroDaReceita, 6000, 400)
    if (e) return enviar({ tipo: 'pgmei-erro', msg: e })
  }

  async function acaoBaixarPdf() {
    const btn = await esperarPor(() => botaoPorTexto('imprimir/visualizar pdf', 'visualizar pdf', 'imprimir'), 10000)
    if (!btn) return erro('Botão "Imprimir/Visualizar PDF" não encontrado.')

    // Caminho preferido: link direto → a extensão baixa pela API e o arquivo já
    // sai com o nome certo, sem depender do visualizador de PDF do Chrome.
    const href = btn.tagName === 'A' ? btn.getAttribute('href') : null
    if (href && !/^\s*(#|javascript:)/i.test(href)) {
      await enviar({ tipo: 'pgmei-pdf-url', url: new URL(href, location.href).href })
      return
    }
    btn.click()
    await sleep(3000)
    await enviar({ tipo: 'pgmei-baixado' })
  }

  // ─────────────────────────── ENTRADA ───────────────────────────

  async function principal() {
    if (jaAgi) return
    jaAgi = true
    const pagina = qualPagina()
    if (pagina === 'outra') return

    const temTabela = pagina === 'emissao' ? !!tabelaPeriodos() : false
    const r = await enviar({ tipo: 'pgmei-carregou', pagina, temTabela })
    if (!r || !r.acao || r.acao === 'nada') return

    try {
      if (r.acao === 'preencher-cnpj') return await acaoPreencherCnpj(r.cnpj)
      if (r.acao === 'ir-emissao') return await acaoIrEmissao()
      if (r.acao === 'selecionar-ano') return await acaoSelecionarAno(r.ano)
      if (r.acao === 'marcar-e-gerar') return await acaoMarcarEGerar(r.dataPagamento, r.confirmar, r.incluir)
      if (r.acao === 'baixar-pdf') return await acaoBaixarPdf()
    } catch (e) {
      await erro('Erro inesperado: ' + (e?.message || e))
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', principal)
  else principal()
})()
