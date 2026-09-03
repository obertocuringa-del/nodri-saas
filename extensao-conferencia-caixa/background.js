// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER — abre a tela do Avec, manda ler e devolve o resultado.
//
// ── O que mudou, e por quê ─────────────────────────────────────────────────
//
// A primeira versão exigia que o dono deixasse a tela certa aberta, com o
// período certo, e só então clicasse. Funcionava, mas jogava para ele um
// trabalho que a máquina faz melhor — e um passo esquecido virava mensagem de
// erro em vez de conferência.
//
// Agora basta o Avec estar LOGADO. Este arquivo abre uma aba própria, em
// segundo plano, na tela de Comandas Finalizadas, manda ler e FECHA a aba. A
// tela que o dono estava usando não é tocada.
//
// ── O limite que continua de pé ────────────────────────────────────────────
//
// Navegar e preencher data é leitura: não muda nada no Avec. O perigoso
// naquela tela são os botões de cada linha — editar, imprimir e EXCLUIR. A
// extensão não encosta neles: o avec.js só toca em controles nomeados (os
// dois campos de data, o Buscar, o "por página" e a paginação), nunca em algo
// dentro do corpo da tabela.
//
// ── O endereço vem do NODRI ────────────────────────────────────────────────
//
// A URL da tela não é fixa aqui: chega junto do pedido, vinda da configuração
// do salão. Se o Avec mudar o endereço, resolve-se no painel, sem reinstalar
// extensão em máquina nenhuma.
// ─────────────────────────────────────────────────────────────────────────────

const AVEC = 'https://admin.avec.beauty/'
const URL_PADRAO = AVEC + 'admin/financeiro/comanda/historico'

function avisar(abaNodri, msg) {
  if (!abaNodri) return
  chrome.tabs.sendMessage(abaNodri, { paraPagina: msg }, () => { void chrome.runtime.lastError })
}

/**
 * Só aceita endereço do próprio Avec — qualquer outro vira o padrão.
 *
 * A URL vem de fora (da configuração do salão), e um endereço trocado por
 * engano faria a extensão abrir um site qualquer já logado no navegador do
 * dono. O domínio é conferido aqui, não na tela.
 */
function urlSegura(bruta) {
  try {
    const u = new URL(String(bruta || ''))
    if (u.protocol === 'https:' && u.hostname.endsWith('avec.beauty')) return u.href
  } catch { /* endereço inválido */ }
  return URL_PADRAO
}

function perguntar(abaId, msg) {
  return new Promise(resolve => {
    try {
      chrome.tabs.sendMessage(abaId, msg, r => {
        // lastError acontece quando o content script não está naquela aba
        // (página ainda carregando, ou outro domínio). Vira resposta vazia e
        // o chamador trata — nunca uma promessa que nunca resolve.
        if (chrome.runtime.lastError) return resolve(null)
        resolve(r || null)
      })
    } catch { resolve(null) }
  })
}

/** Espera a aba terminar de carregar. */
function esperarCarregar(abaId, ms = 30000) {
  return new Promise(resolve => {
    const fim = Date.now() + ms
    const ver = () => {
      chrome.tabs.get(abaId, aba => {
        if (chrome.runtime.lastError || !aba) return resolve(false)
        if (aba.status === 'complete') return resolve(true)
        if (Date.now() > fim) return resolve(false)
        setTimeout(ver, 400)
      })
    }
    ver()
  })
}

/** Existe alguma aba do Avec? É o sinal de que há sessão aberta. */
async function temAvecAberto() {
  const abas = await chrome.tabs.query({ url: AVEC + '*' })
  return abas.length > 0
}

chrome.runtime.onMessage.addListener((msg, remetente) => {
  if (!msg || msg.tipo !== 'coletar') return
  const abaNodri = remetente?.tab?.id || null

  ;(async () => {
    if (!(await temAvecAberto())) {
      avisar(abaNodri, { tipo: 'fim',
        erro: 'O Avec não está aberto. Deixe uma aba do Avec logada e clique de novo.' })
      return
    }

    avisar(abaNodri, { tipo: 'status', texto: 'Abrindo as comandas finalizadas no Avec…' })

    let aba
    try {
      aba = await chrome.tabs.create({ url: urlSegura(msg.url), active: false })
    } catch {
      avisar(abaNodri, { tipo: 'fim', erro: 'Não consegui abrir a tela do Avec.' })
      return
    }

    try {
      const carregou = await esperarCarregar(aba.id)
      if (!carregou) {
        avisar(abaNodri, { tipo: 'fim',
          erro: 'A tela do Avec não terminou de carregar. Tente de novo.' })
        return
      }

      avisar(abaNodri, { tipo: 'status', texto: `Buscando as comandas de ${msg.data}…` })

      const r = await perguntar(aba.id, { tipo: 'ler-caixa', data: msg.data })

      if (!r) {
        avisar(abaNodri, { tipo: 'fim',
          erro: 'A tela do Avec não respondeu. Confira se sua sessão do Avec ainda está ativa.' })
        return
      }
      if (!r.ok) {
        avisar(abaNodri, { tipo: 'fim', erro: r.erro || 'Não consegui ler a tela.', diag: r.diag })
        return
      }

      avisar(abaNodri, { tipo: 'fim', caixas: r.caixas, url: r.url })
    } finally {
      // A aba de trabalho some, dê certo ou não.
      try { await chrome.tabs.remove(aba.id) } catch { /* já fechada */ }
    }
  })()
})
