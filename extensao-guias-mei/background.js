// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER — orquestra a fila.
//
// O estado vive em chrome.storage.session porque o worker do MV3 pode ser
// desligado entre uma página e outra (a pessoa pode demorar num captcha).
// Cada mensagem relê o estado, decide o próximo passo e devolve a ação.
// ─────────────────────────────────────────────────────────────────────────────

const VAZIO = {
  rodando: false, fila: [], idx: 0, config: null,
  abaPgmei: null, abaNodri: null,
  anos: [], anoAtual: null, marcados: null, valor: '', vencimento: '', nomeAlvo: null,
  geracoes: 0,   // quantas vezes ja mandamos gerar para o item atual (trava anti-loop)
}

async function ler() {
  const { estado } = await chrome.storage.session.get('estado')
  return estado || { ...VAZIO }
}
async function gravar(e) { await chrome.storage.session.set({ estado: e }) }

function avisarPagina(estado, msg) {
  if (!estado?.abaNodri) return
  chrome.tabs.sendMessage(estado.abaNodri, { paraPagina: msg }, () => { void chrome.runtime.lastError })
}

function limpaNome(s) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim()
}

function anosParaVerificar(config) {
  const n = Math.max(1, Math.min(3, Number(config?.anos) || 1))
  const atual = new Date().getFullYear()
  const lista = []
  for (let i = 0; i < n; i++) lista.push(atual - i)
  return lista
}

function fmtData(d) {
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
function dataPagamento(config) {
  const hoje = new Date()
  if (config?.pagamentoModo === 'hoje') return fmtData(hoje)
  const dia = Math.max(1, Math.min(31, Number(config?.pagamentoDia) || 20))
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  return fmtData(new Date(hoje.getFullYear(), hoje.getMonth(), Math.min(dia, ultimo)))
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Monta "Guias MEI/2026-08/Fulano - 08-2026.pdf" a partir dos moldes da config
function caminhoArquivo(config, item, periodos) {
  const conv = p => {
    const [m, a] = String(p).split('/')
    const i = MESES.indexOf(String(m || '').trim().toLowerCase())
    return { mes: i >= 0 ? String(i + 1).padStart(2, '0') : '', ano: String(a || '').trim() }
  }
  const cs = (Array.isArray(periodos) ? periodos : []).map(conv).filter(x => x.mes && x.ano)
  const hoje = new Date()
  let mes = String(hoje.getMonth() + 1).padStart(2, '0')
  let ano = String(hoje.getFullYear())
  if (cs.length === 1) { mes = cs[0].mes; ano = cs[0].ano }
  else if (cs.length > 1) { mes = `${cs[0].mes}a${cs[cs.length - 1].mes}`; ano = cs[cs.length - 1].ano }

  const troca = s => String(s || '')
    .split('{nome}').join(limpaNome(item?.nome))
    .split('{cnpj}').join(limpaNome(item?.cnpj))
    .split('{mes}').join(mes)
    .split('{ano}').join(ano)

  const pasta = troca(config?.pasta || 'Guias MEI/{ano}-{mes}')
    .split('/').map(limpaNome).filter(Boolean).join('/')
  let nome = limpaNome(troca(config?.nomeArquivo || '{nome} - {mes}-{ano}.pdf'))
  if (!nome) nome = 'guia.pdf'
  if (!/\.pdf$/i.test(nome)) nome += '.pdf'
  return (pasta ? pasta + '/' : '') + nome
}

function esperar(seg) {
  const ms = Math.max(0, Math.min(60, Number(seg) || 0)) * 1000
  return new Promise(r => setTimeout(r, ms))
}

// ── Renomeia o PDF que a Receita entregar enquanto a fila está rodando ──
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  ler().then(estado => {
    if (!estado.rodando || !estado.nomeAlvo) { suggest(); return }
    const ehPdf = /pdf/i.test(item.mime || '')
      || /\.pdf(\?|$)/i.test(item.filename || '')
      || /\.pdf(\?|$)/i.test(item.url || '')
      || /das/i.test(item.filename || '')
    if (!ehPdf) { suggest(); return }
    suggest({ filename: estado.nomeAlvo, conflictAction: 'uniquify' })
  }).catch(() => suggest())
  return true // resposta assíncrona
})

async function comecarItem() {
  const estado = await ler()
  if (!estado.rodando) return

  if (estado.idx >= estado.fila.length) {
    avisarPagina(estado, { tipo: 'fim' })
    await gravar({ ...VAZIO })
    return
  }

  const item = estado.fila[estado.idx]
  estado.anos = anosParaVerificar(estado.config)
  estado.anoAtual = estado.anos[0]
  estado.marcados = null
  estado.valor = ''
  estado.vencimento = ''
  estado.nomeAlvo = null
  estado.geracoes = 0
  await gravar(estado)

  avisarPagina(estado, { tipo: 'progresso', profId: item.id, etapa: 'andando', msg: 'Abrindo o PGMEI…' })

  const url = estado.config?.url
  let ok = false
  if (estado.abaPgmei != null) {
    try { await chrome.tabs.update(estado.abaPgmei, { url, active: true }); ok = true } catch { ok = false }
  }
  if (!ok) {
    const aba = await chrome.tabs.create({ url, active: true })
    const e2 = await ler()
    e2.abaPgmei = aba.id
    await gravar(e2)
  }
}

async function proximo() {
  const estado = await ler()
  if (!estado.rodando) return
  estado.idx += 1
  await gravar(estado)
  await comecarItem()
}

async function concluirItem(ok, extra) {
  const estado = await ler()
  const item = estado.fila[estado.idx]
  if (item) {
    avisarPagina(estado, {
      tipo: 'resultado', profId: item.id, nome: item.nome, cnpj: item.cnpj, ok,
      periodos: estado.marcados || [], valor: estado.valor || '', vencimento: estado.vencimento || '',
      arquivo: estado.nomeAlvo || '', ...extra,
    })
  }
  await esperar(estado.config?.intervalo)
  await proximo()
}

chrome.runtime.onMessage.addListener((msg, sender, resposta) => {
  ;(async () => {
    // ── comandos vindos da página do NODRI ──
    if (msg?.tipo === 'iniciar') {
      await gravar({
        ...VAZIO,
        rodando: true,
        fila: Array.isArray(msg.fila) ? msg.fila : [],
        config: msg.config || {},
        idx: 0,
        abaNodri: sender?.tab?.id || null,
      })
      resposta({ ok: true })
      await comecarItem()
      return
    }

    if (msg?.tipo === 'cancelar') {
      const estado = await ler()
      avisarPagina(estado, { tipo: 'fim', cancelado: true })
      await gravar({ ...VAZIO })
      resposta({ ok: true })
      return
    }

    // ── relatos do content script no PGMEI ──
    const estado = await ler()
    if (!estado.rodando) { resposta({ acao: 'nada' }); return }
    const item = estado.fila[estado.idx]
    if (!item) { resposta({ acao: 'nada' }); return }

    if (msg?.tipo === 'pgmei-carregou') {
      if (msg.pagina === 'identificacao') { resposta({ acao: 'preencher-cnpj', cnpj: item.cnpj }); return }
      if (msg.pagina === 'inicio') { resposta({ acao: 'ir-emissao' }); return }
      if (msg.pagina === 'emissao') {
        if (msg.temTabela) {
          // Rede de seguranca contra loop: cada ano configurado justifica UMA
          // ordem de gerar. Passou disso, alguma coisa esta recusando de forma
          // que nao sabemos ler — melhor abandonar este profissional do que
          // ficar martelando a Receita para sempre.
          const limite = Math.max(1, (estado.anos || []).length) + 1
          const jaTentou = Number(estado.geracoes || 0)
          if (jaTentou >= limite) {
            resposta({ acao: 'nada' })
            await concluirItem(false, { erro: 'A Receita recusou a geração e a página voltou ao início. Pulado para não repetir sem fim.' })
            return
          }
          const e2 = await ler()
          e2.geracoes = jaTentou + 1
          await gravar(e2)
          resposta({
            acao: 'marcar-e-gerar',
            dataPagamento: dataPagamento(estado.config),
            confirmar: !!estado.config?.confirmar,
            incluir: estado.config?.incluir || 'vencidos_e_mes',
          })
        } else {
          resposta({ acao: 'selecionar-ano', ano: estado.anoAtual })
        }
        return
      }
      if (msg.pagina === 'gerado') {
        const e2 = await ler()
        e2.nomeAlvo = caminhoArquivo(e2.config, item, e2.marcados || [])
        await gravar(e2)
        resposta({ acao: 'baixar-pdf' })
        return
      }
      resposta({ acao: 'nada' })
      return
    }

    if (msg?.tipo === 'pgmei-captcha') {
      avisarPagina(estado, { tipo: 'progresso', profId: item.id, etapa: 'captcha', msg: 'Resolva o desafio na aba do PGMEI — a fila segue sozinha depois.' })
      resposta({ ok: true }); return
    }

    if (msg?.tipo === 'pgmei-status') {
      avisarPagina(estado, { tipo: 'progresso', profId: item.id, etapa: 'andando', msg: msg.msg || '' })
      resposta({ ok: true }); return
    }

    // Ano sem nada em aberto → tenta o próximo ano configurado; se acabou, pula.
    if (msg?.tipo === 'pgmei-ano-sem-valor') {
      const e2 = await ler()
      const i = e2.anos.indexOf(e2.anoAtual)
      const prox = e2.anos[i + 1]
      if (prox) {
        e2.anoAtual = prox
        await gravar(e2)
        resposta({ acao: 'selecionar-ano', ano: prox })
      } else {
        resposta({ acao: 'nada' })
        await concluirItem(false, { pulado: true, msg: 'Nenhum mês em aberto.' })
      }
      return
    }

    if (msg?.tipo === 'pgmei-marcados') {
      const e2 = await ler()
      e2.marcados = Array.isArray(msg.periodos) ? msg.periodos : []
      e2.valor = msg.valor || ''
      e2.vencimento = msg.vencimento || ''
      await gravar(e2)
      avisarPagina(e2, { tipo: 'progresso', profId: item.id, etapa: 'andando', msg: `Gerando: ${e2.marcados.join(', ')}` })
      resposta({ ok: true }); return
    }

    // Link direto do PDF: baixa pela API, com o nome já definido.
    if (msg?.tipo === 'pgmei-pdf-url') {
      resposta({ ok: true })
      const e2 = await ler()
      try {
        await chrome.downloads.download({ url: msg.url, filename: e2.nomeAlvo || undefined, conflictAction: 'uniquify' })
        await concluirItem(true)
      } catch (e) {
        await concluirItem(false, { erro: 'Falha ao baixar o PDF: ' + (e?.message || e) })
      }
      return
    }

    if (msg?.tipo === 'pgmei-baixado') {
      resposta({ ok: true })
      await concluirItem(true)
      return
    }

    if (msg?.tipo === 'pgmei-erro') {
      resposta({ ok: true })
      await concluirItem(false, { erro: msg.msg || 'Falha na página do PGMEI' })
      return
    }

    resposta({ acao: 'nada' })
  })()
  return true // canal aberto para resposta assíncrona
})

// Se a aba do PGMEI for fechada no meio, encerra a fila em vez de travar.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const estado = await ler()
  if (estado.rodando && estado.abaPgmei === tabId) {
    avisarPagina(estado, { tipo: 'fim', cancelado: true })
    await gravar({ ...VAZIO })
  }
})
