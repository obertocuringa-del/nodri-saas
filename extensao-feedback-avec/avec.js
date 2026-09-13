// ─────────────────────────────────────────────────────────────────────────────
// CONTENT SCRIPT — roda dentro das páginas do Avec.
//
// Três perguntas que o service worker faz:
//   onde-estou  → { login: true/false, url }
//   logar       → preenche e-mail e senha na tela de login e clica em entrar
//   ler-0051    → põe o dia no relatório "Clientes com agendamentos", mostra
//                 tudo numa página só e devolve as linhas (data, hora,
//                 cliente, celular, status, número)
//
// Só toca em controles nomeados: os dois campos de data (inicio/fim), o
// Buscar, o "por página". Nunca em nada dentro da tabela.
//
// Medido em 13/09/2026 no relatório real: input[name=inicio],
// input[name=fim], botão "Buscar", select[name=tableFilter_length] (10…500),
// tabela #tableFilter com as colunas Data Reserva · Hora · Cliente · Celular ·
// Status · Número. As colunas são achadas pelo NOME do cabeçalho, para a
// ordem poder mudar sem quebrar nada.
// ─────────────────────────────────────────────────────────────────────────────

;(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()
  const norm = s => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

  /** Preenche do jeito que formulários feitos em React/Vue enxergam. */
  function escrever(el, valor) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
      : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(el, valor); else el.value = valor
    for (const tipo of ['input', 'keyup', 'change']) el.dispatchEvent(new Event(tipo, { bubbles: true }))
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

  function estaNoLogin() {
    return !!document.querySelector('input[type="password"]')
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async function logar(email, senha) {
    const senhaEl = await esperarPor(() => document.querySelector('input[type="password"]'), 8000)
    if (!senhaEl) return { ok: false, erro: 'Não achei o campo de senha' }
    const emailEl = document.querySelector('input[type="email"]')
      || Array.from(document.querySelectorAll('input[type="text"], input:not([type])'))
        .find(i => /mail|usu|login/i.test((i.name || '') + (i.id || '') + (i.placeholder || '') + (i.getAttribute('aria-label') || '')))
      || Array.from(document.querySelectorAll('input')).find(i => i !== senhaEl && !/hidden|checkbox|radio|submit/.test(i.type))
    if (!emailEl) return { ok: false, erro: 'Não achei o campo de e-mail' }
    escrever(emailEl, email)
    escrever(senhaEl, senha)
    await sleep(400)
    const botao = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      .find(b => /acessar|entrar|login/i.test(b.textContent || b.value || ''))
    if (!botao) return { ok: false, erro: 'Não achei o botão de entrar' }
    if (botao.disabled) await sleep(600)
    if (botao.disabled) return { ok: false, erro: 'O botão de entrar continuou desabilitado' }
    botao.click()
    return { ok: true }
  }

  // ── Relatório 0051 ─────────────────────────────────────────────────────────
  function tabela() {
    return document.querySelector('#tableFilter')
      || Array.from(document.querySelectorAll('table')).find(t => /celular/i.test(t.tHead?.textContent || ''))
      || null
  }

  function lerLinhas() {
    const tab = tabela()
    if (!tab) return null
    const cab = Array.from(tab.querySelectorAll('thead th')).map(th => norm(txt(th)))
    const col = (...nomes) => { for (const n of nomes) { const i = cab.indexOf(n); if (i >= 0) return i } return -1 }
    const iData = col('data reserva', 'data'), iHora = col('hora'), iCli = col('cliente'),
      iCel = col('celular', 'telefone'), iSt = col('status'), iNum = col('numero', 'n comanda', 'comanda')
    if (iCli < 0 || iCel < 0 || iSt < 0) return { erro: 'A tabela não tem as colunas Cliente, Celular e Status', cab }
    const linhas = []
    for (const tr of tab.querySelectorAll('tbody tr')) {
      const cs = Array.from(tr.querySelectorAll('td')).map(td => txt(td))
      if (cs.length < 3) continue
      if (cs.length === 1 || /nenhum registro/i.test(cs.join(' '))) continue
      linhas.push({
        data: iData >= 0 ? cs[iData] : '', hora: iHora >= 0 ? cs[iHora] : '',
        cliente: cs[iCli], celular: cs[iCel], status: cs[iSt], numero: iNum >= 0 ? cs[iNum] : '',
      })
    }
    return { linhas }
  }

  function registrosNaListagem() {
    const m = /de\s+([\d.,]+)\s+registros?/i.exec(document.body.innerText || '')
    return m ? Number(String(m[1]).replace(/[.,]/g, '')) : null
  }

  async function lerRelatorio(dia) {
    const ini = await esperarPor(() => document.querySelector('input[name="inicio"]'), 15000)
    const fim = document.querySelector('input[name="fim"]')
    if (!ini || !fim) return { ok: false, erro: 'Não achei os campos Data Início / Data Fim (é a tela do relatório 0051?)', url: location.href }

    const assinatura = () => { const l = lerLinhas()?.linhas || []; return l.length + '|' + (l[0] ? Object.values(l[0]).join('|') : '') }
    const antes = assinatura()

    escrever(ini, dia)
    escrever(fim, dia)
    const buscar = Array.from(document.querySelectorAll('button, a, input[type="submit"]'))
      .find(b => /buscar/i.test(b.textContent || b.value || ''))
    if (!buscar) return { ok: false, erro: 'Não achei o botão Buscar', url: location.href }
    buscar.click()
    // Espera a tabela trocar de conteúdo (ou o "Registros" mudar). Se o dia
    // não tem nada, a tabela fica vazia -- também é resposta.
    await esperarPor(() => assinatura() !== antes, 12000, 300)
    await sleep(800)

    // Tudo numa página só: o maior valor do "por página".
    const sel = document.querySelector('select[name$="_length"]')
    if (sel) {
      const maior = Array.from(sel.options).map(o => Number(o.value)).filter(n => n > 0).sort((a, b) => b - a)[0]
      if (maior && sel.value !== String(maior)) {
        escrever(sel, String(maior))
        await sleep(1500)
      }
    }

    const lido = lerLinhas()
    if (!lido) return { ok: false, erro: 'A tabela do relatório não apareceu', url: location.href }
    if (lido.erro) return { ok: false, erro: lido.erro, url: location.href }

    const total = registrosNaListagem()
    if (total !== null && lido.linhas.length < total) {
      return { ok: false, erro: `A listagem tem ${total} registros e só li ${lido.linhas.length}: aumente o "por página" no Avec`, url: location.href }
    }
    // Só o dia pedido: se o Avec ignorou a data, o NODRI ainda filtra por
    // data, mas aqui já se descarta o que não é de hoje.
    const doDia = lido.linhas.filter(l => !l.data || l.data === dia)
    return { ok: true, linhas: doDia, total, url: location.href }
  }

  chrome.runtime.onMessage.addListener((msg, _rem, responder) => {
    if (!msg || !msg.tipo) return
    if (msg.tipo === 'onde-estou') { responder({ login: estaNoLogin(), url: location.href }); return }
    if (msg.tipo === 'logar') { logar(msg.email, msg.senha).then(responder); return true }
    if (msg.tipo === 'ler-0051') {
      if (estaNoLogin()) { responder({ ok: false, erro: 'Avec deslogado', login: true, url: location.href }); return }
      lerRelatorio(msg.data).then(responder)
      return true
    }
  })
})()
