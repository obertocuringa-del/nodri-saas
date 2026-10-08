// ─────────────────────────────────────────────────────────────────────────────
// PONTE — roda nas páginas do NODRI.
//
// A página não conhece o id da extensão, e não deve conhecer: assim reinstalar
// a extensão não obriga a mexer no código do sistema. A conversa é por
// window.postMessage e este arquivo só repassa.
// ─────────────────────────────────────────────────────────────────────────────

const DA_PAGINA = 'nodri-nfxml'
const DA_EXT = 'nodri-nfxml-ext'

function paraPagina(msg) {
  window.postMessage({ fonte: DA_EXT, ...msg }, window.location.origin)
}

window.addEventListener('message', (ev) => {
  if (ev.source !== window) return
  const d = ev.data
  if (!d || d.fonte !== DA_PAGINA) return

  if (d.tipo === 'ping') {
    let versao = ''
    try { versao = chrome.runtime.getManifest().version } catch { /* contexto invalidado */ }
    paraPagina({ tipo: 'pong', versao })
    return
  }

  if (d.tipo === 'iniciar' || d.tipo === 'cancelar') {
    try {
      chrome.runtime.sendMessage({ tipo: d.tipo, job: d.job }, () => {
        void chrome.runtime.lastError
      })
    } catch {
      paraPagina({ tipo: 'fim', erro: 'Extensão indisponível (recarregue a página).' })
    }
  }
})

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.paraPagina) paraPagina(msg.paraPagina)
})
