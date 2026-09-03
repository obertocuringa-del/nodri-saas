// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER — leva o pedido do NODRI até a aba do Avec e traz a resposta.
//
// Faz pouca coisa de propósito. Quem sabe ler a tela é o avec.js; quem sabe o
// que fazer com o dado é o NODRI. Aqui só se acha a aba certa, se pergunta, e
// se devolve — inclusive quando a resposta é "não deu".
//
// O que este arquivo NUNCA faz: navegar sozinho para outra tela do Avec,
// clicar em filtro, mudar data. Se a tela aberta não é a do caixa, ele diz
// isso e para. Extensão que dirige o sistema de outra empresa por conta
// própria é a que um dia clica no lugar errado.
// ─────────────────────────────────────────────────────────────────────────────

const AVEC = 'https://admin.avec.beauty/'

// A tela certa e' COMANDAS FINALIZADAS (/financeiro/comanda/historico).
//
// A primeira versao apontava para o Historico de Caixas. Olhando a tela de
// verdade, ela nao serve: traz responsavel, abertura, fechamento e os TOTAIS
// por forma de pagamento — e nenhum numero de comanda. Sem comanda nao ha
// como confrontar item lancado com dinheiro recebido.
const TELA_COMANDAS = /financeiro\/comanda/i

function avisar(abaNodri, msg) {
  if (!abaNodri) return
  chrome.tabs.sendMessage(abaNodri, { paraPagina: msg }, () => { void chrome.runtime.lastError })
}

/** A aba do Avec que está na tela de caixa; senão, qualquer aba do Avec. */
async function acharAba() {
  const abas = await chrome.tabs.query({ url: AVEC + '*' })
  if (!abas.length) return { aba: null, motivo: 'sem-avec' }
  const naTela = abas.find(a => TELA_COMANDAS.test(a.url || ''))
  if (naTela) return { aba: naTela, motivo: '' }
  return { aba: null, motivo: 'tela-errada', abertas: abas.length }
}

function perguntar(abaId, msg) {
  return new Promise(resolve => {
    try {
      chrome.tabs.sendMessage(abaId, msg, r => {
        // lastError acontece quando o content script não está naquela aba
        // (página ainda carregando, ou aba de outro domínio). Vira resposta
        // vazia e o chamador trata — nunca uma promessa que nunca resolve.
        if (chrome.runtime.lastError) return resolve(null)
        resolve(r || null)
      })
    } catch { resolve(null) }
  })
}

chrome.runtime.onMessage.addListener((msg, remetente) => {
  if (!msg || msg.tipo !== 'coletar') return
  const abaNodri = remetente?.tab?.id || null

  ;(async () => {
    const { aba, motivo, abertas } = await acharAba()

    if (!aba && motivo === 'sem-avec') {
      avisar(abaNodri, {
        tipo: 'fim',
        erro: 'O Avec não está aberto. Abra Financeiro › Comandas Finalizadas numa aba e clique de novo.',
      })
      return
    }
    if (!aba && motivo === 'tela-errada') {
      avisar(abaNodri, {
        tipo: 'fim',
        erro: `O Avec está aberto (${abertas} aba(s)), mas nenhuma está na tela certa. `
          + 'Abra Financeiro › Comandas Finalizadas, com o período incluindo o dia que '
          + 'você quer conferir, e clique de novo.',
      })
      return
    }

    avisar(abaNodri, { tipo: 'status', texto: 'Lendo as comandas finalizadas…' })

    const r = await perguntar(aba.id, { tipo: 'ler-caixa', data: msg.data })

    if (!r) {
      avisar(abaNodri, {
        tipo: 'fim',
        erro: 'A aba do Avec não respondeu. Atualize a página do Avec (F5) e clique de novo.',
      })
      return
    }
    if (!r.ok) {
      avisar(abaNodri, { tipo: 'fim', erro: r.erro || 'Não consegui ler a tela.', diag: r.diag })
      return
    }

    avisar(abaNodri, { tipo: 'fim', caixas: r.caixas, url: r.url })
  })()
})
