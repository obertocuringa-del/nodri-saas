// ─────────────────────────────────────────────────────────────────────────────
// PONTE — roda na página do NODRI.
//
// A página não conhece o id da extensão (e não deve conhecer: assim atualizar
// ou reinstalar a extensão não exige mexer no código do sistema). Então a
// conversa é por window.postMessage, e este script apenas repassa para o
// service worker e devolve as respostas.
// ─────────────────────────────────────────────────────────────────────────────

const DA_PAGINA = 'nodri-guias'
const DA_EXT = 'nodri-guias-ext'

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
      chrome.runtime.sendMessage({ tipo: d.tipo, config: d.config, fila: d.fila }, () => {
        // callback vazio só para não estourar "Unchecked runtime.lastError"
        void chrome.runtime.lastError
      })
    } catch {
      paraPagina({ tipo: 'fim', erro: 'Extensão indisponível (recarregue a página).' })
    }
  }
})

// Relatos vindos do service worker durante a execução
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.paraPagina) paraPagina(msg.paraPagina)
})
