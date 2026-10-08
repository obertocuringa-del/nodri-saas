// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER
//
// Faz duas coisas que o content script não pode fazer sozinho:
//
//  1. Achar (ou abrir) a aba do Avec na tela de Notas Fiscais e mandar o
//     serviço para lá — a página do NODRI e a do Avec são abas diferentes.
//
//  2. BUSCAR O XML. O botão "XML" do Avec aponta para
//     consulta.invoicy.com.br, que é outro domínio: um `fetch` feito de
//     dentro da página do Avec esbarra no CORS. Aqui no worker, com o
//     domínio declarado em host_permissions, o navegador deixa passar.
//
// Por que buscar em vez de clicar: o link do XML abre NA MESMA ABA
// (target vazio). Clicar nele tiraria a página do ar no meio da fila. E
// buscando temos o conteúdo na mão -- "comprovado que baixou" deixa de ser
// esperança e vira conferência: ou voltou um XML válido, ou não voltou.
// ─────────────────────────────────────────────────────────────────────────────

const URL_AVEC = 'https://admin.avec.beauty/admin/financeiro/nota_fiscal'

const VAZIO = { rodando: false, abaNodri: null, abaAvec: null }

async function ler() {
  const { estado } = await chrome.storage.session.get('estado')
  return estado || { ...VAZIO }
}
async function gravar(e) { await chrome.storage.session.set({ estado: e }) }

function avisarPagina(estado, msg) {
  if (!estado?.abaNodri) return
  chrome.tabs.sendMessage(estado.abaNodri, { paraPagina: msg }, () => { void chrome.runtime.lastError })
}

/** A aba do Avec já aberta na tela certa; se não houver, abre uma. */
async function acharOuAbrirAvec() {
  const abas = await chrome.tabs.query({ url: 'https://admin.avec.beauty/admin/financeiro/nota_fiscal*' })
  if (abas.length) {
    // A última que a pessoa usou é a que ela está vendo.
    const aba = abas.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0]
    return { id: aba.id, nova: false }
  }
  const aba = await chrome.tabs.create({ url: URL_AVEC, active: true })
  return { id: aba.id, nova: true }
}

/** Espera o content script daquela aba responder. Página recém-aberta demora. */
async function esperarAba(abaId, ms = 25000) {
  const ate = Date.now() + ms
  while (Date.now() < ate) {
    const vivo = await new Promise(r => {
      try {
        chrome.tabs.sendMessage(abaId, { tipo: 'ping' }, resp => {
          void chrome.runtime.lastError
          r(!!resp?.pronto)
        })
      } catch { r(false) }
    })
    if (vivo) return true
    await new Promise(r => setTimeout(r, 700))
  }
  return false
}

chrome.runtime.onMessage.addListener((msg, sender, responder) => {
  // ── Pedido vindo da página do NODRI ──
  if (msg?.tipo === 'iniciar') {
    (async () => {
      const estado = { ...VAZIO, rodando: true, abaNodri: sender.tab?.id || null }
      await gravar(estado)

      avisarPagina(estado, { tipo: 'etapa', msg: 'Procurando a aba do Avec…' })
      let aba
      try {
        aba = await acharOuAbrirAvec()
      } catch (e) {
        avisarPagina(estado, { tipo: 'fim', erro: 'Não consegui abrir o Avec: ' + (e?.message || e) })
        await gravar(VAZIO); return
      }
      estado.abaAvec = aba.id
      await gravar(estado)

      if (aba.nova) avisarPagina(estado, { tipo: 'etapa', msg: 'Abri a tela de Notas Fiscais; esperando carregar…' })
      const pronto = await esperarAba(aba.id)
      if (!pronto) {
        avisarPagina(estado, {
          tipo: 'fim',
          erro: 'A tela de Notas Fiscais do Avec não respondeu. Abra admin.avec.beauty, entre na sua conta e deixe a tela de Notas Fiscais aberta.',
        })
        await gravar(VAZIO); return
      }

      chrome.tabs.sendMessage(aba.id, { tipo: 'executar', job: msg.job }, () => { void chrome.runtime.lastError })
    })()
    return false
  }

  if (msg?.tipo === 'cancelar') {
    (async () => {
      const estado = await ler()
      if (estado.abaAvec) {
        chrome.tabs.sendMessage(estado.abaAvec, { tipo: 'cancelar' }, () => { void chrome.runtime.lastError })
      }
      await gravar(VAZIO)
    })()
    return false
  }

  // ── Relato vindo do content script do Avec, a caminho do NODRI ──
  if (msg?.tipo === 'relato') {
    (async () => {
      const estado = await ler()
      avisarPagina(estado, msg.conteudo)
      if (msg.conteudo?.tipo === 'fim') await gravar(VAZIO)
    })()
    return false
  }

  // ── Buscar um XML no invoicy (o content script não pode: outro domínio) ──
  if (msg?.tipo === 'buscarXml') {
    (async () => {
      try {
        const r = await fetch(msg.url, { credentials: 'include', cache: 'no-store' })
        const texto = await r.text()
        responder({
          ok: r.ok,
          status: r.status,
          tipoConteudo: r.headers.get('content-type') || '',
          texto,
        })
      } catch (e) {
        responder({ ok: false, status: 0, erro: String(e?.message || e) })
      }
    })()
    return true   // resposta assíncrona
  }

  return false
})

// Se a aba do Avec for fechada no meio, a fila morre junto: avisa o NODRI em
// vez de deixar a tela girando para sempre.
chrome.tabs.onRemoved.addListener(async (abaId) => {
  const estado = await ler()
  if (!estado.rodando || estado.abaAvec !== abaId) return
  avisarPagina(estado, { tipo: 'fim', erro: 'A aba do Avec foi fechada no meio da busca.' })
  await gravar(VAZIO)
})
