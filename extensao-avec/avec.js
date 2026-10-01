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
    for (const tipo of ['input', 'keyup', 'change', 'blur']) el.dispatchEvent(new Event(tipo, { bubbles: true }))
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
    // Só campo de senha VISÍVEL: o painel logado tem modal de trocar senha
    // escondido, e um `querySelector` cego dizia "login" com o Avec aberto.
    return Array.from(document.querySelectorAll('input[type="password"]')).some(i => i.offsetParent !== null)
  }

  /** Aviso de erro visível na tela de login ("Usuário ou senha inválidos"). */
  function avisoDeErro() {
    const el = Array.from(document.querySelectorAll('[role=alert], .alert, .error, .invalid-feedback, .text-danger, [class*=erro], [class*=error]'))
      .find(e => e.offsetParent !== null && (e.textContent || '').trim().length > 3)
    return el ? txt(el).slice(0, 160) : null
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
    // O Avec lento deixa o botão desabilitado enquanto valida os campos: era
    // 0,6 s de espera e desistia. Agora espera até 10 s ele liberar.
    if (botao.disabled) await esperarPor(() => !botao.disabled, 10000, 250)
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
    // Conferido em 18/09/2026 no relatório real: Data Cadastro Reserva · Data
    // Reserva · Hora · Cliente · Celular · Data Cadastro Cliente · E-mail ·
    // Profissional · Serviço · Origem · Status · Observação · Data Comanda ·
    // Número · Quem Cadastrou. Profissional e Serviço estavam lá o tempo todo
    // e não eram lidos -- por isso o aviso ao profissional achava 22 elegíveis
    // e não mandava para ninguém.
    const iData = col('data reserva', 'data'), iHora = col('hora'), iCli = col('cliente'),
      iCel = col('celular', 'telefone'), iSt = col('status'), iNum = col('numero', 'n comanda', 'comanda'),
      iProf = col('profissional'), iServ = col('servico', 'servicos', 'item')
    if (iCli < 0 || iCel < 0 || iSt < 0) return { erro: 'A tabela não tem as colunas Cliente, Celular e Status', cab }
    const linhas = []
    for (const tr of tab.querySelectorAll('tbody tr')) {
      const cs = Array.from(tr.querySelectorAll('td')).map(td => txt(td))
      if (cs.length < 3) continue
      if (cs.length === 1 || /nenhum registro/i.test(cs.join(' '))) continue
      linhas.push({
        data: iData >= 0 ? cs[iData] : '', hora: iHora >= 0 ? cs[iHora] : '',
        cliente: cs[iCli], celular: cs[iCel], status: cs[iSt], numero: iNum >= 0 ? cs[iNum] : '',
        profissional: iProf >= 0 ? cs[iProf] : '', servico: iServ >= 0 ? cs[iServ] : '',
      })
    }
    return { linhas }
  }

  function registrosNaListagem() {
    const m = /de\s+([\d.,]+)\s+registros?/i.exec(document.body.innerText || '')
    return m ? Number(String(m[1]).replace(/[.,]/g, '')) : null
  }

  async function lerRelatorio(dia, jaInsisti = false) {
    // 30 s: no horário de pico o Avec leva mais de 15 para montar a tela
    // (18/09/2026, 17:01), e desistir cedo custou o disparo de confirmação.
    const ini = await esperarPor(() => document.querySelector('input[name="inicio"]'), 30000)
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

    // ── Zero merece uma segunda olhada ────────────────────────────────────
    //
    // A tela abre com a data preenchida e a TABELA VAZIA: só enche depois do
    // Buscar. Se a leitura pegar esse instante, volta zero -- e zero faz a
    // automação não mandar nada, calada, que é o pior erro possível aqui.
    // Num dia realmente vazio a segunda tentativa também dá zero e custa 3
    // segundos. Num dia cheio, salva o disparo inteiro.
    if (!doDia.length && !jaInsisti) {
      await sleep(2500)
      return await lerRelatorio(dia, true)
    }

    return { ok: true, linhas: doDia, total, url: location.href }
  }

  // ── Marcar um agendamento como Confirmado ─────────────────────────────────
  //
  // Recebe do NODRI o que a PLANILHA já disse: dia, hora, profissional e o
  // telefone da cliente. Aqui só se abre o bloquinho certo e se confere o
  // celular dentro do modal antes de salvar -- duas fontes concordando. Se o
  // telefone não bater, NÃO salva: confirmar o horário da pessoa errada é pior
  // do que não confirmar.
  const soDigitos = s => String(s || '').replace(/\D+/g, '').replace(/^55/, '').replace(/^(\d{2})9(\d{8})$/, '$1$2')

  // ── A agenda de verdade (conferida em 18/09/2026) ─────────────────────────
  //
  // É uma tabela. A linha de título tem um `td.ag-titulo` por profissional,
  // com o nome num div dentro; os bloquinhos `.reserva-agendada` ficam nos
  // `td` da MESMA coluna (cellIndex). Doze profissionais por página; a
  // setinha `.bloco-branco-vazio-abs-prox` vira a página. A data que está na
  // tela mora num `input.datepicker2` escondido, no formato dd/mm/aaaa -- é
  // por ele que se sabe se o clique no dia já surtiu efeito, em vez de
  // dormir 2,5 s e torcer (às 17:43 a agenda ainda estava em 18/09 quando a
  // extensão procurou o horário de 19/09, e não achou).
  const dataNaTela = () => {
    const i = Array.from(document.querySelectorAll('input.datepicker2, input[type=text]'))
      .find(x => /^\d{2}\/\d{2}\/\d{4}$/.test(x.value || ''))
    return i ? i.value : null
  }
  const titulosVisiveis = () => Array.from(document.querySelectorAll('td.ag-titulo'))
    .filter(td => td.offsetParent !== null)
    .map(td => {
      const nome = Array.from(td.querySelectorAll('div, span'))
        .map(x => txt(x)).find(t => t && /^[A-ZÀ-Ú][A-ZÀ-Ú .]{1,24}$/.test(t)) || txt(td).slice(0, 20)
      return { idx: td.cellIndex, nome }
    })
  const assinaturaTitulos = () => titulosVisiveis().map(t => t.nome).join('|')

  async function porODiaNaAgenda(dia) {
    // "Hoje" primeiro: recarrega a agenda e volta para uma data conhecida.
    const hoje = Array.from(document.querySelectorAll('button, a')).find(b => /^\s*hoje\s*$/i.test(b.textContent || ''))
    if (hoje) { hoje.click(); await sleep(1500) }
    if (dataNaTela() === dia) return true

    const [d, m, a] = String(dia || '').split('/')
    if (!d || !m || !a) return false
    const MES = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
    const alvoMes = MES[Number(m) - 1]

    // Acerta o mês pela setinha, comparando o cabeçalho do calendário.
    for (let i = 0; i < 18; i++) {
      const cab = Array.from(document.querySelectorAll('.datepicker-switch, th'))
        .map(e => txt(e)).find(t => /\d{4}/.test(t) && /[a-zç]{4,}/i.test(t)) || ''
      const cabN = norm(cab)
      if (cabN.includes(alvoMes) && cab.includes(a)) break
      const proxima = Array.from(document.querySelectorAll('.next, th.next, [class*=next]'))
        .find(e => e.offsetParent !== null)
      if (!proxima) break
      proxima.click()
      await sleep(500)
    }

    // Clica no dia, evitando os dias "de fora" do mês.
    const celulas = Array.from(document.querySelectorAll('td.day, td'))
      .filter(td => txt(td) === String(Number(d)) && !/old|new|disabled/.test(td.className))
    const alvo = celulas.find(td => td.offsetParent !== null)
    if (!alvo) return false
    alvo.click()
    // Espera a data da tela virar a pedida E os blocos assentarem.
    const virou = await esperarPor(() => dataNaTela() === dia, 15000, 300)
    await sleep(2000)
    return !!virou || dataNaTela() === dia
  }

  /** Vira as páginas de profissionais até a coluna de `nomeProf` aparecer. */
  async function acharColuna(nomeProf) {
    const alvo = norm(nomeProf).split(' ')[0]
    for (let pagina = 0; pagina < 8; pagina++) {
      const t = titulosVisiveis().find(x => norm(x.nome).split(' ')[0] === alvo || norm(x.nome) === norm(nomeProf))
      if (t) return t.idx
      const antes = assinaturaTitulos()
      const prox = Array.from(document.querySelectorAll('.bloco-branco-vazio-abs-prox')).find(e => e.offsetParent !== null)
      if (!prox) return null
      prox.click()
      const mudou = await esperarPor(() => assinaturaTitulos() !== antes, 8000, 300)
      if (!mudou) return null
      await sleep(800)
    }
    return null
  }

  async function abrirEConfirmar(bloco, alvoTel) {
    bloco.click()
    const modal = await esperarPor(() =>
      Array.from(document.querySelectorAll('.modal, [role=dialog]'))
        .find(m => m.offsetParent !== null && /celular/i.test(m.textContent || '')), 8000)
    if (!modal) return { ok: false, motivo: 'modal não abriu' }

    const cel = (/celular:?\s*([\d()\-\s+]{8,})/i.exec(modal.textContent || '') || [])[1]
    if (soDigitos(cel) !== alvoTel) {
      const fechar = modal.querySelector('.close, [data-dismiss=modal]')
        || Array.from(modal.querySelectorAll('a, button')).find(x => /cancelar/i.test(x.textContent || ''))
      if (fechar) fechar.click()
      await sleep(600)
      return { ok: false, motivo: 'outro telefone' }
    }

    // O status é um rádio `name=status` (Confirmado = 1.5) dentro de um label;
    // "Salvar" é um <a class="btn"> -- não <button>.
    const radioConfirmado = Array.from(modal.querySelectorAll('input[type=radio][name=status]'))
      .find(r => /^\s*confirmado\s*$/i.test((r.closest('label')?.textContent || '').trim()) || r.value === '1.5')
    const labelConfirmado = radioConfirmado?.closest('label')
      || Array.from(modal.querySelectorAll('label, button, div, span'))
        .find(e => /^\s*confirmado\s*$/i.test((e.textContent || '').trim()) && e.offsetParent !== null)
    if (!labelConfirmado) return { ok: false, erro: 'Não achei o botão Confirmado no modal', final: true }
    if (radioConfirmado?.checked) {
      const fechar = modal.querySelector('.close, [data-dismiss=modal]')
      if (fechar) fechar.click()
      await sleep(600)
      return { ok: true, jaEstava: true }
    }
    labelConfirmado.click()
    await sleep(300)
    if (radioConfirmado && !radioConfirmado.checked) { radioConfirmado.click(); await sleep(300) }
    if (radioConfirmado && !radioConfirmado.checked) return { ok: false, erro: 'O status não mudou para Confirmado ao clicar', final: true }

    const salvar = Array.from(modal.querySelectorAll('a, button, input[type=submit], input[type=button]'))
      .find(x => x.offsetParent !== null && /^\s*salvar\s*$/i.test((x.textContent || x.value || '').trim()))
    if (!salvar) return { ok: false, erro: 'Não achei o botão Salvar', final: true }
    salvar.click()
    await sleep(1500)

    // ── "Todos os agendamentos / apenas esse" ──
    // Só aparece quando a cliente tem outros agendamentos NO MESMO DIA, com
    // outros profissionais. Não alcança recorrência -- por isso TODOS é
    // seguro: a cliente confirmou o dia, não um profissional. A caixa é
    // procurada, não esperada: com um profissional só ela não abre.
    const achaTodos = () => Array.from(document.querySelectorAll('button, a, div, span'))
      .find(x => x.offsetParent !== null
        && /^\s*todos os agendamentos\s*$/i.test((x.textContent || '').trim())
        && !Array.from(x.children).some(f => /todos os agendamentos/i.test(f.textContent || '')))
    const todos = await esperarPor(achaTodos, 3000, 300)
    if (todos) { todos.click(); await sleep(1500) }
    return { ok: true }
  }

  async function marcarConfirmado({ data, hora, profissional, telefone }) {
    const ok = await porODiaNaAgenda(data)
    if (!ok) return { ok: false, erro: `Não consegui pôr a agenda em ${data} (ficou em ${dataNaTela() || '?'})` }

    const alvoHora = String(hora || '').slice(0, 5)
    const alvoTel = soDigitos(telefone)
    const blocosDaHora = (idx) => Array.from(document.querySelectorAll('.reserva-agendada:not(.bloqueio-tipo)'))
      .filter(b => b.offsetParent !== null)
      .filter(b => idx == null || b.closest('td')?.cellIndex === idx)
      .filter(b => txt(b).startsWith(alvoHora) || txt(b).includes(alvoHora))

    // 1) A coluna do profissional, virando página se precisar.
    const idx = await acharColuna(profissional)
    const vistos = []
    const tentar = async (lista) => {
      for (const b of lista) {
        const r = await abrirEConfirmar(b, alvoTel)
        if (r.ok || r.final) return r
        vistos.push(r.motivo)
      }
      return null
    }
    if (idx != null) {
      const r = await tentar(blocosDaHora(idx))
      if (r) return r
    }
    // 2) Não achou na coluna dele: qualquer coluna desta página, no horário.
    const r2 = await tentar(blocosDaHora(null))
    if (r2) return r2

    const profs = titulosVisiveis().map(t => t.nome).join(', ')
    return {
      ok: false,
      erro: `Não achei o agendamento de ${alvoHora} com ${profissional} em ${dataNaTela() || data}`
        + (idx == null ? ` (coluna de ${profissional} não apareceu; vi: ${profs})` : ` (${vistos.length} bloco(s) nesse horário, nenhum com o telefone dela)`),
    }
  }

  chrome.runtime.onMessage.addListener((msg, _rem, responder) => {
    if (!msg || !msg.tipo) return
    if (msg.tipo === 'onde-estou') { responder({ login: estaNoLogin(), url: location.href, erro: avisoDeErro() }); return }
    if (msg.tipo === 'logar') { logar(msg.email, msg.senha).then(responder); return true }
    if (msg.tipo === 'marcar-confirmado') {
      if (estaNoLogin()) { responder({ ok: false, erro: 'Avec deslogado', login: true }); return }
      marcarConfirmado(msg).then(responder).catch(e => responder({ ok: false, erro: String(e?.message || e) }))
      return true
    }
    if (msg.tipo === 'ler-0051') {
      if (estaNoLogin()) { responder({ ok: false, erro: 'Avec deslogado', login: true, url: location.href }); return }
      lerRelatorio(msg.data).then(responder)
      return true
    }
  })
})()
