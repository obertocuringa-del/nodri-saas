// ─────────────────────────────────────────────────────────────────────────────
// PONTE — roda na página do NODRI.
//
// Mesma ideia da ponte das guias do MEI: a página não conhece o id da extensão,
// a conversa é por window.postMessage e este script só repassa.
//
// Protocolo próprio (nodri-caixa) de propósito. Se um dia as duas extensões
// estiverem instaladas ao mesmo tempo, uma não responde no lugar da outra.
// ─────────────────────────────────────────────────────────────────────────────

const DA_PAGINA = 'nodri-caixa'
const DA_EXT = 'nodri-caixa-ext'

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

  if (d.tipo === 'coletar' || d.tipo === 'cancelar') {
    try {
      chrome.runtime.sendMessage({ tipo: d.tipo, data: d.data }, () => {
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
